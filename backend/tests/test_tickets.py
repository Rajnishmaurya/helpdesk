import pytest
from fastapi.testclient import TestClient

from test_app import app
from app.db import get_db
from test_setup import override_get_db


# Use the separate SQLite testing database
app.dependency_overrides[get_db] = override_get_db


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


# Helper: create a requester before creating a ticket
def create_requester(client):
    response = client.post(
        "/api/requesters/",
        json={
            "display_name": "Test User",
            "email": "testuser@example.com",
            "department": "IT"
        }
    )
    assert response.status_code == 201
    return response.json()["id"]


# Helper: create a ticket
def create_ticket(client):
    requester_id = create_requester(client)

    response = client.post(
        "/api/tickets/",
        json={
            "requester_id": requester_id,
            "title": "Laptop not working",
            "description": "My laptop is not starting properly.",
            "category": "Hardware"
        }
    )

    assert response.status_code == 201
    return response.json()


# --------------------------------------------------
# 1. CREATE TICKET
# --------------------------------------------------

def test_create_ticket(client):
    ticket = create_ticket(client)

    assert ticket["title"] == "Laptop not working"
    assert ticket["status"] == "New"
    assert ticket["category"] == "Hardware"


def test_create_ticket_invalid_requester(client):
    response = client.post(
        "/api/tickets/",
        json={
            "requester_id": 9999,
            "title": "Laptop not working",
            "description": "My laptop is not starting properly.",
            "category": "Hardware"
        }
    )

    assert response.status_code == 404


def test_create_ticket_invalid_category(client):
    requester_id = create_requester(client)

    response = client.post(
        "/api/tickets/",
        json={
            "requester_id": requester_id,
            "title": "Laptop not working",
            "description": "My laptop is not starting properly.",
            "category": "Invalid"
        }
    )

    assert response.status_code == 400


def test_create_ticket_short_title(client):
    requester_id = create_requester(client)

    response = client.post(
        "/api/tickets/",
        json={
            "requester_id": requester_id,
            "title": "PC",
            "description": "My laptop is not starting properly.",
            "category": "Hardware"
        }
    )

    assert response.status_code == 422


def test_create_ticket_activity(client):
    ticket = create_ticket(client)

    response = client.get(
        f"/api/tickets/{ticket['id']}/history"
    )

    assert response.status_code == 200
    assert response.json()[0]["action_type"] == "created"


# --------------------------------------------------
# 2. GET ALL TICKETS AND FILTER
# --------------------------------------------------

def test_get_all_tickets(client):
    create_ticket(client)

    response = client.get("/api/tickets/")

    assert response.status_code == 200
    assert len(response.json()) >= 1


def test_filter_tickets_by_status(client):
    create_ticket(client)

    response = client.get(
        "/api/tickets/",
        params={"status": "New"}
    )

    assert response.status_code == 200

    for ticket in response.json():
        assert ticket["status"] == "New"


def test_filter_tickets_by_category(client):
    create_ticket(client)

    response = client.get(
        "/api/tickets/",
        params={"category": "Hardware"}
    )

    assert response.status_code == 200

    for ticket in response.json():
        assert ticket["category"] == "Hardware"


def test_filter_tickets_by_requester(client):
    requester_id = create_requester(client)

    client.post(
        "/api/tickets/",
        json={
            "requester_id": requester_id,
            "title": "Network issue",
            "description": "Unable to connect to office network.",
            "category": "Network"
        }
    )

    response = client.get(
        "/api/tickets/",
        params={"requester_id": requester_id}
    )

    assert response.status_code == 200

    for ticket in response.json():
        assert ticket["requester_id"] == requester_id


# --------------------------------------------------
# 3. GET TICKET BY ID
# --------------------------------------------------

def test_get_ticket_by_id(client):
    ticket = create_ticket(client)

    response = client.get(
        f"/api/tickets/{ticket['id']}"
    )

    assert response.status_code == 200
    assert response.json()["id"] == ticket["id"]


def test_get_nonexistent_ticket(client):
    response = client.get("/api/tickets/9999")

    assert response.status_code == 404


# --------------------------------------------------
# 4. UPDATE TICKET
# --------------------------------------------------

def test_update_ticket_title(client):
    ticket = create_ticket(client)

    response = client.patch(
        f"/api/tickets/{ticket['id']}",
        json={"title": "Laptop screen issue"}
    )

    assert response.status_code == 200
    assert response.json()["title"] == "Laptop screen issue"


def test_update_ticket_category(client):
    ticket = create_ticket(client)

    response = client.patch(
        f"/api/tickets/{ticket['id']}",
        json={"category": "Software"}
    )

    assert response.status_code == 200
    assert response.json()["category"] == "Software"


def test_update_ticket_invalid_category(client):
    ticket = create_ticket(client)

    response = client.patch(
        f"/api/tickets/{ticket['id']}",
        json={"category": "Invalid"}
    )

    assert response.status_code == 400


def test_update_nonexistent_ticket(client):
    response = client.patch(
        "/api/tickets/9999",
        json={"title": "Updated title"}
    )

    assert response.status_code == 404


# --------------------------------------------------
# 5. TICKET HISTORY
# --------------------------------------------------

def test_ticket_history(client):
    ticket = create_ticket(client)

    client.patch(
        f"/api/tickets/{ticket['id']}",
        json={"title": "Updated laptop issue"}
    )

    response = client.get(
        f"/api/tickets/{ticket['id']}/history"
    )

    assert response.status_code == 200

    actions = [item["action_type"] for item in response.json()]

    assert "created" in actions
    assert "field_update" in actions


def test_history_for_nonexistent_ticket(client):
    response = client.get(
        "/api/tickets/9999/history"
    )

    assert response.status_code == 404


# --------------------------------------------------
# 6. WORKFLOW ENDPOINTS (PERSON B INTEGRATION)
# --------------------------------------------------

def test_valid_status_transition(client):
    ticket = create_ticket(client)

    response = client.patch(
        f"/api/tickets/{ticket['id']}/status",
        json={
            "status": "In Progress",
            "note": "Work started"
        }
    )

    assert response.status_code == 200
    assert response.json()["status"] == "In Progress"


def test_invalid_status_transition(client):
    ticket = create_ticket(client)

    response = client.patch(
        f"/api/tickets/{ticket['id']}/status",
        json={
            "status": "Resolved",
            "note": "Trying invalid transition"
        }
    )

    assert response.status_code == 409


def test_same_status_transition(client):
    ticket = create_ticket(client)

    response = client.patch(
        f"/api/tickets/{ticket['id']}/status",
        json={
            "status": "New",
            "note": "No change"
        }
    )

    assert response.status_code == 409


def test_priority_update(client):
    ticket = create_ticket(client)

    response = client.patch(
        f"/api/tickets/{ticket['id']}/priority",
        json={"priority": "High"}
    )

    assert response.status_code == 200
    assert response.json()["priority"] == "High"


def test_add_ticket_comment(client):
    ticket = create_ticket(client)

    response = client.post(
        f"/api/tickets/{ticket['id']}/comments",
        json={
            "note": "We are checking the issue.",
            "actor": "Support"
        }
    )

    assert response.status_code == 201
    assert response.json()["action_type"] == "comment"
