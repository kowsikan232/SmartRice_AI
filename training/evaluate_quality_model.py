"""
SmartRice AI - Phase 1: Rice Grain Quality & Defect Evaluation Pipeline
Evaluates the trained MobileNetV2 Quality Classifier exclusively on the UNSEEN test set (processed_quality_dataset/test).

Academic Integrity:
- Real test set evaluation on unseen rice defect images.
- Calculates test accuracy, per-class metrics, macro avg, weighted avg.
- Saves quality_confusion_matrix.png with exact defect labels (Broken, Chalky, Stained, Whole).
- Saves quality_classification_report.txt and quality_evaluation_results.json.
- Integrates documented agricultural quality grading rules.
"""

import os
import sys
import json
from pathlib import Path
import numpy as np
import torch
from torch.utils.data import DataLoader
from torchvision import datasets, transforms
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score, precision_recall_fscore_support
import matplotlib.pyplot as plt
import seaborn as sns

PROJECT_ROOT = Path(__file__).resolve().parent.parent
PROCESSED_DIR = PROJECT_ROOT / "processed_quality_dataset"
MODELS_DIR = PROJECT_ROOT / "models"
RESULTS_DIR = PROJECT_ROOT / "results"
BACKEND_MODEL_DIR = PROJECT_ROOT / "backend" / "models" / "image_model"

from training.train_rice_quality import build_mobilenetv2_quality_model, IMAGE_SIZE
from training.quality_dataset_report import QUALITY_GRADING_RULES


