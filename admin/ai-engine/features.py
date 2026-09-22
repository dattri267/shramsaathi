"""
Shared feature engineering for the ShramSaathi demand engine.

Supports all 10 Household & Personal Service categories and 31 subcategories.
"""

from __future__ import annotations

from datetime import date, datetime
from typing import Any

import pandas as pd

MODEL_VERSION = "1.2.0-rf-subcategories"

CITIES = ["Bengaluru", "Mumbai", "Delhi", "Hyderabad", "Kolkata", "Chennai", "Pune", "Jaipur", "Ahmedabad", "Noida", "Gurgaon"]

CATEGORIES = [
    "Electrician",
    "Plumber",
    "Carpenter",
    "Painter",
    "Domestic Helper",
    "Caregiver",
    "Drivers",
    "Gardener",
    "Cleaner",
    "Technician",
]

SUBCATEGORIES = [
    # Electrician
    "Residential electrician",
    "Industrial electrician",
    "Solar electrical service",
    # Plumber
    "Pipe & leakage",
    "Bathroom plumbing",
    "Water tank service",
    # Carpenter / Carpentry
    "Furniture repairs",
    "Polishing & woodwork",
    "Custom furniture",
    # Painter
    "House painting",
    "Texture painting",
    "Waterproofing",
    # Domestic Helper
    "House maid",
    "Cooking helper",
    "Laundry helper",
    # Caregiver
    "Elderly care",
    "Patient care",
    "Baby care",
    # Drivers
    "Personal driver",
    "Delivery driver",
    "Family driver",
    # Gardener
    "Garden & lawn maintenance",
    "Garden cleaning",
    "Terrace garden maintenance",
    # Cleaner
    "Home cleaning",
    "Bathroom cleaning",
    "Sofa and carpet cleaning",
    # Technician
    "RO/water purifier",
    "CCTV technician",
    "Appliances technician",
    "Mobile technician",
]

WEATHERS = ["Clear", "Rain", "Extreme heat"]
EVENTS = ["Normal day", "Holiday", "Major event"]

CATEGORICAL_FEATURES = ["city", "category", "sub_category", "weather", "events"]
NUMERIC_FEATURES = [
    "day_of_week",
    "month",
    "is_weekend",
    "is_month_end",
    "hour_of_day",
    "demand_impact",
    "availability_impact",
    "traffic_impact",
    "location_affected",
]
FEATURE_COLUMNS = CATEGORICAL_FEATURES + NUMERIC_FEATURES

BASE_JOBS = 86.0

CITY_FACTOR = {
    "Bengaluru": 1.00,
    "Mumbai": 1.12,
    "Delhi": 1.08,
    "Hyderabad": 0.95,
    "Kolkata": 0.92,
    "Chennai": 0.96,
    "Pune": 0.95,
    "Jaipur": 0.88,
    "Ahmedabad": 0.90,
    "Noida": 1.05,
    "Gurgaon": 1.08,
}

CATEGORY_FACTOR = {
    "Electrician": 1.10,
    "Plumber": 1.15,
    "Carpenter": 0.95,
    "Painter": 0.85,
    "Domestic Helper": 1.05,
    "Caregiver": 0.90,
    "Drivers": 1.00,
    "Gardener": 0.88,
    "Cleaner": 1.02,
    "Technician": 1.00,
}

