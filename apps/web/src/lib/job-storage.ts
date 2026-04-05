import type { CreateJobResponse } from "@/lib/types";

const JOB_STORAGE_PREFIX = "pea-meter-demo-job:";

export function persistJob(job: CreateJobResponse) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(`${JOB_STORAGE_PREFIX}${job.job_id}`, JSON.stringify(job));
}

export function loadJob(jobId: string): CreateJobResponse | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(`${JOB_STORAGE_PREFIX}${jobId}`);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as CreateJobResponse;
  } catch {
    return null;
  }
}
