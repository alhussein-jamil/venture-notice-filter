"""Filter public notices by keyword and response deadline."""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path


def load_notices(path: Path) -> list[dict]:
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, list):
        raise ValueError("notice file must be a JSON list")
    return data


def matches(notice: dict, keywords: list[str]) -> bool:
    parts = [str(notice.get("objet", "")), str(notice.get("descripteur_libelle", ""))]
    text = " ".join(parts).lower()
    return all(word.lower() in text for word in keywords)


def still_open(notice: dict, now: datetime) -> bool:
    raw = notice.get("datelimitereponse")
    if not raw:
        return False
    deadline = datetime.fromisoformat(str(raw).replace("Z", "+00:00"))
    if deadline.tzinfo is None:
        deadline = deadline.replace(tzinfo=timezone.utc)
    if now.tzinfo is None:
        now = now.replace(tzinfo=timezone.utc)
    return deadline >= now


def select_notices(notices: list[dict], keywords: list[str], now: datetime) -> list[dict]:
    return [notice for notice in notices if matches(notice, keywords) and still_open(notice, now)]
