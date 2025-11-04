# Epic 3: Conversion Job Monitoring

## Epic Overview
**Epic ID:** ADMIN-003
**Epic Name:** Conversion Job Monitoring
**Priority:** High
**Estimated Effort:** 1.5 days
**Dependencies:** ADMIN-001 (Admin Panel Foundation)

## Description
Build a real-time conversion job monitoring interface that allows admin and support teams to view, filter, retry, cancel, and troubleshoot all PDF conversion jobs across the platform. This includes job status tracking, error diagnosis, queue health monitoring, and manual intervention capabilities.

## Business Value
- **Operational Visibility:** Real-time insight into platform health and conversion pipeline
- **Faster Issue Resolution:** Support can diagnose and fix failed conversions immediately
- **Proactive Monitoring:** Identify bottlenecks and errors before users report issues
- **System Reliability:** Manual retry/cancel capabilities prevent queue blocking
- **Customer Satisfaction:** Faster resolution of conversion issues improves user experience

## User Personas
- **Support Team:** Needs to view user-reported failed conversions, retry jobs, download files for verification
- **Operations/DevOps:** Needs to monitor queue health, identify bottlenecks, manage stuck jobs
- **Admin:** Needs overview of system conversion throughput and success rates
- **Super Admin:** Full job management including deletion and queue manipulation

## Epic Goals
1. Admins can view all conversion jobs with real-time status updates
2. Support can filter jobs by status, type, user, and date range
3. Failed jobs show detailed error logs for troubleshooting
4. Admins can manually retry, cancel, or delete jobs
5. Queue health metrics visible (pending count, processing rate, delays)
6. Bulk operations available for common tasks (retry all failed, delete old completed)

## Technical Scope

### Backend Components

1. **Admin Conversion Job API Endpoints**
   - `GET /api/admin/conversions` - List all conversion jobs with filters and pagination
   - `GET /api/admin/conversions/:id` - Get detailed job information
   - `POST /api/admin/conversions/:id/retry` - Manually retry failed job
   - `POST /api/admin/conversions/:id/cancel` - Cancel pending/processing job
   - `DELETE /api/admin/conversions/:id` - Delete job and associated files
   - `POST /api/admin/conversions/bulk-retry` - Retry multiple failed jobs
   - `POST /api/admin/conversions/bulk-delete` - Delete multiple jobs
   - `GET /api/admin/conversions/stats` - Get conversion statistics
   - `GET /api/admin/queue/status` - Get Bull queue health metrics
   - `POST /api/admin/queue/clean` - Clean old completed/failed jobs from queue

2. **Job Management Services**
   - Job filtering service (status, type, user, date range, error type)
   - Job retry logic (re-queue with CloudConvert)
   - Job cancellation service (abort CloudConvert job, update DB)
   - Queue monitoring service (Bull queue metrics)
   - Job cleanup service (delete old files, database records)

3. **Real-time Updates**
   - WebSocket connection for live job status updates (optional)
   - Polling mechanism for auto-refresh (fallback)
   - Server-Sent Events (SSE) for job progress (alternative)

### Frontend Components

1. **Conversion Jobs List Page (`/app/admin/conversions/page.tsx`)**
   - Data table with real-time status updates
   - Status badges (pending, processing, completed, failed)
   - Progress indicators for in-progress jobs
   - Advanced filters (status, type, user, date range)
   - Search by job ID, file name, user email
   - Pagination and sorting
   - Auto-refresh toggle (on/off, interval selection)
   - Bulk actions (retry, delete, export CSV)

2. **Job Detail Modal**
   - Job metadata (ID, user, type, status, progress, timestamps)
   - File information (name, size, input/output formats)
   - CloudConvert job ID and external status
   - Full error stack trace (if failed)
   - Job timeline (uploaded → queued → processing → completed/failed)
   - File preview/download links
   - Admin actions (retry, cancel, delete, download logs)

3. **Queue Health Dashboard (Widget or Section)**
   - Queue metrics cards:
     - Pending jobs count
     - Processing jobs count
     - Completed today count
     - Failed today count
     - Average processing time
     - Queue delay estimate
   - Real-time charts (jobs per hour, success rate)
   - Worker status (active workers, idle workers)
   - Manual operations (clean queue, restart workers)

