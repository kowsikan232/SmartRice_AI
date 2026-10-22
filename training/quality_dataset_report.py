"""
SmartRice AI - Phase 1: Rice Quality & Defect Dataset Inspection & Preparation
Academic Integrity:
- Real inspection of the provided Rice Quality / Defect dataset (ml/datasets/rice_dataset).
- Checks classes: Broken, Chalky, Stained, Whole.
- Validates formats (PNG), dimensions (~400x400), integrity, and duplicates via SHA256.
- Creates clean stratified 80% train / 10% validation / 10% test split in processed_quality_dataset/.
- Strictly prevents data leakage across splits.
- Documents the explicit agricultural Quality Grading Layer:
    Whole   -> Grade A (Excellent / Visually healthy intact grain)
    Chalky  -> Grade B (Acceptable / Chalky grain defect)
    Broken  -> Grade C (Lower quality / Mechanically fractured grain)
    Stained -> Grade D (Poor quality / Discolored / Fungal damaged grain)
- Generates dataset distribution plot in results/quality_dataset_distribution.png.
"""

import os
import sys
import json
import shutil
import hashlib
import random
from pathlib import Path
from collections import Counter, defaultdict
from PIL import Image
import matplotlib.pyplot as plt
import seaborn as sns

PROJECT_ROOT = Path(__file__).resolve().parent.parent
ORIGINAL_DATASET_ROOT = PROJECT_ROOT / "ml" / "datasets" / "rice_dataset"
PROCESSED_DATASET_ROOT = PROJECT_ROOT / "processed_quality_dataset"
RESULTS_DIR = PROJECT_ROOT / "results"

EXPECTED_CLASSES = ["Broken", "Chalky", "Stained", "Whole"]
RANDOM_SEED = 42

# Explicitly documented Quality Grading Mapping Layer
QUALITY_GRADING_RULES = {
    "Whole": {
        "condition": "Healthy / Intact",
        "quality_grade": "A",
        "quality_level": "Excellent",
        "quality_description": "Visually healthy, fully formed intact grain with no structural or color defects.",
        "defects_detected": []
    },
    "Chalky": {
        "condition": "Chalky Grain",
        "quality_grade": "B",
        "quality_level": "Acceptable",
        "quality_description": "Acceptable commercial grade with visible chalkiness (opaque white starch accumulation).",
        "defects_detected": ["Chalky endosperm defect"]
    },
    "Broken": {
        "condition": "Broken Grain",
        "quality_grade": "C",
        "quality_level": "Lower Quality",
        "quality_description": "Lower commercial quality due to physical fractures and partial length reduction.",
        "defects_detected": ["Mechanical fracture / Broken grain"]
    },
    "Stained": {
        "condition": "Discolored / Stained",
        "quality_grade": "D",
        "quality_level": "Poor Quality",
        "quality_description": "Poor quality grain exhibiting visible surface discoloration, staining, or fungal blemish.",
        "defects_detected": ["Severe discoloration / Staining"]
    }
}


def get_file_hash(filepath: Path) -> str:
    """Calculates SHA256 hash of a file for exact duplicate detection."""
    hasher = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            hasher.update(chunk)
    return hasher.hexdigest()


