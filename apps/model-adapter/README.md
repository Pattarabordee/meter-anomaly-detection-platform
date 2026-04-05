# HF Python bridge

This layer exists to make file-based Hugging Face / Gradio integration reliable while keeping the main product backend in Go.

## Main scripts

- `scripts/hf_predict.py` — run one prediction request and normalize output to a stable JSON contract
- `scripts/inspect_space_api.py` — inspect named API endpoints via `Client.view_api()`

## Typical flow

1. Inspect the space:
```bash
python scripts/inspect_space_api.py
```

2. Set `HF_API_NAME` in `apps/api/.env` if needed.

3. Run Go API with:
```bash
INFERENCE_BACKEND=hf_python_bridge
```
