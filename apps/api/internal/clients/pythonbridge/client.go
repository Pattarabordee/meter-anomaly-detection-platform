package pythonbridge

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"time"

	"pea-ntl-api/internal/domain"
)

type Client struct {
	PythonExecutable string
	ScriptPath       string
	SpaceID          string
	APIName          string
	AuthToken        string
	UseAuth          bool
	TimeoutSeconds   int
}

type bridgeResponse struct {
	Backend        string                 `json:"backend"`
	BackendEventID string                 `json:"backend_event_id"`
	BackendAPIName string                 `json:"backend_api_name"`
	Summary        domain.JobSummary      `json:"summary"`
	Items          []domain.PredictionItem `json:"items"`
	DownloadCSV    string                 `json:"download_csv"`
}

func NewClient(pythonExecutable, scriptPath, spaceID, apiName, authToken string, useAuth bool, timeoutSeconds int) *Client {
	return &Client{PythonExecutable: pythonExecutable, ScriptPath: scriptPath, SpaceID: spaceID, APIName: apiName, AuthToken: authToken, UseAuth: useAuth, TimeoutSeconds: timeoutSeconds}
}

func (c *Client) PredictCSV(ctx context.Context, fileName string, data []byte) (*domain.JobResult, []byte, error) {
	tmpDir, err := os.MkdirTemp("", "pea-ntl-upload-*")
	if err != nil {
		return nil, nil, fmt.Errorf("failed to create temp dir: %w", err)
	}
	defer os.RemoveAll(tmpDir)
	inputPath := filepath.Join(tmpDir, sanitize(fileName))
	if err := os.WriteFile(inputPath, data, 0o600); err != nil {
		return nil, nil, fmt.Errorf("failed to write temp input file: %w", err)
	}
	ctx, cancel := context.WithTimeout(ctx, time.Duration(c.TimeoutSeconds)*time.Second)
	defer cancel()
	cmd := exec.CommandContext(ctx, c.PythonExecutable, c.ScriptPath)
	cmd.Env = append(os.Environ(),
		"HF_SPACE_ID="+c.SpaceID,
		"HF_API_NAME="+c.APIName,
		"HF_AUTH_TOKEN="+c.AuthToken,
		fmt.Sprintf("HF_USE_AUTH=%t", c.UseAuth),
		"INPUT_CSV_PATH="+inputPath,
	)
	out, err := cmd.CombinedOutput()
	if err != nil {
		return nil, nil, fmt.Errorf("python bridge failed: %w; output=%s", err, string(out))
	}
	var resp bridgeResponse
	if err := json.Unmarshal(out, &resp); err != nil {
		return nil, nil, fmt.Errorf("failed to decode python bridge response: %w; output=%s", err, string(out))
	}
	result := &domain.JobResult{Backend: resp.Backend, BackendEventID: resp.BackendEventID, BackendAPIName: resp.BackendAPIName, Summary: resp.Summary, Items: resp.Items}
	return result, []byte(resp.DownloadCSV), nil
}

func sanitize(name string) string {
	if name == "" {
		return "input.csv"
	}
	return filepath.Base(name)
}
