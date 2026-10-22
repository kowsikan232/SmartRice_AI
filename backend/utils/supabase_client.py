"""
Supabase client utility for Smart Rice AI backend.
Provides client initialization and connectivity checking.
"""

import os
from pathlib import Path
from typing import Optional
from dotenv import load_dotenv

# Load backend/.env first, then root .env or frontend/.env.local fallback
backend_env = Path(__file__).resolve().parent.parent / ".env"
frontend_env = Path(__file__).resolve().parent.parent.parent / "frontend" / ".env.local"

if backend_env.exists():
    load_dotenv(dotenv_path=backend_env)
if frontend_env.exists():
    load_dotenv(dotenv_path=frontend_env)
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL", "").strip()
SUPABASE_KEY = os.getenv("SUPABASE_KEY") or os.getenv("VITE_SUPABASE_PUBLISHABLE_KEY", "").strip()

_supabase_client = None


def is_supabase_configured() -> bool:
    """Returns True if valid Supabase credentials have been configured."""
    return bool(
        SUPABASE_URL
        and SUPABASE_KEY
        and SUPABASE_URL.startswith("http")
        and "placeholder" not in SUPABASE_URL
        and "your-project" not in SUPABASE_URL
    )


def get_supabase_client():
    """Initializes or returns singleton Supabase client."""
    global _supabase_client
    if _supabase_client is not None:
        return _supabase_client

    if not is_supabase_configured():
        return None

    try:
        from supabase import create_client
        _supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)
        return _supabase_client
    except Exception as e:
        print(f"[Supabase Client Error] Failed to initialize Supabase client: {e}")
        return None
