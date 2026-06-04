"""yt-dlp processing pipeline used by background tasks.

This module drives the bundled ``yt-dlp`` integration. It can download the best
available audio and convert it to MP3, or download a merged MP4 video, while
persisting progress updates to SQLite for the UI.
"""

from __future__ import annotations

import math
import mimetypes
import os
import random
import subprocess
import tempfile
import time
from pathlib import Path
from typing import Any, Dict

import yt_dlp

from .db import AUDIO_DIR, get_audio_job, update_audio_job

SUPPORTED_OUTPUT_FORMATS = {"mp3", "mp4"}
SUPPORTED_BITRATES = {128, 192, 256, 320}


def normalize_output_format(value: Any) -> str:
    """Return a safe output format accepted by the downloader."""

    normalized = str(value or "mp3").strip().lower()
    if normalized not in SUPPORTED_OUTPUT_FORMATS:
        raise ValueError("Format de sortie non supporté. Choisissez mp3 ou mp4.")
    return normalized


def normalize_bitrate(value: Any) -> int:
    """Return a safe audio bitrate in kbps."""

    try:
        bitrate = int(value or 192)
    except (TypeError, ValueError) as exc:
        raise ValueError("Bitrate invalide.") from exc
    if bitrate not in SUPPORTED_BITRATES:
        raise ValueError("Bitrate non supporté. Choisissez 128, 192, 256 ou 320 kbps.")
    return bitrate


def ytdlp_runtime_info() -> Dict[str, Any]:
    """Expose runtime details used by the frontend status panel."""

    return {
        "name": "yt-dlp",
        "project_url": "https://github.com/yt-dlp/yt-dlp",
        "version": getattr(yt_dlp.version, "__version__", "unknown"),
        "output_formats": sorted(SUPPORTED_OUTPUT_FORMATS),
        "audio_bitrates": sorted(SUPPORTED_BITRATES),
    }


def media_type_for_path(path: Path) -> str:
    """Return the HTTP media type for a generated file."""

    if path.suffix.lower() == ".mp3":
        return "audio/mpeg"
    if path.suffix.lower() == ".mp4":
        return "video/mp4"
    return mimetypes.guess_type(path.name)[0] or "application/octet-stream"


def process_audio_job(audio_id: str) -> None:
    """Download and convert a yt-dlp job to the requested output format."""

    try:
        job = get_audio_job(audio_id)
        if not job:
            return

        source_url = job["source_url"]
        output_format = normalize_output_format(job.get("output_format"))
        bitrate = normalize_bitrate(job.get("bitrate"))

        update_audio_job(audio_id, status="downloading", progress=0, message="Initialisation de yt-dlp…")

        import imageio_ffmpeg

        ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()

        def progress_hook(d: dict) -> None:
            if d.get("status") == "downloading":
                total = d.get("total_bytes") or d.get("total_bytes_estimate")
                if total:
                    pct = math.ceil(d.get("downloaded_bytes", 0) * 80 / total)
                    update_audio_job(
                        audio_id,
                        status="downloading",
                        progress=max(1, min(80, pct)),
                        message="Téléchargement avec yt-dlp…",
                    )
            elif d.get("status") == "finished":
                update_audio_job(audio_id, status="converting", progress=85, message="Téléchargement terminé.")

        ydl_opts = _base_ytdlp_options(ffmpeg_exe, progress_hook)

        with tempfile.TemporaryDirectory() as tmpdir:
            tmp_path = Path(tmpdir)
            if output_format == "mp4":
                output_file, info = _download_mp4(source_url, audio_id, tmp_path, ydl_opts)
            else:
                output_file, info = _download_mp3(source_url, audio_id, bitrate, tmp_path, ydl_opts, ffmpeg_exe)

        update_audio_job(
            audio_id,
            status="done",
            progress=100,
            message="Terminé",
            title=info.get("title"),
            duration_s=info.get("duration"),
            filepath_mp3=str(output_file),
        )
    except Exception as exc:  # pragma: no cover - safety net
        update_audio_job(audio_id, status="error", message=str(exc))


def _base_ytdlp_options(ffmpeg_exe: str, progress_hook) -> Dict[str, Any]:
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36"
        ),
        "Referer": "https://www.youtube.com/",
        "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
    }
    options: Dict[str, Any] = {
        "noplaylist": True,
        "quiet": True,
        "no_warnings": True,
        "retries": 20,
        "fragment_retries": 20,
        "concurrent_fragment_downloads": 1,
        "socket_timeout": 30,
        "prefer_free_formats": True,
        "geo_bypass": True,
        "http_headers": headers,
        "extractor_args": {"youtube": {"player_client": ["android", "web"]}},
        "ffmpeg_location": ffmpeg_exe,
        "progress_hooks": [progress_hook],
    }

    cookiefile = os.getenv("COOKIES_TXT")
    if cookiefile and Path(cookiefile).is_file():
        options["cookiefile"] = cookiefile

    return options


def _download_mp3(
    source_url: str,
    audio_id: str,
    bitrate: int,
    tmp_path: Path,
    ydl_opts: Dict[str, Any],
    ffmpeg_exe: str,
) -> tuple[Path, Dict[str, Any]]:
    ydl_opts = {
        **ydl_opts,
        "format": "bestaudio/best",
        "outtmpl": str(tmp_path / "source.%(ext)s"),
    }

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(source_url, download=True)

    update_audio_job(
        audio_id,
        title=info.get("title"),
        duration_s=info.get("duration"),
        status="converting",
        progress=90,
        message="Conversion MP3 avec ffmpeg…",
    )

    time.sleep(random.uniform(0.2, 0.6))
    downloaded = list(tmp_path.glob("source.*"))
    if not downloaded:
        raise RuntimeError("Téléchargement échoué : aucun fichier source généré.")

    output_file = AUDIO_DIR / f"{audio_id}.mp3"
    ff_cmd = [
        ffmpeg_exe,
        "-y",
        "-i",
        str(downloaded[0]),
        "-vn",
        "-ar",
        "44100",
        "-ac",
        "2",
        "-b:a",
        f"{bitrate}k",
    ]
    if info.get("title"):
        ff_cmd += ["-metadata", f"title={info['title']}"]
    ff_cmd.append(str(output_file))
    subprocess.run(ff_cmd, check=True)
    return output_file, info


def _download_mp4(
    source_url: str,
    audio_id: str,
    tmp_path: Path,
    ydl_opts: Dict[str, Any],
) -> tuple[Path, Dict[str, Any]]:
    output_file = AUDIO_DIR / f"{audio_id}.mp4"
    ydl_opts = {
        **ydl_opts,
        "format": "bv*[height<=1080]+ba/b[height<=1080]/best",
        "merge_output_format": "mp4",
        "outtmpl": str(tmp_path / "source.%(ext)s"),
        "postprocessor_hooks": [
            lambda _: update_audio_job(
                audio_id,
                status="converting",
                progress=92,
                message="Fusion MP4 avec ffmpeg…",
            )
        ],
        "paths": {"home": str(tmp_path)},
    }

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(source_url, download=True)
        downloaded = Path(ydl.prepare_filename(info)).with_suffix(".mp4")

    candidates = [downloaded, *tmp_path.glob("source*.mp4")]
    source_file = next((candidate for candidate in candidates if candidate.is_file()), None)
    if not source_file:
        raise RuntimeError("Téléchargement échoué : aucun fichier MP4 généré.")
    source_file.replace(output_file)
    return output_file, info
