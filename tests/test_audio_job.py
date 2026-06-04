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


def test_ytdlp_options_include_youtube_compatibility_headers():
    from app import audio_pipeline

    opts = audio_pipeline._base_ytdlp_options("ffmpeg", lambda _: None)

    assert opts["extractor_args"]["youtube"]["player_client"] == ["web", "android", "tv_embedded"]
    assert opts["retries"] == 5
    assert opts["fragment_retries"] == 5
    assert opts["sleep_interval_requests"] == 1
    assert "Chrome/149.0.0.0" in opts["http_headers"]["User-Agent"]
    assert "cookiefile" not in opts


def test_ytdlp_fallback_tries_android_then_tv_embedded(monkeypatch):
    from app import audio_pipeline
    from yt_dlp.utils import DownloadError

    seen_clients = []

    class FakeYoutubeDL:
        def __init__(self, opts):
            self.opts = opts

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

        def extract_info(self, url, download):
            clients = self.opts["extractor_args"]["youtube"]["player_client"]
            seen_clients.append(clients)
            if clients != ["tv_embedded"]:
                raise DownloadError("ERROR: Sign in to confirm you’re not a bot")
            return {"title": "ok"}

    monkeypatch.setattr(audio_pipeline.yt_dlp, "YoutubeDL", FakeYoutubeDL)
    monkeypatch.setattr(audio_pipeline, "update_audio_job", lambda *args, **kwargs: None)

    result = audio_pipeline._extract_info_with_youtube_fallback(
        "https://www.youtube.com/watch?v=dummy",
        {"extractor_args": {"youtube": {"player_client": ["web", "android", "tv_embedded"]}}},
        "job-id",
    )

    assert result == {"title": "ok"}
    assert seen_clients == [["web", "android", "tv_embedded"], ["android"], ["tv_embedded"]]