SUBCATEGORY_FACTOR = {
    # Electrician
    "Residential electrician": 1.00,
    "Industrial electrician": 1.35,
    "Solar electrical service": 1.25,
    # Plumber
    "Pipe & leakage": 1.00,
    "Bathroom plumbing": 1.15,
    "Water tank service": 1.20,
    # Carpenter
    "Furniture repairs": 1.00,
    "Polishing & woodwork": 1.18,
    "Custom furniture": 1.30,
    # Painter
    "House painting": 1.00,
    "Texture painting": 1.25,
    "Waterproofing": 1.35,
    # Domestic Helper
    "House maid": 1.00,
    "Cooking helper": 1.10,
    "Laundry helper": 0.95,
    # Caregiver
    "Elderly care": 1.10,
    "Patient care": 1.25,
    "Baby care": 1.15,
    # Drivers
    "Personal driver": 1.00,
    "Delivery driver": 0.90,
    "Family driver": 1.05,
    # Gardener
    "Garden & lawn maintenance": 1.00,
    "Garden cleaning": 0.90,
    "Terrace garden maintenance": 1.20,
    # Cleaner
    "Home cleaning": 1.00,
    "Bathroom cleaning": 0.95,
    "Sofa and carpet cleaning": 1.15,
    # Technician
    "RO/water purifier": 1.00,
    "CCTV technician": 1.20,
    "Appliances technician": 1.15,
    "Mobile technician": 1.10,
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


def _normalize_city(city: str) -> str:
    key = (city or "").strip()
    if not key:
        return "Bengaluru"
    for option in CITIES:
        if key.lower() == option.lower():
            return option
    # Format clean Title Case for unmodeled Indian cities (e.g., "noida" -> "Noida")
    return key.title()


def _normalize(value: str, options: list[str]) -> str:
    """Map free-text input onto a known option (case/whitespace insensitive)."""
    key = (value or "").strip().lower()

    # Alias handling for Carpenter / Carpentry
    if key in ("carpentry", "carpenter"):
        return "Carpenter"

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
    sub_category: str = "",
    weather: str,
    events: str,
    when: str | date | datetime | None,
    hour_of_day: int = 12,
    demand_impact: float = 1.0,
    availability_impact: float = 1.0,
    traffic_impact: float = 1.0,
    location_affected: int = 0,
    calendar_context: dict[str, Any] | None = None,
) -> pd.DataFrame:
    """Return a single-row DataFrame in the exact column order the model expects."""
    d = parse_date(when)

    norm_city = _normalize_city(city)
    norm_category = _normalize(category, CATEGORIES)
    norm_subcategory = _normalize(sub_category, SUBCATEGORIES) if sub_category else SUBCATEGORIES[0]

    if calendar_context:
        hour_str = str(calendar_context.get("bookingTime", "12:00")).split(":")[0]
        try:
            hour_of_day = int(hour_str)
        except ValueError:
            hour_of_day = 12

        demand_impact = float(calendar_context.get("demandImpact", demand_impact))
        availability_impact = float(calendar_context.get("availabilityImpact", availability_impact))
        traffic_impact = float(calendar_context.get("trafficImpact", traffic_impact))
        location_affected = int(bool(calendar_context.get("locationAffected", location_affected)))

        if calendar_context.get("isHoliday"):
            events = "Holiday"
        elif calendar_context.get("eventPresent"):
            events = "Major event"

    row = {
        "city": norm_city,
        "category": norm_category,
        "sub_category": norm_subcategory,
        "weather": _normalize(weather, WEATHERS),
        "events": _normalize(events, EVENTS),
        "day_of_week": d.weekday(),
        "month": d.month,
        "is_weekend": int(d.weekday() >= 5),
        "is_month_end": int(d.day >= 26),
        "hour_of_day": hour_of_day,
        "demand_impact": demand_impact,
        "availability_impact": availability_impact,
        "traffic_impact": traffic_impact,
        "location_affected": location_affected,
    }

    return pd.DataFrame([row], columns=FEATURE_COLUMNS)


def baseline_jobs(city: str, category: str, sub_category: str = "") -> float:
    """Structural baseline (no weather / event uplift) used for the ratio."""
    c = _normalize_city(city)
    k = _normalize(category, CATEGORIES)
    sub_k = _normalize(sub_category, SUBCATEGORIES) if sub_category else SUBCATEGORIES[0]

    sub_mult = SUBCATEGORY_FACTOR.get(sub_k, 1.00)

    return max(
        10.0,
        round(
            BASE_JOBS
            * CITY_FACTOR.get(c, 1.00)
            * CATEGORY_FACTOR.get(k, 1.00)
            * sub_mult
        )
    )