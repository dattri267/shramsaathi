"""
ShramSaathi AI engine - FastAPI inference service with Calendar & Event Context Layer and Subcategories.
"""

from __future__ import annotations

import json
import pickle
from pathlib import Path
from typing import Any

import fastapi
import fastapi.middleware.cors
import numpy as np
from pydantic import BaseModel, Field, field_validator

from features import (
    CATEGORIES,
    CITIES,
    CITY_FACTOR,
    EVENTS,
    MODEL_VERSION,
    SUBCATEGORIES,
    WEATHERS,
    baseline_jobs,
    build_features,
)

HERE = Path(__file__).resolve().parent
MODEL_PATH = HERE / "model" / "demand_forecaster.pkl"
META_PATH = HERE / "model" / "metadata.json"

PRICE_FLOOR = 0.82
PRICE_CEILING = 1.18

# Subcategory Mapping Tree by Category
CATEGORY_SUBCATEGORY_MAP = {
    "Electrician": ["Residential electrician", "Industrial electrician", "Solar electrical service"],
    "Plumber": ["Pipe & leakage", "Bathroom plumbing", "Water tank service"],
    "Carpenter": ["Furniture repairs", "Polishing & woodwork", "Custom furniture"],
    "Painter": ["House painting", "Texture painting", "Waterproofing"],
    "Domestic Helper": ["House maid", "Cooking helper", "Laundry helper"],
    "Caregiver": ["Elderly care", "Patient care", "Baby care"],
    "Drivers": ["Personal driver", "Delivery driver", "Family driver"],
    "Gardener": ["Garden & lawn maintenance", "Garden cleaning", "Terrace garden maintenance"],
    "Cleaner": ["Home cleaning", "Bathroom cleaning", "Sofa and carpet cleaning"],
    "Technician": ["RO/water purifier", "CCTV technician", "Appliances technician", "Mobile technician"]
}


def _load_model():
    if not MODEL_PATH.exists():
        print(f"[WARNING] Model file not found at {MODEL_PATH}. Using Rule-Based Impact Estimator.")
        return None
    try:
        with MODEL_PATH.open("rb") as fh:
            return pickle.load(fh)
    except Exception as err:
        print(f"[WARNING] Could not load trained ML model ({err}). Falling back to Rule-Based Impact Estimator.")
        return None


PIPELINE = _load_model()
METADATA: dict[str, Any] = json.loads(META_PATH.read_text()) if META_PATH.exists() else {}

