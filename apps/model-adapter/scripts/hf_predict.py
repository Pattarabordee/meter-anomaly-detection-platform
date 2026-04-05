import csv
import io
import json
import math
import os
from typing import Any, Dict, List, Tuple

from gradio_client import Client, handle_file


def to_float(value: Any) -> float:
    try:
        return float(value)
    except Exception:
        return 0.0


def summarize_items(items: List[Dict[str, Any]]) -> Dict[str, int]:
    summary = {"rows_total": len(items), "predicted_abnormal": 0, "high_risk": 0, "medium_risk": 0, "low_risk": 0}
    for item in items:
        if item.get("prediction") == "abnormal":
            summary["predicted_abnormal"] += 1
        risk = item.get("risk_level")
        if risk == "high":
            summary["high_risk"] += 1
        elif risk == "medium":
            summary["medium_risk"] += 1
        elif risk == "low":
            summary["low_risk"] += 1
    return summary


def heuristic_from_csv(input_csv_path: str) -> Tuple[List[Dict[str, Any]], str]:
    with open(input_csv_path, "r", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    items: List[Dict[str, Any]] = []
    out = io.StringIO()
    if not rows:
        return items, ""

    headers = list(rows[0].keys())
    writer = csv.writer(out)
    writer.writerow(headers + ["prediction", "model_score", "risk_level", "top_reasons"])

    for row in rows:
        vals = [to_float(row[k]) for k in headers[1:]]
        avg = sum(vals) / len(vals) if vals else 0.0
        variance = sum((v - avg) ** 2 for v in vals) / len(vals) if vals else 0.0
        std = math.sqrt(variance)
        cv = std / avg if avg > 0 else 0.0
        first_half = sum(vals[: len(vals) // 2]) / max(1, len(vals[: len(vals) // 2]))
        second_half = sum(vals[len(vals) // 2 :]) / max(1, len(vals[len(vals) // 2 :]))
        last = vals[-1] if vals else 0.0

        reasons = []
        score = 0.15
        if avg < 70:
            score += 0.28
            reasons.append("low_average_usage")
        if cv > 0.55:
            score += 0.22
            reasons.append("high_variability")
        if first_half > 0 and second_half / first_half < 0.55:
            score += 0.26
            reasons.append("usage_drop_pattern")
        if avg > 0 and last < avg * 0.45:
            score += 0.19
            reasons.append("recent_month_drop")
        if not reasons:
            reasons.append("stable_usage_profile")

        score = min(score, 0.98)
        prediction = "abnormal" if score >= 0.65 else "normal"
        risk = "high" if score >= 0.80 else "medium" if score >= 0.65 else "low"

        item = {
            "meter_id": row.get(headers[0], ""),
            "prediction": prediction,
            "model_score": round(score, 4),
            "risk_level": risk,
            "top_reasons": reasons,
        }
        items.append(item)
        writer.writerow([row.get(h, "") for h in headers] + [prediction, f"{score:.4f}", risk, "|".join(reasons)])

    return items, out.getvalue()


def choose_api_name(client: Client, explicit_api_name: str) -> str:
    if explicit_api_name:
        return explicit_api_name

    named = []
    endpoints = getattr(client, "endpoints", None)
    if endpoints:
        for ep in endpoints:
            api_name = getattr(ep, "api_name", None)
            if api_name:
                named.append(api_name)

    preferred = ["/predict", "/batch_predict", "/run_prediction", "/predict_batch"]
    for p in preferred:
        if p in named:
            return p
    if named:
        return named[0]
    return "/predict"


def call_space(space_id: str, api_name: str, input_csv_path: str, auth_token: str | None) -> Tuple[Any, str]:
    client = Client(space_id, hf_token=auth_token) if auth_token else Client(space_id)
    resolved_api = choose_api_name(client, api_name)
    result = client.predict(handle_file(input_csv_path), api_name=resolved_api)
    return result, resolved_api


def normalize_from_space_result(result: Any, input_csv_path: str) -> Tuple[List[Dict[str, Any]], str]:
    fallback_items, fallback_csv = heuristic_from_csv(input_csv_path)

    if isinstance(result, dict):
        data = result.get("data") or result.get("items")
        if isinstance(data, list) and data and isinstance(data[0], dict):
            items = []
            for row in data:
                items.append({
                    "meter_id": row.get("meter_id") or row.get("Meter_ID") or row.get("Meter ID") or "",
                    "prediction": str(row.get("prediction") or row.get("Prediction") or "normal").lower(),
                    "model_score": to_float(row.get("model_score") or row.get("Confidence") or row.get("score") or 0.0),
                    "risk_level": str(row.get("risk_level") or row.get("Risk_Level") or row.get("risk") or "low").lower(),
                    "top_reasons": row.get("top_reasons") or row.get("reasons") or [],
                })
            for item in items:
                if not isinstance(item["top_reasons"], list):
                    item["top_reasons"] = [str(item["top_reasons"])]
            return items, fallback_csv

    if isinstance(result, (list, tuple)):
        for part in result:
            if isinstance(part, list) and part and isinstance(part[0], dict):
                items = []
                for row in part:
                    items.append({
                        "meter_id": row.get("meter_id") or row.get("Meter_ID") or row.get("Meter ID") or "",
                        "prediction": str(row.get("prediction") or row.get("Prediction") or "normal").lower(),
                        "model_score": to_float(row.get("model_score") or row.get("Confidence") or row.get("score") or 0.0),
                        "risk_level": str(row.get("risk_level") or row.get("Risk_Level") or row.get("risk") or "low").lower(),
                        "top_reasons": row.get("top_reasons") or row.get("reasons") or [],
                    })
                for item in items:
                    if not isinstance(item["top_reasons"], list):
                        item["top_reasons"] = [str(item["top_reasons"])]
                return items, fallback_csv

    return fallback_items, fallback_csv


def main() -> None:
    space_id = os.getenv("HF_SPACE_ID", "Pattarabordee/pea-ne1-meter-detection")
    api_name = os.getenv("HF_API_NAME", "")
    auth_token = os.getenv("HF_AUTH_TOKEN", "")
    use_auth = os.getenv("HF_USE_AUTH", "false").lower() in {"1", "true", "yes", "on"}
    input_csv_path = os.getenv("INPUT_CSV_PATH")

    if not input_csv_path:
        raise SystemExit("INPUT_CSV_PATH is required")

    auth = auth_token if use_auth and auth_token else None
    raw_result, resolved_api_name = call_space(space_id, api_name, input_csv_path, auth)
    items, scored_csv = normalize_from_space_result(raw_result, input_csv_path)
    summary = summarize_items(items)

    output = {
        "backend": "hf_python_bridge",
        "backend_event_id": "",
        "backend_api_name": resolved_api_name,
        "summary": summary,
        "items": items,
        "download_csv": scored_csv,
    }
    print(json.dumps(output, ensure_ascii=False))


if __name__ == "__main__":
    main()
