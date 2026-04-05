# Meter Anomaly Detection Platform

Public-safe monorepo for a meter anomaly detection demo platform with:

- `apps/web` as the primary Next.js web product
- Vercel as the intended deployment target for the web app
- Hugging Face Space `Pattarabordee/pea-ne1-meter-detection` as the live inference backend
- Deterministic mock mode for local testing, fallback, and portfolio demos

The current production-ready path is:

```text
Browser -> Next.js (apps/web) -> Next.js Route Handler -> Hugging Face Space or Mock Scorer
```

The legacy Go API and Python adapter remain in the repo as reference material, but the main GitHub + Vercel deployment path now runs through `apps/web`.

## Why this repo is public-safe

- No real customer data is included
- The sample input is synthetic only
- Hugging Face credentials, if needed, stay server-side in Vercel environment variables
- The browser never calls Hugging Face directly

## Repository structure

```text
apps/
  api/            Legacy Go orchestration layer kept as reference
  model-adapter/  Legacy Python bridge kept as reference
  web/            Main Next.js product and Vercel deploy target
data/
  synthetic/      Public-safe example CSV
packages/design/  Architecture notes from the starter setup
```

## Quick start

### 1. Run locally in mock mode

```bash
cd apps/web
copy .env.local.example .env.local
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Default local behavior:

- `INFERENCE_BACKEND=mock`
- no Hugging Face token required
- sample upload works with `public/sample_input.csv`

### 2. Run locally against Hugging Face Space

Edit `apps/web/.env.local`:

```bash
INFERENCE_BACKEND=hf_space
HF_SPACE_ID=Pattarabordee/pea-ne1-meter-detection
HF_API_NAME=
HF_AUTH_TOKEN=
HF_USE_AUTH=false
ENABLE_MOCK_FALLBACK=true
```

Notes:

- Leave `HF_AUTH_TOKEN` blank for public access
- Set `HF_USE_AUTH=true` only if the Space requires a token or you want authenticated quota/rate behavior
- If the live call fails and `ENABLE_MOCK_FALLBACK=true`, the app falls back to mock mode automatically

## Environment variables

Set these in `apps/web/.env.local` for local dev and in Vercel Project Settings for deployment:

- `NEXT_PUBLIC_APP_NAME`
  Product title shown in the UI
- `INFERENCE_BACKEND`
  `mock` or `hf_space`
- `MAX_UPLOAD_MB`
  Maximum upload size in megabytes
- `ENABLE_MOCK_FALLBACK`
  `true` or `false`
- `HF_SPACE_ID`
  Default: `Pattarabordee/pea-ne1-meter-detection`
- `HF_API_NAME`
  Optional explicit Gradio API name such as `/predict`
- `HF_AUTH_TOKEN`
  Optional Hugging Face token, server-side only
- `HF_USE_AUTH`
  `true` when the server should attach `HF_AUTH_TOKEN` to Space calls

## Deploy on Vercel

### Recommended setup

1. Push this repository to GitHub
2. Import the repository into Vercel
3. Set the Vercel Root Directory to `apps/web`
4. Add the environment variables listed above
5. Deploy

### Current deployed demo

- Production URL: `https://web-51de25lec-pattarabordeelpt-1472s-projects.vercel.app`
- Vercel project: `web`
- Root directory: `apps/web`

### Minimum Vercel env setup for live inference

```bash
INFERENCE_BACKEND=hf_space
HF_SPACE_ID=Pattarabordee/pea-ne1-meter-detection
HF_API_NAME=
HF_AUTH_TOKEN=
HF_USE_AUTH=false
ENABLE_MOCK_FALLBACK=true
```

### Minimum Vercel env setup for safe demo mode

```bash
INFERENCE_BACKEND=mock
ENABLE_MOCK_FALLBACK=true
```

## GitHub push checklist

Before pushing:

1. Confirm no real data or secrets are present
2. Keep `.env.local` out of version control
3. Commit from the repo root after reviewing the generated cleanup changes
4. Use `apps/web` as the main deployable app in project documentation

## Demo usage

1. Open the homepage
2. Go to `Run Demo`
3. Download the synthetic sample CSV or upload your own synthetic CSV
4. Review summary KPIs and row-level anomalies
5. Download the scored CSV for presentation or review

## Important implementation notes

- The Next.js route handler at `apps/web/src/app/api/jobs/route.ts` is the secure API layer
- Hugging Face is called only on the server side
- Result artifacts are stored in browser local storage after upload for the current demo flow
- This avoids reliance on server memory, which is a poor fit for Vercel serverless deployments

## What changed from the original starter

- Next.js is now the main application path for real deployment
- The browser no longer depends on the Go API service for the demo flow
- Inference is normalized in the Next.js server layer
- Mock fallback remains available
- The UI has been refreshed to look more like a product showcase than a raw demo shell

## Remaining limitations

- The current result page stores completed jobs in browser local storage, so results are not shared across browsers or devices
- If the Hugging Face Space API signature changes significantly, `HF_API_NAME` may need to be set explicitly
- The legacy Go and Python folders are still present; they are reference assets, not the primary production path for Vercel
