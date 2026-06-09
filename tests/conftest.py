import os
from pathlib import Path

import pytest

import app as aquaia


@pytest.fixture()
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("AQUAIA_SEED_DEMO", "false")
    monkeypatch.setenv("GEMINI_API_KEY", "")
    monkeypatch.setenv("AQUAIA_ENABLE_RESET", "false")
    monkeypatch.setenv("TARIFA_M3_ESTIMADA", "71.03")
    monkeypatch.setattr(aquaia, "DB_PATH", tmp_path / "aquaia-test.db")
    monkeypatch.setattr(aquaia, "UPLOAD_DIR", tmp_path / "uploads")
    monkeypatch.setattr(aquaia, "gemini_analysis", lambda *args, **kwargs: None)

    Path(aquaia.UPLOAD_DIR).mkdir(exist_ok=True)
    aquaia.init_db()
    aquaia.app.config.update(TESTING=True)

    with aquaia.app.test_client() as test_client:
        yield test_client


@pytest.fixture(autouse=True)
def stable_env(monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    os.environ.setdefault("FLASK_DEBUG", "false")
