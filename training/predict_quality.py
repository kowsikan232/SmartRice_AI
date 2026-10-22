"""
SmartRice AI - Phase 1: Rice Grain Quality & Defect Inference Script
Performs inference on a single rice grain image using the trained MobileNetV2 Quality Classifier
and maps the prediction to the documented Quality Grading Layer (Grade A/B/C/D).

Usage:
    python predict_quality.py --image "path/to/image.png"
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

from training.train_rice_quality import build_mobilenetv2_quality_model, IMAGE_SIZE
from training.quality_dataset_report import QUALITY_GRADING_RULES

INFERENCE_TRANSFORMS = transforms.Compose([
    transforms.Resize(IMAGE_SIZE),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
])


def load_quality_model_and_classes():
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    class_names_path = MODELS_DIR / "quality_class_names.json"
    if not class_names_path.exists():
        class_names_path = BACKEND_MODEL_DIR / "quality_class_names.json"

    if not class_names_path.exists():
        class_names = ["Broken", "Chalky", "Stained", "Whole"]
    else:
        with open(class_names_path, "r") as f:
            class_names = json.load(f)

    weights_path = MODELS_DIR / "rice_quality_mobilenetv2.pth"
    if not weights_path.exists():
        weights_path = BACKEND_MODEL_DIR / "rice_quality_mobilenet.pth"

    if not weights_path.exists():
        raise FileNotFoundError(f"Trained quality model weights not found at {weights_path}. Run training/train_rice_quality.py first!")

    model = build_mobilenetv2_quality_model(len(class_names)).to(device)
    model.load_state_dict(torch.load(weights_path, map_location=device))
    model.eval()

    return model, class_names, device


def predict_single_quality_image(image_path_or_bytes, model=None, class_names=None, device=None):
    """
    Runs model inference on an image file path or raw image bytes.
    Returns:
        dict: predicted_class, quality_grade, quality_level, quality_description, confidence,
              class_probabilities, defects_detected, disclaimer
    """
    if model is None or class_names is None or device is None:
        model, class_names, device = load_quality_model_and_classes()

    try:
        if isinstance(image_path_or_bytes, (str, Path)):
            img_path = Path(image_path_or_bytes)
            if not img_path.exists():
                raise FileNotFoundError(f"Image not found at: {img_path}")
            img = Image.open(img_path)
        else:
            import io
            img = Image.open(io.BytesIO(image_path_or_bytes))

        img = img.convert("RGB")
    except Exception as e:
        raise ValueError(f"Unable to read or decode image: {e}")

    tensor = INFERENCE_TRANSFORMS(img).unsqueeze(0).to(device)

    with torch.no_grad():
        outputs = model(tensor)
        probs = torch.softmax(outputs, dim=1).squeeze(0)

    probs_dict = {cls: float(probs[i].item()) for i, cls in enumerate(class_names)}
    sorted_probs = sorted(probs_dict.items(), key=lambda x: x[1], reverse=True)

    predicted_class, top_conf = sorted_probs[0]

    # Map to agricultural quality grading layer
    grading_info = QUALITY_GRADING_RULES.get(predicted_class, {
        "condition": predicted_class,
        "quality_grade": "Ungraded",
        "quality_level": "Undetermined",
        "quality_description": "Undocumented classification",
        "defects_detected": []
    })

    return {
        "status": "success",
        "predicted_class": predicted_class,
        "detected_condition": grading_info["condition"],
        "quality_grade": grading_info["quality_grade"],
        "quality_level": grading_info["quality_level"],
        "quality_description": grading_info["quality_description"],
        "confidence": round(top_conf, 4),
        "class_probabilities": {cls: round(prob, 4) for cls, prob in probs_dict.items()},
        "defects_detected": grading_info["defects_detected"],
        "top_predictions": [(cls, round(p, 4)) for cls, p in sorted_probs],
        "disclaimer": "Quality grade is a derived visual-grade classification based on documented defect categories; it is not an original dataset label."
    }


def main():
    parser = argparse.ArgumentParser(description="Predict rice quality and defect grade from image.")
    parser.add_argument("--image", required=True, help="Path to input rice grain image.")
    args = parser.parse_args()

    try:
        res = predict_single_quality_image(args.image)
        print("\n-----------------------------------")
        print("RICE QUALITY ANALYSIS")
        print("-----------------------------------\n")
        print("Detected Condition:")
        print(f"{res['detected_condition']}\n")
        print("Quality Grade:")
        print(f"{res['quality_grade']}\n")
        print("Quality Level:")
        print(f"{res['quality_level']}\n")
        print("Confidence:")
        print(f"{res['confidence'] * 100:.2f}%\n")
        print("Visible Defects:")
        defects = res['defects_detected']
        print(f"{', '.join(defects) if defects else 'None detected'}\n")
        print("Class Probabilities:")
        for cls, prob in res['top_predictions']:
            print(f"  {cls:8s}: {prob * 100:.2f}%")
        print("\nNote: " + res['disclaimer'])
        print("-----------------------------------\n")

    except Exception as e:
        print(f"Error during prediction: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
