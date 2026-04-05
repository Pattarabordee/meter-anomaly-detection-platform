'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import { loadJob } from "@/lib/job-storage";
import type { CreateJobResponse } from "@/lib/types";

function downloadCsv(job: CreateJobResponse) {
  const csvText = window.atob(job.download_csv_base64);
  const blob = new Blob([csvText], { type: "text/csv;charset=utf-8" });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = job.download_file_name;
  anchor.click();
  window.URL.revokeObjectURL(url);
}

export default function JobResultClient({ jobId }: { jobId: string }) {
  const [job, setJob] = useState<CreateJobResponse | null>(null);

  useEffect(() => {
    setJob(loadJob(jobId));
  }, [jobId]);

  if (!job) {
    return (
      <main className="container">
        <section className="page-header">
          <span className="eyebrow">Result unavailable</span>
          <h1>Saved result not found for {jobId}</h1>
          <p className="hero-lead">
            This Vercel-first demo stores completed job artifacts in the browser after upload instead of
            relying on server memory. Run the upload flow again to regenerate the report.
          </p>
          <div className="actions">
            <Link className="button" href="/upload">Run New Demo</Link>
            <Link className="button secondary" href="/">Back Home</Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="container">
      <section className="page-header">
        <span className="eyebrow">Scoring Report</span>
        <h1>Inference result for {job.job_id}</h1>
        <p className="hero-lead">
          The result view is normalized by the Next.js server layer so the UI stays stable whether the app
          uses the live Hugging Face Space or the deterministic mock scorer.
        </p>
      </section>

      <section className="result-toolbar">
        <div className="actions">
          <span className="badge">Backend: {job.result.backend || "unknown"}</span>
          {job.result.backend_api_name ? <span className="badge">API: {job.result.backend_api_name}</span> : null}
        </div>
        <div className="actions">
          <button onClick={() => downloadCsv(job)}>Download scored CSV</button>
          <Link className="button secondary" href="/upload">Run another file</Link>
        </div>
      </section>

      {job.warnings.length ? (
        <div className="warn">
          {job.warnings.map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
        </div>
      ) : null}

      <section className="grid grid-3 stats-grid">
        <article className="card stat-card surface-strong">
          <div className="panel-label">Rows processed</div>
          <div className="stat-value">{job.result.summary.rows_total}</div>
        </article>
        <article className="card stat-card surface-strong">
          <div className="panel-label">Predicted abnormal</div>
          <div className="stat-value">{job.result.summary.predicted_abnormal}</div>
        </article>
        <article className="card stat-card surface-strong">
          <div className="panel-label">High risk</div>
          <div className="stat-value">{job.result.summary.high_risk}</div>
        </article>
      </section>

      <section className="grid grid-2 result-summary-grid">
        <article className="card editorial-card">
          <div className="panel-label">Interpretation</div>
          <h2 className="section-title">Use the report to focus field action, not assign blame.</h2>
          <p className="muted">
            Model scores are intended for prioritization. They help rank inspections and highlight unusual
            profiles, but they are not calibrated proof of wrongdoing.
          </p>
        </article>
        <article className="card editorial-card accent-card">
          <div className="panel-label">Topline</div>
          <h2 className="section-title">Review flagged rows, reasons, and export-ready output in one pass.</h2>
          <p className="muted">
            The result payload is normalized by the server layer, so the front-end remains stable even when
            the inference backend changes.
          </p>
        </article>
      </section>

      <section className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Meter ID</th>
                <th>Prediction</th>
                <th>Score</th>
                <th>Risk</th>
                <th>Reasons</th>
              </tr>
            </thead>
            <tbody>
              {job.result.items.map((item) => (
                <tr key={item.meter_id}>
                  <td>{item.meter_id}</td>
                  <td>{item.prediction}</td>
                  <td>{item.model_score.toFixed(2)}</td>
                  <td>{item.risk_level}</td>
                  <td>{item.top_reasons.join(", ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