def evaluate_quality_test_dataset(model_path: Path = None):
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print("=" * 75, flush=True)
    print("SMART RICE AI - EVALUATION ON UNSEEN RICE QUALITY TEST DATASET", flush=True)
    print("=" * 75, flush=True)
    print(f"Device: {device}", flush=True)

    test_dir = PROCESSED_DIR / "test"
    if not test_dir.exists():
        raise FileNotFoundError(f"Test directory not found at: {test_dir}")

    # Load class names
    class_names_path = MODELS_DIR / "quality_class_names.json"
    if not class_names_path.exists():
        class_names_path = BACKEND_MODEL_DIR / "quality_class_names.json"

    with open(class_names_path, "r") as f:
        class_names = json.load(f)

    num_classes = len(class_names)
    print(f"Supported Defect Classes ({num_classes}): {class_names}", flush=True)

    # Determine model path
    if model_path is None or not model_path.exists():
        primary_path = MODELS_DIR / "rice_quality_mobilenetv2.pth"
        backend_path = BACKEND_MODEL_DIR / "rice_quality_mobilenet.pth"
        if primary_path.exists():
            model_path = primary_path
        elif backend_path.exists():
            model_path = backend_path
        else:
            raise FileNotFoundError("Trained quality model weights not found. Run training/train_rice_quality.py first!")

    print(f"Loading trained weights from: {model_path}", flush=True)
    model = build_mobilenetv2_quality_model(num_classes).to(device)
    model.load_state_dict(torch.load(model_path, map_location=device))
    model.eval()

    # Deterministic test transforms (NO random augmentation)
    test_transform = transforms.Compose([
        transforms.Resize(IMAGE_SIZE),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])

    test_dataset = datasets.ImageFolder(test_dir, transform=test_transform)
    test_loader = DataLoader(test_dataset, batch_size=64, shuffle=False, num_workers=0)

    print(f"Test samples: {len(test_dataset)} across {len(test_dataset.classes)} classes\n", flush=True)

    all_preds = []
    all_targets = []
    all_probs = []

    print("Running inference on unseen quality test set...", flush=True)
    with torch.no_grad():
        for images, labels in test_loader:
            images = images.to(device)
            outputs = model(images)
            probs = torch.softmax(outputs, dim=1)
            _, preds = torch.max(probs, 1)

            all_preds.extend(preds.cpu().numpy().tolist())
            all_targets.extend(labels.numpy().tolist())
            all_probs.extend(probs.cpu().numpy().tolist())

    all_preds = np.array(all_preds)
    all_targets = np.array(all_targets)

    # 1. Overall Accuracy
    accuracy = float(accuracy_score(all_targets, all_preds))

    # 2. Precision, Recall, F1 (macro and weighted)
    macro_p, macro_r, macro_f1, _ = precision_recall_fscore_support(all_targets, all_preds, average='macro', zero_division=0)
    weighted_p, weighted_r, weighted_f1, _ = precision_recall_fscore_support(all_targets, all_preds, average='weighted', zero_division=0)

    # 3. Detailed classification report
    report_dict = classification_report(all_targets, all_preds, target_names=class_names, output_dict=True, zero_division=0)
    report_text = classification_report(all_targets, all_preds, target_names=class_names, digits=4, zero_division=0)

    # 4. Confusion Matrix
    cm = confusion_matrix(all_targets, all_preds)

    print("\n" + "=" * 75, flush=True)
    print("QUALITY TEST EVALUATION RESULTS (100% UNSEEN TEST SET)", flush=True)
    print("=" * 75, flush=True)
    print(f"Test Accuracy:       {accuracy * 100:.2f}% ({np.sum(all_preds == all_targets)} / {len(all_targets)})", flush=True)
    print(f"Macro Precision:     {macro_p * 100:.2f}%", flush=True)
    print(f"Macro Recall:        {macro_r * 100:.2f}%", flush=True)
    print(f"Macro F1-Score:      {macro_f1 * 100:.2f}%", flush=True)
    print(f"Weighted Precision:  {weighted_p * 100:.2f}%", flush=True)
    print(f"Weighted Recall:     {weighted_r * 100:.2f}%", flush=True)
    print(f"Weighted F1-Score:   {weighted_f1 * 100:.2f}%", flush=True)
    print("\nDetailed Classification Report:", flush=True)
    print(report_text, flush=True)

    RESULTS_DIR.mkdir(parents=True, exist_ok=True)

    # 5. Save Classification Report Text
    txt_path = RESULTS_DIR / "quality_classification_report.txt"
    with open(txt_path, "w") as f:
        f.write("=" * 75 + "\n")
        f.write("SMART RICE AI - PHASE 1: RICE QUALITY & DEFECT TEST CLASSIFICATION REPORT\n")
        f.write("=" * 75 + "\n\n")
        f.write("Model:               MobileNetV2 (Transfer Learning)\n")
        f.write(f"Test Samples:        {len(all_targets)}\n")
        f.write(f"Overall Accuracy:    {accuracy * 100:.4f}%\n")
        f.write(f"Macro Precision:     {macro_p * 100:.4f}%\n")
        f.write(f"Macro Recall:        {macro_r * 100:.4f}%\n")
        f.write(f"Macro F1-Score:      {macro_f1 * 100:.4f}%\n")
        f.write(f"Weighted Precision:  {weighted_p * 100:.4f}%\n")
        f.write(f"Weighted Recall:     {weighted_r * 100:.4f}%\n")
        f.write(f"Weighted F1-Score:   {weighted_f1 * 100:.4f}%\n\n")
        f.write("Per-Class Defect Metrics:\n")
        f.write(report_text + "\n\n")
        f.write("Agricultural Quality Grading Rules (Documented Presentation Layer):\n")
        for cls, rule in QUALITY_GRADING_RULES.items():
            f.write(f"  - {cls:8s} -> Grade {rule['quality_grade']} ({rule['quality_level']}): {rule['quality_description']}\n")
        f.write("\nDisclaimer: Quality grade is a derived visual-grade classification based on documented defect categories; it is not an original dataset label.\n")
    print(f"Saved quality classification report to: {txt_path}", flush=True)

    # 6. Plot & Save Confusion Matrix
    print("Generating quality confusion matrix plot...", flush=True)
    plt.figure(figsize=(8, 7), dpi=300)
    sns.heatmap(
        cm,
        annot=True,
        fmt='d',
        cmap='Blues',
        xticklabels=class_names,
        yticklabels=class_names,
        cbar=True,
        linewidths=0.5,
        annot_kws={"size": 13, "weight": "bold"}
    )
    plt.title("SmartRice AI - Confusion Matrix (Test Set)\nMobileNetV2 Rice Quality & Defect Classification",
              fontsize=13, fontweight='bold', pad=15)
    plt.xlabel("Predicted Defect Class", fontsize=11, fontweight='bold', labelpad=10)
    plt.ylabel("Actual Defect Class", fontsize=11, fontweight='bold', labelpad=10)
    plt.tight_layout()

    cm_path = RESULTS_DIR / "quality_confusion_matrix.png"
    plt.savefig(cm_path)
    plt.close()
    print(f"Saved quality confusion matrix plot to: {cm_path}", flush=True)

    # 7. Save JSON results
    eval_results = {
        "model_architecture": "MobileNetV2",
        "model_weights_file": str(model_path.name),
        "total_test_samples": int(len(all_targets)),
        "test_accuracy": round(accuracy, 4),
        "macro_metrics": {
            "precision": round(float(macro_p), 4),
            "recall": round(float(macro_r), 4),
            "f1_score": round(float(macro_f1), 4)
        },
        "weighted_metrics": {
            "precision": round(float(weighted_p), 4),
            "recall": round(float(weighted_r), 4),
            "f1_score": round(float(weighted_f1), 4)
        },
        "per_class_metrics": {
            cls: {
                "precision": round(report_dict[cls]["precision"], 4),
                "recall": round(report_dict[cls]["recall"], 4),
                "f1_score": round(report_dict[cls]["f1-score"], 4),
                "support": int(report_dict[cls]["support"])
            }
            for cls in class_names
        },
        "confusion_matrix": cm.tolist(),
        "classes": class_names,
        "quality_grading_layer": QUALITY_GRADING_RULES,
        "disclaimer": "Quality grade is a derived visual-grade classification based on documented defect categories; it is not an original dataset label."
    }

    json_path = RESULTS_DIR / "quality_evaluation_results.json"
    with open(json_path, "w") as f:
        json.dump(eval_results, f, indent=4)
    print(f"Saved quality evaluation JSON to: {json_path}", flush=True)

    print("=" * 75, flush=True)
    print("QUALITY EVALUATION COMPLETE", flush=True)
    print("=" * 75, flush=True)
    return eval_results


if __name__ == "__main__":
    evaluate_quality_test_dataset()
