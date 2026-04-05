FROM golang:1.22 AS builder
WORKDIR /app
COPY apps/api /app/apps/api
WORKDIR /app/apps/api
RUN go build -o /bin/pea-ntl-api ./cmd/server

FROM python:3.11-slim
WORKDIR /app
COPY --from=builder /bin/pea-ntl-api /usr/local/bin/pea-ntl-api
COPY apps/model-adapter /app/apps/model-adapter
RUN pip install --no-cache-dir -r /app/apps/model-adapter/requirements.txt
EXPOSE 8080
ENV PYTHON_EXECUTABLE=python3
ENV PYTHON_BRIDGE_PATH=/app/apps/model-adapter/scripts/hf_predict.py
CMD ["pea-ntl-api"]
