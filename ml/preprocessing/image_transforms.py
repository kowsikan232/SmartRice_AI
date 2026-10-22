"""
Image Preprocessing and Transformation Pipeline for Smart Rice AI.
Handles image validation, standard resizing (224x224), normalization, and data augmentations.
"""

import io
from typing import Tuple, Optional
from PIL import Image
import torch
from torchvision import transforms

# Supported image formats
SUPPORTED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
SUPPORTED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB limit
IMAGE_SIZE = (224, 224)

# Standard ImageNet normalization parameters
NORM_MEAN = [0.485, 0.456, 0.406]
NORM_STD = [0.229, 0.224, 0.225]


def get_inference_transforms():
    """Returns standard inference preprocessing transform."""
    return transforms.Compose([
        transforms.Resize(IMAGE_SIZE),
        transforms.ToTensor(),
        transforms.Normalize(mean=NORM_MEAN, std=NORM_STD)
    ])


def get_training_transforms():
    """
    Returns training transforms with moderate domain-appropriate augmentations.
    Preserves defect characteristics while providing regularization.
    """
    return transforms.Compose([
        transforms.Resize(IMAGE_SIZE),
        transforms.RandomHorizontalFlip(p=0.5),
        transforms.RandomVerticalFlip(p=0.2),
        transforms.RandomRotation(degrees=15),
        transforms.ColorJitter(brightness=0.1, contrast=0.1),
        transforms.ToTensor(),
        transforms.Normalize(mean=NORM_MEAN, std=NORM_STD)
    ])


def validate_and_preprocess_image(image_bytes: bytes, filename: Optional[str] = None) -> Tuple[torch.Tensor, Image.Image]:
    """
    Validates uploaded image byte stream, checks image integrity, converts to RGB,
    and returns a preprocessed normalized torch Tensor with shape [1, 3, 224, 224]
    along with the PIL Image object.
    
    Raises:
        ValueError: If file size, type, or integrity checks fail.
    """
    if not image_bytes:
        raise ValueError("Image content is empty.")

    if len(image_bytes) > MAX_FILE_SIZE_BYTES:
        raise ValueError(f"Image file exceeds maximum allowable size of {MAX_FILE_SIZE_BYTES // (1024 * 1024)}MB.")

    try:
        pil_image = Image.open(io.BytesIO(image_bytes))
        pil_image.verify()  # Verify integrity
    except Exception as e:
        raise ValueError(f"Corrupt or invalid image file: {str(e)}")

    # Re-open after verify() because verify() clears file pointer
    pil_image = Image.open(io.BytesIO(image_bytes))
    image_format = (pil_image.format or "").upper()
    if image_format not in {"JPEG", "PNG", "WEBP", "JPG"}:
        raise ValueError(f"Unsupported image format: {image_format}. Allowed formats: JPG, JPEG, PNG, WEBP.")

    # Convert to standard RGB (e.g. from RGBA or grayscale)
    if pil_image.mode != "RGB":
        pil_image = pil_image.convert("RGB")

    transform = get_inference_transforms()
    tensor = transform(pil_image)
    tensor = tensor.unsqueeze(0)  # Add batch dimension [1, 3, 224, 224]

    return tensor, pil_image
