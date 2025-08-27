import asyncio
import logging
import os
import random
import uuid
from datetime import datetime
from pathlib import Path
from typing import List

import yt_dlp
from dotenv import load_dotenv
from fastapi import APIRouter, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

DOWNLOAD_DIR = Path(os.getenv("DOWNLOAD_DIR", "/tmp/music_downloads"))
DOWNLOAD_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI()

ALLOWED_ORIGINS = [
    o for o in [os.getenv("FRONTEND_ORIGIN"), "http://localhost:3000"] if o
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
    max_age=86400,
)


@app.get("/health")
def health_root():
    return {"ok": True}


@app.get("/api/health")
def health_api():
    return {"ok": True}


@app.get("/")
def root():
    return {"ok": True, "at": "/"}


api_router = APIRouter(prefix="/api")


class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class StatusCheckCreate(BaseModel):
    client_name: str


class YouTubeInfoRequest(BaseModel):
    url: str


class YouTubeDownloadRequest(BaseModel):
    url: str
    format: str = "mp3"


@api_router.get("/")
async def api_root():
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
    return [StatusCheck(**s) for s in status_checks]


@api_router.post("/youtube/info")
async def youtube_info(input: YouTubeInfoRequest):
    """Return info about a YouTube video with better reliability."""
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
            "(KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
        ),
        "Accept": (
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"  # noqa: E501
        ),
        "Accept-Language": "en-us,en;q=0.5",
        "Accept-Encoding": "gzip,deflate",
        "Accept-Charset": "ISO-8859-1,utf-8;q=0.7,*;q=0.7",
        "Keep-Alive": "300",
        "Connection": "keep-alive",
        "X-YouTube-Client-Name": "1",
        "X-YouTube-Client-Version": "2.20240101.00.00",
    }
    opts = {
        "quiet": True,
        "no_warnings": True,
        "skip_download": True,
        "http_headers": headers,
    }
    try:
        with yt_dlp.YoutubeDL(opts) as ydl:
            info = ydl.extract_info(input.url, download=False)
    except Exception as e:
        logger.error("Info extraction failed: %s", e)
        raise HTTPException(status_code=400, detail="Analyse échouée") from e

    if info.get("availability") not in [None, "public"]:
        raise HTTPException(
            status_code=403,
            detail="Cette vidéo n'est pas disponible publiquement.",
        )

    return {"title": info.get("title"), "duration": info.get("duration")}


@api_router.post("/youtube/download")
async def youtube_download(input: YouTubeDownloadRequest):
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
            "(KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
        ),
        "Accept": (
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"  # noqa: E501
        ),
        "Accept-Language": "en-us,en;q=0.5",
        "Accept-Encoding": "gzip,deflate",
        "Accept-Charset": "ISO-8859-1,utf-8;q=0.7,*;q=0.7",
        "Keep-Alive": "300",
        "Connection": "keep-alive",
        "X-YouTube-Client-Name": "1",
        "X-YouTube-Client-Version": "2.20240101.00.00",
    }
    base_opts = {
        "outtmpl": str(DOWNLOAD_DIR / "%(id)s.%(ext)s"),
        "quiet": True,
        "no_warnings": True,
        "http_headers": headers,
        "geo_bypass": True,
        "geo_bypass_country": "US",
        "age_limit": None,
        "no_check_certificate": True,
        "youtube_include_dash_manifest": False,
        "skip_unavailable_fragments": True,
        "keep_fragments": False,
        "abort_on_unavailable_fragment": False,
    }
    max_attempts = 2
    info = None
    last_error = None
    for attempt in range(max_attempts):
        if attempt == 0:
            format_selector = (
                "bestaudio[ext=m4a]/bestaudio[ext=mp3]/"
                "bestaudio/best[height<=480]"  # noqa: E501
            )
            quality = "192"
        else:
            format_selector = "worst[ext=mp4]/worst"
            quality = "128"
        ydl_opts = {
            **base_opts,
            "format": format_selector,
            "postprocessors": [
                {
                    "key": "FFmpegExtractAudio",
                    "preferredcodec": input.format,
                    "preferredquality": quality,
                }
            ],
        }
        await asyncio.sleep(random.uniform(1, 3))
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(input.url, download=True)
            break
        except Exception as e:
            last_error = e
            logger.error("Download attempt %s failed: %s", attempt + 1, e)
            await asyncio.sleep(random.uniform(3, 7))

    if info is None:
        error_msg = str(last_error)
        if "403" in error_msg or "Forbidden" in error_msg:
            detail = "YouTube a temporairement bloqué cette requête..."
        elif "404" in error_msg or "not available" in error_msg:
            detail = "Cette vidéo n'est pas disponible ou a été supprimée."
        elif "private" in error_msg.lower():
            detail = "Cette vidéo est privée..."
        elif "copyright" in error_msg.lower():
            detail = "Cette vidéo est protégée par des droits d'auteur..."
        else:
            detail = "Échec du téléchargement"
        raise HTTPException(status_code=400, detail=detail) from last_error

    if info.get("availability") not in [None, "public"]:
        raise HTTPException(
            status_code=403,
            detail="Cette vidéo n'est pas disponible publiquement.",
        )

    file_path = DOWNLOAD_DIR / f"{info['id']}.{input.format}"
    if not file_path.exists():
        raise HTTPException(
            status_code=500,
            detail="Fichier introuvable après le téléchargement",
        )
    filename = f"{info.get('title', 'video')}.{input.format}"
    return FileResponse(
        file_path, filename=filename, media_type="application/octet-stream"
    )


app.include_router(api_router)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
