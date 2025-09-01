"""Audio processing pipeline used by background tasks.

This module downloads the best available audio stream from a video URL using
``yt-dlp`` and converts it to an MP3 file via ``ffmpeg``. Progress and status
updates are written to the SQLite database so that the API can report real-time
information to clients.
"""

# INSERT START: imports
import glob
import math
import os
import random
import subprocess
import tempfile
import time
from pathlib import Path

import imageio_ffmpeg
import yt_dlp

from .db import AUDIO_DIR, get_audio_job, update_audio_job

# INSERT END: imports

# INSERT START: pipeline

def process_audio_job(audio_id: str) -> None:
    """Download the audio for ``audio_id`` and convert it to MP3.

    Parameters
    ----------
    audio_id: Identifier of the audio job in the database.
    """

    try:
        job = get_audio_job(audio_id)
        if not job:
            return

        source_url = job["source_url"]
        update_audio_job(audio_id, status="downloading", progress=0, message="")

        ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()

        def progress_hook(d: dict) -> None:
            if d.get("status") == "downloading":
                total = d.get("total_bytes") or d.get("total_bytes_estimate")
                if total:
                    pct = math.ceil(d["downloaded_bytes"] * 80 / total)
                    update_audio_job(audio_id, status="downloading", progress=pct)

        headers = {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36"
            ),
            "Referer": "https://www.youtube.com/",
            "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
        }

        ydl_opts = {
            "format": "bestaudio/best",
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
            ydl_opts["cookiefile"] = cookiefile

        with tempfile.TemporaryDirectory() as tmpdir:
            tmp_path = Path(tmpdir)
            ydl_opts["outtmpl"] = str(tmp_path / "source.%(ext)s")

            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(source_url, download=True)

            update_audio_job(
                audio_id,
                title=info.get("title"),
                duration_s=info.get("duration"),
            )

            time.sleep(random.uniform(0.2, 0.6))

            downloaded = list(tmp_path.glob("source.*"))
            if not downloaded:
                raise RuntimeError("Download failed")
            source_file = downloaded[0]

            update_audio_job(audio_id, status="converting", progress=90)
            output_file = AUDIO_DIR / f"{audio_id}.mp3"

            ff_cmd = [
                ffmpeg_exe,
                "-y",
                "-i",
                str(source_file),
                "-vn",
                "-ar",
                "44100",
                "-ac",
                "2",
                "-b:a",
                "192k",
            ]
            if info.get("title"):
                ff_cmd += ["-metadata", f"title={info['title']}"]
            ff_cmd.append(str(output_file))

            subprocess.run(ff_cmd, check=True)

        update_audio_job(
            audio_id,
            status="done",
            progress=100,
            filepath_mp3=str(output_file),
        )
    except Exception as exc:  # pragma: no cover - safety net
        update_audio_job(audio_id, status="error", message=str(exc))

# INSERT END: pipeline

