"""
Random Forest Classifier Training Pipeline for Rice Quality Assessment.
Inputs: rice_variety, temperature, humidity, moisture_content, storage_duration_days (optional: co2, o2).
Target: quality.
Academic Integrity Rules:
- Evaluates real data metrics (Accuracy, Precision, Recall, F1, Confusion Matrix).
- Does not fabricate synthetic rows or false accuracy scores.
"""

import sys
import json
import shutil
from pathlib import Path
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score
import joblib

CURRENT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = CURRENT_DIR.parent.parent
sys.path.append(str(PROJECT_ROOT))

DATASET_PATH = PROJECT_ROOT / "ml" / "datasets" / "tabular" / "rice_storage_dataset.csv"
TRAINED_MODELS_DIR = PROJECT_ROOT / "ml" / "trained_models"
BACKEND_MODEL_DIR = PROJECT_ROOT / "backend" / "models" / "quality_model"

TARGET_COL = "quality"
NUMERICAL_COLS = ["temperature", "humidity", "moisture_content", "storage_duration_days"]
OPTIONAL_NUMERICAL_COLS = ["co2", "o2"]
CATEGORICAL_COLS = ["rice_variety"]


def train_quality_model():
    print("=" * 65)
    print("SMART RICE AI - RICE QUALITY TABULAR MODEL (Random Forest)")
    print("=" * 65)

    if not DATASET_PATH.exists():
        print("\n" + "!" * 65)
        print("STATUS: Tabular storage dataset required before training.")
        print(f"Please place your dataset CSV at: {DATASET_PATH}")
        print(f"Required target column: '{TARGET_COL}'")
        print(f"Required features: {CATEGORICAL_COLS + NUMERICAL_COLS}")
        print("Optional features: " + ", ".join(OPTIONAL_NUMERICAL_COLS))
        print("No synthetic data will be fabricated.")
        print("!" * 65)
        return False

    df = pd.read_csv(DATASET_PATH)
    print(f"Loaded dataset: {df.shape[0]} rows, {df.shape[1]} columns.")

    if TARGET_COL not in df.columns:
        print(f"[-] Missing target column '{TARGET_COL}' in dataset.")
        print(f"Available columns: {list(df.columns)}")
        return False

    # Check required numerical features
    num_cols = [c for c in NUMERICAL_COLS if c in df.columns]
    for opt in OPTIONAL_NUMERICAL_COLS:
        if opt in df.columns:
            num_cols.append(opt)

    missing_required = set(NUMERICAL_COLS + CATEGORICAL_COLS) - set(df.columns)
    if missing_required:
        print(f"[-] Missing required features: {missing_required}")
        return False

    # Clean data
    clean_df = df.dropna(subset=num_cols + CATEGORICAL_COLS + [TARGET_COL])
    X = clean_df[CATEGORICAL_COLS + num_cols]
    y = clean_df[TARGET_COL]

    print(f"Training on {len(clean_df)} valid samples.")
    print("Class distribution:")
    print(y.value_counts())

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    preprocessor = ColumnTransformer(
        transformers=[
            ("num", StandardScaler(), num_cols),
            ("cat", OneHotEncoder(handle_unknown="ignore"), CATEGORICAL_COLS)
        ]
    )

    pipeline = Pipeline(steps=[
        ("preprocessor", preprocessor),
        ("classifier", RandomForestClassifier(n_estimators=100, random_state=42, n_jobs=-1))
    ])

    print("\nTraining Random Forest Classifier...")
    pipeline.fit(X_train, y_train)

    y_pred = pipeline.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    report = classification_report(y_test, y_pred, output_dict=True)
    cm = confusion_matrix(y_test, y_pred).tolist()

    print(f"\nModel Evaluation (Test Split):")
    print(f"Accuracy: {acc * 100:.2f}%")
    print(classification_report(y_test, y_pred))

    TRAINED_MODELS_DIR.mkdir(parents=True, exist_ok=True)
    BACKEND_MODEL_DIR.mkdir(parents=True, exist_ok=True)

    model_out = TRAINED_MODELS_DIR / "rice_quality_rf.joblib"
    joblib.dump(pipeline, model_out)
    shutil.copy(model_out, BACKEND_MODEL_DIR / "rice_quality_rf.joblib")

    meta = {
        "model_type": "RandomForestClassifier",
        "target": TARGET_COL,
        "features": list(X.columns),
        "classes": list(pipeline.classes_),
        "test_accuracy": acc,
        "classification_report": report,
        "confusion_matrix": cm
    }
    meta_path = TRAINED_MODELS_DIR / "rice_quality_rf_metadata.json"
    with open(meta_path, "w") as f:
        json.dump(meta, f, indent=2)
    shutil.copy(meta_path, BACKEND_MODEL_DIR / "rice_quality_rf_metadata.json")

    print(f"Model and metadata saved to {model_out}")
    return True


if __name__ == "__main__":
    train_quality_model()
