#!/usr/bin/env python3
"""Generate and serve a synthetic NeoOutcome patient demo.

The same synthetic patient is exported as:
  - JSON bundle for the web application;
  - CSV with the exact model feature contract;
  - PDF clinical-style patient card;
  - JSON prediction result with XGBoost contributions and review actions.

This module is a research/demo tool. It must not be used for clinical care.
"""

from __future__ import annotations

import argparse
import csv
import json
import math
import shutil
import sys
import warnings
from datetime import datetime, timezone
from html import escape
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any

import joblib
import pandas as pd
import xgboost as xgb
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from admission_model import DEFAULT_ADMISSION_MODEL, AdmissionEngine
from reportlab.platypus import (
    KeepTogether,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


BACKEND_ROOT = Path(__file__).resolve().parent
SITE_ROOT = BACKEND_ROOT.parent / "neooutcome-ai"
DEFAULT_MODEL = BACKEND_ROOT / "neooutcome_xgb.joblib"
DEFAULT_OUTPUT = BACKEND_ROOT / "output" / "patient_demo"
DEFAULT_SITE_PUBLIC = SITE_ROOT / "public" / "demo"

SYNTHETIC_NOTICE = (
    "Синтетические данные. Исследовательский прототип. "
    "Не является диагнозом или медицинской рекомендацией."
)

EXPECTED_FEATURES = [
    "gender",
    "age_days_at_admission",
    "hr_mean",
    "hr_min",
    "hr_max",
    "rr_mean",
    "rr_min",
    "rr_max",
    "temp_mean",
    "temp_max",
    "sbp_mean",
    "vitals_count_12h",
    "ph_mean",
    "ph_min",
    "lactate_mean",
    "lactate_max",
    "po2_mean",
    "po2_min",
    "pco2_mean",
    "base_excess_mean",
    "base_excess_min",
    "glucose_mean",
    "glucose_min",
    "glucose_max",
    "hemoglobin_mean",
    "platelets_min",
    "wbc_mean",
    "wbc_max",
    "sodium_mean",
    "potassium_mean",
    "labs_count_12h",
]

FEATURE_LABELS = {
    "gender": "Пол (модель: M=1, F=0)",
    "age_days_at_admission": "Возраст при поступлении",
    "hr_mean": "ЧСС, среднее",
    "hr_min": "ЧСС, минимум",
    "hr_max": "ЧСС, максимум",
    "rr_mean": "ЧДД, среднее",
    "rr_min": "ЧДД, минимум",
    "rr_max": "ЧДД, максимум",
    "temp_mean": "Температура, средняя",
    "temp_max": "Температура, максимум",
    "sbp_mean": "Систолическое АД, среднее",
    "vitals_count_12h": "Измерений витальных показателей",
    "ph_mean": "pH, среднее",
    "ph_min": "pH, минимум",
    "lactate_mean": "Лактат, среднее",
    "lactate_max": "Лактат, максимум",
    "po2_mean": "pO2, среднее",
    "po2_min": "pO2, минимум",
    "pco2_mean": "pCO2, среднее",
    "base_excess_mean": "Base excess, среднее",
    "base_excess_min": "Base excess, минимум",
    "glucose_mean": "Глюкоза, средняя",
    "glucose_min": "Глюкоза, минимум",
    "glucose_max": "Глюкоза, максимум",
    "hemoglobin_mean": "Гемоглобин, средний",
    "platelets_min": "Тромбоциты, минимум",
    "wbc_mean": "Лейкоциты, среднее",
    "wbc_max": "Лейкоциты, максимум",
    "sodium_mean": "Натрий, средний",
    "potassium_mean": "Калий, средний",
    "labs_count_12h": "Лабораторных измерений",
}

FEATURE_UNITS = {
    "gender": "код",
    "age_days_at_admission": "дней",
    "hr_mean": "уд/мин",
    "hr_min": "уд/мин",
    "hr_max": "уд/мин",
    "rr_mean": "вдох/мин",
    "rr_min": "вдох/мин",
    "rr_max": "вдох/мин",
    "temp_mean": "°C",
    "temp_max": "°C",
    "sbp_mean": "мм рт. ст.",
    "vitals_count_12h": "измерений",
    "ph_mean": "",
    "ph_min": "",
    "lactate_mean": "ммоль/л",
    "lactate_max": "ммоль/л",
    "po2_mean": "мм рт. ст.",
    "po2_min": "мм рт. ст.",
    "pco2_mean": "мм рт. ст.",
    "base_excess_mean": "ммоль/л",
    "base_excess_min": "ммоль/л",
    "glucose_mean": "ммоль/л",
    "glucose_min": "ммоль/л",
    "glucose_max": "ммоль/л",
    "hemoglobin_mean": "г/л",
    "platelets_min": "10^9/л",
    "wbc_mean": "10^9/л",
    "wbc_max": "10^9/л",
    "sodium_mean": "ммоль/л",
    "potassium_mean": "ммоль/л",
    "labs_count_12h": "измерений",
}


def synthetic_patient() -> dict[str, Any]:
    """Return one deterministic, entirely fictional NICU encounter."""
    return {
        "schema_version": "1.0",
        "synthetic": True,
        "patient": {
            "patient_id": "SYN-NICU-0001",
            "full_name": "Демо-пациент N-0001",
            "sex": "F",
            "date_of_birth": "2026-07-12",
            "gestational_age": "32 недели 4 дня",
            "birth_weight_g": 1780,
            "current_weight_g": 1740,
            "blood_group": "не определена",
        },
        "encounter": {
            "encounter_id": "SYN-HADM-0001",
            "institution": "NeoOutcome Demonstration NICU",
            "department": "Отделение реанимации и интенсивной терапии новорождённых",
            "admitted_at": "2026-07-17T08:15:00+05:00",
            "prediction_time": "2026-07-17T20:15:00+05:00",
            "admission_diagnosis": "Респираторный дистресс, динамическое наблюдение",
            "attending_clinician": "Демо-врач А. Каримова",
        },
        "features": {
            "gender": 0,
            "age_days_at_admission": 5.0,
            "hr_mean": 165.0,
            "hr_min": 130.0,
            "hr_max": 205.0,
            "rr_mean": 52.0,
            "rr_min": 35.0,
            "rr_max": 78.0,
            "temp_mean": 36.7,
            "temp_max": 37.4,
            "sbp_mean": 52.0,
            "vitals_count_12h": 96,
            "ph_mean": 7.21,
            "ph_min": 7.12,
            "lactate_mean": 3.8,
            "lactate_max": 5.2,
            "po2_mean": 64.0,
            "po2_min": 48.0,
            "pco2_mean": 52.0,
            "base_excess_mean": -6.5,
            "base_excess_min": -10.0,
            "glucose_mean": 4.5,
            "glucose_min": 2.8,
            "glucose_max": 7.1,
            "hemoglobin_mean": 145.0,
            "platelets_min": 155.0,
            "wbc_mean": 18.0,
            "wbc_max": 21.0,
            "sodium_mean": 137.0,
            "potassium_mean": 4.7,
            "labs_count_12h": 22,
        },
    }


def json_safe(value: Any) -> Any:
    if hasattr(value, "item"):
        return value.item()
    if isinstance(value, float) and not math.isfinite(value):
        return None
    return value


def sigmoid(value: float) -> float:
    """Convert the additive XGBoost margin into a probability."""
    if value >= 0:
        z = math.exp(-value)
        return 1.0 / (1.0 + z)
    z = math.exp(value)
    return z / (1.0 + z)


def coerce_features(payload: dict[str, Any], required: list[str]) -> dict[str, float | None]:
    missing = [feature for feature in required if feature not in payload]
    if missing:
        raise ValueError("Отсутствуют признаки модели: " + ", ".join(missing))

    result: dict[str, float | None] = {}
    for feature in required:
        value = payload.get(feature)
        if feature == "gender" and isinstance(value, str):
            normalized = value.strip().upper()
            if normalized in {"M", "MALE", "М"}:
                value = 1
            elif normalized in {"F", "FEMALE", "Ж"}:
                value = 0
        if value in (None, "", "null", "None"):
            result[feature] = None
            continue
        try:
            result[feature] = float(value)
        except (TypeError, ValueError) as exc:
            raise ValueError(f"Признак {feature} должен быть числом") from exc
    return result


class ModelEngine:
    def __init__(self, model_path: Path) -> None:
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            artifact = joblib.load(model_path)

        self.model = artifact["model"]
        self.features = list(artifact["features"])
        self.threshold = float(artifact["threshold_spec90"])
        self.medians = {key: float(value) for key, value in artifact["median_values"].items()}

        if self.features != EXPECTED_FEATURES:
            raise RuntimeError(
                "Схема артефакта не совпадает с ожидаемыми 31 признаками. "
                f"Получено: {self.features}"
            )

    def predict(self, raw_features: dict[str, Any]) -> dict[str, Any]:
        features = coerce_features(raw_features, self.features)
        frame = pd.DataFrame([[features[name] for name in self.features]], columns=self.features)
        frame = frame.fillna(self.medians)

        risk = float(self.model.predict_proba(frame)[0, 1])
        dmatrix = xgb.DMatrix(frame, feature_names=self.features)
        contributions = self.model.get_booster().predict(dmatrix, pred_contribs=True)[0]
        factor_rows = []
        for feature, contribution in zip(self.features, contributions[:-1]):
            factor_rows.append(
                {
                    "feature": feature,
                    "label": FEATURE_LABELS.get(feature, feature),
                    "value": json_safe(features[feature]),
                    "unit": FEATURE_UNITS.get(feature, ""),
                    "contribution": round(float(contribution), 5),
                    "direction": "raises" if contribution >= 0 else "lowers",
                }
            )
        factor_rows.sort(key=lambda row: abs(row["contribution"]), reverse=True)

        shap_base_value = float(contributions[-1])
        shap_contribution_sum = float(sum(contributions[:-1]))
        shap_margin = shap_base_value + shap_contribution_sum

        return {
            "model_name": "neooutcome_xgb",
            "model_version": "research-demo-1",
            "prediction_window_hours": 12,
            "risk_probability": round(risk, 6),
            "risk_percent": round(risk * 100, 1),
            "operating_threshold": round(self.threshold, 6),
            "threshold_crossed": risk >= self.threshold,
            "risk_band": risk_band(risk, self.threshold),
            "top_factors": factor_rows[:6],
            "shap_values": factor_rows,
            "shap_method": "XGBoost TreeSHAP через pred_contribs в пространстве log-odds",
            "shap_feature_count": len(factor_rows),
            "shap_base_value": round(shap_base_value, 6),
            "shap_base_probability": round(sigmoid(shap_base_value), 6),
            "shap_contribution_sum": round(shap_contribution_sum, 6),
            "shap_margin": round(shap_margin, 6),
            "shap_probability": round(sigmoid(shap_margin), 6),
            "review_actions": review_actions(risk, self.threshold, features),
            "disclaimer": SYNTHETIC_NOTICE,
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }


def risk_band(risk: float, threshold: float) -> str:
    if risk >= threshold:
        return "high"
    if risk >= threshold * 0.7:
        return "elevated"
    if risk >= threshold * 0.35:
        return "moderate"
    return "low"


def review_actions(
    risk: float,
    threshold: float,
    features: dict[str, float | None],
) -> list[str]:
    actions = ["Сверить загруженные значения с первичной медицинской документацией."]

    if risk >= threshold:
        actions.extend(
            [
                "Передать оценку старшему врачу для приоритетного клинического осмотра по локальному протоколу.",
                "Продолжить непрерывный мониторинг и задокументировать повторную оценку состояния.",
            ]
        )
    elif risk >= threshold * 0.35:
        actions.append("Запланировать повторный врачебный осмотр и обновить оценку после новых измерений.")
    else:
        actions.append("Продолжить плановое наблюдение по протоколу отделения.")

    if (features.get("ph_min") or 9) < 7.25 or (features.get("base_excess_min") or 0) < -8:
        actions.append("Повторно проверить газовый состав крови и кислотно-основное состояние.")
    if (features.get("lactate_max") or 0) > 4:
        actions.append("Проверить динамику лактата и сопоставить её с клиническими признаками перфузии.")
    if (features.get("glucose_min") or 99) < 3:
        actions.append("Повторно измерить глюкозу и оценить динамику по локальному протоколу.")
    if (features.get("hr_max") or 0) > 200:
        actions.append("Проверить эпизоды тахикардии по исходной записи мониторинга.")

    return actions[:7]


def register_pdf_fonts() -> tuple[str, str]:
    regular_path = Path("C:/Windows/Fonts/arial.ttf")
    bold_path = Path("C:/Windows/Fonts/arialbd.ttf")
    if regular_path.exists() and bold_path.exists():
        pdfmetrics.registerFont(TTFont("NeoSans", str(regular_path)))
        pdfmetrics.registerFont(TTFont("NeoSansBold", str(bold_path)))
        return "NeoSans", "NeoSansBold"
    return "Helvetica", "Helvetica-Bold"


def value_text(value: Any) -> str:
    if value is None:
        return "нет данных"
    if isinstance(value, float):
        return f"{value:.2f}".rstrip("0").rstrip(".")
    return str(value)


def feature_flag(feature: str, value: float | None) -> str:
    if value is None:
        return "нет данных"
    attention = (
        (feature == "ph_min" and value < 7.25)
        or (feature == "lactate_max" and value > 4)
        or (feature == "base_excess_min" and value < -8)
        or (feature == "glucose_min" and value < 3)
        or (feature == "hr_max" and value > 200)
    )
    return "проверить" if attention else "зафиксировано"


def render_patient_pdf(bundle: dict[str, Any], output_path: Path) -> None:
    regular_font, bold_font = register_pdf_fonts()
    styles = getSampleStyleSheet()
    body = ParagraphStyle(
        "BodyRu",
        parent=styles["BodyText"],
        fontName=regular_font,
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#243447"),
    )
    small = ParagraphStyle(
        "SmallRu",
        parent=body,
        fontSize=7.5,
        leading=10,
        textColor=colors.HexColor("#607284"),
    )
    title = ParagraphStyle(
        "TitleRu",
        parent=body,
        fontName=bold_font,
        fontSize=18,
        leading=22,
        textColor=colors.HexColor("#155e63"),
    )
    section = ParagraphStyle(
        "SectionRu",
        parent=body,
        fontName=bold_font,
        fontSize=10,
        leading=13,
        textColor=colors.HexColor("#163a45"),
        spaceBefore=7,
        spaceAfter=5,
    )
    center = ParagraphStyle("CenterRu", parent=body, alignment=TA_CENTER)
    left_bold = ParagraphStyle("BoldRu", parent=body, fontName=bold_font, alignment=TA_LEFT)
    table_header = ParagraphStyle(
        "TableHeaderRu",
        parent=left_bold,
        fontSize=8.5,
        leading=10,
        textColor=colors.white,
    )
    action_style = ParagraphStyle(
        "ActionRu",
        parent=body,
        fontSize=8,
        leading=10,
        spaceAfter=1,
    )

    patient = bundle["patient"]
    encounter = bundle["encounter"]
    prediction = bundle["prediction"]
    features = bundle["features"]

    document = SimpleDocTemplate(
        str(output_path),
        pagesize=A4,
        leftMargin=16 * mm,
        rightMargin=16 * mm,
        topMargin=17 * mm,
        bottomMargin=16 * mm,
        title="Синтетическая карта пациента NeoOutcome",
        author="NeoOutcome AI",
    )

    def page_decor(canvas: Any, doc: Any) -> None:
        canvas.saveState()
        width, height = A4
        canvas.setFont(bold_font, 7.5)
        canvas.setFillColor(colors.HexColor("#155e63"))
        canvas.drawString(16 * mm, height - 10 * mm, "NEOOUTCOME AI / SYNTHETIC PATIENT")
        canvas.setFont(regular_font, 7)
        canvas.setFillColor(colors.HexColor("#6b7b8c"))
        canvas.drawRightString(width - 16 * mm, 9 * mm, f"Страница {doc.page}")
        canvas.setFillColor(colors.Color(0.75, 0.12, 0.15, alpha=0.09))
        canvas.setFont(bold_font, 27)
        canvas.translate(width / 2, height / 2)
        canvas.rotate(34)
        canvas.drawCentredString(0, 0, "СИНТЕТИЧЕСКИЕ ДАННЫЕ")
        canvas.restoreState()

    story: list[Any] = [
        Paragraph("Карта пациента NICU", title),
        Paragraph(
            "Демонстрационный документ для проверки интеграции данных, ML-модели и интерфейса врача.",
            small,
        ),
        Spacer(1, 5 * mm),
    ]

    identity_data = [
        [Paragraph("Пациент", left_bold), Paragraph(escape(patient["full_name"]), body)],
        [Paragraph("ID пациента", left_bold), Paragraph(patient["patient_id"], body)],
        [Paragraph("Госпитализация", left_bold), Paragraph(encounter["encounter_id"], body)],
        [Paragraph("Пол / дата рождения", left_bold), Paragraph(f"{patient['sex']} / {patient['date_of_birth']}", body)],
        [Paragraph("Гестационный возраст", left_bold), Paragraph(patient["gestational_age"], body)],
        [Paragraph("Вес", left_bold), Paragraph(f"{patient['current_weight_g']} г (при рождении {patient['birth_weight_g']} г)", body)],
    ]
    identity_table = Table(identity_data, colWidths=[52 * mm, 126 * mm])
    identity_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#e8f3f3")),
                ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#b8c9cc")),
                ("INNERGRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#d8e1e3")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    story.extend([identity_table, Spacer(1, 4 * mm)])

    encounter_data = [
        [Paragraph("Учреждение", left_bold), Paragraph(escape(encounter["institution"]), body)],
        [Paragraph("Отделение", left_bold), Paragraph(escape(encounter["department"]), body)],
        [Paragraph("Поступление", left_bold), Paragraph(encounter["admitted_at"], body)],
        [Paragraph("Окно прогноза", left_bold), Paragraph(f"первые 12 часов, до {encounter['prediction_time']}", body)],
        [Paragraph("Причина поступления", left_bold), Paragraph(escape(encounter["admission_diagnosis"]), body)],
    ]
    encounter_table = Table(encounter_data, colWidths=[52 * mm, 126 * mm])
    encounter_table.setStyle(
        TableStyle(
            [
                ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd7da")),
                ("LINEBELOW", (0, 0), (-1, -2), 0.25, colors.HexColor("#e0e6e8")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    story.extend([Paragraph("Госпитализация", section), encounter_table])

    band_colors = {
        "low": "#d9f0e4",
        "moderate": "#f5e4a8",
        "elevated": "#f3c08f",
        "high": "#efaaaa",
    }
    risk_table = Table(
        [
            [
                Paragraph("Оценка модели", left_bold),
                Paragraph(f"{prediction['risk_percent']:.1f}%", ParagraphStyle("Risk", parent=title, fontSize=22, alignment=TA_CENTER)),
                Paragraph(
                    f"Уровень: {prediction['risk_band'].upper()}<br/>Порог: {prediction['operating_threshold']:.3f}",
                    center,
                ),
            ]
        ],
        colWidths=[55 * mm, 55 * mm, 68 * mm],
    )
    risk_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor(band_colors[prediction["risk_band"]])),
                ("BOX", (0, 0), (-1, -1), 0.7, colors.HexColor("#aebdc1")),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ]
        )
    )
    story.extend([Paragraph("ML-оценка после первых 12 часов", section), risk_table, Spacer(1, 3 * mm)])
    story.append(Paragraph("Оценка предназначена только для исследовательского демо и требует врачебной проверки.", small))

    vital_names = EXPECTED_FEATURES[2:12]
    lab_names = EXPECTED_FEATURES[12:]

    def feature_table(names: list[str]) -> Table:
        rows: list[list[Any]] = [
            [
                Paragraph("Показатель", table_header),
                Paragraph("Значение", table_header),
                Paragraph("Единица", table_header),
                Paragraph("Статус", table_header),
            ]
        ]
        for name in names:
            value = features.get(name)
            rows.append(
                [
                    Paragraph(escape(FEATURE_LABELS[name]), body),
                    Paragraph(value_text(value), body),
                    Paragraph(FEATURE_UNITS.get(name, ""), small),
                    Paragraph(feature_flag(name, value), small),
                ]
            )
        table = Table(rows, colWidths=[76 * mm, 32 * mm, 33 * mm, 37 * mm], repeatRows=1)
        table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#155e63")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                    ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#becbce")),
                    ("LINEBELOW", (0, 1), (-1, -2), 0.2, colors.HexColor("#dfe6e8")),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 5),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                    ("TOPPADDING", (0, 0), (-1, -1), 4),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ]
            )
        )
        for row_number, name in enumerate(names, start=1):
            if feature_flag(name, features.get(name)) == "проверить":
                table.setStyle(TableStyle([("BACKGROUND", (3, row_number), (3, row_number), colors.HexColor("#fde2df"))]))
        return table

    story.extend([Paragraph("Витальные показатели", section), feature_table(vital_names)])
    story.extend([Paragraph("Лабораторные показатели", section), feature_table(lab_names)])

    factor_rows = [[Paragraph("Фактор", left_bold), Paragraph("Вклад", left_bold), Paragraph("Направление", left_bold)]]
    for factor in prediction["top_factors"]:
        factor_rows.append(
            [
                Paragraph(escape(factor["label"]), body),
                Paragraph(f"{factor['contribution']:+.3f}", body),
                Paragraph("повышает" if factor["direction"] == "raises" else "снижает", small),
            ]
        )
    factors_table = Table(factor_rows, colWidths=[112 * mm, 30 * mm, 36 * mm], repeatRows=1)
    factors_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e8f3f3")),
                ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#becbce")),
                ("LINEBELOW", (0, 1), (-1, -2), 0.2, colors.HexColor("#dfe6e8")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    story.extend([Paragraph("Ключевые факторы модели", section), factors_table])

    action_flowables = [
        Paragraph(f"{index}. {escape(action)}", action_style)
        for index, action in enumerate(prediction["review_actions"], start=1)
    ]
    story.extend(
        [
            Paragraph("Действия для врачебной проверки", section),
            KeepTogether(action_flowables),
            Paragraph(f"<b>Важно:</b> {escape(SYNTHETIC_NOTICE)}", small),
            Spacer(1, 1.5 * mm),
            Paragraph("Подпись врача: ____________________    Дата/время: ____________________", small),
        ]
    )

    document.build(story, onFirstPage=page_decor, onLaterPages=page_decor)


def generate_bundle(
    model_path: Path,
    output_dir: Path,
    site_public: Path | None,
) -> dict[str, Path]:
    output_dir.mkdir(parents=True, exist_ok=True)
    engine = ModelEngine(model_path)
    bundle = synthetic_patient()
    bundle["prediction"] = engine.predict(bundle["features"])

    base_name = bundle["patient"]["patient_id"]
    bundle_path = output_dir / f"{base_name}_bundle.json"
    features_path = output_dir / f"{base_name}_features.csv"
    result_path = output_dir / f"{base_name}_result.json"
    pdf_path = output_dir / f"{base_name}_patient_card.pdf"

    bundle_path.write_text(json.dumps(bundle, ensure_ascii=False, indent=2), encoding="utf-8")
    result_path.write_text(
        json.dumps(bundle["prediction"], ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    with features_path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=engine.features, extrasaction="ignore")
        writer.writeheader()
        writer.writerow(bundle["features"])

    render_patient_pdf(bundle, pdf_path)

    paths = {
        "bundle": bundle_path,
        "features": features_path,
        "result": result_path,
        "pdf": pdf_path,
    }
    if site_public is not None:
        site_public.mkdir(parents=True, exist_ok=True)
        for path in paths.values():
            shutil.copy2(path, site_public / path.name)

    return paths


class ApiHandler(BaseHTTPRequestHandler):
    engine: ModelEngine
    admission_engine: AdmissionEngine | None = None

    def _headers(self, status: int = 200) -> None:
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.end_headers()

    def _json(self, payload: dict[str, Any], status: int = 200) -> None:
        self._headers(status)
        self.wfile.write(json.dumps(payload, ensure_ascii=False).encode("utf-8"))

    def do_OPTIONS(self) -> None:  # noqa: N802
        self._headers(204)

    def do_GET(self) -> None:  # noqa: N802
        if self.path == "/health":
            self._json(
                {
                    "status": "ok",
                    "model": "neooutcome_xgb",
                    "features": len(self.engine.features),
                    "admission_model": self.admission_engine is not None,
                    "clinical_use": False,
                }
            )
            return
        if self.path == "/demo":
            bundle = synthetic_patient()
            bundle["prediction"] = self.engine.predict(bundle["features"])
            self._json(bundle)
            return
        self._json({"error": "Not found"}, 404)

    def do_POST(self) -> None:  # noqa: N802
        if self.path not in ("/predict", "/predict/admission"):
            self._json({"error": "Not found"}, 404)
            return
        if self.path == "/predict/admission" and self.admission_engine is None:
            self._json(
                {"error": "Модель при поступлении не загружена. Запустите: python train_asfendiyarov.py"},
                503,
            )
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length <= 0 or length > 1_000_000:
                raise ValueError("Некорректный размер запроса")
            payload = json.loads(self.rfile.read(length).decode("utf-8"))
            features = payload.get("features", payload)
            if not isinstance(features, dict):
                raise ValueError("Ожидается JSON-объект features")
            if self.path == "/predict/admission":
                self._json(self.admission_engine.predict(features))
            else:
                self._json(self.engine.predict(features))
        except (ValueError, json.JSONDecodeError) as exc:
            self._json({"error": str(exc)}, 400)
        except Exception as exc:  # pragma: no cover - boundary safety
            self._json({"error": f"Ошибка модели: {exc}"}, 500)

    def log_message(self, format_string: str, *args: Any) -> None:
        sys.stdout.write("[neooutcome-api] " + (format_string % args) + "\n")


def serve(model_path: Path, host: str, port: int, admission_model: Path = DEFAULT_ADMISSION_MODEL) -> None:
    engine = ModelEngine(model_path)
    admission_engine = AdmissionEngine(admission_model) if admission_model.exists() else None
    if admission_engine is None:
        print(f"Admission model not found ({admission_model}); run train_asfendiyarov.py to enable it")
    handler = type(
        "NeoOutcomeApiHandler",
        (ApiHandler,),
        {"engine": engine, "admission_engine": admission_engine},
    )
    server = ThreadingHTTPServer((host, port), handler)
    print(f"NeoOutcome demo API: http://{host}:{port}")
    print("Endpoints: GET /health, GET /demo, POST /predict, POST /predict/admission")
    print(SYNTHETIC_NOTICE)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--model", type=Path, default=DEFAULT_MODEL)
    subparsers = parser.add_subparsers(dest="command", required=True)

    generate_parser = subparsers.add_parser("generate", help="Create JSON, CSV and PDF demo files")
    generate_parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    generate_parser.add_argument(
        "--site-public",
        type=Path,
        default=DEFAULT_SITE_PUBLIC,
        help="Copy generated demo files into the site's public/demo directory",
    )
    generate_parser.add_argument("--no-site-copy", action="store_true")

    serve_parser = subparsers.add_parser("serve", help="Run the local model inference API")
    serve_parser.add_argument("--host", default="127.0.0.1")
    serve_parser.add_argument("--port", type=int, default=8000)
    serve_parser.add_argument("--admission-model", type=Path, default=DEFAULT_ADMISSION_MODEL)
    return parser


def main() -> int:
    args = build_parser().parse_args()
    if args.command == "generate":
        site_public = None if args.no_site_copy else args.site_public
        paths = generate_bundle(args.model, args.output, site_public)
        print("Synthetic patient generated")
        for label, path in paths.items():
            print(f"{label}: {path}")
        return 0
    if args.command == "serve":
        serve(args.model, args.host, args.port, args.admission_model)
        return 0
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
