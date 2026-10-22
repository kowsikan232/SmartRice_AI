"""
SmartRice AI - Phase 1: Rice Variety Inference Script
Performs inference on a single image using the trained MobileNetV2 model.

Usage:
    python predict_image.py --image "path/to/image.jpg"
"""

import sys
import json
import argparse
from pathlib import Path
from PIL import Image
import torch
from torchvision import transforms

PROJECT_ROOT = Path(__file__).resolve().parent.parent
MODELS_DIR = PROJECT_ROOT / "models"
BACKEND_MODEL_DIR = PROJECT_ROOT / "backend" / "models" / "image_model"

from training.train_rice_variety import build_mobilenetv2_model, IMAGE_SIZE

INFERENCE_TRANSFORMS = transforms.Compose([
    transforms.Resize(IMAGE_SIZE),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
])


def load_model_and_classes():
    """Loads the trained model weights and class labels."""
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    # Locate class names
    class_names_path = MODELS_DIR / "class_names.json"
    if not class_names_path.exists():
        class_names_path = BACKEND_MODEL_DIR / "class_names.json"

    if not class_names_path.exists():
        raise FileNotFoundError(f"Class names file not found. Run training first!")

    with open(class_names_path, "r") as f:
        class_names = json.load(f)

    # Locate weights
    weights_path = MODELS_DIR / "rice_variety_mobilenetv2.pth"
    if not weights_path.exists():
        weights_path = BACKEND_MODEL_DIR / "rice_variety_mobilenet.pth"

    if not weights_path.exists():
        raise FileNotFoundError(f"Trained model weights not found at {weights_path}. Run training first!")

    model = build_mobilenetv2_model(len(class_names)).to(device)
    model.load_state_dict(torch.load(weights_path, map_location=device))
    model.eval()

    return model, class_names, device


def predict_single_image(image_path_or_bytes, model=None, class_names=None, device=None):
    """
    Runs model inference on an image file path or raw image bytes.
    Returns:
        dict: predicted_variety, confidence (float 0-1), probabilities (dict of class: float 0-1), top_predictions (list)
    """
    if model is None or class_names is None or device is None:
        model, class_names, device = load_model_and_classes()

    # Load and validate PIL image
    try:
        if isinstance(image_path_or_bytes, (str, Path)):
            img_path = Path(image_path_or_bytes)
            if not img_path.exists():
                raise FileNotFoundError(f"Image not found at: {img_path}")
            img = Image.open(img_path)
        else:
            import io
            img = Image.open(io.BytesIO(image_path_or_bytes))

        # Convert to RGB (handles RGBA, grayscale, etc.)
        img = img.convert("RGB")
    except Exception as e:
        raise ValueError(f"Unable to read or decode image: {e}")

    # Preprocess
    tensor = INFERENCE_TRANSFORMS(img).unsqueeze(0).to(device)

    # Inference
    with torch.no_grad():
        outputs = model(tensor)
        probs = torch.softmax(outputs, dim=1).squeeze(0)

    probs_dict = {cls: float(probs[i].item()) for i, cls in enumerate(class_names)}
    sorted_probs = sorted(probs_dict.items(), key=lambda x: x[1], reverse=True)

    predicted_variety = sorted_probs[0][0]
    top_confidence = sorted_probs[0][1]

    # Check for insect presence
    has_insect = False
    insect_type = None
    try:
        from backend.services.image_service import image_service
        raw_bytes = image_path_or_bytes if isinstance(image_path_or_bytes, bytes) else Path(image_path_or_bytes).read_bytes()
        fname = Path(image_path_or_bytes).name if isinstance(image_path_or_bytes, (str, Path)) else None
        ins_res = image_service.detect_insect(raw_bytes, filename=fname)
        has_insect = ins_res.get("has_insect", False)
        insect_type = ins_res.get("insect_type")
    except Exception:
        pass

    return {
        "predicted_variety": predicted_variety,
        "confidence": top_confidence,
        "probabilities": probs_dict,
        "top_predictions": sorted_probs,
        "has_insect": has_insect,
        "insect_detected": has_insect,
        "insect_message": "Found insect" if has_insect else None,
        "insect_type": insect_type
    }


def main():
    parser = argparse.ArgumentParser(description="Predict rice variety and scan for storage pests from image.")
    parser.add_argument("--image", required=True, help="Path to input rice grain image.")
    args = parser.parse_args()

    try:
        result = predict_single_image(args.image)
        pred_var = result["predicted_variety"]
        conf_pct = result["confidence"] * 100

        if result.get("has_insect"):
            print("\n" + "="*40)
            print(">>> Found insect <<<")
            print(f"Pest Identified: {result.get('insect_type') or 'Storage Pest / Weevil'}")
            print("="*40 + "\n")

        print("Predicted Variety:")
        print(f"{pred_var}")
        print("\nConfidence:")
        print(f"{conf_pct:.2f}%")
        print("\nTop Predictions:\n")

        for rank, (cls, prob) in enumerate(result["top_predictions"], start=1):
            print(f"{rank}. {cls} {prob * 100:.2f}%")
        print()

    except Exception as e:
        print(f"Error during prediction: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
