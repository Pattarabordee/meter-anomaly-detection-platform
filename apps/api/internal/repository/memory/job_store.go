package memory

import (
	"errors"
	"sync"
	"time"

	"pea-ntl-api/internal/domain"
)

var ErrJobNotFound = errors.New("job not found")

type JobStore struct {
	mu   sync.RWMutex
	jobs map[string]*domain.Job
}

func NewJobStore() *JobStore {
	return &JobStore{jobs: map[string]*domain.Job{}}
}

func (s *JobStore) Save(job *domain.Job) {
	s.mu.Lock()
	defer s.mu.Unlock()
	job.UpdatedAt = time.Now()
	s.jobs[job.ID] = job
}

func (s *JobStore) Get(jobID string) (*domain.Job, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	job, ok := s.jobs[jobID]
	if !ok {
		return nil, ErrJobNotFound
	}
	return job, nil
}
