package http

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"pea-ntl-api/internal/config"
	"pea-ntl-api/internal/domain"
	"pea-ntl-api/internal/repository/memory"
	"pea-ntl-api/internal/validation"
)

type InferenceClient interface {
	PredictCSV(ctx context.Context, fileName string, data []byte) (*domain.JobResult, []byte, error)
}

type Handler struct {
	cfg       config.Config
	store     *memory.JobStore
	inference InferenceClient
}

func NewHandler(cfg config.Config, store *memory.JobStore, inference InferenceClient) *Handler {
	return &Handler{cfg: cfg, store: store, inference: inference}
}

func NewRouter(h *Handler) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/v1/health", h.Health)
	mux.HandleFunc("/api/v1/runtime", h.Runtime)
	mux.HandleFunc("/api/v1/jobs", h.CreateJob)
	mux.HandleFunc("/api/v1/jobs/", h.JobSubroutes)
	return withCORS(mux)
}

func (h *Handler) Health(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeMethodNotAllowed(w)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"status": "ok", "service": "pea-ntl-api", "version": "0.2.0"})
}

func (h *Handler) Runtime(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeMethodNotAllowed(w)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"inference_backend": h.cfg.InferenceBackend,
		"hf_space_id":       h.cfg.HFSpaceID,
		"hf_api_name":       h.cfg.HFAPIName,
	})
}

func (h *Handler) CreateJob(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeMethodNotAllowed(w)
		return
	}
	if err := r.ParseMultipartForm(h.cfg.MaxUploadMB * 1024 * 1024); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_MULTIPART", "Could not parse multipart form", map[string]any{"reason": err.Error()})
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		writeError(w, http.StatusBadRequest, "FILE_REQUIRED", "A CSV file is required", nil)
		return
	}
	defer file.Close()

	if header.Size > h.cfg.MaxUploadMB*1024*1024 {
		writeError(w, http.StatusBadRequest, "FILE_TOO_LARGE", "Uploaded file exceeds allowed size", map[string]any{"max_upload_mb": h.cfg.MaxUploadMB})
		return
	}

	data, err := io.ReadAll(file)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "FILE_READ_FAILED", "Could not read uploaded file", nil)
		return
	}

	if err := validation.ParseAndValidateCSV(bytes.NewReader(data)); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_CSV_SCHEMA", "Uploaded file does not match expected schema", map[string]any{"reason": err.Error()})
		return
	}

	now := time.Now()
	jobID := fmt.Sprintf("job_%d", now.UnixNano())
	job := &domain.Job{ID: jobID, Status: domain.JobRunning, Message: "Inference started", CreatedAt: now, UpdatedAt: now, OriginalName: header.Filename}
	h.store.Save(job)

	ctx, cancel := context.WithTimeout(r.Context(), time.Duration(h.cfg.RequestTimeoutSeconds)*time.Second)
	defer cancel()

	result, downloadBytes, err := h.inference.PredictCSV(ctx, header.Filename, data)
	if err != nil {
		job.Status = domain.JobFailed
		job.Message = err.Error()
		h.store.Save(job)
		writeError(w, http.StatusBadGateway, "INFERENCE_FAILED", "Inference backend failed", map[string]any{"reason": err.Error()})
		return
	}

	result.JobID = jobID
	job.Status = domain.JobSucceeded
	job.Message = "Inference completed"
	job.Result = result
	job.DownloadBytes = downloadBytes
	h.store.Save(job)

	writeJSON(w, http.StatusOK, map[string]any{
		"job_id":     jobID,
		"status":     job.Status,
		"message":    job.Message,
		"result_url": fmt.Sprintf("/api/v1/jobs/%s/result", jobID),
		"summary":    result.Summary,
	})
}

func (h *Handler) JobSubroutes(w http.ResponseWriter, r *http.Request) {
	path := strings.TrimPrefix(r.URL.Path, "/api/v1/jobs/")
	parts := strings.Split(strings.Trim(path, "/"), "/")
	if len(parts) == 0 || parts[0] == "" {
		writeError(w, http.StatusNotFound, "NOT_FOUND", "Route not found", nil)
		return
	}
	jobID := parts[0]
	if len(parts) == 1 {
		h.GetJob(w, r, jobID)
		return
	}
	switch parts[1] {
	case "result":
		h.GetJobResult(w, r, jobID)
	case "download":
		h.DownloadJobCSV(w, r, jobID)
	default:
		writeError(w, http.StatusNotFound, "NOT_FOUND", "Route not found", nil)
	}
}

func (h *Handler) GetJob(w http.ResponseWriter, r *http.Request, jobID string) {
	if r.Method != http.MethodGet {
		writeMethodNotAllowed(w)
		return
	}
	job, err := h.store.Get(jobID)
	if err != nil {
		if errors.Is(err, memory.ErrJobNotFound) {
			writeError(w, http.StatusNotFound, "JOB_NOT_FOUND", "Job was not found", nil)
			return
		}
		writeError(w, http.StatusInternalServerError, "STORE_ERROR", "Failed to load job", nil)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"job_id":        job.ID,
		"status":        job.Status,
		"message":       job.Message,
		"created_at":    job.CreatedAt,
		"updated_at":    job.UpdatedAt,
		"original_name": job.OriginalName,
	})
}

func (h *Handler) GetJobResult(w http.ResponseWriter, r *http.Request, jobID string) {
	if r.Method != http.MethodGet {
		writeMethodNotAllowed(w)
		return
	}
	job, err := h.store.Get(jobID)
	if err != nil {
		if errors.Is(err, memory.ErrJobNotFound) {
			writeError(w, http.StatusNotFound, "JOB_NOT_FOUND", "Job was not found", nil)
			return
		}
		writeError(w, http.StatusInternalServerError, "STORE_ERROR", "Failed to load job", nil)
		return
	}
	if job.Result == nil {
		writeError(w, http.StatusConflict, "JOB_NOT_READY", "Job result is not available yet", nil)
		return
	}
	writeJSON(w, http.StatusOK, job.Result)
}

func (h *Handler) DownloadJobCSV(w http.ResponseWriter, r *http.Request, jobID string) {
	if r.Method != http.MethodGet {
		writeMethodNotAllowed(w)
		return
	}
	job, err := h.store.Get(jobID)
	if err != nil {
		if errors.Is(err, memory.ErrJobNotFound) {
			writeError(w, http.StatusNotFound, "JOB_NOT_FOUND", "Job was not found", nil)
			return
		}
		writeError(w, http.StatusInternalServerError, "STORE_ERROR", "Failed to load job", nil)
		return
	}
	if len(job.DownloadBytes) == 0 {
		writeError(w, http.StatusConflict, "JOB_NOT_READY", "Download artifact is not available yet", nil)
		return
	}
	w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s_scored.csv"`, job.ID))
	w.Header().Set("Content-Type", "text/csv; charset=utf-8")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(job.DownloadBytes)
}

func withCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func writeMethodNotAllowed(w http.ResponseWriter) {
	writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Method not allowed", nil)
}

func writeError(w http.ResponseWriter, status int, code, message string, details any) {
	writeJSON(w, status, map[string]any{"error": map[string]any{"code": code, "message": message, "details": details}})
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}
