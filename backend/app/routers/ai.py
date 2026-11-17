"""
routers/ai.py - AI endpoints owned by Piyush.
(The feedback endpoint lives in routers/feedback.py.)

Registered in main.py with: app.include_router(ai.router)
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.db import get_db
from app.models import AISuggestion, Ticket
from app.schemas import AISuggestionOut
from app.services.ai_service import (AIInvalidOutputError, AITimeoutError,
                                     AIUnavailableError, analyse_ticket)

router = APIRouter(prefix="/api", tags=["AI"])


def get_ticket_or_404(db: Session, ticket_id: int) -> Ticket:
    ticket = db.get(Ticket, ticket_id)
    if ticket is None:
        raise HTTPException(status_code=404, detail=f"Ticket {ticket_id} not found")
    return ticket


@router.post("/tickets/{ticket_id}/ai-analysis", response_model=AISuggestionOut, status_code=201)
def run_ai_analysis(ticket_id: int, db: Session = Depends(get_db)):
    """Ask the AI for a suggestion and store it. The ticket itself is NOT changed."""
    ticket = get_ticket_or_404(db, ticket_id)

    # Map each AI failure to a clear, non-destructive HTTP error. Nothing is saved on failure,
    # and every other ticket endpoint keeps working (Scenario 04).
    try:
        result = analyse_ticket(ticket.id, ticket.title, ticket.description)
    except AITimeoutError:
        raise HTTPException(504, "AI analysis timed out. Try again, or continue managing the ticket manually.")
    except AIUnavailableError:
        raise HTTPException(503, "AI service is unavailable. You can continue managing the ticket manually.")
    except AIInvalidOutputError:
        raise HTTPException(502, "AI returned an invalid response. You can continue managing the ticket manually.")

    # Save the proposal in ai_suggestions only. tickets.category/priority stay as the humans set them.
    suggestion = AISuggestion(
        ticket_id=ticket.id,
        suggested_category=result.category,
        suggested_priority=result.priority,
        priority_reason=result.priority_reason,
        troubleshooting_steps=result.troubleshooting_steps,
        model_name=settings.OPENROUTER_MODEL,
    )
    db.add(suggestion)
    db.commit()
    db.refresh(suggestion)   # reload so id and created_at from the database are filled in
    return suggestion


@router.get("/tickets/{ticket_id}/ai-suggestions", response_model=list[AISuggestionOut])
def list_ai_suggestions(ticket_id: int, db: Session = Depends(get_db)):
    """All suggestions for a ticket, newest first."""
    get_ticket_or_404(db, ticket_id)
    rows = db.scalars(select(AISuggestion)
                      .where(AISuggestion.ticket_id == ticket_id)
                      # id breaks ties when two suggestions share the same timestamp
                      .order_by(AISuggestion.created_at.desc(), AISuggestion.id.desc()))
    return list(rows)
