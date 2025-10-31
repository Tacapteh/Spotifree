from __future__ import annotations

import re
import shutil
import tempfile
from pathlib import Path
from typing import Dict, Iterable, Optional
from urllib.parse import urlparse

import ffmpeg
from mutagen.easyid3 import EasyID3
from mutagen.id3 import ID3NoHeaderError
from tenacity import retry, stop_after_attempt, wait_exponential
from yt_dlp import YoutubeDL
from yt_dlp.utils import DownloadError

from .config import DATA_DIR
from .jobs import Job, ProgressCallback

BLACKLISTED_DOMAINS: Iterable[str] = (
    "spotify.com",
    "music.apple.com",
    "deezer.com",
    "tidal.com",
    "amazon.com",
    "amazon.co",
    "soundcloud.com",
)

ALLOWED_BITRATES = {128, 192, 256, 320}


class UnsupportedMediaError(Exception):
    """Raised when a URL is valid but media cannot be processed."""


def validate_url(url: str) -> str:
    if not isinstance(url, str):
        raise ValueError("URL invalide")
    cleaned = url.strip()
    if not cleaned:
        raise ValueError("URL vide")
    if len(cleaned) > 2048:
        raise ValueError("URL trop longue")
    parsed = urlparse(cleaned)
    if parsed.scheme not in {"http", "https"}:
        raise ValueError("Seules les URLs http(s) sont acceptées")
    hostname = (parsed.netloc or "").lower()
    if _is_blacklisted(hostname):
        raise ValueError("Domaine non autorisé")
    return cleaned


def _is_blacklisted(host: str) -> bool:
    return any(host == domain or host.endswith(f".{domain}") for domain in BLACKLISTED_DOMAINS)


def sanitize_filename(value: str) -> str:
    value = value.strip()
    value = re.sub(r"[\s]+", " ", value)
    value = value.replace("/", "-")
    sanitized = re.sub(r"[^\w\- .,()\[\]]", "", value, flags=re.UNICODE)
    return sanitized[:120].strip() or "audio"


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=6), reraise=True)
def probe_media(url: str) -> Dict[str, Optional[str]]:
    opts = {
        "quiet": True,
        "no_warnings": True,
        "skip_download": True,
        "socket_timeout": 15,
        "retries": 3,
        "noplaylist": True,
    }
    with YoutubeDL(opts) as ydl:
        try:
            info = ydl.extract_info(url, download=False)
        except DownloadError as exc:  # pragma: no cover - passthrough
            raise UnsupportedMediaError(str(exc)) from exc

    if info.get("is_live") or info.get("live_status") in {"is_live", "is_upcoming"}:
        raise UnsupportedMediaError("Flux en direct non pris en charge")
    if info.get("drm"):
        raise UnsupportedMediaError("Média protégé par DRM")

    has_audio = False
    if info.get("acodec") and info.get("acodec") != "none":
        has_audio = True
    for fmt in info.get("formats") or []:
        if fmt.get("acodec") and fmt.get("acodec") != "none":
            has_audio = True
            break
    if not has_audio:
        raise UnsupportedMediaError("Aucune piste audio détectée")

    summary = {
        "id": info.get("id"),
        "title": info.get("title"),
        "uploader": info.get("uploader"),
        "duration": info.get("duration"),
        "ext": info.get("ext"),
        "original_info": info,
    }
    return summary


