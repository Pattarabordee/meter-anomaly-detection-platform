package mock

import (
	"context"
	"encoding/csv"
	"fmt"
	"io"
	"math"
	"strconv"
	"strings"

	"pea-ntl-api/internal/domain"
)

type Client struct{}

func NewClient() *Client { return &Client{} }

func (m *Client) PredictCSV(ctx context.Context, fileName string, data []byte) (*domain.JobResult, []byte, error) {
	r := csv.NewReader(strings.NewReader(string(data)))
	header, err := r.Read()
	if err != nil {
		return nil, nil, fmt.Errorf("failed to read CSV header: %w", err)
	}
	outRows := [][]string{append(header, "prediction", "model_score", "risk_level", "top_reasons")}
	items := []domain.PredictionItem{}
	for {
		rec, err := r.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			return nil, nil, fmt.Errorf("failed to read CSV row: %w", err)
		}
		vals := make([]float64, 0, len(rec)-1)
		for _, raw := range rec[1:] {
			v, err := strconv.ParseFloat(strings.TrimSpace(raw), 64)
			if err != nil {
				return nil, nil, err
			}
			vals = append(vals, v)
		}
		score, risk, reasons := scoreRow(vals)
		prediction := "normal"
		if score >= 0.65 {
			prediction = "abnormal"
		}
		item := domain.PredictionItem{MeterID: rec[0], Prediction: prediction, ModelScore: score, RiskLevel: risk, TopReasons: reasons}
		items = append(items, item)
		outRows = append(outRows, append(rec, item.Prediction, fmt.Sprintf("%.4f", item.ModelScore), item.RiskLevel, strings.Join(item.TopReasons, "|")))
	}
	summary := domain.JobSummary{RowsTotal: len(items)}
	for _, item := range items {
		if item.Prediction == "abnormal" {
			summary.PredictedAbnormal++
		}
		switch item.RiskLevel {
		case "high":
			summary.HighRisk++
		case "medium":
			summary.MediumRisk++
		case "low":
			summary.LowRisk++
		}
	}
	var sb strings.Builder
	cw := csv.NewWriter(&sb)
	for _, row := range outRows {
		_ = cw.Write(row)
	}
	cw.Flush()
	return &domain.JobResult{Backend: "mock", Summary: summary, Items: items}, []byte(sb.String()), nil
}

func scoreRow(values []float64) (float64, string, []string) {
	avg := mean(values)
	std := stddev(values)
	cv := 0.0
	if avg > 0 {
		cv = std / avg
	}
	last := values[len(values)-1]
	firstHalf := mean(values[:len(values)/2])
	secondHalf := mean(values[len(values)/2:])
	reasons := []string{}
	score := 0.15
	if avg < 70 {
		score += 0.28
		reasons = append(reasons, "low_average_usage")
	}
	if cv > 0.55 {
		score += 0.22
		reasons = append(reasons, "high_variability")
	}
	if firstHalf > 0 && secondHalf/firstHalf < 0.55 {
		score += 0.26
		reasons = append(reasons, "usage_drop_pattern")
	}
	if last < avg*0.45 {
		score += 0.19
		reasons = append(reasons, "recent_month_drop")
	}
	if len(reasons) == 0 {
		reasons = append(reasons, "stable_usage_profile")
	}
	if score > 0.98 {
		score = 0.98
	}
	risk := "low"
	if score >= 0.80 {
		risk = "high"
	} else if score >= 0.65 {
		risk = "medium"
	}
	return score, risk, reasons
}

func mean(values []float64) float64 {
	if len(values) == 0 {
		return 0
	}
	total := 0.0
	for _, v := range values {
		total += v
	}
	return total / float64(len(values))
}

func stddev(values []float64) float64 {
	if len(values) == 0 {
		return 0
	}
	m := mean(values)
	total := 0.0
	for _, v := range values {
		d := v - m
		total += d * d
	}
	return math.Sqrt(total / float64(len(values)))
}
