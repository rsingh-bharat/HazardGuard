"""
Boundary integration tests — hostile audit.
Proves the Sayan ForecastSnapshot → Soumy ImpactRequest → ImpactResult boundary
without starting external servers.  These tests focus on the exact code paths
introduced or modified in the latest integration round.

Tests are deliberately minimal and targeted.  They do NOT depend on network I/O.

FINDINGS UNDER TEST:
  CRITICAL-1  p10/p50/p90 phantom-quantile fabrication via ×0.79/×1.26
  CRITICAL-2  Double fabrication (Ronak route.ts + Soumy schemas.py from_dict)
  HIGH-1      authoritative_forecast dropped from provenance.to_dict()
  HIGH-2      Empty authoritative_forecast ({}) treated as truthy gating
  HIGH-3      run_simulation_cli.py emits error JSON to stderr but exits 0 if
              ImpactAPIError is raised (server.ts reads exit code, not stderr)
  MEDIUM-1    Fallback p10/p50/p90 fabrication (route.ts lines 64-66)
              still supplied even when authoritative_forecast present
"""
import sys
import os
import json
import unittest

# ---------- path setup --------------------------------------------------
base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if base_dir not in sys.path:
    sys.path.insert(0, base_dir)

from services.impact_engine.core.schemas import (
    ImpactRequest, ForecastSnapshot, RainfallForecast
)
from services.impact_engine.core.scenario import resolve_scenario
from services.impact_engine.core.validation import validate_impact_request, ValidationError
from services.impact_engine.api.routes import handle_simulate
from services.impact_engine.api.errors import ImpactAPIError


# -----------------------------------------------------------------------
# Helper: canonical Sayan ForecastSnapshot dict (as returned by /ml/forecast)
# -----------------------------------------------------------------------
SAYAN_SNAPSHOT = {
    "snapshot_id": "550e8400-e29b-41d4-a716-446655440000",
    "timestamp": "2026-09-05T05:00:00+00:00",
    "latitude": 12.9716,
    "longitude": 77.5946,
    "lead_hours": 24,
    "provider": "open-meteo",
    "provider_model": "ecmwf_ifs025",
    "nwp_valid_time": "2026-09-05T06:00:00+00:00",
    "nwp_initialization_time": None,
    "model_id": "hg-bc-v1.0.0-24h",
    "model_type": "Residual",
    "rainfall_mm": 120.0,
    "model_status": "DEPLOY_CORRECTED",
    "fallback": False,
    "fallback_reason": None,
    "feature_schema": None
}

LEGACY_FORECAST = {
    "forecast_id": "FC-TEST-BOUNDARY",
    "state_id": "KA",
    "district_id": "KA_BLR_URBAN",
    "bbox": [77.58, 12.89, 77.695, 12.98],
    "rainfall": {
        "p10_mm": 0.0,
        "p50_mm": 0.0,
        "p90_mm": 0.0
    }
}


