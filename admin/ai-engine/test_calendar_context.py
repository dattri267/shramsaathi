"""
Unit and integration tests for Calendar, Weather & Subcategories in ShramSaathi AI Engine.
Run with: py -m unittest test_calendar_context.py
"""

from __future__ import annotations

import unittest
from features import build_features, baseline_jobs, FEATURE_COLUMNS, CATEGORIES, SUBCATEGORIES
from main import predict, PredictRequest, _clamp, PRICE_FLOOR, PRICE_CEILING


class TestCalendarContext(unittest.IsolatedAsyncioTestCase):

    def test_01_normal_monday(self):
        df = build_features(
            city="Delhi",
            category="Electrician",
            sub_category="Residential electrician",
            weather="Clear",
            events="Normal day",
            when="2026-09-14",
            calendar_context={
                "isWeekend": False,
                "isHoliday": False,
                "eventPresent": False,
                "demandImpact": 1.0,
                "availabilityImpact": 1.0,
                "trafficImpact": 1.0,
                "locationAffected": False
            }
        )
        self.assertEqual(df.iloc[0]["is_weekend"], 0)
        self.assertEqual(df.iloc[0]["category"], "Electrician")
        self.assertEqual(df.iloc[0]["sub_category"], "Residential electrician")

    def test_02_subcategory_scaling(self):
        """Test subcategory complexity baseline scaling (Industrial vs Residential)"""
        base_res = baseline_jobs("Delhi", "Electrician", "Residential electrician")
        base_ind = baseline_jobs("Delhi", "Electrician", "Industrial electrician")
        self.assertGreater(base_ind, base_res)

    def test_03_sunday_weekend_detection(self):
        df = build_features(
            city="Delhi",
            category="Electrician",
            sub_category="Solar electrical service",
            weather="Clear",
            events="Normal day",
            when="2026-09-20",
            calendar_context={
                "isWeekend": True,
                "dayOfWeek": "Sunday",
                "isHoliday": False,
                "eventPresent": False,
                "demandImpact": 1.10,
                "availabilityImpact": 0.88,
                "trafficImpact": 1.0,
                "locationAffected": False
            }
        )
        self.assertEqual(df.iloc[0]["is_weekend"], 1)

    async def test_04_major_event_affected_location(self):
        req = PredictRequest(
            city="Delhi",
            category="Plumber",
            subCategory="Water tank service",
            date="2026-09-12",
            time="12:00",
            pickupLocation="Noida",
            destinationLocation="Central Delhi",
            currentPrice=650.0,
            weather="Clear",
            weatherSource="Open-Meteo Live API",
            events="Major event",
            calendarContext={
                "isWeekend": True,
                "isHoliday": False,
                "eventPresent": True,
                "activeEvents": [{
                    "name": "BRICS Summit",
                    "affectedArea": "Central Delhi",
                    "locationAffected": True
                }],
                "demandImpact": 1.35,
                "availabilityImpact": 0.70,
                "trafficImpact": 1.45,
                "locationAffected": True
            }
        )
        resp = await predict(req)
        self.assertGreater(resp.forecast, 0)
        self.assertTrue(any("BRICS Summit" in r or "affected" in r or "Major Event" in r for r in resp.reasons))

    async def test_05_extreme_demand_price_cap(self):
        req = PredictRequest(
            city="Mumbai",
            category="Technician",
            subCategory="CCTV technician",
            date="2026-11-08",
            time="12:00",
            currentPrice=850.0,
            weather="Rain",
            events="Major event",
            calendarContext={
                "demandImpact": 2.50,
                "availabilityImpact": 0.30,
                "trafficImpact": 2.00,
                "locationAffected": True
            }
        )
        resp = await predict(req)
        min_allowed = round(850.0 * PRICE_FLOOR)
        max_allowed = round(850.0 * PRICE_CEILING)

        self.assertLessEqual(resp.suggestedPrice, max_allowed)
        self.assertGreaterEqual(resp.suggestedPrice, min_allowed)

    def test_06_unmodeled_city_support(self):
        from features import CITY_FACTOR
        base_meerut = baseline_jobs("Meerut", "Electrician", "Residential electrician")
        self.assertEqual(CITY_FACTOR.get("Meerut", 1.00), 1.00)
        self.assertEqual(base_meerut, 95) # 86 * 1.00 * 1.10 = 94.6 -> 95


if __name__ == "__main__":
    unittest.main()