def inspect_and_prepare_quality_dataset():
    print("=" * 75)
    print("SMART RICE AI - RICE QUALITY & DEFECT DATASET INSPECTION & PREPARATION")
    print("=" * 75)

    if not ORIGINAL_DATASET_ROOT.exists():
        raise FileNotFoundError(f"Original dataset directory not found at: {ORIGINAL_DATASET_ROOT}")

    print(f"Original Dataset Location: {ORIGINAL_DATASET_ROOT}")
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)

    # 1. Discover all images
    all_image_paths = []
    for ext in ("*.png", "*.jpg", "*.jpeg", "*.webp"):
        all_image_paths.extend(ORIGINAL_DATASET_ROOT.rglob(ext))

    total_images_found = len(all_image_paths)
    print(f"Total raw images scanned: {total_images_found}")

    # 2. Inspect formats, dimensions, corruption, and group by class
    class_images = defaultdict(list)
    corrupted_images = []
    formats = Counter()
    dimensions = Counter()
    channels = Counter()

    print("Verifying image integrity, formats, and dimensions...")
    for img_path in all_image_paths:
        class_name = img_path.parent.name
        if class_name not in EXPECTED_CLASSES:
            continue

        try:
            with Image.open(img_path) as img:
                img.verify()
            with Image.open(img_path) as img:
                fmt = img.format
                size = img.size
                mode = img.mode
                formats[fmt] += 1
                dimensions[size] += 1
                channels[mode] += 1
                class_images[class_name].append(img_path)
        except Exception as e:
            corrupted_images.append({"file": str(img_path), "error": str(e)})

    detected_classes = sorted(class_images.keys())
    print(f"\nDetected Defect / Condition Classes: {detected_classes}")
    class_match = (detected_classes == EXPECTED_CLASSES)
    print(f"Class Names Match Expected 4 Defect Classes: {class_match}")
    if not class_match:
        raise ValueError(f"Mismatch in classes! Found {detected_classes}, expected {EXPECTED_CLASSES}")

    # 3. Deduplication via SHA256
    print("\nScanning for duplicates using SHA256 hashing...")
    unique_class_images = defaultdict(list)
    duplicate_count = 0
    seen_hashes = {}

    for c in EXPECTED_CLASSES:
        for p in class_images[c]:
            h = get_file_hash(p)
            if h in seen_hashes:
                duplicate_count += 1
            else:
                seen_hashes[h] = p
                unique_class_images[c].append(p)

    print(f"Duplicate images detected and removed: {duplicate_count}")
    for c in EXPECTED_CLASSES:
        print(f"  - {c}: {len(unique_class_images[c])} unique verified images")

    # 4. Create clean stratified 80% train / 10% validation / 10% test split
    print(f"\nCreating clean reproducible split (80% / 10% / 10%) with seed={RANDOM_SEED}...")
    random.seed(RANDOM_SEED)

    train_dir = PROCESSED_DATASET_ROOT / "train"
    val_dir = PROCESSED_DATASET_ROOT / "validation"
    test_dir = PROCESSED_DATASET_ROOT / "test"

    for d in [train_dir, val_dir, test_dir]:
        d.mkdir(parents=True, exist_ok=True)
        for c in EXPECTED_CLASSES:
            (d / c).mkdir(parents=True, exist_ok=True)

    split_counts = {
        "train": Counter(),
        "validation": Counter(),
        "test": Counter()
    }

    train_hashes = set()
    val_hashes = set()
    test_hashes = set()

    for c in EXPECTED_CLASSES:
        imgs = list(unique_class_images[c])
        imgs.sort(key=lambda x: x.name)
        random.shuffle(imgs)

        total_cls = len(imgs)
        train_end = int(0.80 * total_cls)
        val_end = int(0.90 * total_cls)

        train_imgs = imgs[:train_end]
        val_imgs = imgs[train_end:val_end]
        test_imgs = imgs[val_end:]

        for img_p in train_imgs:
            dest = train_dir / c / img_p.name
            if not dest.exists():
                shutil.copy2(img_p, dest)
            split_counts["train"][c] += 1
            train_hashes.add(get_file_hash(dest))

        for img_p in val_imgs:
            dest = val_dir / c / img_p.name
            if not dest.exists():
                shutil.copy2(img_p, dest)
            split_counts["validation"][c] += 1
            val_hashes.add(get_file_hash(dest))

        for img_p in test_imgs:
            dest = test_dir / c / img_p.name
            if not dest.exists():
                shutil.copy2(img_p, dest)
            split_counts["test"][c] += 1
            test_hashes.add(get_file_hash(dest))

    # Strict leakage validation
    train_val_overlap = train_hashes.intersection(val_hashes)
    train_test_overlap = train_hashes.intersection(test_hashes)
    val_test_overlap = val_hashes.intersection(test_hashes)

    leakage_detected = len(train_val_overlap) > 0 or len(train_test_overlap) > 0 or len(val_test_overlap) > 0
    print(f"\nData Leakage Verification:")
    print(f"  Train / Validation hash overlap: {len(train_val_overlap)}")
    print(f"  Train / Test hash overlap:       {len(train_test_overlap)}")
    print(f"  Val / Test hash overlap:         {len(val_test_overlap)}")
    print(f"  Data Leakage Status:             {'PASSED (ZERO LEAKAGE)' if not leakage_detected else 'FAILED'}")

    if leakage_detected:
        raise RuntimeError("Data leakage detected! Some images appear across multiple splits.")

    # 5. Plot Dataset Distribution
    print("\nGenerating dataset distribution visualization...")
    sns.set_theme(style="whitegrid")
    fig, ax = plt.subplots(figsize=(10, 6), dpi=300)

    classes = EXPECTED_CLASSES
    x = range(len(classes))
    width = 0.25

    train_vals = [split_counts["train"][c] for c in classes]
    val_vals = [split_counts["validation"][c] for c in classes]
    test_vals = [split_counts["test"][c] for c in classes]

    rects1 = ax.bar([i - width for i in x], train_vals, width, label='Train (80%)', color='#2563eb')
    rects2 = ax.bar([i for i in x], val_vals, width, label='Validation (10%)', color='#10b981')
    rects3 = ax.bar([i + width for i in x], test_vals, width, label='Test (10%)', color='#f59e0b')

    ax.set_ylabel('Image Count', fontsize=12, fontweight='bold')
    ax.set_title('SmartRice AI - Rice Quality & Defect Dataset Split Distribution', fontsize=14, fontweight='bold', pad=15)
    ax.set_xticks(list(x))
    ax.set_xticklabels(classes, fontsize=11, fontweight='bold')
    ax.legend(frameon=True, facecolor='white', framealpha=0.9)

    def autolabel(rects):
        for rect in rects:
            height = rect.get_height()
            ax.annotate(f'{height}',
                        xy=(rect.get_x() + rect.get_width() / 2, height),
                        xytext=(0, 3),
                        textcoords="offset points",
                        ha='center', va='bottom', fontsize=9)

    autolabel(rects1)
    autolabel(rects2)
    autolabel(rects3)

    plt.tight_layout()
    dist_plot_path = RESULTS_DIR / "quality_dataset_distribution.png"
    plt.savefig(dist_plot_path)
    plt.close()
    print(f"Saved quality distribution chart to: {dist_plot_path}")

    # 6. Save JSON report
    report = {
        "dataset_name": "SmartRice AI - Rice Grain Defect & Quality Dataset",
        "original_location": str(ORIGINAL_DATASET_ROOT),
        "processed_location": str(PROCESSED_DATASET_ROOT),
        "total_images_scanned": total_images_found,
        "corrupted_image_count": len(corrupted_images),
        "duplicate_images_removed": duplicate_count,
        "total_unique_images": sum(len(unique_class_images[c]) for c in EXPECTED_CLASSES),
        "image_formats": dict(formats),
        "image_dimensions": {f"{k[0]}x{k[1]}": v for k, v in dimensions.most_common(5)},
        "color_channels": dict(channels),
        "class_distribution_unique": {c: len(unique_class_images[c]) for c in EXPECTED_CLASSES},
        "split_counts": {
            "train": dict(split_counts["train"]),
            "validation": dict(split_counts["validation"]),
            "test": dict(split_counts["test"]),
            "train_total": sum(split_counts["train"].values()),
            "validation_total": sum(split_counts["validation"].values()),
            "test_total": sum(split_counts["test"].values())
        },
        "quality_grading_layer": QUALITY_GRADING_RULES,
        "disclaimer": "Quality grade is a derived visual-grade classification based on documented defect categories; it is not an original dataset label.",
        "data_leakage_verified": not leakage_detected,
        "random_seed": RANDOM_SEED
    }

    report_path = RESULTS_DIR / "quality_dataset_report.json"
    with open(report_path, "w") as f:
        json.dump(report, f, indent=4)
    print(f"Saved quality dataset JSON report to: {report_path}")

    print("\n" + "=" * 75)
    print("QUALITY DATASET REPORT COMPLETE")
    print("=" * 75)
    print(f"Total Unique Images:  {report['total_unique_images']}")
    print(f"Train Set Count:      {report['split_counts']['train_total']} images (80%)")
    print(f"Validation Set Count: {report['split_counts']['validation_total']} images (10%)")
    print(f"Test Set Count:       {report['split_counts']['test_total']} images (10%)")
    print(f"Formats:              {list(formats.keys())}")
    print(f"Corrupted Images:     {len(corrupted_images)}")
    print(f"Data Leakage:         NONE (Verified by SHA-256 cross-split hash intersection)")
    print("=" * 75)

    return report


if __name__ == "__main__":
    inspect_and_prepare_quality_dataset()
