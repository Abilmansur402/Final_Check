"""Admission-time mortality model trained on the Asfendiyarov dataset.

Loaded by patient_demo.py and served at POST /predict/admission.
Train the artifact first:  python train_asfendiyarov.py
Research/demo only. Not for clinical use.
"""

from __future__ import annotations

import math
import warnings
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import joblib
import pandas as pd
import xgboost as xgb

DEFAULT_ADMISSION_MODEL = Path(__file__).resolve().parent / "neooutcome_admission_xgb.joblib"

ADMISSION_NOTICE = (
    "Модель обучена на обезличенных данных Асфендиярова (2021–2023), проверена на 2024–2025. "
    "Исследовательский прототип, не является диагнозом или медицинской рекомендацией."
)

# Codes whose meaning is not confirmed by the data owner are labelled as codes.
ADMISSION_LABELS = {
    "m_age": "Возраст матери",
    "m_obstetric": "Отягощённый акушерский анамнез",
    "m_preeclampsia": "Преэклампсия",
    "m_chorioamnionitis": "Хориоамнионит",
    "m_intrauterine": "Внутриутробная инфекция",
    "m_birth": "Способ родоразрешения (код)",
    "b_gender": "Пол (код)",
    "b_weight": "Масса при рождении",
    "b_apgar": "Апгар",
    "b_gestational": "Срок гестации",
    "b_respiratory_failure": "Дыхательная недостаточность, степень",
    "b_heart_rate": "ЧСС при поступлении",
    "b_saturation": "SpO₂ при поступлении",
    "b_blood": "Группа крови (код)",
    "b_rhesus": "Резус (код)",
}

ADMISSION_UNITS = {
    "m_age": "лет",
    "b_weight": "г",
    "b_apgar": "балл",
    "b_gestational": "нед",
    "b_heart_rate": "уд/мин",
    "b_saturation": "%",
}


def _sigmoid(x: float) -> float:
    return 1.0 / (1.0 + math.exp(-x))


class AdmissionEngine:
    def __init__(self, model_path: Path = DEFAULT_ADMISSION_MODEL) -> None:
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            artifact = joblib.load(model_path)
        self.model = artifact["model"]
        self.features: list[str] = list(artifact["features"])
        self.threshold = float(artifact["threshold"])
        self.medians = {k: float(v) for k, v in artifact["median_values"].items()}
        self.ranges = {k: tuple(v) for k, v in artifact["feature_ranges"].items()}
        self.metrics = artifact.get("metrics", {})

    def _coerce(self, payload: dict[str, Any]) -> tuple[dict[str, float | None], list[str]]:
        values: dict[str, float | None] = {}
        warnings_out: list[str] = []
        for name in self.features:
            raw = payload.get(name)
            if raw is None or (isinstance(raw, str) and not raw.strip()):
                values[name] = None
                warnings_out.append(f"{ADMISSION_LABELS.get(name, name)}: нет значения, подставлена медиана")
                continue
            try:
                value = float(str(raw).replace(",", ".").strip())
            except ValueError as exc:
                raise ValueError(f"{name}: ожидается число, получено {raw!r}") from exc
            if not math.isfinite(value):
                raise ValueError(f"{name}: некорректное число")
            low, high = self.ranges.get(name, (-math.inf, math.inf))
            if value < low or value > high:
                warnings_out.append(
                    f"{ADMISSION_LABELS.get(name, name)}: {value:g} вне диапазона обучающих данных ({low:g}–{high:g})"
                )
            values[name] = value
        return values, warnings_out

    def predict(self, payload: dict[str, Any]) -> dict[str, Any]:
        values, input_warnings = self._coerce(payload)
        frame = pd.DataFrame([[values[f] for f in self.features]], columns=self.features)
        frame = frame.astype(float).fillna(self.medians)

        risk = float(self.model.predict_proba(frame)[0, 1])
        contribs = self.model.get_booster().predict(
            xgb.DMatrix(frame, feature_names=self.features), pred_contribs=True
        )[0]

        rows = [
            {
                "feature": f,
                "label": ADMISSION_LABELS.get(f, f),
                "value": values[f],
                "unit": ADMISSION_UNITS.get(f, ""),
                "contribution": round(float(c), 5),
                "direction": "raises" if c >= 0 else "lowers",
            }
            for f, c in zip(self.features, contribs[:-1])
        ]
        rows.sort(key=lambda r: abs(r["contribution"]), reverse=True)

        if risk >= self.threshold:
            band = "high"
        elif risk >= self.threshold * 0.5:
            band = "elevated"
        elif risk >= 0.1:
            band = "moderate"
        else:
            band = "low"

        return {
            "model_name": "neooutcome_admission_xgb",
            "model_version": "asfendiyarov-2021-2023",
            "outcome": "in_hospital_death",
            "risk_probability": round(risk, 6),
            "risk_percent": round(risk * 100, 1),
            "operating_threshold": round(self.threshold, 6),
            "threshold_crossed": risk >= self.threshold,
            "risk_band": band,
            "top_factors": rows[:6],
            "shap_values": rows,
            "shap_base_probability": round(_sigmoid(float(contribs[-1])), 6),
            "input_warnings": input_warnings,
            "validation": {
                "test_period": "2024–2025",
                "auroc": self.metrics.get("auroc"),
                "auroc_95ci": self.metrics.get("auroc_95ci"),
                "sensitivity": self.metrics.get("sensitivity"),
                "specificity": self.metrics.get("specificity"),
            },
            "disclaimer": ADMISSION_NOTICE,
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }
