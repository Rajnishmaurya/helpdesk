
import pytest

from fastapi import HTTPException

from app.services.workflow import validate_status_transition


def test_new_to_in_progress():
    validate_status_transition("New", "In Progress")


def test_in_progress_to_resolved():
    validate_status_transition("In Progress", "Resolved")


def test_resolved_to_in_progress():
    validate_status_transition("Resolved", "In Progress")


def test_new_to_resolved_is_blocked():
    with pytest.raises(HTTPException) as exc:
        validate_status_transition("New", "Resolved")

    assert exc.value.status_code == 409


def test_resolved_to_new_is_blocked():
    with pytest.raises(HTTPException) as exc:
        validate_status_transition("Resolved", "New")

    assert exc.value.status_code == 409


def test_same_status_is_blocked():
    with pytest.raises(HTTPException) as exc:
        validate_status_transition("New", "New")

    assert exc.value.status_code == 409
