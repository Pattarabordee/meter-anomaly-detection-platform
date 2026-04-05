package domain

import "time"

type JobStatus string

const (
	JobPending   JobStatus = "PENDING"
	JobRunning   JobStatus = "RUNNING"
	JobSucceeded JobStatus = "SUCCEEDED"
	JobFailed    JobStatus = "FAILED"
)

type PredictionItem struct {
	MeterID    string   `json:"meter_id"`
	Prediction string   `json:"prediction"`
	ModelScore float64  `json:"model_score"`
	RiskLevel  string   `json:"risk_level"`
	TopReasons []string `json:"top_reasons"`
}

type JobSummary struct {
	RowsTotal         int `json:"rows_total"`
	PredictedAbnormal int `json:"predicted_abnormal"`
	HighRisk          int `json:"high_risk"`
	MediumRisk        int `json:"medium_risk"`
	LowRisk           int `json:"low_risk"`
}

type JobResult struct {
	JobID          string           `json:"job_id"`
	Backend        string           `json:"backend,omitempty"`
	BackendEventID string           `json:"backend_event_id,omitempty"`
	BackendAPIName string           `json:"backend_api_name,omitempty"`
	Summary        JobSummary       `json:"summary"`
	Items          []PredictionItem `json:"items"`
}

type Job struct {
	ID            string     `json:"job_id"`
	Status        JobStatus  `json:"status"`
	Message       string     `json:"message"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
	Result        *JobResult `json:"-"`
	DownloadBytes []byte     `json:"-"`
	OriginalName  string     `json:"original_name"`
}
