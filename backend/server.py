import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent))

from fastapi import FastAPI, APIRouter, BackgroundTasks, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel

from app import audio_pipeline
from app.db import create_audio_job, get_audio_job

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


class SubmitRequest(BaseModel):
    url: str


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
async def audio_download(audio_id: str):
    job = get_audio_job(audio_id)
    if not job or not job.get("filepath_mp3"):
        raise HTTPException(status_code=404, detail="File not ready")
    return FileResponse(job["filepath_mp3"], media_type="audio/mpeg")


@app.get("/health")
def health_root():
    return {"ok": True}


@app.get("/api/health")
def health_api():
    return {"ok": True}


app.include_router(api_router)

