from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
 
from app.db import get_db
from app.models import Ticket, TicketActivity, Requester
from app.schemas import (
    TicketCreate,
    TicketUpdate,
    TicketResponse,
    TicketActivityResponse,
    StatusUpdate,
    PriorityUpdate,
    CommentCreate,
)
from app.services.workflow import validate_status_transition
 
 
router = APIRouter(
    prefix="/api/tickets",
    tags=["Tickets"],
)
 
 
# =====================================================
# ALLOWED VALUES
# =====================================================
 
ALLOWED_CATEGORIES = {
    "Hardware",
    "Software",
    "Network",
    "Access",
    "Other",
}
 
ALLOWED_PRIORITIES = {
    "Low",
    "Medium",
    "High",
}
 
ALLOWED_STATUSES = {
    "New",
    "In Progress",
    "Resolved",
}
 
 
# =====================================================
# COMMON HELPER
# =====================================================
 
def get_ticket_or_404(db: Session, ticket_id: int):
 
    ticket = db.query(Ticket).filter(
        Ticket.id == ticket_id
    ).first()
 
    if ticket is None:
        raise HTTPException(
            status_code=404,
            detail=f"Ticket {ticket_id} not found"
        )
 
    return ticket
 
 
# =====================================================
# PERSON A: CORE TICKET APIs
# =====================================================
 
 
# 1. CREATE TICKET
# POST /api/tickets/
 
@router.post(
    "/",
    response_model=TicketResponse,
    status_code=status.HTTP_201_CREATED
)
def create_ticket(
    payload: TicketCreate,
    db: Session = Depends(get_db)
):
 
    requester = db.query(Requester).filter(
        Requester.id == payload.requester_id
    ).first()
 
    if requester is None:
        raise HTTPException(
            status_code=404,
            detail="Requester not found"
        )
 
    if (
        payload.category is not None
        and payload.category not in ALLOWED_CATEGORIES
    ):
        raise HTTPException(
            status_code=400,
            detail="Invalid category"
        )
 
    ticket = Ticket(
        requester_id=payload.requester_id,
        title=payload.title,
        description=payload.description,
        category=payload.category,
        priority=None,
        status="New"
    )
 
    try:
        db.add(ticket)
        db.flush()
 
        activity = TicketActivity(
            ticket_id=ticket.id,
            action_type="created",
            old_value=None,
            new_value="New",
            note="Ticket created",
            actor=requester.display_name
        )
 
        db.add(activity)
 
        db.commit()
        db.refresh(ticket)
 
        return ticket
 
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to create ticket"
        )
 

# 2. LIST AND FILTER TICKETS
# GET /api/tickets/

@router.get(
    "/",
    response_model=list[TicketResponse]
)
def get_tickets(
    status_filter: str | None = None,
    category: str | None = None,
    priority: str | None = None,
    requester_id: int | None = None,
    requester_email: str | None = None,
    db: Session = Depends(get_db)
):
    query = db.query(Ticket)

    # Filter by status
    if status_filter is not None:
        if status_filter not in ALLOWED_STATUSES:
            raise HTTPException(
                status_code=400,
                detail="Invalid status filter"
            )

        query = query.filter(
            Ticket.status == status_filter
        )

    # Filter by category
    if category is not None:
        if category not in ALLOWED_CATEGORIES:
            raise HTTPException(
                status_code=400,
                detail="Invalid category filter"
            )

        query = query.filter(
            Ticket.category == category
        )

    # Filter by priority
    if priority is not None:
        if priority not in ALLOWED_PRIORITIES:
            raise HTTPException(
                status_code=400,
                detail="Invalid priority filter"
            )

        query = query.filter(
            Ticket.priority == priority
        )

    # Filter by requester ID
    if requester_id is not None:
        query = query.filter(
            Ticket.requester_id == requester_id
        )

    # Filter by employee email
    if requester_email is not None:
        requester = db.query(Requester).filter(
            Requester.email.ilike(requester_email.strip())
        ).first()

        if requester is None:
            raise HTTPException(
                status_code=404,
                detail="Employee not found"
            )

        query = query.filter(
            Ticket.requester_id == requester.id
        )

    return query.order_by(
        Ticket.created_at.desc()
    ).all()
 
 
# 3. GET TICKET BY ID
# GET /api/tickets/{ticket_id}
 
@router.get(
    "/{ticket_id}",
    response_model=TicketResponse
)
def get_ticket(
    ticket_id: int,
    db: Session = Depends(get_db)
):
 
    return get_ticket_or_404(db, ticket_id)
 
 
# 4. UPDATE TICKET DETAILS
# PATCH /api/tickets/{ticket_id}
 
