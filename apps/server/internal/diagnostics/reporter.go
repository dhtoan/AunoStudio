package diagnostics

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"
)

// Sender limits keep diagnostic delivery independent of application health:
// bounded memory, short timeouts, backoff, and no reliance on the
// application database.
const (
	defaultQueueSize          = 256
	defaultSendsPerHour       = 120
	defaultSendTimeout        = 5 * time.Second
	defaultStartupSendTimeout = 2 * time.Second
	maxReportBodyBytes        = 64 << 10
	summaryTickInterval       = time.Minute
)

// Config is the complete diagnostics contract. Reporting is enabled by
// default and delivers to the official OpenPost receiver unless the
// operator overrides the receiver or disables reporting. The
// OPENPOST_DIAGNOSTICS_ENABLED=false environment value is a hard
// kill-switch that wins over every other setting.
type Config struct {
	// Enabled is the operator's opt-in. The OPENPOST_DIAGNOSTICS_ENABLED=false
	// environment value is a hard kill-switch that wins over every other
	// setting.
	Enabled bool
	// EnvDisabled is true when the environment explicitly disables reporting
	// (OPENPOST_DIAGNOSTICS_ENABLED=false). It wins over Enabled.
	EnvDisabled bool
	// ReceiverURL is the diagnostics receiver endpoint. It defaults to the
	// official OpenPost receiver; empty means disabled: reports are
	// validated and dropped, never sent.
	ReceiverURL string
	// InstallationIDFile persists the random installation ID without the
	// application database. Empty means the reporting decision is unknown
	// and nothing is sent.
	InstallationIDFile string
	Version            string
	Revision           string
	DBDriver           string
	StorageDriver      string
	// QueueSize bounds in-memory reports; SendsPerHour caps delivery.
	// Zero values select defaults.
	QueueSize    int
	SendsPerHour int
	HTTPClient   *http.Client
	Now          func() time.Time
}

// Status is the browser-safe surface: whether the browser may report
// through its own instance, plus the build it runs against. It carries no
// receiver URL, tokens, or installation identifiers. The type name is
// unique across the API so Huma schema registration cannot collide.
type Status struct {
	Enabled  bool   `json:"enabled"`
	Version  string `json:"version"`
	Revision string `json:"revision"`
}

// Reporter collects, deduplicates, and delivers diagnostic reports without
// blocking application work. The zero value is a disabled no-op reporter.
type Reporter struct {
	mu             sync.Mutex
	config         Config
	installationID string
	decided        bool
	dedupe         *Deduplicator
	queue          []Report
	sendCount      int
	windowStart    time.Time
	stop           chan struct{}
	stopped        chan struct{}
	client         *http.Client
	now            func() time.Time
}

// NewReporter resolves the reporting decision from env-level configuration
// only, so it can be constructed before the application database exists.
// When the decision cannot be established (no installation ID persistence),
// the reporter is disabled and Report is a no-op.
func NewReporter(config Config) *Reporter {
	now := config.Now
	if now == nil {
		now = time.Now
	}
	client := config.HTTPClient
	if client == nil {
		client = &http.Client{Timeout: defaultSendTimeout}
	}
	queueSize := config.QueueSize
	if queueSize <= 0 {
		queueSize = defaultQueueSize
	}
	reporter := &Reporter{
		config:      config,
		dedupe:      NewDeduplicator(),
		queue:       make([]Report, 0, queueSize),
		windowStart: now().UTC().Truncate(time.Hour),
		stop:        make(chan struct{}),
		stopped:     make(chan struct{}),
		client:      client,
		now:         now,
	}
	reporter.reconfigureLocked()
	go reporter.run()
	return reporter
}

// DisabledReporter returns a reporter that never sends. Use it when the
// diagnostics subsystem itself cannot be constructed.
func DisabledReporter() *Reporter {
	reporter := &Reporter{
		dedupe:  NewDeduplicator(),
		stop:    make(chan struct{}),
		stopped: make(chan struct{}),
		now:     time.Now,
		client:  &http.Client{Timeout: defaultSendTimeout},
	}
	close(reporter.stopped)
	return reporter
}

func (r *Reporter) reconfigureLocked() {
	if r.config.EnvDisabled {
		r.decided = false
		r.installationID = ""
		r.clearLocked()
		return
	}
	if !r.config.Enabled || strings.TrimSpace(r.config.ReceiverURL) == "" {
		r.decided = false
		r.installationID = ""
		r.clearLocked()
		return
	}
	id, err := LoadOrCreateInstallationID(r.config.InstallationIDFile)
	if err != nil {
		// The decision cannot be established without a persisted
		// installation ID (for example, before storage is available).
		// Do not send.
		r.decided = false
		r.installationID = ""
		r.clearLocked()
		return
	}
	r.decided = true
	r.installationID = id
}

