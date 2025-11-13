from __future__ import annotations

from typing import Any, Dict, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, validator

from . import budget_store

__all__ = ["create_budget_router"]


class BudgetItemPayload(BaseModel):
    """Schema accepting flexible payloads for budget item creation."""

    name: Optional[str] = None
    title: Optional[str] = None
    amount: Optional[float] = None
    category: Optional[str] = None
    type: Optional[str] = None
    description: Optional[str] = None
    frequency: Optional[str] = None
    dueDate: Optional[str] = None
    due_date: Optional[str] = None

    class Config:
        extra = "allow"

    @validator("name", "title", pre=True, allow_reuse=True)
    def _strip_names(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        if isinstance(value, str):
            stripped = value.strip()
            return stripped or None
        raise ValueError("Le nom doit être une chaîne de caractères.")

    @validator("amount", pre=True, allow_reuse=True)
    def _parse_amount(cls, value: Any) -> Optional[float]:
        if value is None:
            return None
        if isinstance(value, (int, float)):
            return float(value)
        if isinstance(value, str):
            stripped = value.strip()
            if not stripped:
                return None
            try:
                return float(stripped.replace(",", "."))
            except ValueError as exc:  # pragma: no cover - defensive
                raise ValueError("Le montant doit être un nombre.") from exc
        raise ValueError("Le montant doit être un nombre.")

    def to_payload(self) -> Dict[str, Any]:
        return self.dict(exclude_none=True)


def create_budget_router() -> APIRouter:
    router = APIRouter()

    @router.get("/budget-items")
    @router.get("/budget-items/")
    @router.get("/budget")
    @router.get("/budget/")
    @router.get("/budgets")
    @router.get("/budgets/")
    def list_budget_items() -> Dict[str, Any]:
        return {"items": budget_store.list_items()}

    @router.post("/budget-items", status_code=201)
    @router.post("/budget-items/", status_code=201)
    @router.post("/budget", status_code=201)
    @router.post("/budget/", status_code=201)
    @router.post("/budgets", status_code=201)
    @router.post("/budgets/", status_code=201)
    def create_budget_item(payload: BudgetItemPayload) -> Dict[str, Any]:
        try:
            item = budget_store.create_item(payload.to_payload())
        except budget_store.BudgetStoreError as exc:
            raise HTTPException(status_code=400, detail={"error": str(exc)}) from exc
        return {"item": item}

    return router
