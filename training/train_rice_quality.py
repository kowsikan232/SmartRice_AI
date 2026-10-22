"""
SmartRice AI - Phase 1: Rice Grain Quality & Defect Classifier Training Pipeline
Model: MobileNetV2 Transfer Learning
Classes: Broken, Chalky, Stained, Whole (4 classes)

Academic Data Science Integrity:
- Real training on processed Kaggle Rice Defect dataset (processed_quality_dataset/).
- Features frozen initially; classification head trained with Adam.
- Handles class imbalance using weighted CrossEntropyLoss.
- Validation monitored with ModelCheckpoint, EarlyStopping, and ReduceLROnPlateau.
- Saves best model, final model, quality_class_names.json, and training_history plot.
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
PROCESSED_DIR = PROJECT_ROOT / "processed_quality_dataset"
MODELS_DIR = PROJECT_ROOT / "models"
RESULTS_DIR = PROJECT_ROOT / "results"
BACKEND_MODEL_DIR = PROJECT_ROOT / "backend" / "models" / "image_model"

RANDOM_SEED = 42
BATCH_SIZE = 64
EPOCHS_HEAD = 4
EPOCHS_FINETUNE = 1
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
    and mild brightness/contrast jitter (+/-0.1).
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


def build_mobilenetv2_quality_model(num_classes: int = 4):
    """
    Builds MobileNetV2 with custom classification head for 4-class rice quality defect classification.
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
    Dense layer (num_classes=4)
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


