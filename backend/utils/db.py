"""
Database module for Smart Rice AI prediction history.
Dual-layer persistence: Supabase PostgreSQL (primary) with SQLite (local backup & offline fallback).
Preserves existing SQLite history while keeping Supabase fully in sync.
"""

import sqlite3
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Any, Optional

from backend.utils.supabase_client import get_supabase_client, is_supabase_configured

DB_DIR = Path(__file__).resolve().parent.parent / "data"
DB_DIR.mkdir(parents=True, exist_ok=True)
DB_PATH = DB_DIR / "prediction_history.db"


def init_db():
    """Initializes the prediction history database schema in SQLite and verifies Supabase."""
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS prediction_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                rice_variety TEXT NOT NULL,
                temperature REAL NOT NULL,
                humidity REAL NOT NULL,
                moisture_content REAL NOT NULL,
                storage_days REAL NOT NULL,
                has_image BOOLEAN DEFAULT 0,
                image_quality TEXT,
                image_confidence REAL,
                detected_variety TEXT,
                tabular_quality TEXT,
                spoilage_risk TEXT,
                shelf_life_days REAL,
                final_quality TEXT,
                overall_confidence REAL,
                recommended_price REAL,
                has_insect BOOLEAN DEFAULT 0,
                insect_type TEXT
            )
        """)
        # Safe column migrations for existing databases
        for col_def in [("has_insect", "BOOLEAN DEFAULT 0"), ("insect_type", "TEXT")]:
            try:
                cursor.execute(f"ALTER TABLE prediction_history ADD COLUMN {col_def[0]} {col_def[1]}")
            except Exception:
                pass
        conn.commit()


def save_prediction(record: Dict[str, Any]) -> int:
    """Inserts a new prediction record into SQLite and Supabase."""
    init_db()

    # 1. Always save into SQLite to maintain local backup audit trail
    sqlite_id = 0
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO prediction_history (
                timestamp, rice_variety, temperature, humidity, moisture_content,
                storage_days, has_image, image_quality, image_confidence,
                detected_variety, tabular_quality, spoilage_risk, shelf_life_days,
                final_quality, overall_confidence, recommended_price, has_insect, insect_type
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            record.get("timestamp", datetime.now().isoformat()),
            record.get("rice_variety", "Unknown"),
            record.get("temperature", 0.0),
            record.get("humidity", 0.0),
            record.get("moisture_content", 0.0),
            record.get("storage_days", 0.0),
            1 if record.get("has_image") else 0,
            record.get("image_quality"),
            record.get("image_confidence"),
            record.get("detected_variety"),
            record.get("tabular_quality"),
            record.get("spoilage_risk"),
            record.get("shelf_life_days"),
            record.get("final_quality"),
            record.get("overall_confidence"),
            record.get("recommended_price"),
            1 if record.get("has_insect") else 0,
            record.get("insect_type")
        ))
        conn.commit()
        sqlite_id = cursor.lastrowid or 0

    # 2. Save into Supabase if configured
    if is_supabase_configured():
        supabase = get_supabase_client()
        if supabase:
            try:
                target_id = sqlite_id
                if not target_id:
                    max_res = supabase.table("prediction_history").select("id").order("id", desc=True).limit(1).execute()
                    target_id = (max_res.data[0]["id"] if max_res.data else 0) + 1

                sb_record = {
                    "id": target_id,
                    "timestamp": record.get("timestamp", datetime.now().isoformat()),
                    "analysis_type": "multimodal" if record.get("has_image") else "storage_tabular",
                    "rice_variety": record.get("rice_variety", "Unknown"),
                    "temperature": float(record.get("temperature", 0.0)),
                    "humidity": float(record.get("humidity", 0.0)),
                    "moisture_content": float(record.get("moisture_content", 0.0)),
                    "storage_days": float(record.get("storage_days", 0.0)),
                    "has_image": bool(record.get("has_image")),
                    "image_quality": record.get("image_quality"),
                    "image_confidence": float(record["image_confidence"]) if record.get("image_confidence") is not None else None,
                    "detected_variety": record.get("detected_variety"),
                    "tabular_quality": record.get("tabular_quality"),
                    "spoilage_risk": record.get("spoilage_risk"),
                    "shelf_life_days": float(record["shelf_life_days"]) if record.get("shelf_life_days") is not None else None,
                    "final_quality": record.get("final_quality"),
                    "overall_confidence": float(record["overall_confidence"]) if record.get("overall_confidence") is not None else None,
                    "recommended_price": float(record["recommended_price"]) if record.get("recommended_price") is not None else None,
                    "image_url": record.get("image_url"),
                    "has_insect": bool(record.get("has_insect")),
                    "insect_type": record.get("insect_type")
                }
                try:
                    supabase.table("prediction_history").insert(sb_record).execute()
                except Exception as ins_err:
                    # Graceful fallback if remote Supabase schema has not run migration for has_insect / insect_type
                    if "has_insect" in str(ins_err) or "insect_type" in str(ins_err) or "PGRST204" in str(ins_err):
                        sb_fallback = {k: v for k, v in sb_record.items() if k not in ("has_insect", "insect_type")}
                        supabase.table("prediction_history").insert(sb_fallback).execute()
                    else:
                        raise ins_err
            except Exception as e:
                print(f"[Supabase Sync Error] Failed inserting into Supabase: {e}")

    return sqlite_id


def get_prediction_history(limit: int = 50) -> List[Dict[str, Any]]:
    """Retrieves recent prediction history records from Supabase, or SQLite fallback."""
    if is_supabase_configured():
        supabase = get_supabase_client()
        if supabase:
            try:
                res = supabase.table("prediction_history").select("*").order("id", desc=True).limit(limit).execute()
                if res.data is not None and len(res.data) > 0:
                    return res.data
            except Exception as e:
                print(f"[Supabase Fetch Warning] Failed fetching from Supabase, falling back to SQLite: {e}")

    # Fallback to SQLite
    init_db()
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("""
            SELECT * FROM prediction_history ORDER BY id DESC LIMIT ?
        """, (limit,))
        rows = cursor.fetchall()
        return [dict(row) for row in rows]


def clear_history():
    """Clears records from SQLite and Supabase."""
    init_db()
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM prediction_history")
        conn.commit()

    if is_supabase_configured():
        supabase = get_supabase_client()
        if supabase:
            try:
                supabase.table("prediction_history").delete().gt("id", 0).execute()
            except Exception as e:
                print(f"[Supabase Clear Warning] Failed clearing Supabase records: {e}")
