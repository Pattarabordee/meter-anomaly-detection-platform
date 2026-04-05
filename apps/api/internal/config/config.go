package config

import (
	"os"
	"strconv"
	"strings"
)

type Config struct {
	AppEnv                     string
	Port                       string
	InferenceBackend           string
	RequestTimeoutSeconds      int
	MaxUploadMB                int64
	HFSpaceID                  string
	HFAPIName                  string
	HFAuthToken                string
	HFUseAuth                  bool
	PythonExecutable           string
	PythonBridgePath           string
	PythonBridgeTimeoutSeconds int
}

func Load() Config {
	return Config{
		AppEnv:                     getEnv("APP_ENV", "development"),
		Port:                       getEnv("PORT", "8080"),
		InferenceBackend:           getEnv("INFERENCE_BACKEND", "mock"),
		RequestTimeoutSeconds:      getEnvAsInt("REQUEST_TIMEOUT_SECONDS", 90),
		MaxUploadMB:                int64(getEnvAsInt("MAX_UPLOAD_MB", 10)),
		HFSpaceID:                  getEnv("HF_SPACE_ID", "Pattarabordee/pea-ne1-meter-detection"),
		HFAPIName:                  getEnv("HF_API_NAME", ""),
		HFAuthToken:                getEnv("HF_AUTH_TOKEN", ""),
		HFUseAuth:                  getEnvAsBool("HF_USE_AUTH", false),
		PythonExecutable:           getEnv("PYTHON_EXECUTABLE", "python3"),
		PythonBridgePath:           getEnv("PYTHON_BRIDGE_PATH", "../model-adapter/scripts/hf_predict.py"),
		PythonBridgeTimeoutSeconds: getEnvAsInt("PYTHON_BRIDGE_TIMEOUT_SECONDS", 120),
	}
}

func getEnv(key, fallback string) string {
	if v, ok := os.LookupEnv(key); ok {
		return v
	}
	return fallback
}

func getEnvAsInt(key string, fallback int) int {
	v, ok := os.LookupEnv(key)
	if !ok || v == "" {
		return fallback
	}
	n, err := strconv.Atoi(v)
	if err != nil {
		return fallback
	}
	return n
}

func getEnvAsBool(key string, fallback bool) bool {
	v, ok := os.LookupEnv(key)
	if !ok || strings.TrimSpace(v) == "" {
		return fallback
	}
	v = strings.ToLower(strings.TrimSpace(v))
	return v == "1" || v == "true" || v == "yes" || v == "on"
}
