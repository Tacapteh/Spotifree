# INSERT START: imports
from fastapi import BackgroundTasks, FastAPI, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel

from . import audio_pipeline
from .db import create_audio_job, get_audio_job
# INSERT END: imports

# INSERT START: app
app = FastAPI()
from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# INSERT END: app

# INSERT START: models
class SubmitRequest(BaseModel):
    url: str
# INSERT END: models

# INSERT START: endpoints
@app.post("/audio/submit")
def submit_audio(req: SubmitRequest, background_tasks: BackgroundTasks):
    audio_id = create_audio_job(req.url)
    background_tasks.add_task(audio_pipeline.process_audio_job, audio_id)
    return {"audio_id": audio_id, "status": "queued"}


@app.get("/audio/status/{audio_id}")
def audio_status(audio_id: str):
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


@app.get("/audio/download/{audio_id}")
def audio_download(audio_id: str):
    job = get_audio_job(audio_id)
    if not job or not job.get("filepath_mp3"):
        raise HTTPException(status_code=404, detail="File not ready")
    return FileResponse(job["filepath_mp3"], media_type="audio/mpeg")

# INSERT END: endpoints


@app.get("/health")
def health():
    return {"ok": True}