def train_quality_model():
    set_seed(RANDOM_SEED)
    torch.set_num_threads(8)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    print("=" * 75, flush=True)
    print("SMART RICE AI - MOBILENETV2 RICE QUALITY & DEFECT CLASSIFIER TRAINING", flush=True)
    print("=" * 75, flush=True)
    print(f"Device: {device} (Thread count: {torch.get_num_threads()})", flush=True)

    train_dir = PROCESSED_DIR / "train"
    val_dir = PROCESSED_DIR / "validation"
    test_dir = PROCESSED_DIR / "test"

    if not train_dir.exists() or not val_dir.exists():
        raise FileNotFoundError(f"Processed dataset not found at {PROCESSED_DIR}. Run training/quality_dataset_report.py first!")

    train_transform, val_transform = get_transforms()

    train_dataset = datasets.ImageFolder(train_dir, transform=train_transform)
    val_dataset = datasets.ImageFolder(val_dir, transform=val_transform)

    class_names = train_dataset.classes
    num_classes = len(class_names)

    # Compute inverse class frequencies for balanced cross entropy
    class_counts = np.bincount(train_dataset.targets)
    total_samples = len(train_dataset.targets)
    class_weights = total_samples / (num_classes * class_counts.astype(np.float32))
    class_weights_tensor = torch.tensor(class_weights, dtype=torch.float32).to(device)

    print(f"\nDataset Overview:", flush=True)
    print(f"  Classes ({num_classes}): {class_names}", flush=True)
    print(f"  Class counts in train: {dict(zip(class_names, class_counts.tolist()))}", flush=True)
    print(f"  Computed class weights: {[round(w, 3) for w in class_weights.tolist()]}", flush=True)
    print(f"  Training samples:      {len(train_dataset)}", flush=True)
    print(f"  Validation samples:    {len(val_dataset)}", flush=True)
    print(f"  Batch size:            {BATCH_SIZE}", flush=True)
    print(f"  Image size:            {IMAGE_SIZE}\n", flush=True)

    train_loader = DataLoader(train_dataset, batch_size=BATCH_SIZE, shuffle=True, num_workers=0)
    val_loader = DataLoader(val_dataset, batch_size=BATCH_SIZE, shuffle=False, num_workers=0)

    # Ensure output directories
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    BACKEND_MODEL_DIR.mkdir(parents=True, exist_ok=True)

    # Save quality_class_names.json
    class_names_path = MODELS_DIR / "quality_class_names.json"
    with open(class_names_path, "w") as f:
        json.dump(class_names, f, indent=4)
    shutil.copy2(class_names_path, BACKEND_MODEL_DIR / "quality_class_names.json")
    print(f"Saved quality class names to {class_names_path}", flush=True)

    # Build model
    model = build_mobilenetv2_quality_model(num_classes).to(device)

    criterion = nn.CrossEntropyLoss(weight=class_weights_tensor)
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
    best_model_path = MODELS_DIR / "rice_quality_mobilenetv2.pth"
    final_model_path = MODELS_DIR / "rice_quality_mobilenetv2_final.pth"

    early_stopping_patience = 3
    early_stopping_counter = 0

    total_epochs = EPOCHS_HEAD + EPOCHS_FINETUNE

    print("\n--- PHASE 1A: TRAINING CLASSIFIER HEAD (Backbone Frozen) ---", flush=True)
    start_time = time.time()

    for epoch in range(total_epochs):
        epoch_num = epoch + 1

        # Phase 1B: Fine-tuning switch
        if epoch_num == EPOCHS_HEAD + 1 and EPOCHS_FINETUNE > 0:
            print("\n--- PHASE 1B: FINE-TUNING BACKBONE (Unfreezing Top Residual Blocks) ---", flush=True)
            for param in model.features[-2:].parameters():
                param.requires_grad = True
            optimizer = optim.Adam([
                {"params": model.features[-2:].parameters(), "lr": LEARNING_RATE_FINETUNE},
                {"params": model.classifier.parameters(), "lr": LEARNING_RATE_FINETUNE * 2}
            ])
            scheduler = optim.lr_scheduler.ReduceLROnPlateau(optimizer, mode='min', factor=0.5, patience=1)

        model.train()
        train_loss = 0.0
        train_correct = 0
        train_total = 0

        current_lr = optimizer.param_groups[0]['lr']
        print(f"\nEpoch [{epoch_num}/{total_epochs}] (lr: {current_lr:.6f})", flush=True)

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
                print(f"  Batch [{batch_idx+1:02d}/{len(train_loader)}] Loss: {loss.item():.4f} - Running Acc: {batch_acc:.2f}%", flush=True)

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
              f"Val Loss: {epoch_val_loss:.4f} | Val Acc: {epoch_val_acc*100:.2f}%", flush=True)

        # Model Checkpoint (save best model)
        if epoch_val_acc > best_val_acc or (epoch_val_acc == best_val_acc and epoch_val_loss < best_val_loss):
            best_val_acc = epoch_val_acc
            best_val_loss = epoch_val_loss
            torch.save(model.state_dict(), best_model_path)
            shutil.copy2(best_model_path, BACKEND_MODEL_DIR / "rice_quality_mobilenet.pth")
            print(f"  [*] Model Checkpoint: Best validation accuracy ({best_val_acc*100:.2f}%) saved to {best_model_path}", flush=True)
            early_stopping_counter = 0
        else:
            early_stopping_counter += 1
            if early_stopping_counter >= early_stopping_patience:
                print(f"  [!] Early stopping triggered after {epoch_num} epochs (no validation improvement).", flush=True)
                break

    total_training_time = time.time() - start_time
    print(f"\nTraining completed in {total_training_time / 60:.2f} minutes.", flush=True)

    # Save final model state
    torch.save(model.state_dict(), final_model_path)
    print(f"Saved final quality model state to {final_model_path}", flush=True)

    # Save history JSON
    history_path = RESULTS_DIR / "quality_training_history.json"
    with open(history_path, "w") as f:
        json.dump(history, f, indent=4)
    print(f"Saved quality training history to {history_path}", flush=True)

    # Plot training curves (Accuracy and Loss)
    print("Generating quality training history graphs...", flush=True)
    sns.set_theme(style="whitegrid")
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5), dpi=300)

    epochs_range = history["epoch"]

    # Accuracy Plot
    ax1.plot(epochs_range, [acc * 100 for acc in history["train_acc"]], 'o-', label="Training Accuracy", color="#2563eb", linewidth=2)
    ax1.plot(epochs_range, [acc * 100 for acc in history["val_acc"]], 's-', label="Validation Accuracy", color="#10b981", linewidth=2)
    ax1.set_title("Training and Validation Accuracy (Rice Quality)", fontsize=13, fontweight='bold', pad=10)
    ax1.set_xlabel("Epoch", fontsize=11, fontweight='bold')
    ax1.set_ylabel("Accuracy (%)", fontsize=11, fontweight='bold')
    ax1.set_xticks(epochs_range)
    ax1.legend(loc="lower right", frameon=True, facecolor='white')
    ax1.grid(True, linestyle="--", alpha=0.6)

    # Loss Plot
    ax2.plot(epochs_range, history["train_loss"], 'o-', label="Training Loss", color="#dc2626", linewidth=2)
    ax2.plot(epochs_range, history["val_loss"], 's-', label="Validation Loss", color="#f59e0b", linewidth=2)
    ax2.set_title("Training and Validation Loss (Rice Quality)", fontsize=13, fontweight='bold', pad=10)
    ax2.set_xlabel("Epoch", fontsize=11, fontweight='bold')
    ax2.set_ylabel("Weighted Cross Entropy Loss", fontsize=11, fontweight='bold')
    ax2.set_xticks(epochs_range)
    ax2.legend(loc="upper right", frameon=True, facecolor='white')
    ax2.grid(True, linestyle="--", alpha=0.6)

    plt.tight_layout()
    history_plot_path = RESULTS_DIR / "quality_training_history.png"
    plt.savefig(history_plot_path)
    plt.close()
    print(f"Saved quality training history plot to {history_plot_path}", flush=True)

    print("\n" + "=" * 75, flush=True)
    print(f"QUALITY TRAINING COMPLETE. Best Validation Accuracy: {best_val_acc * 100:.2f}%", flush=True)
    print(f"Best Model File: {best_model_path}", flush=True)
    print("=" * 75, flush=True)

    return best_model_path, history


if __name__ == "__main__":
    train_quality_model()
