"""
Root runner for train_shelf_life_model.
"""
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from ml.training.train_shelf_life_model import train_shelf_life_model

if __name__ == "__main__":
    train_shelf_life_model()
