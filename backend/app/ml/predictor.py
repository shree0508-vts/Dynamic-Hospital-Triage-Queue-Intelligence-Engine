"""
ML Predictor — Scikit-learn consultation duration prediction.
Trains on synthetic historical data at startup.
Falls back to deterministic rule-based prediction if training fails.
"""
import numpy as np
from typing import Optional

try:
    from sklearn.ensemble import GradientBoostingRegressor
    from sklearn.preprocessing import LabelEncoder
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False

# ── Synthetic Training Data ─────────────────────────────────────────────────

DEPT_ENCODING = {
    "Cardiology": 0,
    "General Medicine": 1,
    "Orthopaedics": 2,
    "Paediatrics": 3,
    "Emergency": 4,
}

VISIT_ENCODING = {
    "New Consultation": 0,
    "Follow-up": 1,
    "Report Review": 2,
    "Emergency": 3,
}

DOCTOR_BASE = {
    "D01": 14,
    "D02": 12,
    "D03": 18,
    "D04": 10,
    "D05": 16,
}


def _age_group(age: int) -> int:
    if age < 5:   return 0
    if age < 18:  return 1
    if age < 40:  return 2
    if age < 60:  return 3
    return 4


def _generate_training_data():
    """Generate 500 synthetic consultation records."""
    np.random.seed(42)
    X, y = [], []
    depts = list(DEPT_ENCODING.values())
    visits = list(VISIT_ENCODING.values())
    doctors = list(DOCTOR_BASE.keys())

    base_times = {
        (0, 0): 25, (0, 1): 18, (0, 2): 12, (0, 3): 30,  # Cardiology
        (1, 0): 12, (1, 1): 10, (1, 2): 8,  (1, 3): 20,  # General Medicine
        (2, 0): 20, (2, 1): 15, (2, 2): 10, (2, 3): 35,  # Ortho
        (3, 0): 15, (3, 1): 12, (3, 2): 8,  (3, 3): 22,  # Paediatrics
        (4, 0): 30, (4, 1): 20, (4, 2): 15, (4, 3): 40,  # Emergency
    }

    for _ in range(500):
        dept = np.random.choice(depts)
        visit = np.random.choice(visits)
        age = np.random.randint(1, 85)
        doctor = np.random.choice(doctors)
        doc_idx = list(DOCTOR_BASE.keys()).index(doctor)

        base = base_times.get((dept, visit), 15)
        # Age effect
        age_g = _age_group(age)
        age_mult = [1.3, 1.0, 0.9, 1.1, 1.4][age_g]
        # Doctor speed effect
        doc_speed = [0.9, 1.0, 1.2, 0.85, 1.1][doc_idx]
        duration = base * age_mult * doc_speed + np.random.normal(0, 2)
        duration = max(5, min(60, duration))

        X.append([dept, visit, _age_group(age), doc_idx])
        y.append(duration)

    return np.array(X), np.array(y)


class ConsultationPredictor:
    def __init__(self):
        self.model = None
        self.trained = False
        self._train()

    def _train(self):
        if not SKLEARN_AVAILABLE:
            return
        try:
            X, y = _generate_training_data()
            self.model = GradientBoostingRegressor(
                n_estimators=100, max_depth=4, learning_rate=0.1, random_state=42
            )
            self.model.fit(X, y)
            self.trained = True
        except Exception as e:
            print(f"[ML] Training failed: {e}. Using fallback predictor.")

    def predict(self, department: str, age: int, visit_type: str, doctor_id: str) -> int:
        """Predict consultation duration in minutes."""
        if self.trained and self.model is not None:
            try:
                dept_enc = DEPT_ENCODING.get(department, 1)
                visit_enc = VISIT_ENCODING.get(visit_type, 0)
                age_g = _age_group(age)
                doc_idx = list(DOCTOR_BASE.keys()).index(doctor_id) if doctor_id in DOCTOR_BASE else 1
                X = np.array([[dept_enc, visit_enc, age_g, doc_idx]])
                pred = self.model.predict(X)[0]
                return max(5, min(60, int(round(pred))))
            except Exception as e:
                print(f"[ML] Prediction failed: {e}. Using fallback.")

        return self._fallback(department, age, visit_type, doctor_id)

    def _fallback(self, department: str, age: int, visit_type: str, doctor_id: str) -> int:
        """Deterministic fallback prediction."""
        base = {
            "Cardiology": 20,
            "General Medicine": 12,
            "Orthopaedics": 18,
            "Paediatrics": 13,
            "Emergency": 25,
        }.get(department, 15)

        visit_mult = {
            "New Consultation": 1.2,
            "Follow-up": 0.8,
            "Report Review": 0.7,
            "Emergency": 1.6,
        }.get(visit_type, 1.0)

        age_mult = 1.4 if age > 65 or age < 5 else 1.0
        doc_base = DOCTOR_BASE.get(doctor_id, 15)

        return max(5, min(60, int((base * visit_mult * age_mult + doc_base) / 2)))


# Singleton
predictor = ConsultationPredictor()
