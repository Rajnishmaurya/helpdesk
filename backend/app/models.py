"""
models.py - Python classes that mirror the tables in database/schema.sql.

schema.sql is the source of truth for the real database. Keep these models in step with it:
if you add a column there, add it here too. The CHECK constraints are repeated here so a
test database built from these models (Base.metadata.create_all) follows the same rules.
"""
from datetime import datetime

from sqlalchemy import (JSON, Boolean, CheckConstraint, DateTime, ForeignKey, Integer,
                        String, Text, func)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base

# Allowed values, written once and reused in the constraints below
CATEGORIES = "('Hardware','Software','Network','Access','Other')"
PRIORITIES = "('Low','Medium','High')"
STATUSES = "('New','In Progress','Resolved')"
ACTIONS = "('created','status_change','priority_change','field_update','comment','ai_feedback')"


class Requester(Base):
    __tablename__ = "requesters"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    display_name: Mapped[str] = mapped_column(String(100))
    email: Mapped[str] = mapped_column(String(150), unique=True)
    department: Mapped[str | None] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Lets you write requester.tickets to get all of this employee's tickets
    tickets: Mapped[list["Ticket"]] = relationship(back_populates="requester")


class Ticket(Base):
    __tablename__ = "tickets"
    __table_args__ = (
        CheckConstraint(f"category IN {CATEGORIES}", name="ck_ticket_category"),
        CheckConstraint(f"priority IN {PRIORITIES}", name="ck_ticket_priority"),
        CheckConstraint(f"status IN {STATUSES}", name="ck_ticket_status"),
        CheckConstraint("length(title) >= 5", name="ck_ticket_title_len"),
        CheckConstraint("length(description) >= 10", name="ck_ticket_desc_len"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    requester_id: Mapped[int] = mapped_column(ForeignKey("requesters.id"))
    title: Mapped[str] = mapped_column(String(150))
    description: Mapped[str] = mapped_column(Text)
    category: Mapped[str | None] = mapped_column(String(20))   # human-confirmed value (NULL = not set)
    priority: Mapped[str | None] = mapped_column(String(10))   # human-confirmed value (NULL = not set)
    status: Mapped[str] = mapped_column(String(20), server_default="New")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    # onupdate keeps updated_at current whenever SQLAlchemy updates the row
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(),
                                                 onupdate=func.now())

    requester: Mapped[Requester] = relationship(back_populates="tickets")
    activities: Mapped[list["TicketActivity"]] = relationship(back_populates="ticket",
                                                              order_by="TicketActivity.created_at")
    suggestions: Mapped[list["AISuggestion"]] = relationship(back_populates="ticket",
                                                             order_by="AISuggestion.created_at.desc()")


class TicketActivity(Base):
    __tablename__ = "ticket_activity"
    __table_args__ = (CheckConstraint(f"action_type IN {ACTIONS}", name="ck_activity_action"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    ticket_id: Mapped[int] = mapped_column(ForeignKey("tickets.id", ondelete="CASCADE"))
    action_type: Mapped[str] = mapped_column(String(30))
    old_value: Mapped[str | None] = mapped_column(String(100))
    new_value: Mapped[str | None] = mapped_column(String(100))
    note: Mapped[str | None] = mapped_column(Text)
    actor: Mapped[str] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    ticket: Mapped[Ticket] = relationship(back_populates="activities")


class AISuggestion(Base):
    __tablename__ = "ai_suggestions"
    __table_args__ = (
        CheckConstraint(f"suggested_category IN {CATEGORIES}", name="ck_sugg_category"),
        CheckConstraint(f"suggested_priority IN {PRIORITIES}", name="ck_sugg_priority"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    ticket_id: Mapped[int] = mapped_column(ForeignKey("tickets.id", ondelete="CASCADE"))
    suggested_category: Mapped[str] = mapped_column(String(20))
    suggested_priority: Mapped[str] = mapped_column(String(10))
    priority_reason: Mapped[str] = mapped_column(Text)
    # JSONB on PostgreSQL; plain JSON elsewhere, so a SQLite test database also works
    troubleshooting_steps: Mapped[list[str]] = mapped_column(JSON().with_variant(JSONB(), "postgresql"))
    model_name: Mapped[str] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    ticket: Mapped[Ticket] = relationship(back_populates="suggestions")
    # uselist=False: at most one feedback row per suggestion (UNIQUE in the database)
    feedback: Mapped["AIFeedback | None"] = relationship(back_populates="suggestion", uselist=False)


class AIFeedback(Base):
    __tablename__ = "ai_feedback"
    __table_args__ = (
        CheckConstraint(f"final_category IN {CATEGORIES}", name="ck_fb_category"),
        CheckConstraint(f"final_priority IN {PRIORITIES}", name="ck_fb_priority"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    suggestion_id: Mapped[int] = mapped_column(ForeignKey("ai_suggestions.id", ondelete="CASCADE"), unique=True)
    ticket_id: Mapped[int] = mapped_column(ForeignKey("tickets.id", ondelete="CASCADE"))
    accepted: Mapped[bool] = mapped_column(Boolean)
    useful: Mapped[bool] = mapped_column(Boolean)
    final_category: Mapped[str] = mapped_column(String(20))
    final_priority: Mapped[str] = mapped_column(String(10))
    comment: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    suggestion: Mapped[AISuggestion] = relationship(back_populates="feedback")
