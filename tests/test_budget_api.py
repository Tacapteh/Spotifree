import importlib
import sys
from typing import Callable

import pytest


@pytest.fixture
def budget_endpoints(tmp_path, monkeypatch):
    storage_path = tmp_path / "budget.json"
    monkeypatch.setenv("BUDGET_STORAGE_PATH", str(storage_path))
    for module in ["app.budget_store", "app.budget_api"]:
        sys.modules.pop(module, None)
    budget_store = importlib.import_module("app.budget_store")
    importlib.reload(budget_store)
    budget_api = importlib.import_module("app.budget_api")
    importlib.reload(budget_api)
    router = budget_api.create_budget_router()

    def get_endpoint(method: str, path: str) -> Callable:
        for route in router.routes:
            if method in getattr(route, "methods", set()) and route.path == path:
                return route.endpoint
        raise AssertionError(f"Endpoint {method} {path} not found")

    return {
        "create": get_endpoint("POST", "/budget-items"),
        "list": get_endpoint("GET", "/budget-items"),
        "payload_model": budget_api.BudgetItemPayload,
    }


def test_create_budget_item_success(budget_endpoints):
    payload_model = budget_endpoints["payload_model"]
    payload = payload_model(name="Courses", amount="125.50", category="Courses")
    response = budget_endpoints["create"](payload)
    item = response["item"]
    assert item["name"] == "Courses"
    assert pytest.approx(item["amount"], rel=1e-6) == 125.5
    assert item["category"] == "Courses"
    assert "id" in item

    list_response = budget_endpoints["list"]()
    items = list_response["items"]
    assert any(entry["id"] == item["id"] for entry in items)


def test_create_budget_item_requires_name(budget_endpoints):
    payload_model = budget_endpoints["payload_model"]
    payload = payload_model(amount=50)
    with pytest.raises(Exception) as exc_info:
        budget_endpoints["create"](payload)
    assert getattr(exc_info.value, "status_code", 400) == 400