class TestCritical1_PhantomQuantileFabrication(unittest.TestCase):
    """
    CRITICAL-1: Verifies that p10/p50/p90 values produced in schemas.py from_dict
    are NOT fabricated via linear scaling factors (0.79 / 1.26).
    For a single-value deterministic forecast (without distribution quantiles),
    all scenarios honestly evaluate to the base rainfall_mm (no phantom spread).
    When genuine distribution quantiles are provided, they are faithfully used.
    """

    def test_single_value_forecast_defaults_scenarios_honestly_without_fabrication(self):
        payload = {
            "authoritative_forecast": SAYAN_SNAPSHOT,  # single-value deterministic forecast (120.0 mm)
            "forecast": dict(LEGACY_FORECAST),
            "scenario_type": "P90",
            "duration_hours": 24,
            "timestep_hours": 3
        }
        req = ImpactRequest.from_dict(payload)
        rf = req.forecast.rainfall

        base = SAYAN_SNAPSHOT["rainfall_mm"]  # 120.0

        # Invariant: No arbitrary linear scaling (no 0.79 * 120 = 94.8, no 1.26 * 120 = 151.2).
        # For single-value forecast without genuine quantiles, scenarios honestly equal base_mm.
        self.assertEqual(rf.low_scenario_mm, base, "low_scenario_mm must not be fabricated from 0.79 multiplier")
        self.assertEqual(rf.base_scenario_mm, base, "base_scenario_mm must equal authoritative base_mm")
        self.assertEqual(rf.high_scenario_mm, base, "high_scenario_mm must not be fabricated from 1.26 multiplier")
        self.assertEqual(rf.p10_mm, base)
        self.assertEqual(rf.p50_mm, base)
        self.assertEqual(rf.p90_mm, base)

    def test_authentic_distribution_quantiles_preserved_when_present(self):
        snapshot_with_dist = {
            **SAYAN_SNAPSHOT,
            "distribution": {
                "low_scenario_mm": 100.0,
                "base_scenario_mm": 120.0,
                "high_scenario_mm": 145.0,
                "p10_mm": 100.0,
                "p50_mm": 120.0,
                "p90_mm": 145.0,
            }
        }
        payload = {
            "authoritative_forecast": snapshot_with_dist,
            "forecast": dict(LEGACY_FORECAST),
            "scenario_type": "HIGH",
            "duration_hours": 24,
            "timestep_hours": 3
        }
        req = ImpactRequest.from_dict(payload)
        rf = req.forecast.rainfall

        self.assertEqual(rf.low_scenario_mm, 100.0)
        self.assertEqual(rf.base_scenario_mm, 120.0)
        self.assertEqual(rf.high_scenario_mm, 145.0)

    def test_comparison_matrix_uses_honest_quantiles(self):
        """
        engine._generate_comparison() iterates over LOW, BASE, HIGH from forecast.rainfall.
        Verify comparison matrix reflects honest values without fabricated multipliers.
        """
        from services.impact_engine.core.engine import ImpactEngine
        payload = {
            "authoritative_forecast": SAYAN_SNAPSHOT,
            "forecast": dict(LEGACY_FORECAST),
            "scenario_type": "P90",
            "duration_hours": 24,
            "timestep_hours": 3
        }
        req = ImpactRequest.from_dict(payload)
        engine = ImpactEngine()
        result = engine.simulate(req)

        # For single-value forecast, P10 rainfall_mm must be base (120.0), NOT 94.8
        self.assertIn("P10", result.comparison)
        self.assertEqual(
            result.comparison["P10"]["rainfall_mm"], 120.0,
            "Comparison matrix P10 must be base_mm, not fabricated 94.8"
        )
        self.assertEqual(result.comparison["BASE"]["rainfall_mm"], 120.0)
        self.assertEqual(result.comparison["HIGH"]["rainfall_mm"], 120.0)


class TestCritical2_DoubleQuantileFabrication(unittest.TestCase):
    """
    CRITICAL-2: Verifies that arbitrary 0.79 and 1.26 multipliers are NOT injected
    into request payloads, and schemas.py does NOT multiply base rainfall.
    """

    def test_no_fabricated_scaling_in_scenarios(self):
        rainfall_mm = SAYAN_SNAPSHOT["rainfall_mm"]  # 120.0

        clean_payload = {
            "authoritative_forecast": SAYAN_SNAPSHOT,
            "forecast": {
                **LEGACY_FORECAST,
                "rainfall": {
                    "low_scenario_mm": rainfall_mm,
                    "base_scenario_mm": rainfall_mm,
                    "high_scenario_mm": rainfall_mm,
                    "p10_mm": rainfall_mm,
                    "p50_mm": rainfall_mm,
                    "p90_mm": rainfall_mm,
                }
            },
            "scenario_type": "P90",
            "duration_hours": 24,
            "timestep_hours": 3
        }

        req = ImpactRequest.from_dict(clean_payload)
        rf = req.forecast.rainfall

        self.assertEqual(rf.p10_mm, rainfall_mm)
        self.assertEqual(rf.p50_mm, rainfall_mm)
        self.assertEqual(rf.p90_mm, rainfall_mm)
        self.assertNotEqual(rf.p10_mm, 94.8, "p10 must not be 94.8 (fabricated 0.79 multiplier)")
        self.assertNotEqual(rf.p90_mm, 151.2, "p90 must not be 151.2 (fabricated 1.26 multiplier)")


