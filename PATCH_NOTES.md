# Patch notes

This edition adds a real integration seam for the user's Hugging Face Space through a Python bridge.

## Added
- `INFERENCE_BACKEND=hf_python_bridge`
- `apps/model-adapter/scripts/hf_predict.py`
- `apps/model-adapter/scripts/inspect_space_api.py`
- `/api/v1/runtime`
- frontend backend badges on result page

## Changed
- Go API config now supports HF bridge env mapping
- Dockerfile for API now includes Python runtime and bridge dependencies

## Caveat
The environment used to build this artifact could not fetch the Space OpenAPI directly.
This patch therefore resolves the endpoint dynamically through `gradio_client` and allows `HF_API_NAME` override if needed.
