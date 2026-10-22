"""
SmartRice AI - Phase 1: Rice Variety Classifier Training Pipeline
Model: MobileNetV2 Transfer Learning
Classes: Arborio, Basmati, Ipsala, Jasmine, Karacadag (5 classes)

Academic Data Science Integrity:
- Real training on processed Kaggle Rice Varieties dataset (processed_dataset/).
- Features frozen initially; classification head trained with Adam.
- Validation monitored with EarlyStopping, ModelCheckpoint, and ReduceLROnPlateau.
- Saves best model, final model, class_names.json, and training_history plot.
- Test set remains completely unseen during training.
"""

import os
import sys
import json
import time
import shutil
from pathlib import Path
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader
from torchvision import datasets, models, transforms
from PIL import Image
import matplotlib.pyplot as plt
import seaborn as sns

PROJECT_ROOT = Path(__file__).resolve().parent.parent
PROCESSED_DIR = PROJECT_ROOT / "processed_dataset"
MODELS_DIR = PROJECT_ROOT / "models"
RESULTS_DIR = PROJECT_ROOT / "results"
BACKEND_MODEL_DIR = PROJECT_ROOT / "backend" / "models" / "image_model"

RANDOM_SEED = 42
BATCH_SIZE = 64
EPOCHS_HEAD = 5
EPOCHS_FINETUNE = 2
LEARNING_RATE_HEAD = 5e-4
LEARNING_RATE_FINETUNE = 5e-5
IMAGE_SIZE = (224, 224)


def set_seed(seed=RANDOM_SEED):
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)


def get_transforms():
    """
    Standard transfer learning transforms for MobileNetV2.
    Training uses gentle augmentation: small rotation (+/-15 deg), horizontal flip,
    mild zoom (RandomResizedCrop with scale 0.9-1.0), and mild brightness jitter (+/-0.1).
    Validation uses deterministic resize and normalization only.
    """
    train_transform = transforms.Compose([
        transforms.Resize(IMAGE_SIZE),
        transforms.RandomHorizontalFlip(p=0.5),
        transforms.RandomRotation(degrees=15),
        transforms.ColorJitter(brightness=0.1, contrast=0.1),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])

    val_transform = transforms.Compose([
        transforms.Resize(IMAGE_SIZE),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])

    return train_transform, val_transform


def build_mobilenetv2_model(num_classes: int = 5):
    """
    Builds MobileNetV2 with custom classification head for 5-class rice variety classification.
    Input Image (224x224x3)
    ↓
    MobileNetV2 pretrained backbone (ImageNet weights)
    ↓
    Global Average Pooling
    ↓
    Dropout (0.3)
    ↓
    Dense layer (128 units) + ReLU
    ↓
    Dropout (0.2)
    ↓
    Dense layer (num_classes=5)
    """
    model = models.mobilenet_v2(weights=models.MobileNet_V2_Weights.DEFAULT)

    # Freeze convolutional feature backbone initially
    for param in model.features.parameters():
        param.requires_grad = False

    in_features = model.classifier[1].in_features  # 1280
    model.classifier = nn.Sequential(
        nn.Dropout(p=0.3),
        nn.Linear(in_features, 128),
        nn.ReLU(inplace=True),
        nn.Dropout(p=0.2),
        nn.Linear(128, num_classes)
    )

    return model


