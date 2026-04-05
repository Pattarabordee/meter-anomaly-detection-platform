run-api:
	cd apps/api && cp -n .env.example .env || true && go run ./cmd/server

run-web:
	cd apps/web && cp -n .env.local.example .env.local || true && npm install && npm run dev

test-api:
	cd apps/api && go test ./...

inspect-hf:
	cd apps/model-adapter && python scripts/inspect_space_api.py