app = fastapi.FastAPI(title="ShramSaathi AI Engine", version=MODEL_VERSION)
app.add_middleware(
    fastapi.middleware.cors.CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class PredictRequest(BaseModel):
    city: str = Field(default="Bengaluru", max_length=80)
    category: str = Field(default="Electrician", max_length=80)
    subCategory: str = Field(default="", max_length=120)
    date: str = Field(default="", max_length=10)
    time: str = Field(default="12:00", max_length=8)
    pickupLocation: str = Field(default="", max_length=120)
    destinationLocation: str = Field(default="", max_length=120)
    currentPrice: float = Field(gt=0, le=1_000_000)
    weather: str = Field(default="Clear", max_length=40)
    events: str = Field(default="Normal day", max_length=40)
    weatherSource: str = Field(default="Manual", max_length=80)
    calendarContext: dict[str, Any] | None = None

    @field_validator("city", "category", "subCategory", "weather", "events", "time", "pickupLocation", "destinationLocation", mode="before")
    @classmethod
    def _stringify(cls, v: Any) -> str:
        return str(v or "")


class PredictResponse(BaseModel):
    forecast: int
    baseline: int
    ratio: float
    suggestedPrice: int
    multiplier: float
    confidence: int
    explanation: list[str]
    reasons: list[str]
    contextSummary: dict[str, Any]
    modelVersion: str


def _clamp(value: float, lo: float, hi: float) -> float:
    return min(max(value, lo), hi)


def _tree_uncertainty(features) -> float:
    if PIPELINE is None or not hasattr(PIPELINE, "named_steps"):
        return 0.05
    rf = PIPELINE.named_steps["rf"]
    transformed = PIPELINE.named_steps["prep"].transform(features)
    per_tree = np.array([tree.predict(transformed)[0] for tree in rf.estimators_])
    mean = per_tree.mean()
    return float(per_tree.std() / mean) if mean > 0 else 0.0


def _build_context_reasons(body: PredictRequest, ctx: dict[str, Any] | None) -> list[str]:
    reasons = []

    if body.subCategory:
        reasons.append(f"Sub-service complexity factor: {body.subCategory}")

    if body.weatherSource and "Open-Meteo" in body.weatherSource:
        reasons.append(f"Live Weather Auto-Resolved ({body.weatherSource}): {body.weather}")
    elif body.weather in ("Rain", "Extreme heat"):
        reasons.append(f"{body.weather} weather conditions")

    if ctx:
        if ctx.get("isWeekend"):
            reasons.append(f"System Analysis: Weekend ({ctx.get('dayOfWeek', 'Weekend')}) detected")
        if ctx.get("isHoliday"):
            reasons.append(f"System Analysis: Holiday ({ctx.get('holidayName', 'Holiday')})")

        active_events = ctx.get("activeEvents", [])
        for ev in active_events:
            ev_name = ev.get("name", "Event")
            ev_area = ev.get("affectedArea")
            is_affected = ev.get("locationAffected", False)
            if is_affected and ev_area:
                reasons.append(f"System Analysis (Event): {ev_name} in {ev_area}")
            else:
                reasons.append(f"System Analysis (Event): {ev_name}")

        traffic_imp = ctx.get("trafficImpact", 1.0)
        if traffic_imp > 1.15:
            reasons.append(f"Estimated Impact (Rule-based): Traffic factor (+{int((traffic_imp - 1) * 100)}%)")

        avail_imp = ctx.get("availabilityImpact", 1.0)
        if avail_imp < 0.90:
            reasons.append(f"Estimated Impact (Rule-based): Worker availability (-{int((1 - avail_imp) * 100)}%)")

        demand_imp = ctx.get("demandImpact", 1.0)
        if demand_imp > 1.15:
            reasons.append(f"Estimated Impact (Rule-based): Demand uplift (+{int((demand_imp - 1) * 100)}%)")
    else:
        if body.events == "Holiday":
            reasons.append("System Analysis: Holiday activity detected")
        elif body.events == "Major event":
            reasons.append("System Analysis: Major event detected in area")

    if not reasons:
        reasons.append("Standard demand pattern on normal day")

    return reasons


def _explain(features, forecast: float, baseline: float, body: PredictRequest) -> list[str]:
    row = features.iloc[0]
    lines: list[str] = []

    def delta_for(column: str, neutral: Any) -> float:
        if PIPELINE is None or row[column] == neutral:
            return 0.0
        alt = features.copy()
        alt.loc[alt.index[0], column] = neutral
        alt_pred = float(PIPELINE.predict(alt)[0])
        return (forecast - alt_pred) / alt_pred if alt_pred > 0 else 0.0

    city_pct = round((CITY_FACTOR.get(row["city"], 1.0) - 1) * 100)
    lines.append(f"{row['city']} baseline demand profile contributes {city_pct:+d}% to standard volume.")

    if body.subCategory:
        lines.append(f"Sub-service type ({body.subCategory}) adjusts structural baseline pricing.")

    if row["weather"] != "Clear":
        lines.append(f"{row['weather']} weather conditions adjust expected demand by {round(delta_for('weather', 'Clear') * 100):+d}%.")

    ctx = body.calendarContext
    if ctx and ctx.get("activeEvents"):
        ev_names = ", ".join([e.get("name", "Event") for e in ctx["activeEvents"]])
        lines.append(f"Calendar events ({ev_names}) adjust expected demand by {round(delta_for('events', 'Normal day') * 100):+d}%.")
    elif row["events"] != "Normal day":
        lines.append(f"{row['events']} activity adjusts expected demand by {round(delta_for('events', 'Normal day') * 100):+d}%.")

    if row["is_weekend"]:
        lines.append("Weekend factor incorporated into worker availability & demand predictions.")

    return lines


@app.get("/")
async def root() -> dict[str, str]:
    return {
        "status": "ok",
        "service": "ShramSaathi AI Engine",
        "docs": "/docs",
        "health": "/health"
    }


@app.get("/health")
async def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "model": "RandomForestRegressor",
        "modelVersion": METADATA.get("model_version", MODEL_VERSION),
        "trainedOn": METADATA.get("trained_on"),
        "metrics": METADATA.get("metrics"),
    }


