from __future__ import annotations

import queue
import threading
import time
from collections import deque
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Callable, Deque, Dict, Optional

from .config import CONCURRENCY, DATA_DIR, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW

ProgressCallback = Callable[[int, Optional[str]], None]
Processor = Callable[["Job", ProgressCallback], Path]


@dataclass
class Job:
    id: str
    url: str
    created_at: datetime
    bitrate: int
    status: str = "queued"
    progress: int = 0
    message: str = "En file d'attente"
    result_path: Optional[Path] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    info: Dict[str, Any] = field(default_factory=dict)


_jobs: Dict[str, Job] = {}
_jobs_lock = threading.RLock()
_task_queue: "queue.Queue[str]" = queue.Queue()
_processor: Optional[Processor] = None
_started_workers = False
_executor: Optional[ThreadPoolExecutor] = None

_rate_lock = threading.Lock()
_rate_requests: Dict[str, Deque[float]] = {}

_cleanup_started = False


def configure(processor: Processor) -> None:
    global _processor
    _processor = processor
    _start_workers()
    _start_cleanup()


def _start_workers() -> None:
    global _started_workers, _executor
    if _started_workers:
        return
    _executor = ThreadPoolExecutor(max_workers=CONCURRENCY, thread_name_prefix="job-worker")
    for _ in range(CONCURRENCY):
        _executor.submit(_worker_loop)
    _started_workers = True


def _start_cleanup() -> None:
    global _cleanup_started
    if _cleanup_started:
        return
    cleanup_thread = threading.Thread(target=_cleanup_loop, daemon=True)
    cleanup_thread.start()
    _cleanup_started = True


def submit(job: Job) -> None:
    with _jobs_lock:
        _jobs[job.id] = job
    _task_queue.put(job.id)


def get(job_id: str) -> Optional[Job]:
    with _jobs_lock:
        job = _jobs.get(job_id)
        if not job:
            return None
        return Job(
            id=job.id,
            url=job.url,
            created_at=job.created_at,
            bitrate=job.bitrate,
            status=job.status,
            progress=job.progress,
            message=job.message,
            result_path=job.result_path,
            metadata=dict(job.metadata),
            info=dict(job.info),
        )


def update(job_id: str, *, status: Optional[str] = None, progress: Optional[int] = None,
           message: Optional[str] = None, result_path: Optional[Path] = None) -> None:
    with _jobs_lock:
        job = _jobs.get(job_id)
        if not job:
            return
        if status is not None:
            job.status = status
        if progress is not None:
            job.progress = max(0, min(100, progress))
        if message is not None:
            job.message = message
        if result_path is not None:
            job.result_path = result_path


def rate_limit_exceeded(ip: str) -> bool:
    now = time.time()
    with _rate_lock:
        history = _rate_requests.setdefault(ip, deque())
        while history and now - history[0] > RATE_LIMIT_WINDOW:
            history.popleft()
        if len(history) >= RATE_LIMIT_MAX:
            return True
        history.append(now)
    return False


def _worker_loop() -> None:
    while True:
        job_id = _task_queue.get()
        job = get(job_id)
        if not job:
            _task_queue.task_done()
            continue
        if _processor is None:
            update(job.id, status="error", message="Aucun processeur configuré", progress=0)
            _task_queue.task_done()
            continue
        update(job.id, status="in_progress", progress=0, message="Téléchargement en cours…")

        def _progress_callback(value: int, message: Optional[str] = None) -> None:
            if message is None:
                update(job.id, progress=value)
            else:
                update(job.id, progress=value, message=message)

        try:
            result_path = _processor(job, _progress_callback)
        except Exception as exc:  # pragma: no cover - defensive
            update(job.id, status="error", message=str(exc))
        else:
            update(job.id, status="done", progress=100, message="Terminé", result_path=result_path)
        finally:
            _task_queue.task_done()


def _cleanup_loop() -> None:
    interval = 30 * 60
    while True:
        time.sleep(interval)
        cutoff = datetime.utcnow() - timedelta(hours=24)
        try:
            for path in DATA_DIR.glob("**/*"):
                if path.is_file():
                    mtime = datetime.utcfromtimestamp(path.stat().st_mtime)
                    if mtime < cutoff:
                        try:
                            path.unlink()
                        except OSError:
                            continue
        except Exception:
            continue


__all__ = [
    "Job",
    "configure",
    "submit",
    "get",
    "update",
    "rate_limit_exceeded",
]