def download_job(job: Job, progress_cb: ProgressCallback) -> Path:
    progress_cb(5, "Initialisation du téléchargement…")

    bitrate = job.bitrate if job.bitrate in ALLOWED_BITRATES else 192

    output_dir = DATA_DIR
    output_dir.mkdir(parents=True, exist_ok=True)
    temp_dir = Path(tempfile.mkdtemp(prefix=f"{job.id}_", dir=str(output_dir)))

    try:
        downloaded = _download_audio(job.url, temp_dir, progress_cb)
        progress_cb(75, "Analyse du média…")

        metadata = {k: v for k, v in (job.metadata or {}).items() if v}
        info = job.info.get("original_info") or job.info or {}
        base_name = metadata.get("title") or info.get("title") or f"audio-{job.id}"
        base_name = sanitize_filename(base_name)
        final_path = _unique_path(output_dir / f"{base_name}.mp3")

        source_ext = downloaded.suffix.lower()
        if source_ext == ".mp3":
            progress_cb(85, "Vérification du MP3…")
            shutil.copy2(downloaded, final_path)
        else:
            progress_cb(85, "Conversion en MP3…")
            _convert_to_mp3(downloaded, final_path, bitrate)

        progress_cb(95, "Application des métadonnées…")
        _apply_metadata(final_path, info, metadata)

        progress_cb(100, "Terminé")
        return final_path
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)


def _unique_path(path: Path) -> Path:
    candidate = path
    counter = 1
    while candidate.exists():
        candidate = path.with_name(f"{path.stem}-{counter}{path.suffix}")
        counter += 1
    return candidate


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=6), reraise=True)
def _download_audio(url: str, temp_dir: Path, progress_cb: ProgressCallback) -> Path:
    downloaded_path: Optional[Path] = None

    def _hook(status: Dict[str, Optional[str]]) -> None:
        nonlocal downloaded_path
        if status.get("status") == "downloading":
            total = status.get("total_bytes") or status.get("total_bytes_estimate") or 0
            downloaded = status.get("downloaded_bytes") or 0
            if total:
                ratio = min(1.0, max(0.0, downloaded / total))
                progress_cb(int(ratio * 70), "Téléchargement en cours…")
        elif status.get("status") == "finished":
            filename = status.get("filename")
            if filename:
                downloaded_path = Path(filename)
            progress_cb(70, "Téléchargement terminé")

    opts = {
        "format": "bestaudio/best",
        "outtmpl": str(temp_dir / "%(id)s.%(ext)s"),
        "noplaylist": True,
        "progress_hooks": [_hook],
        "socket_timeout": 15,
        "quiet": True,
        "no_warnings": True,
        "retries": 3,
    }

    with YoutubeDL(opts) as ydl:
        info = ydl.extract_info(url, download=True)
        if not downloaded_path:
            filename = info.get("_filename")
            if filename:
                downloaded_path = Path(filename)
    if not downloaded_path:
        raise RuntimeError("Téléchargement impossible")
    return downloaded_path


def _convert_to_mp3(source: Path, target: Path, bitrate: int) -> None:
    audio_stream = ffmpeg.input(str(source)).audio.filter("aresample", resampler="soxr", ar=44100)
    stream = ffmpeg.output(
        audio_stream,
        str(target),
        format="mp3",
        acodec="libmp3lame",
        audio_bitrate=f"{bitrate}k",
        ar=44100,
        ac=2,
    )
    stream = ffmpeg.overwrite_output(stream)
    ffmpeg.run(stream, quiet=True)


def _apply_metadata(path: Path, info: Dict[str, Optional[str]], overrides: Dict[str, Optional[str]]) -> None:
    tags: Dict[str, str] = {}
    if overrides.get("title"):
        tags["title"] = overrides["title"].strip()
    elif info.get("title"):
        tags["title"] = str(info["title"]).strip()
    if overrides.get("artist"):
        tags["artist"] = overrides["artist"].strip()
    elif info.get("uploader"):
        tags["artist"] = str(info["uploader"]).strip()
    if overrides.get("album"):
        tags["album"] = overrides["album"].strip()

    try:
        audio_tags = EasyID3(str(path))
    except ID3NoHeaderError:
        audio_tags = EasyID3()
        audio_tags.save(str(path))
        audio_tags = EasyID3(str(path))

    for key, value in tags.items():
        try:
            audio_tags[key] = value
        except Exception:
            continue
    audio_tags.save(str(path))


__all__ = [
    "ALLOWED_BITRATES",
    "BLACKLISTED_DOMAINS",
    "UnsupportedMediaError",
    "download_job",
    "probe_media",
    "sanitize_filename",
    "validate_url",
]
