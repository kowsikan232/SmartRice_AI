"""
MobileNetV2 Transfer Learning Pipeline for Rice Grain Quality & Defect Classification.
Categorizes rice grain images based on real physical defect classes:
- Whole   (Good Quality / Grade A)
- Chalky  (Medium Quality / Chalky grain defect)
- Broken  (Medium Quality / Broken grain defect)
- Stained (Spoiled / Mold / Discolored damaged grain)

Academic Data Science Rules:
- Trains on actual extracted dataset without synthetic fabrication.
- Evaluates real test set metrics: Accuracy, Precision, Recall, F1-Score, Confusion Matrix.
"""

import os
import sys
import json
import shutil
from pathlib import Path
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader
from torchvision import datasets, models
from sklearn.metrics import classification_report, confusion_matrix

CURRENT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = CURRENT_DIR.parent.parent
sys.path.append(str(PROJECT_ROOT))

from ml.preprocessing.image_transforms import get_training_transforms, get_inference_transforms

TRAINED_MODELS_DIR = PROJECT_ROOT / "ml" / "trained_models"
BACKEND_MODEL_DIR = PROJECT_ROOT / "backend" / "models" / "image_model"

BATCH_SIZE = 32
EPOCHS = 2
LEARNING_RATE = 2e-4
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")


def resolve_dataset_paths():
    """
    Auto-detects either extracted rice_dataset or rice_images structure.
    """
    candidates = [
        PROJECT_ROOT / "ml" / "datasets" / "rice_dataset",
        PROJECT_ROOT / "ml" / "datasets" / "rice_images"
    ]

    for root in candidates:
        if root.exists():
            train_dir = root / "train"
            val_dir = root / "val" if (root / "val").exists() else root / "validation"
            test_dir = root / "test"

            if train_dir.exists() and test_dir.exists():
                classes = [d.name for d in train_dir.iterdir() if d.is_dir() and not d.name.startswith(".")]
                total_train = sum(len(list(d.glob("*.*"))) for d in train_dir.iterdir() if d.is_dir())
                if total_train > 0:
                    return {
                        "root": root,
                        "train_dir": train_dir,
                        "val_dir": val_dir if val_dir.exists() else test_dir,
                        "test_dir": test_dir,
                        "classes": sorted(classes),
                        "total_train_images": total_train
                    }
    return None


def check_dataset_integrity():
    """Checks whether valid dataset paths exist."""
    return resolve_dataset_paths() is not None


def build_mobilenet_model(num_classes: int):
    """Constructs MobileNetV2 with transfer-learning classification head."""
    model = models.mobilenet_v2(weights=models.MobileNet_V2_Weights.DEFAULT)

    # Freeze base convolutional features
    for param in model.features.parameters():
        param.requires_grad = False

    in_features = model.classifier[1].in_features
    model.classifier = nn.Sequential(
        nn.Dropout(p=0.3),
        nn.Linear(in_features, 128),
        nn.ReLU(),
        nn.Dropout(p=0.2),
        nn.Linear(128, num_classes)
    )
    return model


