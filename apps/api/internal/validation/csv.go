package validation

import (
	"encoding/csv"
	"fmt"
	"io"
	"strconv"
	"strings"
)

func ParseAndValidateCSV(reader io.Reader) error {
	r := csv.NewReader(reader)
	r.TrimLeadingSpace = true

	header, err := r.Read()
	if err != nil {
		return fmt.Errorf("failed to read CSV header: %w", err)
	}
	if len(header) < 13 {
		return fmt.Errorf("expected at least 13 columns: meter_id + 12 months")
	}
	if strings.TrimSpace(strings.ToLower(header[0])) != "meter_id" {
		return fmt.Errorf("first column must be meter_id")
	}

	for {
		rec, err := r.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			return fmt.Errorf("failed to parse CSV row: %w", err)
		}
		if len(rec) != len(header) {
			return fmt.Errorf("row has %d columns, expected %d", len(rec), len(header))
		}
		for _, raw := range rec[1:] {
			if _, err := strconv.ParseFloat(strings.TrimSpace(raw), 64); err != nil {
				return fmt.Errorf("failed to parse numeric cell %q: %w", raw, err)
			}
		}
	}
	return nil
}
