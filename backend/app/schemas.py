from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field


# REQUESTER SCHEMAS

class RequesterCreate(BaseModel):
    display_name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    department: Optional[str] = Field(default=None, max_length=100)


class RequesterResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    display_name: str
    email: str
    department: Optional[str] = None
    created_at: datetime


# TICKET SCHEMAS

class TicketCreate(BaseModel):
    requester_id: int
    title: str = Field(..., min_length=5, max_length=150)
    description: str = Field(..., min_length=10)
    category: Optional[str] = None


class TicketUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=5, max_length=150)
    description: Optional[str] = Field(default=None, min_length=10)
    category: Optional[str] = None


class TicketResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    requester_id: int
    title: str
    description: str
    category: Optional[str] = None
    priority: Optional[str] = None
    status: str
    created_at: datetime
    updated_at: datetime


# TICKET ACTIVITY SCHEMAS

class TicketActivityResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    ticket_id: int
    action_type: str
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    note: Optional[str] = None
    actor: str
    created_at: datetime


# DASHBOARD SCHEMA

class DashboardSummary(BaseModel):
    total_tickets: int
    status_summary: dict[str, int]
    priority_summary: dict[str, int]
    category_summary: dict[str, int]


class StatusUpdate(BaseModel):
    status: str
    note: str | None = None


class PriorityUpdate(BaseModel):
    priority: str


class CommentCreate(BaseModel):
    note: str = Field(min_length=1)
    actor: str = "Support"


# AI SUGGESTION SCHEMAS (Person C)

class AISuggestionOut(BaseModel):
    """What the AI endpoints return. Built straight from the AISuggestion database row."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    ticket_id: int
    suggested_category: str
    suggested_priority: str
    priority_reason: str
    troubleshooting_steps: list[str]
    model_name: str
    created_at: datetime


# AI FEEDBACK SCHEMA (used by routers/feedback.py)

class FeedbackCreate(BaseModel):
    """The analyst's decision on an AI suggestion.
    Literal means only these exact values pass; anything else gets a 422 with a clear message."""
    accepted: bool                      # true = took the AI values as they were
    useful: bool                        # analyst's rating of the suggestion
    final_category: Literal["Hardware", "Software", "Network", "Access", "Other"]
    final_priority: Literal["Low", "Medium", "High"]
    comment: Optional[str] = Field(default=None, max_length=2000)