4. **Components**
   - ConversionJobsTable component
   - JobDetailModal component
   - JobStatusBadge component (color-coded)
   - JobProgressBar component
   - JobErrorDisplay component
   - JobFilters component
   - QueueHealthWidget component
   - BulkJobActions component

## Acceptance Criteria

### Job List & Search
- [ ] Job list displays: job ID, user email, file name, type, status, progress, created date, actions
- [ ] Search box searches by job ID, file name, user email
- [ ] Search results update within 500ms
- [ ] Pagination supports 10/25/50/100 jobs per page
- [ ] Table columns sortable (status, type, created date)
- [ ] Status badges color-coded (green=completed, yellow=processing, red=failed, gray=pending)
- [ ] Progress bar visible for processing jobs (0-100%)
- [ ] Auto-refresh toggle updates table every 5/10/30 seconds

### Advanced Filtering
- [ ] Filter by status (all, pending, processing, completed, failed)
- [ ] Filter by conversion type (pdf-to-pptx, pdf-to-docx, pdf-to-xlsx, pdf-to-png, merge)
- [ ] Filter by date range (created date)
- [ ] Filter by user (email or ID)
- [ ] Filter by error type (timeout, quota exceeded, file too large, CloudConvert error)
- [ ] Active filters shown as removable chips
- [ ] "Clear All Filters" button resets view
- [ ] Filter state persisted in URL query params

### Job Detail View
- [ ] Clicking job row opens detail modal
- [ ] Modal shows: job ID, user, file name, type, status, progress, created/updated timestamps
- [ ] CloudConvert job ID displayed (with link to CloudConvert dashboard if available)
- [ ] For failed jobs: full error message and stack trace visible
- [ ] Job timeline shows stages: Upload → Queued → Processing → Complete/Failed
- [ ] Input file downloadable (if still available)
- [ ] Output file downloadable (if completed successfully)
- [ ] Estimated time remaining shown for processing jobs

### Job Actions
- [ ] "Retry" button re-queues failed job (creates new CloudConvert job)
- [ ] "Cancel" button aborts pending/processing job
- [ ] "Delete" button removes job and associated files with confirmation
- [ ] "Download Logs" exports job metadata and error logs as JSON
- [ ] All actions require confirmation for destructive operations
- [ ] Success/error toast notifications for all actions
- [ ] Actions logged to admin_audit_logs

### Real-time Updates
- [ ] Auto-refresh toggle visible in toolbar
- [ ] Refresh interval selectable (5s, 10s, 30s, off)
- [ ] Job status updates without full page reload
- [ ] Progress bars animate smoothly
- [ ] New jobs appear at top of list automatically (if auto-refresh enabled)
- [ ] Toast notification for significant events (job completed, job failed)

### Queue Health Monitoring
- [ ] Queue health widget shows: pending count, processing count, completed today, failed today
- [ ] Average processing time calculated and displayed
- [ ] Queue delay estimate shown (based on current queue size and processing rate)
- [ ] Worker status visible (active/idle workers)
- [ ] "Clean Queue" button removes old completed/failed jobs (>7 days) with confirmation
- [ ] Charts show jobs per hour and success rate trends (last 24 hours)

### Bulk Operations
- [ ] Checkbox selection on table rows
- [ ] "Select All" checkbox selects all on current page
- [ ] Bulk actions: Retry Failed, Delete Selected, Export CSV
- [ ] Bulk retry re-queues all selected failed jobs
- [ ] Bulk delete confirms with count of jobs to delete
- [ ] Bulk actions disabled if no jobs selected
- [ ] Progress indicator for bulk operations (if processing >10 jobs)

### Performance & Quality
- [ ] Job list loads within 1 second for ≤100,000 jobs
- [ ] Search responds within 500ms
- [ ] Auto-refresh does not cause UI jank or flickering
- [ ] No N+1 queries (eager load user data)
- [ ] All components TypeScript typed
- [ ] Responsive design works on tablet (768px+)
- [ ] Accessibility: keyboard navigation, screen reader support

## User Stories (Derived)

### Story 3.1: Conversion Jobs List with Real-time Status
**As a** support agent
**I want** to view all conversion jobs with real-time status updates
**So that** I can monitor platform health and respond to user issues quickly

**Tasks:**
- Create GET /api/admin/conversions endpoint with pagination
- Build ConversionJobsTable component
- Add status badges with color coding
- Implement progress bars for processing jobs
- Add auto-refresh mechanism (polling every 10s)

