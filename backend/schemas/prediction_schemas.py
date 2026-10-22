"""
Pydantic schemas for Smart Rice AI API requests and responses.
"""

from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field


class TabularPredictionRequest(BaseModel):
    rice_variety: str = Field(..., description="Name of the rice variety (e.g., Basmati, Jasmine, Arborio)")
    temperature: float = Field(..., ge=-10.0, le=70.0, description="Storage temperature in Celsius")
    humidity: float = Field(..., ge=0.0, le=100.0, description="Relative humidity percentage")
    moisture_content: float = Field(..., ge=0.0, le=100.0, description="Grain moisture content percentage")
    storage_days: float = Field(..., ge=0.0, le=2000.0, description="Storage duration in days")
    co2: Optional[float] = Field(None, ge=0.0, description="Carbon dioxide level in ppm")
    o2: Optional[float] = Field(None, ge=0.0, le=100.0, description="Oxygen level percentage")


class ImagePredictionResponse(BaseModel):
    status: str
    predicted_variety: Optional[str] = None
    confidence: Optional[float] = None
    probabilities: Optional[Dict[str, float]] = None
    detected_variety: Optional[str] = None
    variety_confidence: Optional[float] = None
    quality_prediction: Optional[str] = None
    model_available: bool = True
    message: Optional[str] = None
    has_insect: Optional[bool] = False
    insect_detected: Optional[bool] = False
    insect_message: Optional[str] = None
    insect_type: Optional[str] = None
    insect_confidence: Optional[float] = None


class TabularPredictionResponse(BaseModel):
    quality: Optional[str] = None
    quality_confidence: Optional[float] = None
    spoilage_risk: Optional[str] = None
    spoilage_confidence: Optional[float] = None
    shelf_life_days: Optional[float] = None
    recommended_price: Optional[float] = None
    status: str
    model_status: Dict[str, bool]
    message: Optional[str] = None


class CombinedPredictionResponse(BaseModel):
    quality: Optional[str] = None
    quality_confidence: Optional[float] = None
    spoilage_risk: Optional[str] = None
    shelf_life_days: Optional[float] = None
    image_prediction: Optional[str] = None
    image_confidence: Optional[float] = None
    detected_variety: Optional[str] = None
    variety_confidence: Optional[float] = None
    recommended_price: Optional[float] = None
    advisory: Optional[str] = None
    status: str
    model_status: Dict[str, bool]
    message: Optional[str] = None
    has_insect: Optional[bool] = False
    insect_detected: Optional[bool] = False
    insect_message: Optional[str] = None
    insect_type: Optional[str] = None
    insect_confidence: Optional[float] = None
    defects_detected: Optional[List[str]] = None
    image_url: Optional[str] = None


class ModelInfo(BaseModel):
    name: str
    type: str
    available: bool
    description: str
    metrics: Optional[Dict[str, Any]] = None


class SystemModelStatusResponse(BaseModel):
    status: str = "ready"
    model_loaded: bool = False
    model_path: Optional[str] = None
    supported_classes: Optional[List[str]] = None
    input_image_size: Optional[List[int]] = None
    models: Optional[Dict[str, ModelInfo]] = None
    ready_for_predictions: bool = False
    message: str = ""


class QualityPredictionResponse(BaseModel):
    status: str = "success"
    predicted_class: str
    detected_condition: str
    quality_grade: str
    quality_level: str
    quality_description: str
    confidence: float
    class_probabilities: Dict[str, float]
    defects_detected: List[str]
    disclaimer: str = "Quality grade is a derived visual-grade classification based on documented defect categories; it is not an original dataset label."
    has_insect: Optional[bool] = False
    insect_detected: Optional[bool] = False
    insect_message: Optional[str] = None
    insect_type: Optional[str] = None
    insect_confidence: Optional[float] = None


class QualityModelStatusResponse(BaseModel):
    model_availability: bool
    model_version: str = "MobileNetV2-Quality-v1.0"
    supported_classes: List[str]
    grading_system: Dict[str, str]
    input_dimensions: List[int]
    status: str = "ready"

