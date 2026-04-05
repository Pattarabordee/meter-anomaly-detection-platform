export default function DocsPage() {
  return (
    <main className="container">
      <section className="page-header">
        <span className="eyebrow">Deployment Blueprint</span>
        <h1>GitHub + Vercel + Hugging Face architecture</h1>
        <p className="hero-lead">
          The main web product is now the Next.js app in <code>apps/web</code>. Vercel deploys that app,
          and the browser only communicates with internal route handlers. Hugging Face access stays on the
          server side.
        </p>
      </section>

      <div className="grid grid-2">
        <article className="card">
          <div className="panel-label">Request flow</div>
          <pre>{`Browser
  -> Next.js page/app router
  -> POST /api/jobs
  -> Hugging Face Space (server-side only) or mock scorer
  -> Normalized JSON + downloadable CSV`}</pre>
        </article>
        <article className="card">
          <div className="panel-label">Key environment variables</div>
          <pre>{`INFERENCE_BACKEND=mock | hf_space
HF_SPACE_ID=Pattarabordee/pea-ne1-meter-detection
HF_API_NAME=/predict
HF_AUTH_TOKEN=
HF_USE_AUTH=false
ENABLE_MOCK_FALLBACK=true`}</pre>
        </article>
      </div>

      <div className="grid grid-2">
        <article className="card">
          <div className="panel-label">Why this is Vercel-ready</div>
          <ul className="bullet-list">
            <li>No dependency on a separate Go service for the main demo path</li>
            <li>No reliance on in-memory server jobs between requests</li>
            <li>Next.js route handlers are the only public API surface needed for the demo</li>
          </ul>
        </article>
        <article className="card">
          <div className="panel-label">Why this is public-safe</div>
          <ul className="bullet-list">
            <li>Uses synthetic sample input only</li>
            <li>Does not expose HF tokens to the browser</li>
            <li>Includes mock mode for local demos and fallback resilience</li>
          </ul>
        </article>
      </div>
    </main>
  );
}
