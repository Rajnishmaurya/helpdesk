
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings

from app.routers import (
    tickets,
    ai,
    dashboard,
    requesters,
)

from app.routers import feedback


# ----------------------------------------
# Logging configuration
# ----------------------------------------

logging.basicConfig(
    level=getattr(
        logging,
        settings.LOG_LEVEL.upper(),
        logging.INFO,
    ),
    format=(
        "%(asctime)s | %(levelname)s | "
        "%(name)s | %(message)s"
    ),
)

logger = logging.getLogger(__name__)


# ----------------------------------------
# FastAPI application
# ----------------------------------------

app = FastAPI(
    title="AI-Powered Employee Helpdesk",
    description=(
        "Employee IT support ticket management "
        "with AI-assisted ticket review."
    ),
    version="1.0.0",
)


# ----------------------------------------
# CORS configuration
# ----------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ----------------------------------------
# Router registration
# ----------------------------------------

app.include_router(tickets.router)
app.include_router(ai.router)
app.include_router(dashboard.router)
app.include_router(requesters.router)
app.include_router(feedback.router)


# ----------------------------------------
# Health endpoint
# ----------------------------------------

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "application": "AI-Powered Employee Helpdesk",
    }


@app.get("/")
def root():
    return {
        "message": "Employee Helpdesk API is running",
        "docs": "/docs",
    }


@app.on_event("startup")
async def startup_event():
    logger.info("Helpdesk application started")


@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Helpdesk application stopped")
