import { NextResponse } from "next/server";
import { readBooleanEnv, readEnv } from "@/lib/server/env";
import type { RuntimeInfo } from "@/lib/types";

function getRuntimeInfo(): RuntimeInfo {
  return {
    inference_backend: readEnv("INFERENCE_BACKEND", "mock"),
    hf_space_id: readEnv("HF_SPACE_ID", "Pattarabordee/pea-ne1-meter-detection"),
    hf_api_name: readEnv("HF_API_NAME", ""),
    mock_enabled: readBooleanEnv("ENABLE_MOCK_FALLBACK", true),
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
