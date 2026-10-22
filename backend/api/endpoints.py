"""
FastAPI REST API Endpoints for Smart Rice AI.
"""

from typing import Optional, List, Dict, Any
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, status
from pydantic import ValidationError

from backend.schemas.prediction_schemas import (
    TabularPredictionRequest,
    TabularPredictionResponse,
    ImagePredictionResponse,
    CombinedPredictionResponse,
    SystemModelStatusResponse,
    QualityPredictionResponse,
    QualityModelStatusResponse,
    ModelInfo
)
from backend.services.image_service import image_service
from backend.services.prediction_service import prediction_service
from backend.utils.db import get_prediction_history, clear_history
from ml.training.train_image_model import check_dataset_integrity

router = APIRouter()


@router.get("/health", tags=["System"])
def health_check():
    """Health check endpoint confirming backend readiness."""
    return {
        "status": "healthy",
        "service": "Smart Rice AI Backend",
        "phase": "Phase 1 (NO-IoT)",
        "version": "1.0.0"
    }


@router.get("/model/status", response_model=SystemModelStatusResponse, tags=["Models"])
def get_model_status():
    """Returns the operational status and metadata of all ML/DL models."""
    img_status = image_service.get_status()
    tab_status = prediction_service.get_model_status()

    variety_available = img_status.get("model_loaded", False)

    if not variety_available:
        return SystemModelStatusResponse(
            status="model_not_available",
            model_loaded=False,
            model_path=None,
            supported_classes=img_status.get("supported_classes", ["Arborio", "Basmati", "Ipsala", "Jasmine", "Karacadag"]),
            input_image_size=img_status.get("input_image_size", [224, 224]),
            models={},
            ready_for_predictions=False,
            message="Rice variety model is not trained yet."
        )

    models_info = {
        "image_variety_model": ModelInfo(
            name="Rice Variety Identification Model",
            type="MobileNetV2 (Transfer Learning)",
            available=variety_available,
            description="Identifies rice variety from images (Arborio, Basmati, Ipsala, Jasmine, Karacadag).",
            metrics={"classes": img_status.get("supported_classes"), "image_size": img_status.get("input_image_size")}
        ),
        "image_quality_model": ModelInfo(
            name="Rice Image Quality Classifier",
            type="MobileNetV2 (CNN)",
            available=img_status.get("quality_model_available", False),
            description="Classifies rice grains into Good, Medium, or Spoiled based on visual patterns.",
            metrics=img_status.get("quality_metadata", {})
        ),
        "tabular_quality_model": ModelInfo(
            name="Storage Quality Assessment Model",
            type="Random Forest Classifier",
            available=tab_status["quality_model_available"],
            description="Assesses rice quality from storage parameters (temp, humidity, moisture, duration).",
            metrics=tab_status.get("quality_metadata", {})
        ),
        "shelf_life_model": ModelInfo(
            name="Shelf-Life Prediction Model",
            type="Random Forest Regressor",
            available=tab_status["shelf_life_model_available"],
            description="Predicts estimated remaining storage life in days.",
            metrics=tab_status.get("shelf_life_metadata", {})
        ),
        "spoilage_risk_model": ModelInfo(
            name="Spoilage Risk Classifier",
            type="Random Forest Classifier",
            available=tab_status["spoilage_model_available"],
            description="Categorizes spoilage risk into Low, Medium, or High.",
            metrics=tab_status.get("spoilage_metadata", {})
        )
    }

    return SystemModelStatusResponse(
        status="ready",
        model_loaded=True,
        model_path=img_status.get("model_path"),
        supported_classes=img_status.get("supported_classes"),
        input_image_size=img_status.get("input_image_size"),
        models=models_info,
        ready_for_predictions=True,
        message="MobileNetV2 Rice Variety Classifier loaded and ready for inference."
    )


@router.post("/predict", response_model=TabularPredictionResponse, tags=["Inference"])
def predict_tabular(request: TabularPredictionRequest):
    """
    Executes prediction based on storage/environment tabular parameters.
    """
    try:
        data = request.model_dump()
        result = prediction_service.predict_tabular(data)
        return TabularPredictionResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/predict/image", response_model=ImagePredictionResponse, tags=["Inference"])
async def predict_image(image: UploadFile = File(...)):
    """
    Analyzes an uploaded rice grain image using MobileNetV2 deep learning classifier.
    Supported formats: JPG, JPEG, PNG, WEBP. Maximum size: 10MB.
    Returns predicted variety, confidence, and probabilities for all 5 classes.
    """
    if not image or not image.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No image file provided."
        )

    # Validate extension
    filename = image.filename
    valid_exts = {".jpg", ".jpeg", ".png", ".webp"}
    ext = "." + filename.split(".")[-1].lower() if "." in filename else ""
    if ext not in valid_exts:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '{ext}'. Supported formats: JPG, JPEG, PNG, WEBP."
        )

    try:
        content = await image.read()
        if not content or len(content) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded file is empty (0 bytes)."
            )
        if len(content) > 10 * 1024 * 1024:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File size exceeds the 10MB maximum limit."
            )

        res = image_service.predict_image(content, filename=filename)
        return ImagePredictionResponse(**res)
    except HTTPException:
        raise
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except RuntimeError as re:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(re))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Image processing error: {e}")


