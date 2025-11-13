import asyncio
import importlib
import sys
import types
from fastapi import BackgroundTasks


def test_submit_audio_without_mongo_env(tmp_path, monkeypatch):
    """Server should start and allow job submission without Mongo env vars."""
    # Remove environment variables and isolate working directory
    monkeypatch.delenv("MONGO_URL", raising=False)
    monkeypatch.delenv("DB_NAME", raising=False)
    monkeypatch.chdir(tmp_path)
    # Ensure modules are reloaded with new environment
    sys.modules.pop("app.db", None)
    sys.modules.pop("backend.server", None)
    monkeypatch.setitem(
        sys.modules,
        "imageio_ffmpeg",
        types.SimpleNamespace(get_ffmpeg_exe=lambda: "ffmpeg"),
    )
    server = importlib.import_module("backend.server")
    importlib.reload(server)

    req = server.SubmitRequest(url="http://example.com")
    result = asyncio.run(server.submit_audio(req, BackgroundTasks()))
    assert result["status"] == "queued"
    assert "audio_id" in result


def test_audio_download_serves_mp3(tmp_path, monkeypatch):
    """Audio download endpoint should serve MP3 with correct media type."""
    monkeypatch.delenv("MONGO_URL", raising=False)
    monkeypatch.delenv("DB_NAME", raising=False)
    monkeypatch.chdir(tmp_path)
    sys.modules.pop("app.db", None)
    sys.modules.pop("backend.server", None)
    monkeypatch.setitem(
        sys.modules,
        "imageio_ffmpeg",
        types.SimpleNamespace(get_ffmpeg_exe=lambda: "ffmpeg"),
    )
    server = importlib.import_module("backend.server")
    importlib.reload(server)
    from app import db as db_module

    dummy_mp3 = tmp_path / "song.mp3"
    dummy_mp3.write_bytes(b"ID3")
    audio_id = server.create_audio_job("http://example.com")
    db_module.update_audio_job(audio_id, filepath_mp3=str(dummy_mp3), status="done")
    response = asyncio.run(server.audio_download(audio_id))
    assert response.media_type == "audio/mpeg"
