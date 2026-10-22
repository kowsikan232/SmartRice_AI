"""
Smart Rice AI - FastAPI Main Application.
Phase 1: NO-IoT AI-Based Rice Storage Quality Assessment, Shelf-Life Prediction,
and Spoilage Risk Prediction System.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.api.endpoints import router
from backend.utils.db import init_db

app = FastAPI(
    title="Smart Rice AI Backend",
    description="AI-Based Rice Storage Quality Assessment, Shelf-Life Prediction and Spoilage Risk Prediction System (Phase 1)",
    version="1.0.0"
)

# Configure CORS for React/Vite development server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Router
app.include_router(router, prefix="")


@app.on_event("startup")
def on_startup():
    """Initializes local storage and database on server launch."""
    init_db()


@app.get("/")
def root():
    return {
        "title": "Smart Rice AI API",
        "description": "AI-Based Rice Storage Quality Assessment, Shelf-Life Prediction and Spoilage Risk Prediction System",
        "phase": "Phase 1 (NO-IoT)",
        "docs_url": "/docs",
        "health_check": "/health"
    }