def train_model():
    set_seed(RANDOM_SEED)
    torch.set_num_threads(8)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    print("=" * 70)
    print("SMART RICE AI - PHASE 1: MOBILENETV2 TRAINING PIPELINE")
    print("=" * 70)
    print(f"Device: {device} (Thread count: {torch.get_num_threads()})")

    train_dir = PROCESSED_DIR / "train"
    val_dir = PROCESSED_DIR / "validation"
    test_dir = PROCESSED_DIR / "test"

    if not train_dir.exists() or not val_dir.exists():
        raise FileNotFoundError(f"Processed dataset not found at {PROCESSED_DIR}. Run training/dataset_report.py first!")

    train_transform, val_transform = get_transforms()

    train_dataset = datasets.ImageFolder(train_dir, transform=train_transform)
    val_dataset = datasets.ImageFolder(val_dir, transform=val_transform)

    class_names = train_dataset.classes
    num_classes = len(class_names)

    print(f"\nDataset Overview:")
    print(f"  Classes ({num_classes}): {class_names}")
    print(f"  Training samples:   {len(train_dataset)}")
    print(f"  Validation samples: {len(val_dataset)}")
    print(f"  Batch size:         {BATCH_SIZE}")
    print(f"  Image size:         {IMAGE_SIZE}\n")

    train_loader = DataLoader(train_dataset, batch_size=BATCH_SIZE, shuffle=True, num_workers=0)
    val_loader = DataLoader(val_dataset, batch_size=BATCH_SIZE, shuffle=False, num_workers=0)

    # Ensure output directories
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    BACKEND_MODEL_DIR.mkdir(parents=True, exist_ok=True)

    # Save class_names.json
    class_names_path = MODELS_DIR / "class_names.json"
    with open(class_names_path, "w") as f:
        json.dump(class_names, f, indent=4)
    shutil.copy2(class_names_path, BACKEND_MODEL_DIR / "class_names.json")
    print(f"Saved class names to {class_names_path}")

    # Build model
    model = build_mobilenetv2_model(num_classes).to(device)

    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.classifier.parameters(), lr=LEARNING_RATE_HEAD)
    scheduler = optim.lr_scheduler.ReduceLROnPlateau(optimizer, mode='min', factor=0.5, patience=1)

    history = {
        "epoch": [],
        "train_loss": [],
        "train_acc": [],
        "val_loss": [],
        "val_acc": [],
        "lr": []
    }

    best_val_loss = float("inf")
    best_val_acc = 0.0
    best_model_path = MODELS_DIR / "rice_variety_mobilenetv2.pth"
    final_model_path = MODELS_DIR / "rice_variety_mobilenetv2_final.pth"

    early_stopping_patience = 4
    early_stopping_counter = 0

    total_epochs = EPOCHS_HEAD + EPOCHS_FINETUNE

    print("\n--- PHASE 1A: TRAINING CLASSIFIER HEAD (Backbone Frozen) ---")
    start_time = time.time()

    for epoch in range(total_epochs):
        epoch_num = epoch + 1

        # Phase 1B: Fine-tuning switch
        if epoch_num == EPOCHS_HEAD + 1 and EPOCHS_FINETUNE > 0:
            print("\n--- PHASE 1B: FINE-TUNING BACKBONE (Unfreezing Top Residual Blocks) ---")
            # Unfreeze top feature layers
            for param in model.features[-3:].parameters():
                param.requires_grad = True
            optimizer = optim.Adam([
                {"params": model.features[-3:].parameters(), "lr": LEARNING_RATE_FINETUNE},
                {"params": model.classifier.parameters(), "lr": LEARNING_RATE_FINETUNE * 2}
            ])
            scheduler = optim.lr_scheduler.ReduceLROnPlateau(optimizer, mode='min', factor=0.5, patience=1)

        model.train()
        train_loss = 0.0
        train_correct = 0
        train_total = 0

        current_lr = optimizer.param_groups[0]['lr']
        print(f"\nEpoch [{epoch_num}/{total_epochs}] (lr: {current_lr:.6f})")

        for batch_idx, (images, labels) in enumerate(train_loader):
            images, labels = images.to(device), labels.to(device)

            optimizer.zero_grad()
            outputs = model(images)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()

            train_loss += loss.item() * images.size(0)
            _, preds = torch.max(outputs, 1)
            train_correct += (preds == labels).sum().item()
            train_total += labels.size(0)

            if (batch_idx + 1) % 20 == 0 or (batch_idx + 1) == len(train_loader):
                batch_acc = (train_correct / train_total) * 100
                print(f"  Batch [{batch_idx+1:02d}/{len(train_loader)}] Loss: {loss.item():.4f} - Running Acc: {batch_acc:.2f}%")

        epoch_train_loss = train_loss / train_total
        epoch_train_acc = train_correct / train_total

        # Validation evaluation
        model.eval()
        val_loss = 0.0
        val_correct = 0
        val_total = 0

        with torch.no_grad():
            for images, labels in val_loader:
                images, labels = images.to(device), labels.to(device)
                outputs = model(images)
                loss = criterion(outputs, labels)

                val_loss += loss.item() * images.size(0)
                _, preds = torch.max(outputs, 1)
                val_correct += (preds == labels).sum().item()
                val_total += labels.size(0)

        epoch_val_loss = val_loss / val_total
        epoch_val_acc = val_correct / val_total

        scheduler.step(epoch_val_loss)

        # Record history
        history["epoch"].append(epoch_num)
        history["train_loss"].append(round(epoch_train_loss, 4))
        history["train_acc"].append(round(epoch_train_acc, 4))
        history["val_loss"].append(round(epoch_val_loss, 4))
        history["val_acc"].append(round(epoch_val_acc, 4))
        history["lr"].append(current_lr)

        print(f"  -> Epoch {epoch_num} Summary: "
              f"Train Loss: {epoch_train_loss:.4f} | Train Acc: {epoch_train_acc*100:.2f}% | "
              f"Val Loss: {epoch_val_loss:.4f} | Val Acc: {epoch_val_acc*100:.2f}%")

        # Model Checkpoint (save best model)
        if epoch_val_acc > best_val_acc or (epoch_val_acc == best_val_acc and epoch_val_loss < best_val_loss):
            best_val_acc = epoch_val_acc
            best_val_loss = epoch_val_loss
            torch.save(model.state_dict(), best_model_path)
            shutil.copy2(best_model_path, BACKEND_MODEL_DIR / "rice_variety_mobilenet.pth")
            print(f"  [*] Model Checkpoint: Best validation accuracy ({best_val_acc*100:.2f}%) saved to {best_model_path}")
            early_stopping_counter = 0
        else:
            early_stopping_counter += 1
            if early_stopping_counter >= early_stopping_patience:
                print(f"  [!] Early stopping triggered after {epoch_num} epochs (no validation improvement).")
                break

    total_training_time = time.time() - start_time
    print(f"\nTraining completed in {total_training_time / 60:.2f} minutes.")

    # Save final model state
    torch.save(model.state_dict(), final_model_path)
    print(f"Saved final model state to {final_model_path}")

    # Save history JSON
    history_path = RESULTS_DIR / "training_history.json"
    with open(history_path, "w") as f:
        json.dump(history, f, indent=4)
    print(f"Saved training history to {history_path}")

    # Plot training curves (Accuracy and Loss)
    print("Generating training history graphs...")
    sns.set_theme(style="whitegrid")
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5), dpi=300)

    epochs_range = history["epoch"]

    # Accuracy Plot
    ax1.plot(epochs_range, [acc * 100 for acc in history["train_acc"]], 'o-', label="Training Accuracy", color="#2563eb", linewidth=2)
    ax1.plot(epochs_range, [acc * 100 for acc in history["val_acc"]], 's-', label="Validation Accuracy", color="#10b981", linewidth=2)
    ax1.set_title("Training and Validation Accuracy", fontsize=13, fontweight='bold', pad=10)
    ax1.set_xlabel("Epoch", fontsize=11, fontweight='bold')
    ax1.set_ylabel("Accuracy (%)", fontsize=11, fontweight='bold')
    ax1.set_xticks(epochs_range)
    ax1.legend(loc="lower right", frameon=True, facecolor='white')
    ax1.grid(True, linestyle="--", alpha=0.6)

    # Loss Plot
    ax2.plot(epochs_range, history["train_loss"], 'o-', label="Training Loss", color="#dc2626", linewidth=2)
    ax2.plot(epochs_range, history["val_loss"], 's-', label="Validation Loss", color="#f59e0b", linewidth=2)
    ax2.set_title("Training and Validation Loss", fontsize=13, fontweight='bold', pad=10)
    ax2.set_xlabel("Epoch", fontsize=11, fontweight='bold')
    ax2.set_ylabel("Cross Entropy Loss", fontsize=11, fontweight='bold')
    ax2.set_xticks(epochs_range)
    ax2.legend(loc="upper right", frameon=True, facecolor='white')
    ax2.grid(True, linestyle="--", alpha=0.6)

    plt.tight_layout()
    history_plot_path = RESULTS_DIR / "training_history.png"
    plt.savefig(history_plot_path)
    plt.close()
    print(f"Saved training history plot to {history_plot_path}")

    print("\n" + "=" * 70)
    print(f"TRAINING COMPLETE. Best Validation Accuracy: {best_val_acc * 100:.2f}%")
    print(f"Best Model File: {best_model_path}")
    print("=" * 70)

    return best_model_path, history


if __name__ == "__main__":
    train_model()
