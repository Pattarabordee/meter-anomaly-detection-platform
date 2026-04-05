'use client';

import { ChangeEvent, useMemo, useState } from "react";
import Link from "next/link";
import { createJob } from "@/lib/api";
import { useRouter } from "next/navigation";
import { persistJob } from "@/lib/job-storage";

export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const fileLabel = useMemo(() => {
    if (!file) {
      return "No CSV selected yet";
    }

    return `${file.name} (${Math.max(1, Math.round(file.size / 1024))} KB)`;
  }, [file]);

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setError("");
    setFile(e.target.files?.[0] || null);
  };

  const onSubmit = async () => {
    if (!file) {
      setError("Please choose a CSV file before running the demo.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const job = await createJob(file);
      persistJob(job);
      router.push(`/jobs/${job.job_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="container">
      <section className="page-header">
        <span className="eyebrow">Demo Console</span>
        <h1>Upload a synthetic meter profile CSV</h1>
        <p className="hero-lead">
          Use the included sample file or your own public-safe synthetic data. The request is processed by
          a Next.js server route that can call Hugging Face securely or fall back to mock mode.
        </p>
      </section>

      <section className="grid grid-2">
        <article className="card emphasis-card">
          <div className="panel-label">Input requirements</div>
          <ul className="bullet-list">
            <li>First column must be <code>meter_id</code></li>
            <li>Remaining columns should be numeric monthly usage values</li>
            <li>Do not upload real operational or customer data</li>
          </ul>
          <div className="actions">
            <a className="button secondary" href="/sample_input.csv" download>
              Download Sample CSV
            </a>
            <Link className="button ghost" href="/docs">
              Review deployment notes
            </Link>
          </div>
        </article>

        <article className="card upload-card">
          <div className="panel-label">Run inference</div>
          <label className="upload-dropzone">
            <input type="file" accept=".csv,text/csv" onChange={onFileChange} />
            <span className="upload-title">Choose CSV file</span>
            <span className="muted">{fileLabel}</span>
          </label>

          {error ? <div className="alert error">{error}</div> : null}

          <div className="actions">
            <button onClick={onSubmit} disabled={busy}>
              {busy ? "Scoring data..." : "Score Meter Profiles"}
            </button>
          </div>
        </article>
      </section>
    </main>
  );
}
