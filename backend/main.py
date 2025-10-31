from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Dict, Optional

from fastapi import Body, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, ValidationError

from .config import CORS_ORIGINS
from . import downloader, jobs

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


class JobRequest(BaseModel):
    url: str
    bitrate: Optional[int] = 192
    title: Optional[str] = None
    artist: Optional[str] = None
    album: Optional[str] = None


jobs.configure(downloader.download_job)


@app.get("/api/health")
async def api_health() -> Dict[str, bool]:
    return {"ok": True}


@app.get("/api/jobs/{job_id}")
async def job_status(job_id: str) -> Dict[str, Any]:
    job = jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Job introuvable."}})
    download_url = None
    if job.status == "done" and job.result_path:
        download_url = f"/api/download/{job.id}"
    return {
        "job_id": job.id,
        "status": job.status,
        "progress": job.progress,
        "message": job.message,
        "download_url": download_url,
    }


@app.post("/api/jobs")
async def create_job(request: Request, payload: Dict[str, Any] = Body(...)) -> Dict[str, str]:
    client_ip = request.client.host if request.client else "unknown"
    if jobs.rate_limit_exceeded(client_ip):
        raise HTTPException(
            status_code=429,
            detail={"error": {"code": "RATE_LIMITED", "message": "Trop de requêtes, réessayez plus tard."}},
        )
    if not isinstance(payload, dict):
        raise HTTPException(
            status_code=400,
            detail={"error": {"code": "INVALID_PAYLOAD", "message": "Corps JSON attendu."}},
        )
    try:
        parsed = JobRequest(**(payload or {}))
    except ValidationError as exc:
        raise HTTPException(
            status_code=400,
            detail={"error": {"code": "INVALID_PAYLOAD", "message": exc.errors()}},
        )
    data = parsed.dict()

    try:
        validated_url = downloader.validate_url(data["url"])
    except (KeyError, ValueError) as exc:
        raise HTTPException(status_code=400, detail={"error": {"code": "INVALID_URL", "message": str(exc)}})

    bitrate = data.get("bitrate") or 192
    if bitrate not in downloader.ALLOWED_BITRATES:
        raise HTTPException(
            status_code=400,
            detail={"error": {"code": "INVALID_BITRATE", "message": "Bitrate non supporté."}},
        )

    try:
        info = downloader.probe_media(validated_url)
    except downloader.UnsupportedMediaError:
        raise HTTPException(
            status_code=400,
            detail={
                "error": {
                    "code": "UNSUPPORTED_URL",
                    "message": "URL non supportée (DRM/protégée ou en direct).",
                }
            },
        )

    job_id = uuid.uuid4().hex
    metadata = {key: value for key, value in data.items() if key in {"title", "artist", "album"} and value}
    job = jobs.Job(
        id=job_id,
        url=validated_url,
        created_at=datetime.utcnow(),
        bitrate=bitrate,
        metadata=metadata,
        info=info,
    )
    jobs.submit(job)
    return {"job_id": job_id}


@app.get("/api/download/{job_id}")
async def download(job_id: str) -> FileResponse:
    job = jobs.get(job_id)
    if not job or not job.result_path or not job.result_path.exists():
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_READY", "message": "Fichier indisponible."}})
    response = FileResponse(
        job.result_path,
        media_type="audio/mpeg",
        filename=job.result_path.name,
    )
    response.headers["Cache-Control"] = "no-store"
    return response


