from __future__ import annotations

import os
from pathlib import Path
from typing import List

# Application configuration loaded from environment variables with sane defaults.

PORT: int = int(os.getenv("PORT", "8000"))

DATA_DIR: Path = Path(os.getenv("DATA_DIR", "/data/output")).resolve()
DATA_DIR.mkdir(parents=True, exist_ok=True)

CONCURRENCY: int = max(1, int(os.getenv("CONCURRENCY", "2")))

RATE_LIMIT_WINDOW: int = int(os.getenv("RATE_LIMIT_WINDOW", str(10 * 60)))
RATE_LIMIT_MAX: int = max(1, int(os.getenv("RATE_LIMIT_MAX", "5")))

_default_origins = [
    "https://spotifree-tan.vercel.app",
    "http://localhost:5173",
]

_env_origins = os.getenv("CORS_ORIGINS")
if _env_origins:
    CORS_ORIGINS: List[str] = [origin.strip() for origin in _env_origins.split(",") if origin.strip()]
else:
    CORS_ORIGINS = _default_origins

__all__ = [
    "PORT",
    "DATA_DIR",
    "CONCURRENCY",
    "RATE_LIMIT_WINDOW",
    "RATE_LIMIT_MAX",
    "CORS_ORIGINS",
]
