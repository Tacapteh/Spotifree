from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Dict, Optional

from fastapi import BackgroundTasks, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel

from . import audio_pipeline
from .db import AUDIO_DIR, create_audio_job, get_audio_job

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://spotifree-tan.vercel.app", "http://localhost:5173"],
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)

DATA_DIR = Path(os.getenv("DATA_DIR", str(AUDIO_DIR))).resolve()
DATA_DIR.mkdir(parents=True, exist_ok=True)


class JobRequest(BaseModel):
    url: str
    bitrate: Optional[int] = None


@app.get("/health")
async def health_root() -> dict[str, bool]:
    return {"ok": True}


@app.get("/api/health")
async def health() -> dict[str, bool]:
    return {"ok": True}


@app.post("/api/jobs")
async def create_job(payload: JobRequest, background_tasks: BackgroundTasks) -> Dict[str, str]:
    source_url = payload.url.strip()
    if not source_url:
        raise HTTPException(status_code=400, detail="URL is required")

    job_id = create_audio_job(source_url)
    background_tasks.add_task(audio_pipeline.process_audio_job, job_id)
    return {"job_id": job_id}


@app.get("/api/jobs/{job_id}")
async def job_status(job_id: str) -> Dict[str, Any]:
    job = get_audio_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    download_ready = bool(job.get("filepath_mp3"))

    return {
        "job_id": job_id,
        "status": job.get("status"),
        "progress": job.get("progress"),
        "message": job.get("message"),
        "title": job.get("title"),
        "duration_s": job.get("duration_s"),
        "created_at": job.get("created_at").isoformat() if job.get("created_at") else None,
        "download_url": f"/api/download/{job_id}" if download_ready else None,
    }


@app.get("/api/download/{job_id}")
async def download(job_id: str):
    file_path = (DATA_DIR / f"{job_id}.mp3").resolve()

    if not file_path.is_file():
        job = get_audio_job(job_id)
        alt_path = Path(job.get("filepath_mp3")) if job and job.get("filepath_mp3") else None
        if alt_path and alt_path.is_file():
            file_path = alt_path.resolve()

    if not file_path.is_file():
        return JSONResponse(
            status_code=404,
            content={"error": {"code": "NOT_FOUND", "message": "Fichier introuvable"}},
        )

    return FileResponse(
        path=file_path,
        media_type="audio/mpeg",
        filename=file_path.name,
        headers={"Cache-Control": "no-store"},
    )
