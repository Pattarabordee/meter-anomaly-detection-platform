import { NextResponse } from "next/server";
import type { RuntimeInfo } from "@/lib/types";

function getRuntimeInfo(): RuntimeInfo {
  return {
    inference_backend: process.env.INFERENCE_BACKEND || "mock",
    hf_space_id: process.env.HF_SPACE_ID || "Pattarabordee/pea-ne1-meter-detection",
    hf_api_name: process.env.HF_API_NAME || "",
    mock_enabled: (process.env.ENABLE_MOCK_FALLBACK || "true").toLowerCase() !== "false",
    public_safe: true,
  };
}

export async function GET() {
  return NextResponse.json(getRuntimeInfo(), {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