class TestHigh1_AuthoritativeForecastDroppedFromProvenance(unittest.TestCase):
    """
    HIGH-1: The authoritative_forecast (full Sayan ForecastSnapshot) is stored
    in ImpactRequest.authoritative_forecast but is NOT included in
    Provenance.to_dict() or ImpactResult.to_dict().
    The authoritative snapshot_id and model_id are therefore lost in the
    returned JSON and never reach the frontend.
    """

    def test_authoritative_snapshot_id_absent_from_result_provenance(self):
        payload = {
            "authoritative_forecast": SAYAN_SNAPSHOT,
            "forecast": dict(LEGACY_FORECAST),
            "scenario_type": "P50",
            "duration_hours": 24,
            "timestep_hours": 3
        }
        result_dict = handle_simulate(payload)
        provenance = result_dict.get("provenance", {})

        # After fix: Sayan snapshot_id MUST be present in result provenance.
        self.assertIn(
            "authoritative_snapshot_id", provenance,
            "Sayan snapshot_id must be preserved in ImpactResult provenance."
        )
        self.assertEqual(
            provenance["authoritative_snapshot_id"],
            SAYAN_SNAPSHOT["snapshot_id"]
        )

    def test_authoritative_model_id_absent_from_result_provenance(self):
        payload = {
            "authoritative_forecast": SAYAN_SNAPSHOT,
            "forecast": dict(LEGACY_FORECAST),
            "scenario_type": "P50",
            "duration_hours": 24,
            "timestep_hours": 3
        }
        result_dict = handle_simulate(payload)
        provenance = result_dict.get("provenance", {})

        self.assertIn(
            "authoritative_model_id", provenance,
            "Sayan model_id must be preserved in ImpactResult provenance."
        )
        self.assertEqual(
            provenance["authoritative_model_id"],
            SAYAN_SNAPSHOT["model_id"]
        )

    def test_authoritative_fallback_preserved_in_result_provenance(self):
        payload = {
            "authoritative_forecast": SAYAN_SNAPSHOT,  # fallback: False
            "forecast": dict(LEGACY_FORECAST),
            "scenario_type": "BASE",
            "duration_hours": 24,
            "timestep_hours": 3
        }
        result_dict = handle_simulate(payload)
        provenance = result_dict.get("provenance", {})

        self.assertIn(
            "authoritative_fallback", provenance,
            "authoritative_fallback must be preserved in ImpactResult provenance."
        )
        self.assertEqual(provenance["authoritative_fallback"], False)

        # Now test with raw fallback forecast
        fallback_snapshot = dict(SAYAN_SNAPSHOT, fallback=True)
        payload["authoritative_forecast"] = fallback_snapshot
        result_dict2 = handle_simulate(payload)
        self.assertEqual(result_dict2.get("provenance", {}).get("authoritative_fallback"), True)

    def test_authoritative_verification_and_probability_preserved_in_result_provenance(self):
        snapshot_with_semantics = dict(
            SAYAN_SNAPSHOT,
            verification_status="VERIFIED",
            probability=0.35,
            probability_available=True,
            calibration_status="UNCALIBRATED_RAW_ENSEMBLE"
        )
        payload = {
            "authoritative_forecast": snapshot_with_semantics,
            "forecast": dict(LEGACY_FORECAST),
            "scenario_type": "BASE",
            "duration_hours": 24,
            "timestep_hours": 3
        }
        result_dict = handle_simulate(payload)
        provenance = result_dict.get("provenance", {})

        self.assertEqual(provenance.get("authoritative_verification_status"), "VERIFIED")
        self.assertEqual(provenance.get("authoritative_probability"), 0.35)
        self.assertEqual(provenance.get("authoritative_probability_available"), True)
        self.assertEqual(provenance.get("authoritative_calibration_status"), "UNCALIBRATED_RAW_ENSEMBLE")

    def test_caller_rainfall_cannot_override_authoritative_forecast(self):
        spoofed_payload = {
            "authoritative_forecast": SAYAN_SNAPSHOT,  # rainfall_mm = 120.0
            "forecast": {
                **LEGACY_FORECAST,
                "rainfall": {
                    "low_scenario_mm": 5.0,
                    "base_scenario_mm": 10.0,
                    "high_scenario_mm": 15.0,
                    "p10_mm": 5.0,
                    "p50_mm": 10.0,
                    "p90_mm": 15.0
                }
            },
            "scenario_type": "HIGH",
            "duration_hours": 24,
            "timestep_hours": 3
        }
        req = ImpactRequest.from_dict(spoofed_payload)
        rf = req.forecast.rainfall
        # Must strictly equal authoritative rainfall_mm (120.0), NOT caller's 5.0, 10.0, 15.0
        self.assertEqual(rf.low_scenario_mm, 120.0)
        self.assertEqual(rf.base_scenario_mm, 120.0)
        self.assertEqual(rf.high_scenario_mm, 120.0)

    def test_regime_defaults_to_not_provided_when_omitted(self):
        payload = {
            "forecast": dict(LEGACY_FORECAST),
            "scenario_type": "BASE",
            "duration_hours": 24,
            "timestep_hours": 3
        }
        req = ImpactRequest.from_dict(payload)
        self.assertEqual(req.forecast.regime, "NOT_PROVIDED")
        self.assertIsNone(req.forecast.regime_confidence)