def train_image_classifier():
    print("=" * 65)
    print("SMART RICE AI - IMAGE QUALITY CLASSIFIER (MobileNetV2)")
    print("=" * 65)
    print(f"Device: {DEVICE}\n")

    dataset_info = resolve_dataset_paths()
    if not dataset_info:
        print("\n" + "!" * 65)
        print("STATUS: Image dataset required before training.")
        print("No valid image folders found in ml/datasets/rice_dataset or ml/datasets/rice_images.")
        print("!" * 65)
        return False

    train_dir = dataset_info["train_dir"]
    val_dir = dataset_info["val_dir"]
    test_dir = dataset_info["test_dir"]
    classes = dataset_info["classes"]

    print(f"Dataset root: {dataset_info['root']}")
    print(f"Detected classes ({len(classes)}): {classes}")
    print(f"Total training images: {dataset_info['total_train_images']}\n")

    def is_valid_image(path):
        try:
            p = Path(path)
            if not p.is_file() or p.stat().st_size == 0:
                return False
            if p.suffix.lower() not in {".jpg", ".jpeg", ".png", ".webp"}:
                return False
            return True
        except Exception:
            return False

    train_dataset = datasets.ImageFolder(str(train_dir), transform=get_training_transforms(), is_valid_file=is_valid_image)
    val_dataset = datasets.ImageFolder(str(val_dir), transform=get_inference_transforms(), is_valid_file=is_valid_image)
    test_dataset = datasets.ImageFolder(str(test_dir), transform=get_inference_transforms(), is_valid_file=is_valid_image)

    print(f"Train split: {len(train_dataset)} images")
    print(f"Validation split: {len(val_dataset)} images")
    print(f"Test split: {len(test_dataset)} images\n")

    train_loader = DataLoader(train_dataset, batch_size=BATCH_SIZE, shuffle=True, num_workers=0)
    val_loader = DataLoader(val_dataset, batch_size=BATCH_SIZE, shuffle=False, num_workers=0)
    test_loader = DataLoader(test_dataset, batch_size=BATCH_SIZE, shuffle=False, num_workers=0)

    num_classes = len(classes)
    model = build_mobilenet_model(num_classes).to(DEVICE)

    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.classifier.parameters(), lr=LEARNING_RATE)

    best_val_acc = 0.0
    best_weights_path = TRAINED_MODELS_DIR / "rice_quality_mobilenet.pth"
    TRAINED_MODELS_DIR.mkdir(parents=True, exist_ok=True)
    BACKEND_MODEL_DIR.mkdir(parents=True, exist_ok=True)

    print(f"Training classifier head for {EPOCHS} epochs...")
    for epoch in range(1, EPOCHS + 1):
        model.train()
        running_loss = 0.0
        correct = 0
        total = 0

        for batch_idx, (images, labels) in enumerate(train_loader, start=1):
            images, labels = images.to(DEVICE), labels.to(DEVICE)
            optimizer.zero_grad()
            outputs = model(images)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()

            running_loss += loss.item() * images.size(0)
            _, preds = torch.max(outputs, 1)
            correct += (preds == labels).sum().item()
            total += labels.size(0)

            if batch_idx % 40 == 0 or batch_idx == len(train_loader):
                batch_acc = (correct / total) * 100
                print(f"  [Epoch {epoch}/{EPOCHS}] Batch [{batch_idx}/{len(train_loader)}] Loss: {loss.item():.4f} Running Acc: {batch_acc:.1f}%")

        train_loss = running_loss / total
        train_acc = (correct / total) * 100

        # Validation
        model.eval()
        val_loss = 0.0
        val_correct = 0
        val_total = 0
        with torch.no_grad():
            for images, labels in val_loader:
                images, labels = images.to(DEVICE), labels.to(DEVICE)
                outputs = model(images)
                loss = criterion(outputs, labels)
                val_loss += loss.item() * images.size(0)
                _, preds = torch.max(outputs, 1)
                val_correct += (preds == labels).sum().item()
                val_total += labels.size(0)

        val_acc = (val_correct / val_total) * 100 if val_total > 0 else 0
        print(f"--> Epoch [{epoch}/{EPOCHS}] Completed | Train Acc: {train_acc:.2f}% | Val Acc: {val_acc:.2f}%\n")

        if val_acc >= best_val_acc:
            best_val_acc = val_acc
            torch.save(model.state_dict(), best_weights_path)
            shutil.copy(best_weights_path, BACKEND_MODEL_DIR / "rice_quality_mobilenet.pth")

    # Evaluation on Test Set
    print("=" * 65)
    print("TEST SET EVALUATION (Unseen Evaluation Partition)")
    print("=" * 65)
    model.load_state_dict(torch.load(best_weights_path, map_location=DEVICE))
    model.eval()

    all_preds, all_labels = [], []
    with torch.no_grad():
        for images, labels in test_loader:
            images, labels = images.to(DEVICE), labels.to(DEVICE)
            outputs = model(images)
            _, preds = torch.max(outputs, 1)
            all_preds.extend(preds.cpu().tolist())
            all_labels.extend(labels.cpu().tolist())

    report = classification_report(all_labels, all_preds, target_names=train_dataset.classes, output_dict=True)
    print(classification_report(all_labels, all_preds, target_names=train_dataset.classes))

    cm = confusion_matrix(all_labels, all_preds).tolist()
    print("\nConfusion Matrix:")
    print(confusion_matrix(all_labels, all_preds))

    # Quality Mapping for Phase 1 fusion
    quality_mapping = {
        "Whole": "Good",
        "Chalky": "Medium",
        "Broken": "Medium",
        "Stained": "Spoiled",
        "good": "Good",
        "medium": "Medium",
        "spoiled": "Spoiled"
    }

    metadata = {
        "architecture": "MobileNetV2",
        "classes": train_dataset.classes,
        "class_to_idx": train_dataset.class_to_idx,
        "quality_mapping": quality_mapping,
        "test_accuracy": report["accuracy"],
        "classification_report": report,
        "confusion_matrix": cm,
        "dataset_samples": {
            "train": len(train_dataset),
            "val": len(val_dataset),
            "test": len(test_dataset)
        }
    }

    meta_file = TRAINED_MODELS_DIR / "rice_quality_metadata.json"
    with open(meta_file, "w") as f:
        json.dump(metadata, f, indent=2)
    shutil.copy(meta_file, BACKEND_MODEL_DIR / "rice_quality_metadata.json")

    print("\n" + "=" * 65)
    print(f"FINAL TEST ACCURACY: {report['accuracy'] * 100:.2f}%")
    print(f"Weights saved: {best_weights_path}")
    print(f"Metadata saved: {meta_file}")
    print("=" * 65)
    return True


if __name__ == "__main__":
    train_image_classifier()
