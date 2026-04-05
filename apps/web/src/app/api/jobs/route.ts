import { Buffer } from "node:buffer";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createMockInferenceResult, normalizeSpaceResult, validateCsvText } from "@/lib/server/csv";
import { readBooleanEnv, readEnv } from "@/lib/server/env";
import { callHuggingFaceSpace } from "@/lib/server/hf-space";

export const runtime = "nodejs";

function jsonError(status: number, code: string, message: string, details?: unknown) {
  return NextResponse.json(
    {
      error: {
        code,
        message,
        details: details ?? null,
      },
    },
    { status },
  );
}

function getMaxUploadBytes() {
  const maxUploadMb = Number(readEnv("MAX_UPLOAD_MB", "10"));
  return maxUploadMb * 1024 * 1024;
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return jsonError(400, "FILE_REQUIRED", "A CSV file is required.");
  }

  if (file.size > getMaxUploadBytes()) {
    return jsonError(400, "FILE_TOO_LARGE", "Uploaded file exceeds the maximum allowed size.");
  }

  const fileBuffer = Buffer.from(await file.arrayBuffer());
  const fileText = fileBuffer.toString("utf-8");

  try {
    validateCsvText(fileText);
  } catch (error) {
    return jsonError(400, "INVALID_CSV_SCHEMA", error instanceof Error ? error.message : "Invalid CSV schema.");
  }

  const jobId = `job_${randomUUID()}`;
  const backend = readEnv("INFERENCE_BACKEND", "mock");
  const warnings: string[] = [];
  const mockFallbackEnabled = readBooleanEnv("ENABLE_MOCK_FALLBACK", true);

  try {
    if (backend === "hf_space") {
      const spaceResult = await callHuggingFaceSpace(fileBuffer, file.name, {
        apiName: readEnv("HF_API_NAME", ""),
        spaceId: readEnv("HF_SPACE_ID", "Pattarabordee/pea-ne1-meter-detection"),
        token: readEnv("HF_AUTH_TOKEN", ""),
        useAuth: readBooleanEnv("HF_USE_AUTH", false),
      });

      const normalized = normalizeSpaceResult(spaceResult.response, fileText, jobId, "hf_space");
      normalized.result.backend_api_name = spaceResult.apiName;

      return NextResponse.json({
        job_id: jobId,
        status: "SUCCEEDED",
        message: "Inference completed successfully.",
        warnings,
        result: normalized.result,
        download_csv_base64: Buffer.from(normalized.downloadCsv, "utf-8").toString("base64"),
        download_file_name: `${jobId}_scored.csv`,
      });
    }
  } catch (error) {
    if (!mockFallbackEnabled) {
      return jsonError(502, "INFERENCE_FAILED", "Hugging Face inference failed.", {
        reason: error instanceof Error ? error.message : "Unknown error",
      });
    }

    warnings.push("Live Hugging Face inference was unavailable, so the app switched to deterministic mock mode.");
  }

  const mockResult = createMockInferenceResult(fileText, jobId);

  return NextResponse.json({
    job_id: jobId,
    status: "SUCCEEDED",
    message: warnings.length
      ? "Inference completed with mock fallback."
      : "Inference completed successfully.",
    warnings,
    result: mockResult.result,
    download_csv_base64: Buffer.from(mockResult.downloadCsv, "utf-8").toString("base64"),
    download_file_name: `${jobId}_scored.csv`,
  });
}