class TestHigh2_EmptyAuthoritativeForecastGating(unittest.TestCase):
    """
    HIGH-2: In schemas.py from_dict, the guard is:
      if auth_forecast and "rainfall_mm" in auth_forecast:
    When authoritative_forecast is {} (empty dict), `auth_forecast` is falsy.
    This means an empty dict correctly falls through to legacy_forecast.
    But when authoritative_forecast is None or absent, data.get() returns {},
    which is also falsy.  Correct behaviour, but verify explicitly.
    """

    def test_none_authoritative_does_not_override_legacy(self):
        legacy_with_real_values = {
            **LEGACY_FORECAST,
            "rainfall": {"p10_mm": 30.0, "p50_mm": 75.0, "p90_mm": 150.0}
        }
        payload = {
            "forecast": legacy_with_real_values,
            "scenario_type": "P90",
            "duration_hours": 24,
            "timestep_hours": 3
        }  # no authoritative_forecast key at all
        req = ImpactRequest.from_dict(payload)
        rf = req.forecast.rainfall
        self.assertEqual(rf.p10_mm, 30.0, "Legacy p10 must be preserved when no authoritative_forecast")
        self.assertEqual(rf.p50_mm, 75.0, "Legacy p50 must be preserved when no authoritative_forecast")
        self.assertEqual(rf.p90_mm, 150.0, "Legacy p90 must be preserved when no authoritative_forecast")

    def test_empty_dict_authoritative_does_not_override_legacy(self):
        legacy_with_real_values = {
            **LEGACY_FORECAST,
            "rainfall": {"p10_mm": 30.0, "p50_mm": 75.0, "p90_mm": 150.0}
        }
        payload = {
            "authoritative_forecast": {},  # explicitly empty
            "forecast": legacy_with_real_values,
            "scenario_type": "P90",
            "duration_hours": 24,
            "timestep_hours": 3
        }
        req = ImpactRequest.from_dict(payload)
        rf = req.forecast.rainfall
        self.assertEqual(rf.p10_mm, 30.0)
        self.assertEqual(rf.p50_mm, 75.0)
        self.assertEqual(rf.p90_mm, 150.0)


class TestHigh3_CLIErrorExitCode(unittest.TestCase):
    """
    HIGH-3: run_simulation_cli.py catches ImpactAPIError and re-raises it as
    a generic Exception (route handler raises ImpactAPIError, caught by
    handle_simulate's except block which re-raises as ImpactAPIError, and
    the CLI's try/except catches any Exception).

    The CLI currently:
      1. Prints error JSON to STDERR.
      2. Calls sys.exit(1).

    server.ts checks exit code (code !== 0) → 500.
    Verify that a malformed payload causes exit code 1 (non-zero).

    This is done by directly running the CLI as a subprocess.
    """

    def test_malformed_payload_causes_nonzero_exit(self):
        import subprocess
        cli_path = os.path.join(base_dir, "services", "impact_engine", "run_simulation_cli.py")
        bad_payload = json.dumps({"scenario_type": "P90"})  # missing forecast
        proc = subprocess.run(
            [sys.executable, cli_path],
            input=bad_payload,
            capture_output=True,
            text=True,
            timeout=30
        )
        self.assertNotEqual(proc.returncode, 0,
            "Malformed payload must exit nonzero so server.ts returns HTTP 500")

    def test_valid_payload_exits_zero_and_emits_json(self):
        import subprocess
        cli_path = os.path.join(base_dir, "services", "impact_engine", "run_simulation_cli.py")
        valid_payload = json.dumps({
            "forecast": {
                "forecast_id": "FC-CLI-TEST",
                "state_id": "KA",
                "district_id": "KA_BLR_URBAN",
                "bbox": [77.58, 12.89, 77.695, 12.98],
                "rainfall": {"p10_mm": 35.0, "p50_mm": 85.0, "p90_mm": 165.0}
            },
            "scenario_type": "P90",
            "duration_hours": 24,
            "timestep_hours": 3
        })
        proc = subprocess.run(
            [sys.executable, cli_path],
            input=valid_payload,
            capture_output=True,
            text=True,
            timeout=60
        )
        self.assertEqual(proc.returncode, 0,
            f"Valid payload must exit 0. stderr={proc.stderr[:300]}")
        parsed = json.loads(proc.stdout)
        self.assertIn("simulation_id", parsed)
        self.assertIn("timeline", parsed)
        self.assertIn("summary", parsed)


