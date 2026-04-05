package app

import (
	"net/http"

	"pea-ntl-api/internal/clients/mock"
	"pea-ntl-api/internal/clients/pythonbridge"
	"pea-ntl-api/internal/config"
	apihttp "pea-ntl-api/internal/http"
	"pea-ntl-api/internal/repository/memory"
)

type Server struct {
	Handler http.Handler
	Config  config.Config
}

func NewServer() (*Server, error) {
	cfg := config.Load()
	store := memory.NewJobStore()

	var inference apihttp.InferenceClient
	switch cfg.InferenceBackend {
	case "hf_python_bridge":
		inference = pythonbridge.NewClient(cfg.PythonExecutable, cfg.PythonBridgePath, cfg.HFSpaceID, cfg.HFAPIName, cfg.HFAuthToken, cfg.HFUseAuth, cfg.PythonBridgeTimeoutSeconds)
	default:
		inference = mock.NewClient()
	}

	h := apihttp.NewHandler(cfg, store, inference)
	return &Server{Handler: apihttp.NewRouter(h), Config: cfg}, nil
}
