#  SmartRice AI
### AI-Based Rice Quality Classification, Shelf-Life Prediction & Dynamic Price Recommendation System

SmartRice AI is a machine learning-based application designed to assess rice quality, predict storage shelf life, identify potential spoilage risks, and recommend prices based on rice quality and storage conditions. The system combines a web-based dashboard with machine learning models to support data-driven rice storage and quality management.

## project Overview

Rice is a major staple food worldwide, and maintaining its quality during storage is essential. SmartRice AI aims to improve rice quality assessment by using machine learning and image-based analysis rather than relying entirely on manual inspection.

The current phase focuses on **AI-based software functionality without physical IoT sensor implementation**. Users can provide available rice and storage information through the application to obtain predictions.

## Key Features

- **Rice Quality Classification:** Evaluates rice quality using trained machine learning models.
- **Rice Variety Detection:** Uses image classification to identify supported rice varieties.
- **Image-Based Analysis:** Supports rice image uploads for model-based analysis.
- **Shelf-Life Prediction:** Estimates the remaining shelf life of stored rice.
- **Spoilage Risk Assessment:** Classifies potential spoilage risk using storage-related information.
- **Dynamic Price Recommendation:** Recommends prices based on the available quality and prediction information.
- **Web Dashboard:** Provides a user interface for entering information and viewing results.
- **Prediction History:** Supports viewing previously recorded predictions where implemented.

## Machine Learning

The project includes trained models and scripts for tasks such as:

- Rice variety classification
- Rice quality assessment
- Shelf-life prediction
- Spoilage risk classification
- Image-based rice analysis

The repository contains model files, metadata, training scripts, and evaluation scripts. Exact performance metrics should be reported only after verification against the corresponding evaluation results.

## Technology Stack

| Component | Technologies |
|---|---|
| Frontend | React.js, Vite, CSS |
| Backend | Python, FastAPI, Uvicorn |
| Machine Learning | Scikit-learn, Random Forest and image-classification models |
| Data Processing | Python and relevant ML libraries |
| API Testing | FastAPI interactive documentation |

## Project Structure

```text
SmartRice_AI/
├── backend/
│   ├── api/
│   ├── data/
│   ├── models/
│   ├── schemas/
│   ├── services/
│   ├── utils/
│   ├── main.py
│   ├── requirements.txt
│   └── run.py
├── frontend/
│   ├── public/
│   ├── src/
│   ├── package.json
│   └── vite.config.js
├── ml/
│   ├── preprocessing/
│   ├── trained_models/
│   ├── training/
│   ├── train_image_model.py
│   ├── train_quality_model.py
│   ├── train_shelf_life_model.py
│   ├── train_spoilage_model.py
│   └── train_variety_model.py
├── .gitignore
├── package.json
└── README.md
```

*Note: This is a simplified overview of the project structure. Some local datasets, virtual environments, and generated outputs are excluded from GitHub.*

## ⚙️ Prerequisites

Install the following before running the application:

- Git
- Python compatible with the backend dependencies
- Node.js and npm
- A supported browser

## 🚀 Installation and Setup

### 1. Clone the repository

```bash
git clone https://github.com/kowsikan232/SmartRice_AI.git
cd SmartRice_AI
```

### 2. Set up the Python backend

Open a terminal in the project root.

```bash
cd backend
python -m venv venv
```

Activate the virtual environment on Windows:

```powershell
.\venv\Scripts\Activate.ps1
```

Install the backend dependencies:

```bash
pip install -r requirements.txt
```

Start the backend using the project's runner:

```bash
python run.py
```

If the application starts successfully, the API is expected to be available at:

- API base URL: `http://127.0.0.1:8000`
- Interactive API documentation: `http://127.0.0.1:8000/docs`
- Health endpoint: `http://127.0.0.1:8000/health`

These URLs assume the default configuration in the project runner.

### 3. Set up the frontend

Open a **second terminal** at the repository root:

```bash
cd frontend
npm install
npm run dev
```

Open the local URL displayed by Vite in your terminal. The default is commonly `http://localhost:5173`.

### 4. Configure environment variables

If the application requires environment variables,