// Enabled reports whether collection currently results in delivery.
func (r *Reporter) Enabled() bool {
	r.mu.Lock()
	defer r.mu.Unlock()
	return r.decided
}

// PublicConfig exposes the browser-safe reporting switch.
func (r *Reporter) PublicConfig() Status {
	r.mu.Lock()
	defer r.mu.Unlock()
	return Status{
		Enabled:  r.decided,
		Version:  r.config.Version,
		Revision: r.config.Revision,
	}
}

// SetEnabled flips the runtime switch (for a future instance-settings UI).
// The environment kill-switch always wins. Disabling clears pending reports.
func (r *Reporter) SetEnabled(enabled bool) {
	r.mu.Lock()
	defer r.mu.Unlock()
	if r.config.EnvDisabled {
		enabled = false
	}
	r.config.Enabled = enabled
	r.reconfigureLocked()
}

// Report collects one failure. It sanitizes, validates, deduplicates, and
// enqueues without blocking; a full queue drops the incoming report. It is
// safe to call when disabled.
func (r *Reporter) Report(report Report) {
	now := r.now().UTC()
	r.mu.Lock()
	if !r.decided {
		r.mu.Unlock()
		return
	}
	report.InstallationID = r.installationID
	report.Version = r.config.Version
	report.Revision = r.config.Revision
	if report.DBDriver == "" {
		report.DBDriver = r.config.DBDriver
	}
	if report.StorageDriver == "" {
		report.StorageDriver = r.config.StorageDriver
	}
	if report.FirstSeen.IsZero() {
		report.FirstSeen = now
	}
	if report.LastSeen.IsZero() || report.LastSeen.Before(report.FirstSeen) {
		report.LastSeen = now
	}
	SanitizeReport(&report)
	if err := ValidateReport(report); err != nil {
		r.mu.Unlock()
		log.Printf("diagnostics report rejected: %v", err)
		return
	}
	decision, deliverable := r.dedupe.Observe(report)
	if decision == DedupeAggregate {
		r.mu.Unlock()
		return
	}
	if cap(r.queue) > 0 && len(r.queue) >= cap(r.queue) {
		r.mu.Unlock()
		return
	}
	r.queue = append(r.queue, deliverable)
	r.mu.Unlock()
}

// ReportStartupFailureSync is the early reporting boundary for failures that
// happen before the application database exists (database initialization,
// migrations). It performs one best-effort synchronous POST with a short
// timeout and never panics, logs credentials, or blocks shutdown for long.
// SIGKILL and abrupt shutdowns cannot be caught, so delivery is best-effort.
func (r *Reporter) ReportStartupFailureSync(operation, errorCode string) {
	r.mu.Lock()
	decided := r.decided
	installationID := r.installationID
	config := r.config
	r.mu.Unlock()
	if !decided {
		return
	}
	report := Report{
		InstallationID: installationID,
		Version:        config.Version,
		Revision:       config.Revision,
		Surface:        SurfaceBackend,
		Operation:      operation,
		ErrorCode:      errorCode,
		DBDriver:       config.DBDriver,
		StorageDriver:  config.StorageDriver,
		FirstSeen:      r.now().UTC(),
		LastSeen:       r.now().UTC(),
	}
	SanitizeReport(&report)
	if err := ValidateReport(report); err != nil {
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), defaultStartupSendTimeout)
	defer cancel()
	_ = postReport(ctx, r.client, strings.TrimRight(config.ReceiverURL, "/"), report)
}

// Flush delivers pending reports synchronously with the normal per-report
// timeouts, stopping at the hourly cap or a ten-second budget. It exists so
// tests can assert delivery deterministically and shutdown can make a
// best-effort attempt; leftovers are dropped rather than retried.
func (r *Reporter) Flush() {
	r.sendPending(r.now().Add(10*time.Second), false)
}

// Close stops the background sender and drops pending reports.
func (r *Reporter) Close() error {
	r.mu.Lock()
	select {
	case <-r.stop:
		r.mu.Unlock()
		return nil
	default:
		close(r.stop)
	}
	r.mu.Unlock()
	<-r.stopped
	return nil
}

func (r *Reporter) clearLocked() {
	r.queue = r.queue[:0]
	if r.dedupe != nil {
		r.dedupe.Reset()
	}
}