@app.get("/analytics")
async def analytics() -> dict[str, Any]:
    analytics_path = HERE / "data" / "spark_output.json"

    if not analytics_path.exists():
        raise fastapi.HTTPException(
            status_code=404,
            detail="Spark analytics output not found. Run spark_pipeline.py first.",
        )

    return json.loads(analytics_path.read_text())


@app.get("/options")
async def options() -> dict[str, Any]:
    """Valid categorical values and category-subcategory hierarchy tree."""
    return {
        "cities": CITIES,
        "categories": CATEGORIES,
        "subCategories": SUBCATEGORIES,
        "categorySubcategoryMap": CATEGORY_SUBCATEGORY_MAP,
        "weather": WEATHERS,
        "events": EVENTS
    }


@app.post("/predict", response_model=PredictResponse)
async def predict(body: PredictRequest) -> PredictResponse:
    features = build_features(
        city=body.city,
        category=body.category,
        sub_category=body.subCategory,
        weather=body.weather,
        events=body.events,
        when=body.date or None,
        calendar_context=body.calendarContext,
    )
    baseline = baseline_jobs(body.city, body.category, body.subCategory)
    if PIPELINE is not None:
        forecast = float(PIPELINE.predict(features)[0])
    else:
        demand_imp = float(features.iloc[0]["demand_impact"])
        avail_imp = float(features.iloc[0]["availability_impact"])
        traffic_imp = float(features.iloc[0]["traffic_impact"])
        is_wknd = float(features.iloc[0]["is_weekend"])
        combined = demand_imp * (1.0 + (1.0 - avail_imp) * 0.3) * (1.0 + (traffic_imp - 1.0) * 0.2)
        if is_wknd:
            combined *= 1.08
        forecast = float(baseline * combined)
    ratio = forecast / baseline if baseline > 0 else 1.0

    multiplier = _clamp(0.82 + (ratio - 0.75) * 0.54, PRICE_FLOOR, PRICE_CEILING)
    suggested = round(body.currentPrice * multiplier)

    spread = _tree_uncertainty(features)
    confidence = int(round(_clamp(94 - spread * 220 - abs(ratio - 1) * 12, 62, 94)))

    reasons = _build_context_reasons(body, body.calendarContext)
    explanation = _explain(features, forecast, baseline, body)

    ctx_summary = body.calendarContext or {
        "isWeekend": int(features.iloc[0]["is_weekend"]) == 1,
        "isHoliday": body.events == "Holiday",
        "eventPresent": body.events == "Major event",
        "demandImpact": float(features.iloc[0]["demand_impact"]),
        "availabilityImpact": float(features.iloc[0]["availability_impact"]),
        "trafficImpact": float(features.iloc[0]["traffic_impact"]),
        "locationAffected": bool(features.iloc[0]["location_affected"]),
    }

    return PredictResponse(
        forecast=int(round(forecast)),
        baseline=int(baseline),
        ratio=round(ratio, 4),
        suggestedPrice=int(suggested),
        multiplier=round(multiplier, 4),
        confidence=confidence,
        explanation=explanation,
        reasons=reasons,
        contextSummary=ctx_summary,
        modelVersion=METADATA.get("model_version", MODEL_VERSION),
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="127.0.0.1", port=8001, reload=True)