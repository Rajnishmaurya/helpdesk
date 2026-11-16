
import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import (
    Ticket,
    TicketActivity,
    AISuggestion,
    AIFeedback,
)
from app.schemas import FeedbackCreate


logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/ai-suggestions",
    tags=["AI Feedback"],
)


@router.post(
    "/{suggestion_id}/feedback",
    status_code=status.HTTP_201_CREATED,
)
def submit_ai_feedback(
    suggestion_id: int,
    payload: FeedbackCreate,
    db: Session = Depends(get_db),
):
    suggestion = (
        db.query(AISuggestion)
        .filter(AISuggestion.id == suggestion_id)
        .first()
    )

    if suggestion is None:
        raise HTTPException(
            status_code=404,
            detail=f"Suggestion {suggestion_id} not found",
        )

    existing_feedback = (
        db.query(AIFeedback)
        .filter(AIFeedback.suggestion_id == suggestion_id)
        .first()
    )

    if existing_feedback:
        raise HTTPException(
            status_code=409,
            detail="Feedback already exists for this suggestion.",
        )

    ticket = (
        db.query(Ticket)
        .filter(Ticket.id == suggestion.ticket_id)
        .first()
    )

    if ticket is None:
        raise HTTPException(
            status_code=404,
            detail=f"Ticket {suggestion.ticket_id} not found",
        )

    old_category = ticket.category
    old_priority = ticket.priority

    try:
        feedback = AIFeedback(
            suggestion_id=suggestion.id,
            ticket_id=ticket.id,
            accepted=payload.accepted,
            useful=payload.useful,
            final_category=payload.final_category,
            final_priority=payload.final_priority,
            comment=payload.comment,
        )

        # Only the analyst's final decision updates
        # the confirmed ticket values.
        ticket.category = payload.final_category
        ticket.priority = payload.final_priority

        activity = TicketActivity(
            ticket_id=ticket.id,
            action_type="ai_feedback",
            old_value=f"{old_category}/{old_priority}",
            new_value=(
                f"{payload.final_category}/"
                f"{payload.final_priority}"
            ),
            note=payload.comment,
            actor="Support",
        )

        db.add(feedback)
        db.add(activity)

        db.commit()
        db.refresh(feedback)

        logger.info(
            "AI feedback saved: suggestion_id=%s ticket_id=%s",
            suggestion.id,
            ticket.id,
        )

        return {
            "message": "AI feedback saved successfully",
            "feedback_id": feedback.id,
            "ticket_id": ticket.id,
            "final_category": ticket.category,
            "final_priority": ticket.priority,
        }

    except Exception:
        db.rollback()

        logger.exception(
            "Failed to save AI feedback: suggestion_id=%s",
            suggestion_id,
        )

        raise HTTPException(
            status_code=500,
            detail="Unable to save AI feedback.",
        )
