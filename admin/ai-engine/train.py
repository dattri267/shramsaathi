"""
Generate synthetic demand history and train the ShramSaathi Random Forest Forecaster.
"""

from __future__ import annotations

import argparse
import json
import pickle
import random
from datetime import date, timedelta
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

from features import (
    BASE_JOBS,
    CATEGORICAL_FEATURES,
    CATEGORIES,
    CATEGORY_FACTOR,
    CITIES,
    CITY_FACTOR,
    EVENT_FACTOR,
    EVENTS,
    FEATURE_COLUMNS,
    MODEL_VERSION,
    NUMERIC_FEATURES,
    SUBCATEGORIES,
    SUBCATEGORY_FACTOR,
    WEATHER_FACTOR,
    WEATHERS,
)

HERE = Path(__file__).resolve().parent
MODEL_DIR = HERE / "model"
DATA_DIR = HERE / "data"

MONTH_FACTOR = {1: 0.98, 2: 0.97, 3: 1.00, 4: 1.03, 5: 1.05, 6: 1.08,
                7: 1.12, 8: 1.10, 9: 1.04, 10: 1.09, 11: 1.07, 12: 1.02}
WEEKDAY_FACTOR = [0.96, 0.97, 0.98, 1.00, 1.05, 1.14, 1.10]  # Mon..Sun


def _sample_weather(month: int, rng: random.Random) -> str:
    if month in (6, 7, 8, 9):
        weights = [0.45, 0.50, 0.05]
    elif month in (4, 5):
        weights = [0.55, 0.05, 0.40]
    else:
        weights = [0.85, 0.10, 0.05]
    return rng.choices(WEATHERS, weights=weights, k=1)[0]


def _sample_event(d: date, rng: random.Random) -> str:
    holiday_p = 0.16 if d.month in (10, 11, 12, 1, 8) else 0.07
    roll = rng.random()
    if roll < 0.04:
        return "Major event"
    if roll < 0.04 + holiday_p:
        return "Holiday"
    return "Normal day"


def generate_synthetic_history(rows: int, seed: int) -> pd.DataFrame:
    rng = random.Random(seed)
    np_rng = np.random.default_rng(seed)
    start = date(2023, 1, 1)
    span_days = 365 * 3

    records = []
    for _ in range(rows):
        d = start + timedelta(days=rng.randrange(span_days))
        city = rng.choice(CITIES)
        category = rng.choice(CATEGORIES)
        sub_category = rng.choice(SUBCATEGORIES)
        weather = _sample_weather(d.month, rng)
        events = _sample_event(d, rng)
        hour_of_day = rng.choice([8, 10, 12, 14, 16, 18, 20, 22])

        demand_impact = 1.0
        availability_impact = 1.0
        traffic_impact = 1.0
        location_affected = 0

        if events == "Holiday":
            demand_impact = float(rng.uniform(1.10, 1.35))
            availability_impact = float(rng.uniform(0.60, 0.85))
            traffic_impact = float(rng.uniform(1.05, 1.25))
        elif events == "Major event":
            demand_impact = float(rng.uniform(1.20, 1.50))
            availability_impact = float(rng.uniform(0.50, 0.75))
            traffic_impact = float(rng.uniform(1.25, 1.60))
            location_affected = 1 if rng.random() < 0.7 else 0

        sub_mult = SUBCATEGORY_FACTOR.get(sub_category, 1.0)

        expected = (
            BASE_JOBS
            * CITY_FACTOR[city]
            * CATEGORY_FACTOR[category]
            * sub_mult
            * WEATHER_FACTOR[weather]
            * EVENT_FACTOR[events]
            * MONTH_FACTOR[d.month]
            * WEEKDAY_FACTOR[d.weekday()]
            * (1.06 if d.day >= 26 else 1.0)
            * (demand_impact / max(0.4, availability_impact))**0.3
        )
        if weather == "Rain" and events == "Major event":
            expected *= 1.08

        jobs = np_rng.poisson(expected) * np_rng.normal(1.0, 0.04)
        jobs = max(5, int(round(jobs)))

        records.append(
            {
                "date": d.isoformat(),
                "city": city,
                "category": category,
                "sub_category": sub_category,
                "weather": weather,
                "events": events,
                "day_of_week": d.weekday(),
                "month": d.month,
                "is_weekend": int(d.weekday() >= 5),
                "is_month_end": int(d.day >= 26),
                "hour_of_day": hour_of_day,
                "demand_impact": demand_impact,
                "availability_impact": availability_impact,
                "traffic_impact": traffic_impact,
                "location_affected": location_affected,
                "jobs": jobs,
            }
        )
    return pd.DataFrame.from_records(records)


def build_pipeline(seed: int) -> Pipeline:
    preprocessor = ColumnTransformer(
        transformers=[
            ("cat", OneHotEncoder(handle_unknown="ignore"), CATEGORICAL_FEATURES),
            ("num", "passthrough", NUMERIC_FEATURES),
        ]
    )
    model = RandomForestRegressor(
        n_estimators=80,
        max_depth=10,
        min_samples_leaf=10,
        n_jobs=-1,
        random_state=seed,
    )
    return Pipeline(steps=[("prep", preprocessor), ("rf", model)])


def main() -> None:
    parser = argparse.ArgumentParser(description="Train the ShramSaathi demand forecaster")
    parser.add_argument("--rows", type=int, default=15000)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--no-csv", action="store_true", help="Skip writing synthetic CSV")
    args = parser.parse_args()

    print(f"[train] generating {args.rows} synthetic rows (seed={args.seed})")
    df = generate_synthetic_history(args.rows, args.seed)

    X = df[FEATURE_COLUMNS]
    y = df["jobs"]
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=args.seed)

    pipeline = build_pipeline(args.seed)
    pipeline.fit(X_train, y_train)

    preds = pipeline.predict(X_test)
    mae = float(mean_absolute_error(y_test, preds))
    r2 = float(r2_score(y_test, preds))
    print(f"[train] holdout MAE={mae:.2f} jobs  R2={r2:.3f}")

    MODEL_DIR.mkdir(exist_ok=True)
    model_path = MODEL_DIR / "demand_forecaster.pkl"
    with model_path.open("wb") as fh:
        pickle.dump(pipeline, fh, protocol=pickle.HIGHEST_PROTOCOL)

    import sklearn

    metadata = {
        "model_version": MODEL_VERSION,
        "algorithm": "RandomForestRegressor",
        "sklearn_version": sklearn.__version__,
        "trained_on": date.today().isoformat(),
        "rows": int(len(df)),
        "seed": args.seed,
        "features": FEATURE_COLUMNS,
        "target": "jobs",
        "metrics": {"mae": round(mae, 3), "r2": round(r2, 4), "holdout_fraction": 0.2},
    }
    (MODEL_DIR / "metadata.json").write_text(json.dumps(metadata, indent=2))

    if not args.no_csv:
        DATA_DIR.mkdir(exist_ok=True)
        csv_path = DATA_DIR / "synthetic_demand.csv"
        df.to_csv(csv_path, index=False)
        print(f"[train] wrote {csv_path.relative_to(HERE)}")

    print(f"[train] saved {model_path.relative_to(HERE)} ({model_path.stat().st_size / 1024:.0f} KB)")


if __name__ == "__main__":
    main()