@router.patch(
    "/{ticket_id}",
    response_model=TicketResponse
)
def update_ticket(
    ticket_id: int,
    payload: TicketUpdate,
    db: Session = Depends(get_db)
):
 
    ticket = get_ticket_or_404(db, ticket_id)
 
    updates = payload.model_dump(exclude_unset=True)
 
    if (
        "category" in updates
        and updates["category"] is not None
        and updates["category"] not in ALLOWED_CATEGORIES
    ):
        raise HTTPException(
            status_code=400,
            detail="Invalid category"
        )
 
    try:
 
        for field, new_value in updates.items():
 
            old_value = getattr(ticket, field)
 
            if old_value != new_value:
 
                setattr(ticket, field, new_value)
 
                activity = TicketActivity(
                    ticket_id=ticket.id,
                    action_type="field_update",
                    old_value=str(old_value) if old_value is not None else None,
                    new_value=str(new_value) if new_value is not None else None,
                    note=f"{field} updated",
                    actor="Support"
                )
 
                db.add(activity)
 
        db.commit()
        db.refresh(ticket)
 
        return ticket
 
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to update ticket"
        )
 
 
# 5. GET TICKET HISTORY
# GET /api/tickets/{ticket_id}/history
 
@router.get(
    "/{ticket_id}/history",
    response_model=list[TicketActivityResponse]
)
def get_ticket_history(
    ticket_id: int,
    db: Session = Depends(get_db)
):
 
    get_ticket_or_404(db, ticket_id)
 
    return (
        db.query(TicketActivity)
        .filter(TicketActivity.ticket_id == ticket_id)
        .order_by(
            TicketActivity.created_at.asc(),
            TicketActivity.id.asc()
        )
        .all()
    )
 
 
# =====================================================
# PERSON B: SUPPORT WORKFLOW APIs
# =====================================================
 
 
# 6. UPDATE TICKET STATUS
# PATCH /api/tickets/{ticket_id}/status
 
@router.patch(
    "/{ticket_id}/status",
    response_model=TicketResponse
)
def update_ticket_status(
    ticket_id: int,
    payload: StatusUpdate,
    db: Session = Depends(get_db)
):
 
    ticket = get_ticket_or_404(db, ticket_id)
 
    old_status = ticket.status
    new_status = payload.status
 
    if new_status not in ALLOWED_STATUSES:
        raise HTTPException(
            status_code=400,
            detail="Invalid status"
        )
 
    # Person B's workflow validation
    validate_status_transition(
        old_status,
        new_status
    )
 
    try:
 
        ticket.status = new_status
 
        activity = TicketActivity(
            ticket_id=ticket.id,
            action_type="status_change",
            old_value=old_status,
            new_value=new_status,
            note=payload.note,
            actor="Support"
        )
 
        db.add(activity)
 
        db.commit()
        db.refresh(ticket)
 
        return ticket
 
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to update ticket status"
        )
 
 
# 7. UPDATE TICKET PRIORITY
# PATCH /api/tickets/{ticket_id}/priority
 
@router.patch(
    "/{ticket_id}/priority",
    response_model=TicketResponse
)
def update_ticket_priority(
    ticket_id: int,
    payload: PriorityUpdate,
    db: Session = Depends(get_db)
):
 
    ticket = get_ticket_or_404(db, ticket_id)
 
    new_priority = payload.priority
 
    if new_priority not in ALLOWED_PRIORITIES:
        raise HTTPException(
            status_code=400,
            detail="Invalid priority"
        )
 
    old_priority = ticket.priority
 
    if old_priority == new_priority:
        raise HTTPException(
            status_code=400,
            detail="Ticket already has this priority"
        )
 
    try:
 
        ticket.priority = new_priority
 
        activity = TicketActivity(
            ticket_id=ticket.id,
            action_type="priority_change",
            old_value=old_priority,
            new_value=new_priority,
            note="Priority updated",
            actor="Support"
        )
 
        db.add(activity)
 
        db.commit()
        db.refresh(ticket)
 
        return ticket
 
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to update ticket priority"
        )
 
 
# 8. ADD SUPPORT COMMENT
# POST /api/tickets/{ticket_id}/comments
 
@router.post(
    "/{ticket_id}/comments",
    response_model=TicketActivityResponse,
    status_code=status.HTTP_201_CREATED
)
def add_ticket_comment(
    ticket_id: int,
    payload: CommentCreate,
    db: Session = Depends(get_db)
):
 
    ticket = get_ticket_or_404(db, ticket_id)
 
    try:
 
        activity = TicketActivity(
            ticket_id=ticket.id,
            action_type="comment",
            old_value=None,
            new_value=None,
            note=payload.note,
            actor=payload.actor
        )
 
        db.add(activity)
 
        db.commit()
        db.refresh(activity)
 
        return activity
 
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to add comment"
        )