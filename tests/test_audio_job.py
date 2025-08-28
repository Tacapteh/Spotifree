import asyncio
import importlib
import sys
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
    server = importlib.import_module("backend.server")
    importlib.reload(server)

    req = server.SubmitRequest(url="http://example.com")
    result = asyncio.run(server.submit_audio(req, BackgroundTasks()))
    assert result["status"] == "queued"
    assert "audio_id" in result
