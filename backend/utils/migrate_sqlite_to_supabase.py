"""
Migration script: Migrates SQLite prediction history and default profile to Supabase.
Safeguards existing data: Never deletes SQLite records.
"""

import sys
import sqlite3
from pathlib import Path
from typing import Dict, Any, List

# Add workspace root to sys.path so imports work
current_dir = Path(__file__).resolve().parent
backend_dir = current_dir.parent
workspace_dir = backend_dir.parent
sys.path.insert(0, str(workspace_dir))

from backend.utils.supabase_client import get_supabase_client, is_supabase_configured

DB_PATH = backend_dir / "data" / "prediction_history.db"


def get_sqlite_records() -> List[Dict[str, Any]]:
    """Reads all rows from SQLite prediction_history table."""
    if not DB_PATH.exists():
        print(f"[Error] SQLite database not found at {DB_PATH}")
        return []

    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM prediction_history ORDER BY id ASC")
        return [dict(r) for r in cursor.fetchall()]


def migrate_to_supabase():
    """Migrates SQLite records and ensures default profile in Supabase."""
    if not is_supabase_configured():
        print("[Error] Supabase is not configured yet. Please provide SUPABASE_URL and SUPABASE_KEY in backend/.env or frontend/.env.local.")
        return False, 0

    supabase = get_supabase_client()
    if not supabase:
        print("[Error] Failed to initialize Supabase client.")
        return False, 0

    print("[Info] Connecting to Supabase...")

    # 1. Ensure Profile Exists
    try:
        profile_res = supabase.table("profiles").select("*").limit(1).execute()
        if not profile_res.data:
            print("[Info] Creating default user profile for Kowsikan in Supabase...")
            default_profile = {
                "name": "Kowsikan",
                "email": "user@email.com",
                "department": "Artificial Intelligence & Data Science",
                "college": "S.A. Engineering College",
                "role": "Student"
            }
            supabase.table("profiles").insert(default_profile).execute()
            print("[Success] Created default profile in Supabase.")
        else:
            print(f"[Info] Found {len(profile_res.data)} existing profile(s) in Supabase.")
    except Exception as e:
        print(f"[Warning] Could not inspect/create profiles table in Supabase: {e}")

    # 2. Read SQLite Records
    sqlite_records = get_sqlite_records()
    total_sqlite = len(sqlite_records)
    print(f"[Info] Found {total_sqlite} records in local SQLite database.")

    if total_sqlite == 0:
        print("[Info] No SQLite records to migrate.")
        return True, 0

    # 3. Migrate to Supabase prediction_history
    migrated_count = 0
    try:
        # Check existing records in Supabase to avoid duplicates
        existing_res = supabase.table("prediction_history").select("id, timestamp").execute()
        existing_ids = {row["id"] for row in (existing_res.data or []) if "id" in row}
        existing_timestamps = {row["timestamp"] for row in (existing_res.data or []) if "timestamp" in row}

        records_to_insert = []
        for r in sqlite_records:
            # Check if already present by id or timestamp
            if r["id"] in existing_ids or r.get("timestamp") in existing_timestamps:
                continue

            record = {
                "id": r["id"],
                "timestamp": r["timestamp"],
                "analysis_type": "multimodal" if r.get("has_image") else "storage_tabular",
                "rice_variety": r.get("rice_variety", "Basmati"),
                "temperature": float(r.get("temperature", 0.0)),
                "humidity": float(r.get("humidity", 0.0)),
                "moisture_content": float(r.get("moisture_content", 0.0)),
                "storage_days": float(r.get("storage_days", 0.0)),
                "has_image": bool(r.get("has_image")),
                "image_quality": r.get("image_quality"),
                "image_confidence": float(r["image_confidence"]) if r.get("image_confidence") is not None else None,
                "detected_variety": r.get("detected_variety"),
                "tabular_quality": r.get("tabular_quality"),
                "spoilage_risk": r.get("spoilage_risk"),
                "shelf_life_days": float(r["shelf_life_days"]) if r.get("shelf_life_days") is not None else None,
                "final_quality": r.get("final_quality"),
                "overall_confidence": float(r["overall_confidence"]) if r.get("overall_confidence") is not None else None,
                "recommended_price": float(r["recommended_price"]) if r.get("recommended_price") is not None else None,
            }
            records_to_insert.append(record)

        if records_to_insert:
            print(f"[Info] Inserting {len(records_to_insert)} records into Supabase prediction_history...")
            insert_res = supabase.table("prediction_history").insert(records_to_insert).execute()
            migrated_count = len(insert_res.data) if insert_res.data else len(records_to_insert)
            print(f"[Success] Successfully migrated {migrated_count} records to Supabase!")
        else:
            print("[Info] All SQLite records already exist in Supabase. No new records to insert.")
            migrated_count = len(existing_ids)

        return True, total_sqlite
    except Exception as e:
        print(f"[Error] Failed migrating records to Supabase: {e}")
        return False, 0


if __name__ == "__main__":
    success, count = migrate_to_supabase()
    sys.exit(0 if success else 1)