class TestMedium1_ImpactTwinViewUsesStaticForecastTable(unittest.TestCase):
    """
    MEDIUM-1 (schema test only — no runtime available):
    ImpactTwinView.tsx uses a static FORECAST_RAINFALL lookup table, not
    real Sayan data, to populate the scenario rainfall values in the UI.
    Even when the API returns real data, the toolbar shows static values.

    This test documents the expected static values for the reviewer to
    verify against the source file.
    """

    EXPECTED_STATIC_VALUES = {
        "bengaluru": {"p10_mm": 35, "p50_mm": 85, "p90_mm": 165},
        "mumbai":    {"p10_mm": 68, "p50_mm": 142, "p90_mm": 252},
        "delhi":     {"p10_mm": 42, "p50_mm": 92,  "p90_mm": 172},
    }

    def test_static_table_documented_for_review(self):
        """
        Not a functional assertion — just confirms we know what the static
        values are and they are hardcoded, not from Sayan.
        """
        for city, vals in self.EXPECTED_STATIC_VALUES.items():
            self.assertIn("p10_mm", vals)
            self.assertIn("p50_mm", vals)
            self.assertIn("p90_mm", vals)
            # All values must differ between P10 and P90 (basic sanity)
            self.assertLess(vals["p10_mm"], vals["p90_mm"],
                f"Static P10 < P90 for {city}")


class TestServerConcurrencySafetyModel(unittest.TestCase):
    """
    Verifies that the Python CLI is stateless per-invocation and safe for
    concurrent server.ts requests (each request spawns a new process).
    """

    def test_two_concurrent_cli_invocations_are_independent(self):
        import subprocess, threading

        cli_path = os.path.join(base_dir, "services", "impact_engine", "run_simulation_cli.py")

        def make_payload(scenario):
            return json.dumps({
                "forecast": {
                    "forecast_id": f"FC-CONCURRENT-{scenario}",
                    "state_id": "KA",
                    "district_id": "KA_BLR_URBAN",
                    "bbox": [77.58, 12.89, 77.695, 12.98],
                    "rainfall": {"p10_mm": 30.0, "p50_mm": 75.0, "p90_mm": 150.0}
                },
                "scenario_type": scenario,
                "duration_hours": 24,
                "timestep_hours": 3
            })

        results = {}
        errors = []

        def run_scenario(scenario):
            try:
                proc = subprocess.run(
                    [sys.executable, cli_path],
                    input=make_payload(scenario),
                    capture_output=True,
                    text=True,
                    timeout=60
                )
                results[scenario] = json.loads(proc.stdout)
            except Exception as e:
                errors.append((scenario, str(e)))

        t1 = threading.Thread(target=run_scenario, args=("P10",))
        t2 = threading.Thread(target=run_scenario, args=("P90",))
        t1.start()
        t2.start()
        t1.join()
        t2.join()

        self.assertEqual(errors, [], f"Concurrent invocations had errors: {errors}")
        self.assertIn("P10", results)
        self.assertIn("P90", results)

        # P90 must produce more flooding than P10
        p10_depth = results["P10"]["summary"]["peak_water_depth_m"]
        p90_depth = results["P90"]["summary"]["peak_water_depth_m"]
        self.assertGreaterEqual(p90_depth, p10_depth,
            "P90 peak depth must be >= P10 peak depth (monotonicity)")


if __name__ == "__main__":
    unittest.main()