**Acceptance Criteria:**
- Table shows: job ID, user, file name, type, status, progress, created date
- Status badges color-coded (completed=green, processing=yellow, failed=red, pending=gray)
- Progress bars visible for processing jobs
- Auto-refresh updates table every 10 seconds (configurable)
- Loading state shown during refresh

---

### Story 3.2: Job Search & Filtering
**As a** support agent
**I want** to filter jobs by status, type, user, and date
**So that** I can quickly find specific jobs for troubleshooting

**Tasks:**
- Add filter query params to API endpoint
- Build JobFilters component
- Implement status, type, user, date range filters
- Show active filters as chips
- Persist filters in URL

**Acceptance Criteria:**
- Filters: status, type, date range, user email
- Filters combine with AND logic
- Active filters shown as removable chips
- Search box searches job ID, file name, user email
- "Clear All" resets filters

---

### Story 3.3: Job Detail Modal with Error Logs
**As a** support agent
**I want** detailed job information including error logs
**So that** I can diagnose and fix failed conversions

**Tasks:**
- Create GET /api/admin/conversions/:id endpoint
- Build JobDetailModal component
- Display job metadata and file information
- Show full error logs for failed jobs
- Add job timeline visualization
- Add file download links

**Acceptance Criteria:**
- Modal shows: job ID, user, file, type, status, progress, timestamps
- For failed jobs: full error message and stack trace visible
- Job timeline shows: Upload → Queued → Processing → Complete/Failed
- Input/output files downloadable
- CloudConvert job ID shown with link

---

### Story 3.4: Manual Job Retry
**As a** support agent
**I want** to manually retry failed conversion jobs
**So that** I can resolve transient errors without user intervention

**Tasks:**
- Create POST /api/admin/conversions/:id/retry endpoint
- Re-queue job in Bull with new CloudConvert task
- Update job status and reset error fields
- Add "Retry" button to job detail modal
- Log retry action to audit trail

**Acceptance Criteria:**
- "Retry" button visible for failed jobs
- Retry creates new CloudConvert job
- Job status updated to "pending"
- Success toast notification shown
- Action logged to admin_audit_logs

---

### Story 3.5: Cancel Pending/Processing Jobs
**As an** admin
**I want** to cancel stuck or unnecessary jobs
**So that** I can free up queue resources and prevent billing for unwanted conversions

**Tasks:**
- Create POST /api/admin/conversions/:id/cancel endpoint
- Abort CloudConvert job via API
- Update job status to "cancelled"
- Remove from Bull queue
- Add "Cancel" button to job detail modal

**Acceptance Criteria:**
- "Cancel" button visible for pending/processing jobs
- CloudConvert job aborted successfully
- Job status updated to "cancelled"
- Confirmation dialog before cancellation
- Action logged to admin_audit_logs

---

### Story 3.6: Queue Health Monitoring
**As an** operations admin
**I want** to monitor queue health metrics
**So that** I can proactively identify bottlenecks and system issues

**Tasks:**
- Create GET /api/admin/queue/status endpoint
- Fetch Bull queue metrics (pending, processing, completed, failed counts)
- Build QueueHealthWidget component
- Calculate average processing time
- Estimate queue delay
- Add charts for jobs per hour and success rate

**Acceptance Criteria:**
- Widget shows: pending, processing, completed today, failed today counts
- Average processing time calculated
- Queue delay estimate displayed
- Worker status visible (active/idle)
- Charts show last 24 hours trends
- Metrics update every 30 seconds

---

### Story 3.7: Bulk Job Retry
**As an** admin
**I want** to retry multiple failed jobs at once
**So that** I can recover from system-wide outages efficiently

**Tasks:**
- Create POST /api/admin/conversions/bulk-retry endpoint
- Add checkbox selection to job table
- Build BulkJobActions component
- Show confirmation with affected job count
- Process retries in background (if >10 jobs)

**Acceptance Criteria:**
- Multi-select checkboxes on table rows
- "Bulk Retry" button enabled when ≥1 failed job selected
- Confirmation shows count of jobs to retry
- Progress indicator for large batches
- Success toast shows number of jobs retried

---

### Story 3.8: Clean Old Completed Jobs
**As an** admin
**I want** to delete old completed jobs from the queue
**So that** I can maintain database performance and free up storage

