import type { JobResult, PredictionItem, JobSummary } from "@/lib/types";

type ParsedCsv = {
  headers: string[];
  rows: string[][];
};

function splitCsvLine(line: string) {
  const cells: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === "\"") {
      if (quoted && line[index + 1] === "\"") {
        current += "\"";
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (char === "," && !quoted) {
      cells.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current);
  return cells.map((cell) => cell.trim());
}

function parseCsvText(text: string): ParsedCsv {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    throw new Error("CSV must contain a header row and at least one data row.");
  }

  const headers = splitCsvLine(lines[0]);
  const rows = lines.slice(1).map(splitCsvLine);

  return { headers, rows };
}

function average(values: number[]) {
  if (!values.length) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function standardDeviation(values: number[]) {
  if (!values.length) {
    return 0;
  }

  const mean = average(values);
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function summarizeItems(items: PredictionItem[]): JobSummary {
  return items.reduce<JobSummary>(
    (summary, item) => {
      summary.rows_total += 1;

      if (item.prediction === "abnormal") {
        summary.predicted_abnormal += 1;
      }

      if (item.risk_level === "high") {
        summary.high_risk += 1;
      } else if (item.risk_level === "medium") {
        summary.medium_risk += 1;
      } else {
        summary.low_risk += 1;
      }

      return summary;
    },
    {
      rows_total: 0,
      predicted_abnormal: 0,
      high_risk: 0,
      medium_risk: 0,
      low_risk: 0,
    },
  );
}

export function validateCsvText(text: string) {
  const { headers, rows } = parseCsvText(text);

  if (headers.length < 3) {
    throw new Error("CSV must include meter_id and at least two monthly usage columns.");
  }

  if (headers[0].toLowerCase() !== "meter_id") {
    throw new Error("The first column must be meter_id.");
  }

  for (const row of rows) {
    if (row.length !== headers.length) {
      throw new Error("Every row must have the same number of columns as the header.");
    }

    if (!row[0]) {
      throw new Error("Every row must include a meter_id value.");
    }

    for (const value of row.slice(1)) {
      if (value === "" || Number.isNaN(Number(value))) {
        throw new Error("Usage columns must contain numeric values only.");
      }
    }
  }

  return { headers, rows };
}

export function createMockInferenceResult(
  text: string,
  jobId: string,
  backend = "mock",
): { result: JobResult; downloadCsv: string } {
  const { headers, rows } = validateCsvText(text);
  const scoredRows: string[][] = [
    [...headers, "prediction", "model_score", "risk_level", "top_reasons"],
  ];

  const items = rows.map((row) => {
    const values = row.slice(1).map((value) => Number(value));
    const avg = average(values);
    const std = standardDeviation(values);
    const coefficientOfVariation = avg > 0 ? std / avg : 0;
    const midpoint = Math.floor(values.length / 2);
    const firstHalf = average(values.slice(0, midpoint));
    const secondHalf = average(values.slice(midpoint));
    const lastValue = values.at(-1) ?? 0;

    const reasons: string[] = [];
    let score = 0.15;

    if (avg < 70) {
      score += 0.28;
      reasons.push("low_average_usage");
    }

    if (coefficientOfVariation > 0.55) {
      score += 0.22;
      reasons.push("high_variability");
    }

    if (firstHalf > 0 && secondHalf / firstHalf < 0.55) {
      score += 0.26;
      reasons.push("usage_drop_pattern");
    }

    if (avg > 0 && lastValue < avg * 0.45) {
      score += 0.19;
      reasons.push("recent_month_drop");
    }

    if (!reasons.length) {
      reasons.push("stable_usage_profile");
    }

    const normalizedScore = Math.min(score, 0.98);
    const prediction = normalizedScore >= 0.65 ? "abnormal" : "normal";
    const riskLevel =
      normalizedScore >= 0.8 ? "high" : normalizedScore >= 0.65 ? "medium" : "low";

    const item: PredictionItem = {
      meter_id: row[0],
      prediction,
      model_score: Number(normalizedScore.toFixed(4)),
      risk_level: riskLevel,
      top_reasons: reasons,
    };

    scoredRows.push([
      ...row,
      prediction,
      normalizedScore.toFixed(4),
      riskLevel,
      reasons.join("|"),
    ]);

    return item;
  });

  return {
    result: {
      job_id: jobId,
      backend,
      summary: summarizeItems(items),
      items,
    },
    downloadCsv: scoredRows.map((row) => row.join(",")).join("\n"),
  };
}

function coerceReasons(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry));
  }

  if (typeof value === "string" && value.trim()) {
    return [value];
  }

  return ["model_output"];
}

function normalizePredictionRow(row: Record<string, unknown>): PredictionItem {
  return {
    meter_id: String(
      row.meter_id ??
        row.Meter_ID ??
        row["Meter ID"] ??
        row["meter id"] ??
        "",
    ),
    prediction: String(row.prediction ?? row.Prediction ?? "normal").toLowerCase(),
    model_score: Number(
      row.model_score ?? row.Confidence ?? row.score ?? row.probability ?? 0,
    ),
    risk_level: String(row.risk_level ?? row.Risk_Level ?? row.risk ?? "low").toLowerCase(),
    top_reasons: coerceReasons(row.top_reasons ?? row.reasons),
  };
}

export function normalizeSpaceResult(
  spaceResponse: unknown,
  fallbackText: string,
  jobId: string,
  backend = "hf_space",
): { result: JobResult; downloadCsv: string } {
  const fallback = createMockInferenceResult(fallbackText, jobId, backend);

  const payload =
    typeof spaceResponse === "object" &&
    spaceResponse !== null &&
    "data" in spaceResponse
      ? (spaceResponse as { data?: unknown }).data
      : spaceResponse;

  const candidates: unknown[] = Array.isArray(payload) ? payload : [payload];

  for (const candidate of candidates) {
    if (!Array.isArray(candidate) || !candidate.length) {
      continue;
    }

    if (typeof candidate[0] === "object" && candidate[0] !== null) {
      const items = (candidate as Record<string, unknown>[]).map(normalizePredictionRow);

      return {
        result: {
          ...fallback.result,
          items,
          summary: summarizeItems(items),
        },
        downloadCsv: fallback.downloadCsv,
      };
    }
  }

  if (
    typeof payload === "object" &&
    payload !== null &&
    ("items" in payload || "data" in payload)
  ) {
    const container = payload as { items?: unknown; data?: unknown };
    const nested = container.items ?? container.data;

    if (Array.isArray(nested) && nested.length && typeof nested[0] === "object") {
      const items = (nested as Record<string, unknown>[]).map(normalizePredictionRow);

      return {
        result: {
          ...fallback.result,
          items,
          summary: summarizeItems(items),
        },
        downloadCsv: fallback.downloadCsv,
      };
    }
  }

  return fallback;
}
