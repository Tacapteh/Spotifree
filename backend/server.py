import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent))

from fastapi import FastAPI, APIRouter, BackgroundTasks, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel

from app import audio_pipeline
from app.budget_api import create_budget_router
from app.db import AUDIO_DIR, create_audio_job, get_audio_job

import os
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

cors_origins_env = os.getenv("CORS_ORIGINS")
allow_origins = (
    [o.strip() for o in cors_origins_env.split(",") if o.strip()]
    if cors_origins_env
    else []
)
allow_origin_regex = os.getenv(
    "CORS_ORIGIN_REGEX", r"^https://.*\.vercel\.app$"
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_origin_regex=allow_origin_regex,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
    allow_credentials=False,
)

api_router = APIRouter(prefix="/api")
api_router.include_router(create_budget_router())


class SubmitRequest(BaseModel):
    url: str


class JobRequest(BaseModel):
    url: str
    bitrate: int | None = None


@api_router.post("/audio/submit")
@api_router.post("/audio/submit/")
async def submit_audio(req: SubmitRequest, background_tasks: BackgroundTasks):
    audio_id = create_audio_job(req.url)
    background_tasks.add_task(audio_pipeline.process_audio_job, audio_id)
    return {"audio_id": audio_id, "status": "queued"}


@api_router.get("/audio/status/{audio_id}")
@api_router.get("/audio/status/{audio_id}/")
async def audio_status(audio_id: str):
    job = get_audio_job(audio_id)
    if not job:
        raise HTTPException(status_code=404, detail="Audio job not found")
    return {
        "status": job["status"],
        "progress": job["progress"],
        "message": job["message"],
        "title": job["title"],
        "duration_s": job["duration_s"],
        "filepath_mp3": job["filepath_mp3"],
    }


@api_router.get("/audio/download/{audio_id}")
@api_router.get("/audio/download/{audio_id}/")
@api_router.head("/audio/download/{audio_id}")
@api_router.head("/audio/download/{audio_id}/")
async def audio_download(audio_id: str):
    job = get_audio_job(audio_id)
    if not job or not job.get("filepath_mp3"):
        raise HTTPException(status_code=404, detail="File not ready")
    return FileResponse(job["filepath_mp3"], media_type="audio/mpeg")


# --- Compatibility endpoints used by the frontend ---
DATA_DIR = Path(os.getenv("DATA_DIR", str(AUDIO_DIR))).resolve()
DATA_DIR.mkdir(parents=True, exist_ok=True)


@api_router.post("/jobs")
@api_router.post("/jobs/")
async def create_job(req: JobRequest, background_tasks: BackgroundTasks):
    source_url = req.url.strip()
    if not source_url:
        raise HTTPException(status_code=400, detail="URL is required")

    job_id = create_audio_job(source_url)
    background_tasks.add_task(audio_pipeline.process_audio_job, job_id)
    return {"job_id": job_id}


@api_router.get("/jobs/{job_id}")
@api_router.get("/jobs/{job_id}/")
async def job_status(job_id: str):
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


@api_router.get("/download/{job_id}")
@api_router.get("/download/{job_id}/")
@api_router.head("/download/{job_id}")
@api_router.head("/download/{job_id}/")
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


@app.get("/health")
def health_root():
    return {"ok": True}


@app.get("/api/health")
def health_api():
    return {"ok": True}


app.include_router(api_router)

