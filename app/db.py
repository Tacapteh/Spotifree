from __future__ import annotations

# INSERT START: imports
import os
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Optional
import uuid

# INSERT END: imports

# INSERT START: constants
AUDIO_DIR = Path("public/audio")
AUDIO_DIR.mkdir(parents=True, exist_ok=True)
DB_PATH = Path("audio_jobs.db")
_conn = sqlite3.connect(DB_PATH, check_same_thread=False)
_conn.row_factory = sqlite3.Row
# INSERT END: constants

# INSERT START: model
class Audio:
    def __init__(self, **data: Any) -> None:
        self.id: str = data.get("id", str(uuid.uuid4()))
        self.created_at: datetime = data.get("created_at", datetime.utcnow())
        self.source_url: str = data["source_url"]
        self.status: str = data.get("status", "queued")
        self.progress: int = data.get("progress", 0)
        self.message: str = data.get("message", "")
        self.title: Optional[str] = data.get("title")
        self.duration_s: Optional[float] = data.get("duration_s")
        self.filepath_mp3: Optional[str] = data.get("filepath_mp3")

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "created_at": self.created_at.isoformat(),
            "source_url": self.source_url,
            "status": self.status,
            "progress": self.progress,
            "message": self.message,
            "title": self.title,
            "duration_s": self.duration_s,
            "filepath_mp3": self.filepath_mp3,
        }

# INSERT END: model

# INSERT START: init_db

def init_db() -> None:
    _conn.execute(
        """
        CREATE TABLE IF NOT EXISTS audio (
            id TEXT PRIMARY KEY,
            created_at TEXT,
            source_url TEXT,
            status TEXT,
            progress INTEGER,
            message TEXT,
            title TEXT,
            duration_s REAL,
            filepath_mp3 TEXT
        )
        """
    )
    _conn.commit()

# INSERT END: init_db

# INSERT START: CRUD

def create_audio_job(source_url: str) -> str:
    audio = Audio(source_url=source_url)
    _conn.execute(
        """
        INSERT INTO audio (
            id, created_at, source_url, status, progress, message, title, duration_s, filepath_mp3
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            audio.id,
            audio.created_at.isoformat(),
            audio.source_url,
            audio.status,
            audio.progress,
            audio.message,
            audio.title,
            audio.duration_s,
            audio.filepath_mp3,
        ),
    )
    _conn.commit()
    return audio.id

def update_audio_job(audio_id: str, **fields: Any) -> None:
    if not fields:
        return
    cols = ", ".join(f"{k}=?" for k in fields.keys())
    values = list(fields.values())
    values.append(audio_id)
    _conn.execute(f"UPDATE audio SET {cols} WHERE id=?", values)
    _conn.commit()

def get_audio_job(audio_id: str) -> Optional[Dict[str, Any]]:
    cur = _conn.execute("SELECT * FROM audio WHERE id=?", (audio_id,))
    row = cur.fetchone()
    if row:
        data = dict(row)
        data["created_at"] = datetime.fromisoformat(data["created_at"])
        return data
    return None

# INSERT END: CRUD

# INSERT START: startup
init_db()
# INSERT END: startup

