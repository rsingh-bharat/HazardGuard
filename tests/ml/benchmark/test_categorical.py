import pytest
import numpy as np
from ml.benchmark.metrics import compute_categorical_metrics


def test_categorical_metrics_correctness():
    # Primary threshold: 64.5 mm
    threshold = 64.5

    # Contingency pairs:
    # 1. f = 70.0, ref = 75.0 -> Hit
    # 2. f = 80.0, ref = 20.0 -> False Alarm
    # 3. f = 10.0, ref = 90.0 -> Miss
    # 4. f = 15.0, ref = 12.0 -> Correct Negative
    # 5. f = 64.5, ref = 64.5 -> Hit (boundary inclusive)
    # Total: Hits = 2, Misses = 1, False Alarms = 1, Correct Negatives = 1
    # POD = 2 / (2 + 1) = 2/3 = 0.666667
    # FAR = 1 / (2 + 1) = 1/3 = 0.333333
    # CSI = 2 / (2 + 1 + 1) = 2/4 = 0.5
    f = np.array([70.0, 80.0, 10.0, 15.0, 64.5])
    r = np.array([75.0, 20.0, 90.0, 12.0, 64.5])

    cat = compute_categorical_metrics(f, r, threshold)

    assert cat.threshold_mm == 64.5
    assert cat.hits == 2
    assert cat.misses == 1
    assert cat.false_alarms == 1
    assert cat.correct_negatives == 1
    assert cat.total_samples == 5

    assert pytest.approx(cat.pod, 1e-5) == 2.0 / 3.0
    assert pytest.approx(cat.far, 1e-5) == 1.0 / 3.0
    assert pytest.approx(cat.csi, 1e-5) == 0.5

    # Check required scientific terminology
    assert cat.metric_type == "deterministic rainfall threshold metrics"
    assert "deterministic threshold classification" in cat.disclaimer
    assert "not probabilistic exceedance forecasting" in cat.disclaimer


def test_categorical_zero_denominators():
    threshold = 64.5
    # Case 1: No rain at all in either forecast or reference
    f_zero = np.array([0.0, 5.0, 10.0])
    r_zero = np.array([0.0, 2.0, 8.0])

    cat_zero = compute_categorical_metrics(f_zero, r_zero, threshold)
    assert cat_zero.hits == 0
    assert cat_zero.misses == 0
    assert cat_zero.false_alarms == 0
    assert cat_zero.correct_negatives == 3

    # Zero denominators: POD, FAR, and CSI must return None rather than NaN
    assert cat_zero.pod is None
    assert cat_zero.far is None
    assert cat_zero.csi is None


def test_categorical_empty_arrays():
    cat = compute_categorical_metrics(np.array([]), np.array([]), 64.5)
    assert cat.total_samples == 0
    assert cat.pod is None
    assert cat.far is None
    assert cat.csi is None
