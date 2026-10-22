"""
Root runner for train_image_model.
"""
import sys
from pathlib import Path

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from ml.training.train_image_model import train_image_classifier

if __name__ == "__main__":
    train_image_classifier()