func (r *Reporter) run() {
	defer close(r.stopped)
	ticker := time.NewTicker(summaryTickInterval)
	defer ticker.Stop()
	for {
		select {
		case <-r.stop:
			return
		case <-ticker.C:
			r.enqueueSummaries()
			r.flush()
		}
	}
}

func (r *Reporter) enqueueSummaries() {
	r.mu.Lock()
	if !r.decided {
		r.mu.Unlock()
		return
	}
	summaries := r.dedupe.PendingSummaries()
	for _, summary := range summaries {
		summary.InstallationID = r.installationID
		summary.Version = r.config.Version
		summary.Revision = r.config.Revision
		if err := ValidateReport(summary); err != nil {
			continue
		}
		if cap(r.queue) > 0 && len(r.queue) >= cap(r.queue) {
			break
		}
		r.queue = append(r.queue, summary)
	}
	r.mu.Unlock()
}

func (r *Reporter) flush() {
	r.sendPending(time.Time{}, true)
}

func (r *Reporter) sendPending(deadline time.Time, backoff bool) {
	for {
		next, receiver, ok := r.dequeueForSend(deadline)
		if !ok {
			return
		}
		ctx, cancel := context.WithTimeout(context.Background(), defaultSendTimeout)
		err := postReport(ctx, r.client, receiver, next)
		cancel()
		if err == nil {
			continue
		}
		log.Printf("diagnostics delivery failed: %v", err)
		if backoff && !r.waitForRetryBackoff() {
			return
		}
	}
}

func (r *Reporter) dequeueForSend(deadline time.Time) (Report, string, bool) {
	r.mu.Lock()
	defer r.mu.Unlock()
	if !r.decided || len(r.queue) == 0 {
		return Report{}, "", false
	}
	now := r.now().UTC()
	if now.Sub(r.windowStart) >= time.Hour {
		r.windowStart = now.Truncate(time.Hour)
		r.sendCount = 0
	}
	limit := r.config.SendsPerHour
	if limit <= 0 {
		limit = defaultSendsPerHour
	}
	if r.sendCount >= limit || (!deadline.IsZero() && now.After(deadline)) {
		return Report{}, "", false
	}
	next := r.queue[0]
	r.queue = r.queue[1:]
	r.sendCount++
	return next, strings.TrimRight(r.config.ReceiverURL, "/"), true
}

func (r *Reporter) waitForRetryBackoff() bool {
	timer := time.NewTimer(time.Second)
	defer timer.Stop()
	select {
	case <-r.stop:
		return false
	case <-timer.C:
		return true
	}
}

// postReport delivers one envelope to the OpenPost-owned diagnostics
// receiver. Only the diagnostic envelope crosses the boundary: never the
// browser's cookies, authorization headers, referrer, or client IP.
//
// Receiver contract (for the standalone ingestion service): accept
// POST {receiver}/v1/reports with a JSON diagnostics.Report body, validate
// every field against the same allowlist, enforce payload limits and global
// quotas, and forward accepted events to the dedicated PostHog diagnostics
// project. Treat all incoming reports as untrusted; the installation ID is
// a counting aid, not authentication.
func postReport(ctx context.Context, client *http.Client, receiver string, report Report) error {
	body, err := json.Marshal(report)
	if err != nil {
		return fmt.Errorf("encode diagnostics report: %w", err)
	}
	if len(body) > maxReportBodyBytes {
		return fmt.Errorf("diagnostics report exceeds %d bytes", maxReportBodyBytes)
	}
	request, err := http.NewRequestWithContext(ctx, http.MethodPost, receiver, bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("build diagnostics request: %w", err)
	}
	request.Header.Set("Content-Type", "application/json")
	response, err := client.Do(request)
	if err != nil {
		return fmt.Errorf("deliver diagnostics report: %w", err)
	}
	defer response.Body.Close()
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return fmt.Errorf("diagnostics receiver returned %d", response.StatusCode)
	}
	return nil
}

// DefaultInstallationIDFile returns the default state-file path for the
// installation ID, honoring OPENPOST_DIAGNOSTICS_STATE_FILE first.
func DefaultInstallationIDFile() string {
	if override := strings.TrimSpace(os.Getenv("OPENPOST_DIAGNOSTICS_STATE_FILE")); override != "" {
		return override
	}
	if dir, err := os.UserCacheDir(); err == nil && dir != "" {
		return dir + "/openpost/diagnostics-installation-id"
	}
	return "/var/lib/openpost/diagnostics-installation-id"
}
