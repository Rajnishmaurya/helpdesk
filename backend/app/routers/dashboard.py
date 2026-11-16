
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db import get_db
from app.models import Ticket
from app.schemas import DashboardSummary


router = APIRouter(
    prefix="/api/dashboard",
    tags=["Dashboard"]
)


@router.get("/summary", response_model=DashboardSummary)
def get_dashboard_summary(db: Session = Depends(get_db)):

    total_tickets = db.query(func.count(Ticket.id)).scalar() or 0

    # Count tickets by status
    status_rows = (
        db.query(Ticket.status, func.count(Ticket.id))
        .group_by(Ticket.status)
        .all()
    )

    status_summary = {
        "New": 0,
        "In Progress": 0,
        "Resolved": 0
    }

    for key, count in status_rows:
        if key in status_summary:
            status_summary[key] = count

    # Count tickets by priority
    priority_rows = (
        db.query(Ticket.priority, func.count(Ticket.id))
        .group_by(Ticket.priority)
        .all()
    )

    priority_summary = {
        "Low": 0,
        "Medium": 0,
        "High": 0,
        "Unassigned": 0
    }

    for key, count in priority_rows:
        if key is None:
            priority_summary["Unassigned"] = count
        elif key in priority_summary:
            priority_summary[key] = count

    # Count tickets by category
    category_rows = (
        db.query(Ticket.category, func.count(Ticket.id))
        .group_by(Ticket.category)
        .all()
    )

    category_summary = {
        "Hardware": 0,
        "Software": 0,
        "Network": 0,
        "Access": 0,
        "Other": 0,
        "Unassigned": 0
    }

    for key, count in category_rows:
        if key is None:
            category_summary["Unassigned"] = count
        elif key in category_summary:
            category_summary[key] = count

    return DashboardSummary(
        total_tickets=total_tickets,
        status_summary=status_summary,
        priority_summary=priority_summary,
        category_summary=category_summary
    )
