from __future__ import annotations

import json
import os
import threading
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List

__all__ = [
    "BudgetStoreError",
    "create_item",
    "list_items",
]


class BudgetStoreError(ValueError):
    """Raised when a budget item cannot be persisted due to invalid data."""


_storage_path_env = os.getenv("BUDGET_STORAGE_PATH")
if _storage_path_env:
    _STORAGE_PATH = Path(_storage_path_env).expanduser()
else:
    base_dir_env = os.getenv("BUDGET_STORAGE_DIR") or os.getenv("DATA_DIR")
    base_dir = Path(base_dir_env).expanduser() if base_dir_env else Path(".")
    file_name = os.getenv("BUDGET_STORAGE_FILE", "budget_items.json")
    _STORAGE_PATH = base_dir / file_name

_STORAGE_PATH = _STORAGE_PATH.resolve()
_LOCK = threading.Lock()


def _ensure_storage() -> None:
    _STORAGE_PATH.parent.mkdir(parents=True, exist_ok=True)
    if not _STORAGE_PATH.exists():
        _STORAGE_PATH.write_text("[]", encoding="utf-8")


def _read_items() -> List[Dict[str, Any]]:
    _ensure_storage()
    try:
        with _STORAGE_PATH.open("r", encoding="utf-8") as fh:
            data = json.load(fh)
    except (OSError, json.JSONDecodeError):
        return []
    if not isinstance(data, list):
        return []
    return [entry for entry in data if isinstance(entry, dict)]


def _write_items(items: List[Dict[str, Any]]) -> None:
    _ensure_storage()
    temp_path = _STORAGE_PATH.with_name(_STORAGE_PATH.name + ".tmp")
    with temp_path.open("w", encoding="utf-8") as fh:
        json.dump(items, fh, ensure_ascii=False, indent=2)
    temp_path.replace(_STORAGE_PATH)


def list_items() -> List[Dict[str, Any]]:
    """Return a copy of all stored budget items."""
    with _LOCK:
        return [dict(item) for item in _read_items()]


def create_item(data: Dict[str, Any]) -> Dict[str, Any]:
    """Validate and persist a budget item, returning the stored representation."""
    if not isinstance(data, dict):  # pragma: no cover - defensive guard
        raise BudgetStoreError("Le corps de la requête doit être un objet JSON.")

    item: Dict[str, Any] = dict(data)

    raw_name = item.get("name") or item.get("title")
    if not isinstance(raw_name, str) or not raw_name.strip():
        raise BudgetStoreError("Le nom du poste de budget est requis.")
    item["name"] = raw_name.strip()
    if "title" in item and isinstance(item["title"], str):
        title = item["title"].strip()
        if title and title != item["name"]:
            item["title"] = title
        else:
            item.pop("title", None)

    raw_amount = item.get("amount")
    if raw_amount is None or raw_amount == "":
        amount_value = 0.0
    else:
        try:
            amount_value = float(raw_amount)
        except (TypeError, ValueError) as exc:
            raise BudgetStoreError("Le montant fourni est invalide.") from exc
    item["amount"] = amount_value

    created_at = item.pop("created_at", None)
    if "createdAt" in item and isinstance(item["createdAt"], datetime):
        item["createdAt"] = item["createdAt"].isoformat()
    elif isinstance(created_at, str) and created_at:
        item["createdAt"] = created_at
    else:
        item.setdefault("createdAt", datetime.utcnow().isoformat())

    item.setdefault("category", item.get("category") or "Général")
    item.setdefault("type", item.get("type") or "expense")
    item.setdefault("id", uuid.uuid4().hex)

    with _LOCK:
        items = _read_items()
        items.append(item)
        _write_items(items)

    return dict(item)
