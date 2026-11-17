"""
test_ai_api.py - tests the AI endpoints through the real API (Person C).

test_ai_service.py checks the AI service on its own. These tests check what the
assessment asks for at API level: AI suggestions are saved without changing the
ticket, and when the model is unavailable the API answers clearly and every other
ticket action keeps working.

Uses the `client` fixture from conftest.py (in-memory SQLite test database).
The real model is never called: httpx.post is replaced with a fake.
Run with:  python -m pytest tests/test_ai_api.py -v
"""
import httpx
import pytest

from app.config import settings
from app.services import ai_service

GOOD_REPLY = ('{"category": "Hardware", "priority": "Low", "priority_reason": "Single user, mouse still works.",'
              ' "troubleshooting_steps": ["Replace the batteries", "Re-pair the receiver"]}')


def fake_model(content: str):
    """A stand-in for httpx.post that answers like an OpenAI-compatible server."""
    def _post(*args, **kwargs):
        return httpx.Response(200, json={"choices": [{"message": {"content": content}}]})
    return _post


@pytest.fixture(autouse=True)
def ai_on(monkeypatch):
    # Start every test with AI enabled, whatever the local .env says
    monkeypatch.setattr(settings, "AI_ENABLED", True)


@pytest.fixture()
def ticket(client):
    """Create one requester and one ticket through the API, and return the ticket."""
    requester = client.post("/api/requesters/", json={
        "display_name": "Asha Menon", "email": "asha.menon@example.com", "department": "Finance"}).json()
    response = client.post("/api/tickets/", json={
        "requester_id": requester["id"],
        "title": "Wireless keyboard not typing",
        "description": "My wireless keyboard stopped responding this morning. The mouse still works."})
    assert response.status_code == 201
    return response.json()


def test_analysis_saves_suggestion_without_changing_ticket(client, ticket, monkeypatch):
    monkeypatch.setattr(ai_service.httpx, "post", fake_model(GOOD_REPLY))

    response = client.post(f"/api/tickets/{ticket['id']}/ai-analysis")

    assert response.status_code == 201
    suggestion = response.json()
    assert suggestion["suggested_category"] == "Hardware"
    assert suggestion["suggested_priority"] == "Low"
    assert suggestion["troubleshooting_steps"] == ["Replace the batteries", "Re-pair the receiver"]

    # Human oversight: the ticket's own values are untouched by the AI
    after = client.get(f"/api/tickets/{ticket['id']}").json()
    assert after["status"] == "New"
    assert after["category"] is None
    assert after["priority"] is None


def test_analysis_for_missing_ticket_returns_404(client):
    response = client.post("/api/tickets/9999/ai-analysis")
    assert response.status_code == 404


def test_model_unavailable_returns_503_and_ticket_work_continues(client, ticket, monkeypatch):
    def server_down(*args, **kwargs):
        raise httpx.ConnectError("connection refused")
    monkeypatch.setattr(ai_service.httpx, "post", server_down)

    response = client.post(f"/api/tickets/{ticket['id']}/ai-analysis")

    # Clear, non-destructive error
    assert response.status_code == 503
    assert "continue managing the ticket manually" in response.json()["detail"]
    # Nothing was saved
    assert client.get(f"/api/tickets/{ticket['id']}/ai-suggestions").json() == []
    # Every other ticket action still works (Scenario 04)
    assert client.patch(f"/api/tickets/{ticket['id']}/status", json={"status": "In Progress"}).status_code == 200
    assert client.patch(f"/api/tickets/{ticket['id']}/priority", json={"priority": "Medium"}).status_code == 200
    assert client.get("/api/tickets/").status_code == 200


@pytest.mark.parametrize("fake, expected_code", [
    ("timeout", 504),          # model too slow
    ("not json", 502),         # model answered with plain text
    ("bad category", 502),     # model used a category outside the allowed list
])
def test_other_ai_failures_return_clear_errors(client, ticket, monkeypatch, fake, expected_code):
    if fake == "timeout":
        def slow(*args, **kwargs):
            raise httpx.ReadTimeout("too slow")
        monkeypatch.setattr(ai_service.httpx, "post", slow)
    elif fake == "not json":
        monkeypatch.setattr(ai_service.httpx, "post", fake_model("Sorry, I cannot help with that."))
    else:
        monkeypatch.setattr(ai_service.httpx, "post", fake_model(GOOD_REPLY.replace("Hardware", "Printers")))

    response = client.post(f"/api/tickets/{ticket['id']}/ai-analysis")

    assert response.status_code == expected_code
    assert client.get(f"/api/tickets/{ticket['id']}/ai-suggestions").json() == []   # nothing saved


def test_suggestions_are_listed_newest_first(client, ticket, monkeypatch):
    monkeypatch.setattr(ai_service.httpx, "post", fake_model(GOOD_REPLY))
    first = client.post(f"/api/tickets/{ticket['id']}/ai-analysis").json()
    monkeypatch.setattr(ai_service.httpx, "post", fake_model(GOOD_REPLY.replace('"Low"', '"Medium"')))
    second = client.post(f"/api/tickets/{ticket['id']}/ai-analysis").json()

    response = client.get(f"/api/tickets/{ticket['id']}/ai-suggestions")

    assert response.status_code == 200
    ids = [s["id"] for s in response.json()]
    assert ids == [second["id"], first["id"]]


def test_suggestions_for_missing_ticket_returns_404(client):
    assert client.get("/api/tickets/9999/ai-suggestions").status_code == 404