**Tasks:**
- Create POST /api/admin/queue/clean endpoint
- Delete jobs older than 7 days (completed or failed)
- Delete associated files from storage
- Add "Clean Queue" button to queue health widget
- Show confirmation with count of jobs to delete

**Acceptance Criteria:**
- "Clean Queue" button visible in queue health section
- Confirmation shows count of jobs to be deleted
- Jobs older than 7 days (completed/failed) removed
- Associated files deleted from storage
- Success toast shows number of jobs cleaned
- Action logged to admin_audit_logs

---

### Story 3.9: Download Job Logs
**As a** developer/support
**I want** to download job metadata and error logs
**So that** I can perform offline analysis and debugging

**Tasks:**
- Create GET /api/admin/conversions/:id/logs endpoint
- Export job data as JSON (metadata, error logs, CloudConvert response)
- Add "Download Logs" button to job detail modal
- Generate filename with job ID and timestamp

**Acceptance Criteria:**
- "Download Logs" button in job detail modal
- JSON file includes: job metadata, error logs, CloudConvert job data, timestamps
- Filename format: `job-{id}-logs-{timestamp}.json`
- Download triggers automatically
- Works for all job statuses (completed, failed, processing)

---

### Story 3.10: Auto-refresh Toggle
**As an** admin
**I want** to control auto-refresh interval
**So that** I can balance real-time updates with system performance

**Tasks:**
- Add auto-refresh toggle to toolbar
- Implement interval selector (5s, 10s, 30s, off)
- Store preference in localStorage
- Show last refresh timestamp
- Pause auto-refresh when modal open (avoid data race)

**Acceptance Criteria:**
- Toggle switch visible in toolbar
- Interval selectable: 5s, 10s, 30s, off
- Default: 10s
- Preference persisted in localStorage
- Last refresh timestamp shown
- Auto-refresh pauses when detail modal open

---

## Dependencies & Risks

### Dependencies
- **ADMIN-001:** Admin Panel Foundation (RBAC, auth, layout)

### Risks
| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Auto-refresh causes performance issues | Medium | Medium | Implement efficient polling, debounce requests, use WebSockets for production |
| CloudConvert API rate limits on retry | Low | Medium | Implement retry queue with backoff, monitor API quota usage |
| Large job lists slow to render | Medium | Low | Use virtualization for >100 rows, optimize queries with indexes |
| Bulk operations timeout | Low | Medium | Process in background job for >10 items, show progress indicator |

---

## Success Metrics
- 95% of failed conversions resolved via admin retry within 5 minutes
- Queue health dashboard reduces system downtime by 50%
- Support team resolves conversion issues 70% faster
- Zero stuck jobs blocking queue for >1 hour
- Admin job monitoring used 50+ times per day

---

## Out of Scope (This Epic)
- User-facing job status notifications (email/SMS)
- Advanced CloudConvert error classification/auto-retry
- Historical job analytics and trends (covered in ADMIN-006)
- Conversion quality scoring
- Job priority management

---

## Technical Notes

### API Response Format
```typescript
// GET /api/admin/conversions
{
  jobs: [
    {
      id: string,
      user_id: string,
      user_email: string,
      type: 'pdf-to-pptx' | 'pdf-to-docx' | 'pdf-to-xlsx' | 'pdf-to-png' | 'merge',
      status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled',
      progress: number,  // 0-100
      file_name: string,
      file_size: number,
      input_file: string,
      output_file: string | null,
      cloudconvert_job_id: string | null,
      error_message: string | null,
      estimated_time: number | null,  // seconds
      created_at: string,
      updated_at: string,
      expires_at: string
    }
  ],
  pagination: { page, limit, total, totalPages },
  stats: {
    pending: number,
    processing: number,
    completed_today: number,
    failed_today: number,
    avg_processing_time: number  // seconds
  }
}
```

### Bull Queue Health Metrics
```typescript
interface QueueHealth {
  waiting: number,
  active: number,
  completed: number,
  failed: number,
  delayed: number,
  paused: boolean,
  workers: {
    active: number,
    idle: number
  },
  processing_rate: number,  // jobs per minute
  avg_completion_time: number  // seconds
}
```

---

**Epic Owner:** Sarah (Product Owner)
**Created:** 2025-11-01
**Status:** Ready for Development
