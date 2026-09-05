"""
ShramSaathi AI engine - FastAPI inference service.

Routes are defined WITHOUT the `/api` prefix; Vercel strips it before
forwarding (see `vercel.json`). The frontend calls `/api/predict`.
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
    WEATHERS,
    baseline_jobs,
    build_features,
)

HERE = Path(__file__).resolve().parent
MODEL_PATH = HERE / "model" / "demand_forecaster.pkl"
META_PATH = HERE / "model" / "metadata.json"

PRICE_FLOOR = 0.82
PRICE_CEILING = 1.18


def _load_model():
    if not MODEL_PATH.exists():
        raise RuntimeError(
            f"Model file not found at {MODEL_PATH}. Run `python train.py` inside backend/ to create it."
        )
    with MODEL_PATH.open("rb") as fh:
        return pickle.load(fh)


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
    category: str = Field(default="Home services", max_length=80)
    date: str = Field(default="", max_length=10)
    currentPrice: float = Field(gt=0, le=1_000_000)
    weather: str = Field(default="Clear", max_length=40)
    events: str = Field(default="Normal day", max_length=40)

    @field_validator("city", "category", "weather", "events", mode="before")
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
    modelVersion: str


def _clamp(value: float, lo: float, hi: float) -> float:
    return min(max(value, lo), hi)


def _tree_uncertainty(features) -> float:
    """Relative spread across trees; used to derive a confidence score."""
    rf = PIPELINE.named_steps["rf"]
    transformed = PIPELINE.named_steps["prep"].transform(features)
    per_tree = np.array([tree.predict(transformed)[0] for tree in rf.estimators_])
    mean = per_tree.mean()
    return float(per_tree.std() / mean) if mean > 0 else 0.0


def _explain(features, forecast: float, baseline: float) -> list[str]:
    """Counterfactual explanation: swap each factor to its neutral level and measure the delta."""
    row = features.iloc[0]
    lines: list[str] = []

    def delta_for(column: str, neutral: str) -> float:
        if row[column] == neutral:
            return 0.0
        alt = features.copy()
        alt.loc[alt.index[0], column] = neutral
        alt_pred = float(PIPELINE.predict(alt)[0])
        return (forecast - alt_pred) / alt_pred if alt_pred > 0 else 0.0

    city_pct = round((CITY_FACTOR[row["city"]] - 1) * 100)
    lines.append(f"{row['city']} demand profile contributes {city_pct:+d}% to the baseline.")
    lines.append(f"{row['weather']} conditions adjust expected jobs by {round(delta_for('weather', 'Clear') * 100):+d}%.")
    lines.append(f"{row['events']} activity adjusts expected jobs by {round(delta_for('events', 'Normal day') * 100):+d}%.")
    return lines


@app.get("/health")
async def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "model": "RandomForestRegressor",
        "modelVersion": METADATA.get("model_version", MODEL_VERSION),
        "trainedOn": METADATA.get("trained_on"),
        "metrics": METADATA.get("metrics"),
    }


@app.get("/options")
async def options() -> dict[str, list[str]]:
    """Valid categorical values, so the UI never drifts from the model."""
    return {"cities": CITIES, "categories": CATEGORIES, "weather": WEATHERS, "events": EVENTS}


@app.post("/predict", response_model=PredictResponse)
async def predict(body: PredictRequest) -> PredictResponse:
    features = build_features(
        city=body.city,
        category=body.category,
        weather=body.weather,
        events=body.events,
        when=body.date or None,
    )
    forecast = float(PIPELINE.predict(features)[0])
    baseline = baseline_jobs(body.city, body.category)
    ratio = forecast / baseline if baseline > 0 else 1.0

    multiplier = _clamp(0.82 + (ratio - 0.75) * 0.54, PRICE_FLOOR, PRICE_CEILING)
    suggested = round(body.currentPrice * multiplier)

    spread = _tree_uncertainty(features)
    confidence = int(round(_clamp(94 - spread * 220 - abs(ratio - 1) * 12, 62, 94)))

    return PredictResponse(
        forecast=int(round(forecast)),
        baseline=int(baseline),
        ratio=round(ratio, 4),
        suggestedPrice=int(suggested),
        multiplier=round(multiplier, 4),
        confidence=confidence,
        explanation=_explain(features, forecast, baseline),
        modelVersion=METADATA.get("model_version", MODEL_VERSION),
    )