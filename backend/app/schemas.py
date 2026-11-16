from datetime import datetime
from typing import Optional

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