@router.post("/predict/quality", response_model=QualityPredictionResponse, tags=["Quality Grading"])
async def predict_quality(image: UploadFile = File(...)):
    """
    Analyzes an uploaded rice grain image using MobileNetV2 Quality & Defect Classifier.
    Detects physical defects (Broken, Chalky, Stained, Whole) and assigns an agricultural
    Quality Grade (Grade A, B, C, D) based on documented grading rules.
    """
    if not image or not image.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No image file provided."
        )

    filename = image.filename
    valid_exts = {".jpg", ".jpeg", ".png", ".webp"}
    ext = "." + filename.split(".")[-1].lower() if "." in filename else ""
    if ext not in valid_exts:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '{ext}'. Supported formats: JPG, JPEG, PNG, WEBP."
        )

    try:
        content = await image.read()
        if not content or len(content) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded file is empty (0 bytes)."
            )
        if len(content) > 10 * 1024 * 1024:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File size exceeds the 10MB maximum limit."
            )

        res = image_service.predict_quality(content, filename=filename)
        return QualityPredictionResponse(**res)
    except HTTPException:
        raise
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except RuntimeError as re:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(re))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Quality analysis error: {e}")


@router.get("/model/quality/status", response_model=QualityModelStatusResponse, tags=["Quality Grading"])
def get_quality_model_status():
    """
    Returns the operational status, supported defect classes, and grading rules
    for the MobileNetV2 Rice Quality Classifier.
    """
    return QualityModelStatusResponse(**image_service.get_quality_status())


@router.post("/predict/combined", response_model=CombinedPredictionResponse, tags=["Inference"])
async def predict_combined(
    image: Optional[UploadFile] = File(None),
    rice_variety: str = Form(...),
    temperature: float = Form(...),
    humidity: float = Form(...),
    moisture_content: float = Form(...),
    storage_days: float = Form(...),
    co2: Optional[float] = Form(None),
    o2: Optional[float] = Form(None)
):
    """
    Combined multimodal prediction endpoint:
    Processes rice grain image + storage parameters to assess Quality,
    Shelf-Life, Spoilage Risk, Dynamic Price, and actionable storage advisories.
    """
    storage_params = {
        "rice_variety": rice_variety,
        "temperature": temperature,
        "humidity": humidity,
        "moisture_content": moisture_content,
        "storage_days": storage_days,
        "co2": co2,
        "o2": o2
    }

    # 1. Run Tabular Prediction
    tabular_result = prediction_service.predict_tabular(storage_params)

    # 2. Run Image Analysis if uploaded
    image_result = {
        "status": "not_provided",
        "quality_prediction": None,
        "confidence": None,
        "detected_variety": None,
        "variety_confidence": None,
        "model_available": False
    }

    if image and image.filename:
        try:
            content = await image.read()
            if content:
                image_result = image_service.predict_image(content, filename=image.filename)
                try:
                    from backend.utils.supabase_storage import upload_image_to_supabase
                    success, img_url, _ = upload_image_to_supabase(
                        bucket_name="rice-analysis-images",
                        file_bytes=content,
                        filename=image.filename,
                        content_type=image.content_type or "image/jpeg"
                    )
                    if success and img_url:
                        image_result["image_url"] = img_url
                except Exception as upload_err:
                    print(f"[Supabase Storage Warning] Could not upload rice image: {upload_err}")
        except Exception as e:
            print(f"[Warning] Combined endpoint image processing error: {e}")

    # 3. Fuse Predictions
    combined = prediction_service.combine_predictions(image_result, tabular_result, storage_params)
    return CombinedPredictionResponse(**combined)


@router.post("/train/image", tags=["Training"])
def trigger_image_training():
    """
    Checks image dataset readiness and returns training status.
    """
    has_data = check_dataset_integrity()
    if not has_data:
        return {
            "status": "dataset_required",
            "message": "Image dataset required before training. Please place images in ml/datasets/rice_images/{train,validation,test}."
        }
    return {
        "status": "ready",
        "message": "Dataset detected. Execute 'python ml/training/train_image_model.py' to run training."
    }


@router.get("/history", tags=["History"])
def fetch_history(limit: int = 50):
    """Returns stored prediction history."""
    try:
        return get_prediction_history(limit=limit)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.delete("/history", tags=["History"])
def remove_history():
    """Clears prediction history."""
    try:
        clear_history()
        return {"status": "success", "message": "Prediction history cleared."}
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
