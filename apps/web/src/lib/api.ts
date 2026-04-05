import type { CreateJobResponse, RuntimeInfo } from "@/lib/types";

export async function createJob(file: File): Promise<CreateJobResponse> {
  const form = new FormData();
  form.append("file", file);

  const response = await fetch("/api/jobs", {
    method: "POST",
    body: form,
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      payload?.error?.message ??
      payload?.message ??
      "Upload failed";
    throw new Error(message);
  }

  return payload as CreateJobResponse;
}

export async function getRuntime(): Promise<RuntimeInfo> {
  const response = await fetch("/api/runtime", {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Failed to load runtime information");
  }

  return response.json() as Promise<RuntimeInfo>;
}
