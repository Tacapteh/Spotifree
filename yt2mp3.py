import os
import sys
import re
import tempfile
import shutil
from pathlib import Path

import yt_dlp
import ffmpeg
import mutagen
from mutagen.id3 import ID3, TIT2, TPE1, TALB
from mutagen.mp3 import MP3


def sanitize_title(title):
    sanitized = re.sub(r"[\\/:*?\"<>|]", "_", title)
    sanitized = re.sub(r"\s+", " ", sanitized).strip()
    return sanitized or "audio"


def ensure_unique_path(path):
    path_obj = Path(path)
    base = path_obj.stem
    directory = path_obj.parent
    counter = 1
    candidate = path_obj
    while candidate.exists():
        candidate = directory / f"{base} ({counter}).mp3"
        counter += 1
    return candidate


def extract_downloaded_audio(info, temp_dir):
    requested = info.get("requested_downloads") or []
    for item in requested:
        filepath = item.get("filepath")
        if filepath and os.path.exists(filepath):
            return filepath
    if "_filename" in info and os.path.exists(info["_filename"]):
        return info["_filename"]
    for root, _dirs, files in os.walk(temp_dir):
        for name in files:
            if os.path.splitext(name)[1].lower() in {".mp3", ".m4a", ".opus", ".webm", ".ogg", ".wav", ".flac", ".aac"}:
                return os.path.join(root, name)
    return None


def add_metadata(target_file, title, artist, album):
    if mutagen.File(target_file) is None:
        raise RuntimeError("Impossible de lire le fichier audio pour appliquer les métadonnées.")
    audio = MP3(target_file, ID3=ID3)
    if audio.tags is None:
        audio.add_tags()
    audio.tags.delall("TIT2")
    audio.tags.delall("TPE1")
    audio.tags.delall("TALB")
    audio.tags.add(TIT2(encoding=3, text=title))
    audio.tags.add(TPE1(encoding=3, text=artist))
    if album:
        audio.tags.add(TALB(encoding=3, text=album))
    audio.save()


def download_and_convert(url):
    output_dir = Path(os.path.dirname(os.path.abspath(__file__))) / "output"
    output_dir.mkdir(exist_ok=True)
    print("Téléchargement en cours…")
    with tempfile.TemporaryDirectory() as temp_dir:
        ydl_opts = {
            "format": "bestaudio/best",
            "outtmpl": os.path.join(temp_dir, "%(title)s.%(ext)s"),
            "noplaylist": True,
            "quiet": True,
            "no_warnings": True,
        }
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=True)
        except Exception as exc:
            raise RuntimeError(f"Erreur lors du téléchargement : {exc}")
        if not info:
            raise RuntimeError("Impossible de récupérer les informations de la ressource.")
        audio_path = extract_downloaded_audio(info, temp_dir)
        if not audio_path or not os.path.exists(audio_path):
            raise RuntimeError("Aucune piste audio n'a été téléchargée.")
        print("Extraction des métadonnées…")
        title = info.get("title") or "audio"
        artist = info.get("artist") or info.get("uploader") or "Inconnu"
        album = info.get("album") or ""
        safe_title = sanitize_title(title)
        output_path = ensure_unique_path(output_dir / f"{safe_title}.mp3")
        source_ext = os.path.splitext(audio_path)[1].lower()
        if source_ext == ".mp3":
            print("Conversion en MP3…")
            shutil.copy2(audio_path, output_path)
        else:
            print("Conversion en MP3…")
            try:
                stream = ffmpeg.input(audio_path)
                stream = ffmpeg.output(
                    stream,
                    str(output_path),
                    audio_bitrate="320k",
                    ac=2,
                    ar=44100,
                    audio_codec="libmp3lame",
                )
                ffmpeg.run(stream, overwrite_output=True, capture_stdout=True, capture_stderr=True)
            except ffmpeg.Error as exc:
                message = exc.stderr.decode("utf-8", errors="ignore") if isinstance(exc.stderr, bytes) else str(exc)
                raise RuntimeError(f"Erreur de conversion : {message}")
        add_metadata(str(output_path), title, artist, album)
    print(f"Conversion terminée : {output_path.name}")


def main():
    if len(sys.argv) < 2:
        print("Usage : python yt2mp3.py \"URL\"")
        sys.exit(1)
    url = sys.argv[1]
    try:
        download_and_convert(url)
    except Exception as exc:
        print(f"Erreur : {exc}")
        sys.exit(1)


if __name__ == "__main__":
    main()
