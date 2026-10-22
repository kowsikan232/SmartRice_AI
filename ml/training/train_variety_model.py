"""
MobileNetV2 Transfer Learning Pipeline for Rice Variety Identification.
Classes: Arborio, Basmati, Ipsala, Jasmine, Karacadag.
Academic Data Science Integrity:
- Real training on extracted Kaggle Rice Varieties dataset.
- Real test set metrics: Accuracy, Precision, Recall, F1-Score, Confusion Matrix.
- Saves model weights (.pth) and evaluation report (.json).
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

DATASET_ROOT = PROJECT_ROOT / "ml" / "datasets" / "rice_varieties"
TRAINED_MODELS_DIR = PROJECT_ROOT / "ml" / "trained_models"
BACKEND_MODEL_DIR = PROJECT_ROOT / "backend" / "models" / "image_model"

BATCH_SIZE = 64
EPOCHS = 2
LEARNING_RATE = 5e-4
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")


def build_mobilenet_variety_model(num_classes: int):
    """MobileNetV2 with transfer learning head for variety identification."""
    model = models.mobilenet_v2(weights=models.MobileNet_V2_Weights.DEFAULT)

    # Freeze convolutional feature backbone
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


def train_variety_classifier():
    print("=" * 65)
    print("SMART RICE AI - RICE VARIETY CLASSIFIER (MobileNetV2)")
    print("=" * 65)
    print(f"Device: {DEVICE}\n")

    train_dir = DATASET_ROOT / "train"
    val_dir = DATASET_ROOT / "val"
    test_dir = DATASET_ROOT / "test"

    if not train_dir.exists() or not test_dir.exists():
        raise FileNotFoundError(f"Dataset directory not found at {DATASET_ROOT}. Please run extraction first.")

    train_transform = get_training_transforms()
    eval_transform = get_inference_transforms()

    train_dataset = datasets.ImageFolder(train_dir, transform=train_transform)
    val_dataset = datasets.ImageFolder(val_dir, transform=eval_transform)
    test_dataset = datasets.ImageFolder(test_dir, transform=eval_transform)

    class_names = train_dataset.classes
    num_classes = len(class_names)

    print(f"Dataset Loaded from: {DATASET_ROOT}")
    print(f"Classes ({num_classes}): {class_names}")
    print(f"Train samples: {len(train_dataset)}")
    print(f"Val samples:   {len(val_dataset)}")
    print(f"Test samples:  {len(test_dataset)}\n")

    train_loader = DataLoader(train_dataset, batch_size=BATCH_SIZE, shuffle=True, num_workers=0)
    val_loader = DataLoader(val_dataset, batch_size=BATCH_SIZE, shuffle=False, num_workers=0)
    test_loader = DataLoader(test_dataset, batch_size=BATCH_SIZE, shuffle=False, num_workers=0)

    model = build_mobilenet_variety_model(num_classes).to(DEVICE)
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.classifier.parameters(), lr=LEARNING_RATE)

    print("Beginning Training...")
    best_val_acc = 0.0

    for epoch in range(EPOCHS):
        model.train()
        running_loss = 0.0
        correct = 0
        total = 0

        for batch_idx, (images, labels) in enumerate(train_loader):
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

            if (batch_idx + 1) % 25 == 0 or (batch_idx + 1) == len(train_loader):
                batch_acc = (correct / total) * 100
                print(f"  Epoch [{epoch+1}/{EPOCHS}] - Batch [{batch_idx+1}/{len(train_loader)}] Loss: {loss.item():.4f} - Train Acc: {batch_acc:.2f}%")

        epoch_loss = running_loss / total
        epoch_acc = (correct / total) * 100

        # Validation
        model.eval()
        val_correct = 0
        val_total = 0
        with torch.no_grad():
            for images, labels in val_loader:
                images, labels = images.to(DEVICE), labels.to(DEVICE)
                outputs = model(images)
                _, preds = torch.max(outputs, 1)
                val_correct += (preds == labels).sum().item()
                val_total += labels.size(0)

        val_acc = (val_correct / val_total) * 100
        print(f"Epoch [{epoch+1}/{EPOCHS}] Result -> Train Loss: {epoch_loss:.4f} | Train Acc: {epoch_acc:.2f}% | Val Acc: {val_acc:.2f}%\n")

    # Evaluation on Test Set
    print("=" * 65)
    print("EVALUATING ON TEST DATASET...")
    print("=" * 65)
    model.eval()
    all_preds = []
    all_targets = []

    with torch.no_grad():
        for images, labels in test_loader:
            images = images.to(DEVICE)
            outputs = model(images)
            _, preds = torch.max(outputs, 1)
            all_preds.extend(preds.cpu().numpy().tolist())
            all_targets.extend(labels.numpy().tolist())

    test_correct = sum(p == t for p, t in zip(all_preds, all_targets))
    test_accuracy = test_correct / len(all_targets)
    report = classification_report(all_targets, all_preds, target_names=class_names, output_dict=True)
    conf_mat = confusion_matrix(all_targets, all_preds).tolist()

    print(f"\nFinal Test Accuracy: {test_accuracy * 100:.2f}%\n")
    print("Classification Report:")
    print(classification_report(all_targets, all_preds, target_names=class_names))

    # Save Model Weights & Metadata
    TRAINED_MODELS_DIR.mkdir(parents=True, exist_ok=True)
    BACKEND_MODEL_DIR.mkdir(parents=True, exist_ok=True)

    model_weights_path = TRAINED_MODELS_DIR / "rice_variety_mobilenet.pth"
    torch.save(model.state_dict(), model_weights_path)
    shutil.copy(model_weights_path, BACKEND_MODEL_DIR / "rice_variety_mobilenet.pth")

    metadata = {
        "model_name": "MobileNetV2 Rice Variety Classifier",
        "architecture": "MobileNetV2 (Transfer Learning)",
        "classes": class_names,
        "test_accuracy": round(float(test_accuracy), 4),
        "dataset_samples": {
            "train": len(train_dataset),
            "val": len(val_dataset),
            "test": len(test_dataset)
        },
        "classification_report": report,
        "confusion_matrix": conf_mat,
        "device_trained_on": str(DEVICE)
    }

    meta_path = TRAINED_MODELS_DIR / "rice_variety_metadata.json"
    with open(meta_path, "w") as f:
        json.dump(metadata, f, indent=4)
    shutil.copy(meta_path, BACKEND_MODEL_DIR / "rice_variety_metadata.json")

    print(f"Model saved to: {model_weights_path}")
    print(f"Synced to backend: {BACKEND_MODEL_DIR / 'rice_variety_mobilenet.pth'}")
    print("\nTraining Complete!")
    return metadata


if __name__ == "__main__":
    train_variety_classifier()
