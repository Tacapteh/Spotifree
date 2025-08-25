from fastapi import FastAPI, APIRouter, HTTPException, File, UploadFile
from fastapi.responses import FileResponse, StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime
from youtube_downloader import YouTubeDownloader
import tempfile
import json

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# YouTube Downloader instance
youtube_dl = YouTubeDownloader()

# Define Models
class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class StatusCheckCreate(BaseModel):
    client_name: str

class YouTubeVideoInfo(BaseModel):
    url: str

class YouTubeDownloadRequest(BaseModel):
    url: str
    format: str = "mp3"

class DownloadedTrack(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    artist: str
    duration: int
    file_path: str
    file_size: int
    download_date: datetime = Field(default_factory=datetime.utcnow)
    youtube_url: str

# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "Hello World"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.dict()
    status_obj = StatusCheck(**status_dict)
    _ = await db.status_checks.insert_one(status_obj.dict())
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find().to_list(1000)
    return [StatusCheck(**status_check) for status_check in status_checks]

# YouTube Download Routes
@api_router.post("/youtube/info")
async def get_youtube_info(request: YouTubeVideoInfo):
    """Get YouTube video information without downloading"""
    try:
        info = youtube_dl.get_video_info(request.url)
        return {
            "success": True,
            "data": info
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.post("/youtube/download")
async def download_youtube_audio(request: YouTubeDownloadRequest):
    """Download audio from YouTube and save to database"""
    try:
        # Download the audio
        download_result = youtube_dl.download_audio(request.url, request.format)
        
        # Save to database
        track_data = {
            "title": download_result['title'],
            "artist": download_result['artist'], 
            "duration": download_result['duration'],
            "file_path": download_result['file_path'],
            "file_size": download_result['file_size'],
            "download_date": datetime.utcnow(),
            "youtube_url": request.url,
            "unique_id": download_result['unique_id']
        }
        
        track_obj = DownloadedTrack(**track_data)
        await db.downloaded_tracks.insert_one(track_obj.dict())
        
        return {
            "success": True,
            "message": "Audio downloaded successfully",
            "track": {
                "id": track_obj.id,
                "title": track_obj.title,
                "artist": track_obj.artist,
                "duration": track_obj.duration,
                "file_size": track_obj.file_size
            }
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.get("/youtube/downloads")
async def get_downloaded_tracks():
    """Get list of all downloaded tracks"""
    try:
        tracks = await db.downloaded_tracks.find().to_list(1000)
        return {
            "success": True,
            "tracks": [
                {
                    "id": track.get("id", ""),
                    "title": track.get("title", ""),
                    "artist": track.get("artist", ""),
                    "duration": track.get("duration", 0),
                    "file_size": track.get("file_size", 0),
                    "download_date": track.get("download_date", ""),
                    "youtube_url": track.get("youtube_url", ""),
                    "file_exists": os.path.exists(track.get("file_path", ""))
                }
                for track in tracks
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/youtube/download/{track_id}/stream")
async def stream_downloaded_track(track_id: str):
    """Stream a downloaded track"""
    try:
        # Find track in database
        track = await db.downloaded_tracks.find_one({"id": track_id})
        if not track:
            raise HTTPException(status_code=404, detail="Track not found")
        
        file_path = track.get("file_path")
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="Audio file not found on disk")
        
        # Stream the file
        def iterfile(file_path: str):
            with open(file_path, mode="rb") as file_like:
                yield from file_like
        
        return StreamingResponse(
            iterfile(file_path),
            media_type="audio/mpeg",
            headers={"Content-Disposition": f"inline; filename={track.get('title', 'audio')}.mp3"}
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.delete("/youtube/download/{track_id}")
async def delete_downloaded_track(track_id: str):
    """Delete a downloaded track"""
    try:
        # Find track in database
        track = await db.downloaded_tracks.find_one({"id": track_id})
        if not track:
            raise HTTPException(status_code=404, detail="Track not found")
        
        # Delete file from disk
        file_path = track.get("file_path")
        if file_path and os.path.exists(file_path):
            youtube_dl.cleanup_file(file_path)
        
        # Delete from database
        await db.downloaded_tracks.delete_one({"id": track_id})
        
        return {
            "success": True,
            "message": "Track deleted successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/youtube/formats")
async def get_supported_formats():
    """Get list of supported audio formats"""
    return {
        "formats": youtube_dl.get_supported_formats()
    }

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()