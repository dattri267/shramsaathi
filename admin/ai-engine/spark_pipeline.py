"""
ShramSaathi Spark data-engineering pipeline.

Reads the synthetic demand history, cleans it, aggregates demand by city and
service category, and writes a small JSON read-model consumed by the admin UI.
Run from this directory with: spark-submit spark_pipeline.py
"""

from __future__ import annotations

import json
from pathlib import Path

from pyspark.sql import SparkSession, functions as F

HERE = Path(__file__).resolve().parent
INPUT = HERE / "data" / "synthetic_demand.csv"
OUTPUT = HERE / "data" / "spark_output.json"


def main() -> None:
    spark = (
        SparkSession.builder
        .appName("ShramSaathiDemandAnalytics")
        .master("local[*]")
        .getOrCreate()
    )
    spark.sparkContext.setLogLevel("WARN")

    df = (
        spark.read.option("header", True).option("inferSchema", True).csv(str(INPUT))
        .dropna(subset=["date", "city", "category", "jobs"])
        .withColumn("date", F.to_date("date"))
        .withColumn("jobs", F.col("jobs").cast("double"))
        .filter(F.col("jobs") > 0)
    )

    total_jobs = int(df.agg(F.sum("jobs")).first()[0] or 0)
    avg_daily_jobs = float(df.agg(F.avg("jobs")).first()[0] or 0)

    city_rows = (
        df.groupBy("city")
        .agg(
            F.sum("jobs").alias("total_jobs"),
            F.avg("jobs").alias("avg_jobs"),
            F.count("*").alias("records"),
        )
        .orderBy(F.desc("total_jobs"))
        .collect()
    )

    category_rows = (
        df.groupBy("category")
        .agg(
            F.sum("jobs").alias("total_jobs"),
            F.avg("jobs").alias("avg_jobs"),
            F.count("*").alias("records"),
        )
        .orderBy(F.desc("total_jobs"))
        .collect()
    )

    city_category_rows = (
        df.groupBy("city", "category")
        .agg(F.sum("jobs").alias("total_jobs"))
        .orderBy(F.desc("total_jobs"))
        .limit(10)
        .collect()
    )

    peak_day = (
        df.groupBy("day_of_week")
        .agg(F.avg("jobs").alias("avg_jobs"))
        .orderBy(F.desc("avg_jobs"))
        .first()
    )
    peak_month = (
        df.groupBy("month")
        .agg(F.avg("jobs").alias("avg_jobs"))
        .orderBy(F.desc("avg_jobs"))
        .first()
    )

    day_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    top_city = city_rows[0]["city"] if city_rows else None
    top_category = category_rows[0]["category"] if category_rows else None

    result = {
        "generated_by": "Apache Spark / PySpark",
        "source": "synthetic_demand.csv",
        "total_jobs": total_jobs,
        "avg_daily_jobs": round(avg_daily_jobs, 2),
        "cities": [
            {"city": r["city"], "total_jobs": int(r["total_jobs"]), "avg_jobs": round(float(r["avg_jobs"]), 2), "records": int(r["records"])}
            for r in city_rows
        ],
        "categories": [
            {"category": r["category"], "total_jobs": int(r["total_jobs"]), "avg_jobs": round(float(r["avg_jobs"]), 2), "records": int(r["records"])}
            for r in category_rows
        ],
        "top_city_category": [
            {"city": r["city"], "category": r["category"], "total_jobs": int(r["total_jobs"])}
            for r in city_category_rows
        ],
        "peak_day": {
            "day": day_names[int(peak_day["day_of_week"])],
            "avg_jobs": round(float(peak_day["avg_jobs"]), 2),
        } if peak_day else None,
        "peak_month": {
            "month": int(peak_month["month"]),
            "avg_jobs": round(float(peak_month["avg_jobs"]), 2),
        } if peak_month else None,
        "allocation_insight": (
            f"Prioritize cooperative worker availability for {top_category} in {top_city}."
            if top_city and top_category else "No allocation insight available."
        ),
    }

    OUTPUT.write_text(json.dumps(result, indent=2))
    print(f"Spark analytics written to {OUTPUT}")
    spark.stop()


if __name__ == "__main__":
    main()
