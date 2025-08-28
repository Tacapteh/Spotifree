# INSERT START: imports
import glob
import subprocess
import tempfile
from pathlib import Path
from typing import Optional

from .db import AUDIO_DIR, get_audio_job, update_audio_job

# INSERT END: imports

# INSERT START: pipeline

def process_audio_job(db_module, audio_id: str) -> None:
    try:
        job = get_audio_job(audio_id)
        if not job:
            return
        update_audio_job(audio_id, status="running", progress=5)
        source_url = job["source_url"]
        with tempfile.TemporaryDirectory() as tmpdir:
            tmp = Path(tmpdir)
            source_tmpl = tmp / "source.%(ext)s"
            dl_cmd = [
                "yt-dlp",
                "-f",
                "bestaudio/best",
                "-o",
                str(source_tmpl),
                source_url,
            ]
            subprocess.run(dl_cmd, check=True)
            downloaded = glob.glob(str(tmp / "source.*"))
            if not downloaded:
                raise RuntimeError("Download failed")
            source_file = Path(downloaded[0])
            output_file = AUDIO_DIR / f"{audio_id}.mp3"
            ff_cmd = [
                "ffmpeg",
                "-y",
                "-i",
                str(source_file),
                "-vn",
                "-ac",
                "2",
                "-ar",
                "44100",
                "-b:a",
                "192k",
                str(output_file),
            ]
            subprocess.run(ff_cmd, check=True)
        update_audio_job(
            audio_id,
            status="done",
            progress=100,
            filepath_mp3=str(output_file),
        )
    except Exception as exc:  # pragma: no cover
        update_audio_job(audio_id, status="error", message=str(exc))

# INSERT END: pipeline

