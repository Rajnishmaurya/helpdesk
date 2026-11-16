
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.db import get_db
from app.models import Requester
from app.schemas import RequesterCreate, RequesterResponse


router = APIRouter(
    prefix="/api/requesters",
    tags=["Requesters"]
)


# CREATE REQUESTER
@router.post("/", response_model=RequesterResponse,
             status_code=status.HTTP_201_CREATED)
def create_requester(
    data: RequesterCreate,
    db: Session = Depends(get_db)
):
    requester = Requester(
        display_name=data.display_name,
        email=data.email,
        department=data.department
    )

    db.add(requester)

    try:
        db.commit()
        db.refresh(requester)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Requester email already exists."
        )

    return requester


# GET ALL REQUESTERS
@router.get("/", response_model=list[RequesterResponse])
def get_requesters(db: Session = Depends(get_db)):
    return (
        db.query(Requester)
        .order_by(Requester.id.desc())
        .all()
    )


# GET REQUESTER BY ID
@router.get("/{requester_id}", response_model=RequesterResponse)
def get_requester(
    requester_id: int,
    db: Session = Depends(get_db)
):
    requester = db.query(Requester).filter(
        Requester.id == requester_id
    ).first()

    if not requester:
        raise HTTPException(
            status_code=404,
            detail="Requester not found."
        )

    return requester
