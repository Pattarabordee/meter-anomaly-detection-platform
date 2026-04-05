package tests

import (
	"bytes"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"testing"

	"pea-ntl-api/internal/clients/mock"
	"pea-ntl-api/internal/config"
	apihttp "pea-ntl-api/internal/http"
	"pea-ntl-api/internal/repository/memory"
)

const sampleCSV = `meter_id,202401,202402,202403,202404,202405,202406,202407,202408,202409,202410,202411,202412
MTR0001,120,118,121,119,117,116,80,72,64,52,50,48
MTR0002,230,231,229,232,228,230,231,229,230,231,229,230
`

func setupRouter() http.Handler {
	cfg := config.Config{AppEnv: "test", Port: "8080", InferenceBackend: "mock", RequestTimeoutSeconds: 10, MaxUploadMB: 10}
	store := memory.NewJobStore()
	inference := mock.NewClient()
	h := apihttp.NewHandler(cfg, store, inference)
	return apihttp.NewRouter(h)
}

func TestHealthcheck(t *testing.T) {
	engine := setupRouter()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/health", nil)
	w := httptest.NewRecorder()
	engine.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
}

func TestRuntimeEndpoint(t *testing.T) {
	engine := setupRouter()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/runtime", nil)
	w := httptest.NewRecorder()
	engine.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
}

func TestCreateJobAndResult(t *testing.T) {
	engine := setupRouter()
	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	part, err := writer.CreateFormFile("file", "sample.csv")
	if err != nil {
		t.Fatalf("CreateFormFile failed: %v", err)
	}
	if _, err := part.Write([]byte(sampleCSV)); err != nil {
		t.Fatalf("Write failed: %v", err)
	}
	_ = writer.WriteField("source", "web")
	_ = writer.WriteField("mode", "sync")
	_ = writer.Close()

	req := httptest.NewRequest(http.MethodPost, "/api/v1/jobs", &body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	w := httptest.NewRecorder()
	engine.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d, body=%s", w.Code, w.Body.String())
	}
}

func TestRejectInvalidCSV(t *testing.T) {
	engine := setupRouter()
	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	part, err := writer.CreateFormFile("file", "bad.csv")
	if err != nil {
		t.Fatalf("CreateFormFile failed: %v", err)
	}
	if _, err := part.Write([]byte("bad,header\n1,2")); err != nil {
		t.Fatalf("Write failed: %v", err)
	}
	_ = writer.Close()

	req := httptest.NewRequest(http.MethodPost, "/api/v1/jobs", &body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	w := httptest.NewRecorder()
	engine.ServeHTTP(w, req)
	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d body=%s", w.Code, w.Body.String())
	}
}
