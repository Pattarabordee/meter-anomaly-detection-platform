import Link from "next/link";

export default function HomePage() {
  return (
    <main className="container">
      <section className="hero-shell">
        <div className="hero-copy">
          <span className="eyebrow">Meter Anomaly Detection Platform</span>
          <h1>Vercel-ready product demo for meter risk screening and inspection prioritization.</h1>
          <p className="hero-lead">
            This Next.js app is the public web layer for committee demos and portfolio review. It keeps
            Hugging Face access on the server side, works in mock mode without any credentials, and is
            structured to be pushed to GitHub and deployed on Vercel with minimal setup.
          </p>
          <div className="actions">
            <Link className="button" href="/upload">Run Demo</Link>
            <Link className="button secondary" href="/docs">Deployment Notes</Link>
          </div>
          <div className="hero-meta">
            <span className="badge">Public-safe</span>
            <span className="badge">Next.js on Vercel</span>
            <span className="badge">
              Runtime: {process.env.INFERENCE_BACKEND === "hf_space" ? "live + mock fallback" : "mock-safe"}
            </span>
          </div>
        </div>
        <div className="hero-panel card">
          <div className="panel-label">Operating model</div>
          <div className="pipeline">
            <div>Browser</div>
            <div>Next.js route handler</div>
            <div>HF Space or mock scorer</div>
          </div>
          <p className="muted">
            Credentials never reach the browser. The UI only talks to internal route handlers under
            <code>/api</code>.
          </p>
        </div>
      </section>

      <section className="grid grid-3 feature-grid">
        <article className="card">
          <div className="panel-label">Web layer</div>
          <h2>Committee-friendly demo</h2>
          <p className="muted">
            Clear KPIs, downloadable scored CSV, and synthetic sample input for safe demonstrations.
          </p>
        </article>
        <article className="card">
          <div className="panel-label">Inference security</div>
          <h2>Server-side HF access</h2>
          <p className="muted">
            Hugging Face Space calls happen inside Next.js route handlers. Optional tokens stay in
            server-only environment variables.
          </p>
        </article>
        <article className="card">
          <div className="panel-label">Operational mode</div>
          <h2>Resilient fallback</h2>
          <p className="muted">
            If the live model is unavailable, the app can fall back to deterministic mock scoring so the
            demo does not stall.
          </p>
        </article>
      </section>

      <section className="grid grid-2 showcase-grid">
        <article className="card">
          <div className="panel-label">What stays in repo</div>
          <ul className="bullet-list">
            <li>Next.js web app as the main deploy target</li>
            <li>Synthetic sample CSV for demo runs</li>
            <li>Legacy Go and Python folders as reference, not the Vercel runtime path</li>
          </ul>
        </article>
        <article className="card">
          <div className="panel-label">What this setup avoids</div>
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
