"""
Shared feature engineering for the ShramSaathi demand engine.

Both `train.py` (offline training) and `main.py` (online inference) import
from here so the model always sees identical features. Keep every constant
below in sync with the option lists in `frontend/app/page.tsx`.
"""

from __future__ import annotations

from datetime import date, datetime

import pandas as pd

MODEL_VERSION = "1.0.0-rf"

CITIES = ["Bengaluru", "Mumbai", "Delhi", "Hyderabad"]

CATEGORIES = [
    "Electrician",
    "Plumber",
    "Carpenter",
    "Painter",
    "Domestic Helper",
    "Caregiver",
    "Technician",
]

WEATHERS = ["Clear", "Rain", "Extreme heat"]
EVENTS = ["Normal day", "Holiday", "Major event"]

CATEGORICAL_FEATURES = ["city", "category", "weather", "events"]
NUMERIC_FEATURES = ["day_of_week", "month", "is_weekend", "is_month_end"]
FEATURE_COLUMNS = CATEGORICAL_FEATURES + NUMERIC_FEATURES

# Explainable "true" demand structure used to generate synthetic history.
# These are multiplicative effects on a base of 86 jobs / day.
BASE_JOBS = 86.0

CITY_FACTOR = {
    "Bengaluru": 1.00,
    "Mumbai": 1.12,
    "Delhi": 1.08,
    "Hyderabad": 0.95,
}

CATEGORY_FACTOR = {
    "Electrician": 1.10,
    "Plumber": 1.15,
    "Carpenter": 0.95,
    "Painter": 0.85,
    "Domestic Helper": 1.05,
    "Caregiver": 0.90,
    "Technician": 1.00,
}

WEATHER_FACTOR = {
    "Clear": 1.00,
    "Rain": 1.22,
    "Extreme heat": 1.14,
}

EVENT_FACTOR = {
    "Normal day": 1.00,
    "Holiday": 1.14,
    "Major event": 1.28,
}


def _normalize(value: str, options: list[str]) -> str:
    """Map free-text input onto a known option (case/whitespace insensitive)."""
    key = (value or "").strip().lower()
    for option in options:
        if key == option.lower() or (key and key in option.lower()):
            return option
    return options[0]


def parse_date(value: str | date | datetime | None) -> date:
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    try:
        return datetime.strptime(str(value)[:10], "%Y-%m-%d").date()
    except (TypeError, ValueError):
        return date.today()


def build_features(
    *,
    city: str,
    category: str,
    weather: str,
    events: str,
    when: str | date | datetime | None,
) -> pd.DataFrame:
    """Return a single-row DataFrame in the exact column order the model expects."""
    d = parse_date(when)

    row = {
        "city": _normalize(city, CITIES),
        "category": _normalize(category, CATEGORIES),
        "weather": _normalize(weather, WEATHERS),
        "events": _normalize(events, EVENTS),
        "day_of_week": d.weekday(),
        "month": d.month,
        "is_weekend": int(d.weekday() >= 5),
        "is_month_end": int(d.day >= 26),
    }

    return pd.DataFrame(
        [row],
        columns=FEATURE_COLUMNS
    )


def baseline_jobs(city: str, category: str) -> float:
    """Structural baseline (no weather / event uplift) used for the ratio."""
    c = _normalize(city, CITIES)
    k = _normalize(category, CATEGORIES)

    return max(
        10.0,
        round(
            BASE_JOBS
            * CITY_FACTOR[c]
            * CATEGORY_FACTOR[k]
        )
    )