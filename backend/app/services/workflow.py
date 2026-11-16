
from fastapi import HTTPException, status


ALLOWED_TRANSITIONS = {
    "New": {"In Progress"},
    "In Progress": {"Resolved"},
    "Resolved": {"In Progress"},
}


def validate_status_transition(
    current_status: str,
    new_status: str,
) -> None:
    """
    Validate whether a ticket can move from its
    current status to the requested status.
    """

    if current_status == new_status:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ticket is already in this status.",
        )

    allowed = ALLOWED_TRANSITIONS.get(current_status, set())

    if new_status not in allowed:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Transition from '{current_status}' "
                f"to '{new_status}' is not allowed."
            ),
        )
