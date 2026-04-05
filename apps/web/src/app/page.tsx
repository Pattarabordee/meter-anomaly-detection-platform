import Link from "next/link";
import { readEnv } from "@/lib/server/env";

export default function HomePage() {
  const inferenceBackend = readEnv("INFERENCE_BACKEND", "mock");
  const runtimeLabel = inferenceBackend === "hf_space" ? "live + mock fallback" : "mock-safe";

  return (
    <main className="container">
      <section className="hero-shell">
        <div className="hero-copy">
          <span className="eyebrow">Operational Analytics Surface</span>
          <h1>Designed for judges, operators, and field teams who need anomaly signals fast.</h1>
          <p className="hero-lead">
            The platform turns synthetic meter history into a presentation-ready risk report. It keeps
            Hugging Face access on the server side, preserves a resilient mock fallback, and now ships as a
            Vercel-ready Next.js product instead of a rough internal demo shell.
          </p>
          <div className="actions">
            <Link className="button" href="/upload">Run Demo</Link>
            <Link className="button secondary" href="/docs">Deployment Notes</Link>
          </div>
          <div className="hero-meta">
            <span className="badge">Public-safe</span>
            <span className="badge">Next.js on Vercel</span>
            <span className="badge">Runtime: {runtimeLabel}</span>
          </div>
        </div>
        <div className="hero-panel card surface-strong">
          <div className="panel-label">Operating model</div>
          <div className="hero-panel-kicker">Inference chain</div>
          <div className="pipeline">
            <div>
              <span>01</span>
              Browser demo flow
            </div>
            <div>
              <span>02</span>
              Next.js route handler
            </div>
            <div>
              <span>03</span>
              HF Space or mock scorer
            </div>
          </div>
          <p className="muted">
            Credentials never reach the browser. The UI only talks to internal route handlers under
            <code>/api</code>.
          </p>
        </div>
      </section>

      <section className="hero-metrics">
        <article className="metric-chip">
          <span>Deployment target</span>
          <strong>Vercel production</strong>
        </article>
        <article className="metric-chip">
          <span>Inference surface</span>
          <strong>Server-side only</strong>
        </article>
        <article className="metric-chip">
          <span>Demo continuity</span>
          <strong>Mock fallback enabled</strong>
        </article>
      </section>

      <section className="grid grid-3 feature-grid">
        <article className="card feature-card">
          <div className="panel-label">Web layer</div>
          <h2>Committee-friendly demo</h2>
          <p className="muted">
            Clear KPI framing, sharper product typography, and downloadable scored CSV for presentation-ready
            walkthroughs.
          </p>
        </article>
        <article className="card feature-card">
          <div className="panel-label">Inference security</div>
          <h2>Server-side HF access</h2>
          <p className="muted">
            Hugging Face Space calls happen inside Next.js route handlers. Optional tokens stay in
            server-only environment variables.
          </p>
        </article>
        <article className="card feature-card">
          <div className="panel-label">Operational mode</div>
          <h2>Resilient fallback</h2>
          <p className="muted">
            If the live model is unavailable, the app can fall back to deterministic mock scoring so the
            demo does not stall.
          </p>
        </article>
      </section>

      <section className="grid grid-2 showcase-grid">
        <article className="card editorial-card">
          <div className="panel-label">What stays in repo</div>
          <h3>Lean enough for deployment, rich enough for review.</h3>
          <ul className="bullet-list">
            <li>Next.js web app as the main deploy target</li>
            <li>Synthetic sample CSV for demo runs</li>
            <li>Legacy Go and Python folders as reference, not the Vercel runtime path</li>
          </ul>
        </article>
        <article className="card editorial-card accent-card">
          <div className="panel-label">What this setup avoids</div>
          <h3>Secure by default for a public portfolio setting.</h3>
          <ul className="bullet-list">
            <li>No real customer data</li>
            <li>No browser-side Hugging Face credentials</li>
            <li>No dependency on in-memory server jobs for production demos</li>
          </ul>
        </article>
      </section>
    </main>
  );
}
