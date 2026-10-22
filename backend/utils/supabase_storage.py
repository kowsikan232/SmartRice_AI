"""
Supabase Storage helper for Smart Rice AI backend.
Manages file uploads to 'profile-images' and 'rice-analysis-images' buckets.
"""

import uuid
from typing import Optional, Tuple
from backend.utils.supabase_client import get_supabase_client, is_supabase_configured


def upload_image_to_supabase(
    bucket_name: str,
    file_bytes: bytes,
    filename: str,
    content_type: str = "image/jpeg"
) -> Tuple[bool, Optional[str], Optional[str]]:
    """
    Uploads a file to a Supabase Storage bucket and returns (success, public_url, error_message).
    """
    if not is_supabase_configured():
        return False, None, "Supabase is not configured."

    supabase = get_supabase_client()
    if not supabase:
        return False, None, "Supabase client unavailable."

    try:
        # Generate unique storage path
        ext = filename.split(".")[-1].lower() if "." in filename else "jpg"
        file_path = f"{uuid.uuid4().hex[:12]}_{filename}"

        # Upload binary
        res = supabase.storage.from_(bucket_name).upload(
            path=file_path,
            file=file_bytes,
            file_options={"content-type": content_type}
        )

        # Get Public URL
        public_url = supabase.storage.from_(bucket_name).get_public_url(file_path)
        return True, public_url, None
    except Exception as e:
        print(f"[Storage Upload Error] Failed uploading {filename} to {bucket_name}: {e}")
        return False, None, str(e)
