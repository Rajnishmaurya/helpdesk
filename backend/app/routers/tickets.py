
import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Ticket, TicketActivity
from app.schemas import (
    StatusUpdate,
    PriorityUpdate,
    CommentCreate,
    TicketOut,
    ActivityOut,
)
from app.services.workflow import validate_status_transition


logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/tickets",
    tags=["Support Workflow"],
)


def get_ticket_or_404(db: Session, ticket_id: int):
    ticket = db.query(Ticket).filter(
        Ticket.id == ticket_id
    ).first()

    if ticket is None:
        raise HTTPException(
            status_code=404,
            detail=f"Ticket {ticket_id} not found",
        )

    return ticket


# ----------------------------------------
# 1. Update ticket status
# ----------------------------------------

@router.patch("/{ticket_id}/status", response_model=TicketOut)
def update_ticket_status(
    ticket_id: int,
    payload: StatusUpdate,
    db: Session = Depends(get_db),
):
    ticket = get_ticket_or_404(db, ticket_id)

    old_status = ticket.status
    new_status = payload.new_status

    validate_status_transition(old_status, new_status)

    try:
        ticket.status = new_status

        activity = TicketActivity(
            ticket_id=ticket.id,
            action_type="status_change",
            old_value=old_status,
            new_value=new_status,
            note=payload.note,
            actor="Support",
        )

        db.add(activity)
        db.commit()
        db.refresh(ticket)

        logger.info(
            "Ticket status updated: ticket_id=%s old=%s new=%s",
            ticket_id,
            old_status,
            new_status,
        )

        return ticket

    except Exception:
        db.rollback()
        logger.exception(
            "Failed to update ticket status: ticket_id=%s",
            ticket_id,
        )
        raise HTTPException(
            status_code=500,
            detail="Unable to update ticket status.",
        )


# ----------------------------------------
# 2. Update ticket priority
# ----------------------------------------

@router.patch("/{ticket_id}/priority", response_model=TicketOut)
def update_ticket_priority(
    ticket_id: int,
    payload: PriorityUpdate,
    db: Session = Depends(get_db),
):
    ticket = get_ticket_or_404(db, ticket_id)

    old_priority = ticket.priority
    new_priority = payload.priority

    try:
        ticket.priority = new_priority

        activity = TicketActivity(
            ticket_id=ticket.id,
            action_type="priority_change",
            old_value=old_priority,
            new_value=new_priority,
            actor="Support",
        )

        db.add(activity)
        db.commit()
        db.refresh(ticket)

        logger.info(
            "Ticket priority updated: ticket_id=%s old=%s new=%s",
            ticket_id,
            old_priority,
            new_priority,
        )

        return ticket

    except Exception:
        db.rollback()
        logger.exception(
            "Failed to update ticket priority: ticket_id=%s",
            ticket_id,
        )
        raise HTTPException(
            status_code=500,
            detail="Unable to update ticket priority.",
        )


# ----------------------------------------
# 3. Add support comment
# ----------------------------------------

@router.post(
    "/{ticket_id}/comments",
    response_model=ActivityOut,
    status_code=status.HTTP_201_CREATED,
)
def add_ticket_comment(
    ticket_id: int,
    payload: CommentCreate,
    db: Session = Depends(get_db),
):
    ticket = get_ticket_or_404(db, ticket_id)

    try:
        activity = TicketActivity(
            ticket_id=ticket.id,
            action_type="comment",
            note=payload.note,
            actor=payload.actor,
        )

        db.add(activity)
        db.commit()
        db.refresh(activity)

        logger.info(
            "Support comment added: ticket_id=%s",
            ticket_id,
        )

        return activity

    except Exception:
        db.rollback()
        logger.exception(
            "Failed to add support comment: ticket_id=%s",
            ticket_id,
        )
        raise HTTPException(
            status_code=500,
            detail="Unable to add support comment.",
        )
