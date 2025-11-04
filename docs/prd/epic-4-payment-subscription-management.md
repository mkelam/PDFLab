# Epic 4: Payment & Subscription Management

## Epic Overview
**Epic ID:** ADMIN-004
**Epic Name:** Payment & Subscription Management
**Priority:** High
**Estimated Effort:** 1.5 days
**Dependencies:** ADMIN-001 (Admin Panel Foundation)

## Description
Build a comprehensive payment and subscription management interface for finance and admin teams to view, manage, and troubleshoot PayFast subscriptions, payment transactions, refunds, and billing issues. Includes revenue analytics, failed payment recovery, manual plan changes, and subscription lifecycle management.

## Business Value
- **Revenue Operations:** Finance team can manage subscriptions without developer intervention
- **Customer Retention:** Quick resolution of payment issues reduces involuntary churn by 30%
- **Financial Visibility:** Real-time MRR, churn, and LTV tracking improves business intelligence
- **Compliance:** Complete payment audit trail supports financial audits and tax reporting
- **Fraud Prevention:** Payment log review helps identify suspicious activity

## User Personas
- **Finance Team:** Needs to view revenue, process refunds, manage subscriptions, resolve payment failures
- **Admin:** Needs overview of payment health and subscription status
- **Support:** Needs to assist users with billing questions and payment issues
- **Super Admin:** Full payment management including manual adjustments

## Epic Goals
1. Finance team can view all subscriptions with status, billing dates, and payment history
2. Failed payments visible with retry mechanisms
3. Manual plan changes and cancellations supported
4. PayFast ITN (Instant Transaction Notification) logs accessible for debugging
5. Revenue analytics dashboard shows MRR, churn rate, LTV
6. Refund processing with audit trail

## Technical Scope

### Backend Components

1. **Admin Payment API Endpoints**
   - `GET /api/admin/payments/subscriptions` - List all subscriptions with filters
   - `GET /api/admin/payments/subscriptions/:id` - Get subscription details
   - `PUT /api/admin/payments/subscriptions/:id` - Update subscription (plan change)
   - `POST /api/admin/payments/subscriptions/:id/cancel` - Cancel subscription
   - `POST /api/admin/payments/subscriptions/:id/pause` - Pause subscription
   - `POST /api/admin/payments/subscriptions/:id/resume` - Resume subscription
   - `GET /api/admin/payments/transactions` - List all payment transactions
   - `GET /api/admin/payments/transactions/:id` - Get transaction details
   - `POST /api/admin/payments/refund` - Process refund
   - `GET /api/admin/payments/itn-logs` - View PayFast ITN webhook logs
   - `GET /api/admin/payments/analytics` - Revenue analytics (MRR, churn, LTV)
   - `POST /api/admin/payments/retry-failed` - Retry failed payment
   - `POST /api/admin/payments/manual-adjustment` - Manual credit/debit

2. **Payment Management Services**
   - Subscription filtering service (status, plan, billing date)
   - Payment log aggregation and search
   - Refund processing service (PayFast API integration)
   - Revenue calculation service (MRR, ARR, churn rate, LTV)
   - Failed payment retry service
   - ITN log viewer service

3. **Revenue Analytics**
   - MRR (Monthly Recurring Revenue) calculation
   - Churn rate tracking (cancelled/total active)
   - LTV (Lifetime Value) by plan
   - Failed payment recovery rate
   - Revenue trends (daily, monthly)

### Frontend Components

1. **Subscriptions List Page (`/app/admin/payments/page.tsx`)**
   - Data table with subscription details
   - Status badges (active, cancelled, expired, paused)
   - Advanced filters (status, plan, billing date)
   - Search by user email, subscription ID, PayFast token
   - Pagination and sorting
   - Quick actions (view details, cancel, pause, resume)
   - Bulk export to CSV

2. **Subscription Detail Modal**
   - Subscription metadata (plan, amount, currency, billing cycle)
   - User information
   - Payment history table
   - Next billing date and amount
   - PayFast token and merchant reference
   - ITN logs for this subscription
   - Admin actions (change plan, cancel, pause, resume, refund)

3. **Payment Transactions Page**
   - Transaction log table (all payments)
   - Filter by status (success, failed, pending, refunded)
   - Filter by date range, user, amount
   - Transaction detail view (PayFast data, ITN response)
   - Refund interface
   - Retry failed payments

4. **Revenue Analytics Dashboard Widget**
   - Key metrics cards:
     - MRR (Monthly Recurring Revenue)
     - Active subscriptions count
     - Churn rate (%)
     - Failed payments (pending retry)
   - Charts:
     - MRR trend (last 12 months)
     - Revenue by plan (pie chart)
     - New subscriptions vs cancellations
     - Failed payment recovery rate
   - Export reports (CSV, PDF)

5. **ITN Logs Viewer**
   - Raw PayFast webhook data table
   - Filter by transaction ID, status, date
   - JSON pretty-print for debugging
   - Search functionality
   - Failed ITN retry mechanism

6. **Components**
   - SubscriptionsTable component
   - SubscriptionDetailModal component
   - PaymentTransactionsTable component
   - RevenueAnalyticsWidget component
   - RefundDialog component
   - ITNLogViewer component
   - PlanChangeDialog component

## Acceptance Criteria

### Subscriptions List
- [ ] Subscriptions table displays: user email, plan, status, amount (USD), billing date, next billing, actions
- [ ] Search by user email, subscription ID, PayFast token
- [ ] Filter by status (active, cancelled, expired, paused, all)
- [ ] Filter by plan (free, starter, pro, enterprise, all)
- [ ] Filter by billing date range
- [ ] Status badges color-coded (active=green, cancelled=red, expired=gray, paused=yellow)
- [ ] Pagination supports 10/25/50/100 per page
- [ ] Sortable columns (status, plan, amount, billing date)

### Subscription Management
- [ ] Clicking subscription opens detail modal
- [ ] Modal shows: plan, amount, currency (USD), billing cycle, next billing date, status
- [ ] Payment history table shows all transactions for subscription
- [ ] "Change Plan" button opens plan selection dialog
- [ ] "Cancel Subscription" button cancels via PayFast API with confirmation
- [ ] "Pause Subscription" button pauses billing (if supported by PayFast)
- [ ] "Resume Subscription" button resumes billing
- [ ] All actions logged to admin_audit_logs

### Payment Transactions
- [ ] Transactions table displays: transaction ID, user, amount, status, payment method, date
- [ ] Filter by status (success, failed, pending, refunded)
- [ ] Filter by date range
- [ ] Search by transaction ID, user email
- [ ] Failed payments highlighted in red
- [ ] "Retry" button available for failed payments
- [ ] "Refund" button processes refund with confirmation
- [ ] Transaction detail shows full PayFast ITN data (JSON)

### Refund Processing
- [ ] "Refund" button opens refund dialog
- [ ] Dialog shows: transaction amount, refund amount (editable for partial refund), reason (required)
- [ ] Confirmation shows refund details before processing
- [ ] Refund sent to PayFast API
- [ ] Success/error notification displayed
- [ ] Refund logged in payment_logs table
- [ ] Action logged to admin_audit_logs

### Revenue Analytics
- [ ] MRR calculated correctly (sum of active monthly subscriptions)
- [ ] Active subscriptions count accurate
- [ ] Churn rate calculated: (cancelled this month / active start of month) * 100
- [ ] LTV by plan calculated: (average revenue per user / churn rate)
- [ ] MRR trend chart shows last 12 months
- [ ] Revenue by plan pie chart shows distribution
- [ ] New subscriptions vs cancellations line chart
- [ ] Failed payment recovery rate tracked
- [ ] Export to CSV button downloads analytics data

### ITN Logs Viewer
- [ ] ITN logs table displays: transaction ID, status, date, user, amount
- [ ] Raw JSON data viewable (pretty-printed)
- [ ] Search by transaction ID
- [ ] Filter by status (success, failed)
- [ ] Filter by date range
- [ ] Failed ITNs highlighted for investigation
- [ ] Pagination for large datasets

### Performance & Quality
- [ ] Subscriptions list loads within 1 second for ≤50,000 subscriptions
- [ ] Revenue analytics calculated within 2 seconds
- [ ] Refund processing completes within 5 seconds
- [ ] No N+1 queries (eager load user data)
- [ ] All components TypeScript typed
- [ ] Currency displayed correctly as USD with $ symbol
- [ ] Responsive design works on tablet (768px+)

## User Stories (Derived)

### Story 4.1: Subscriptions List with Filtering
**As a** finance team member
**I want** to view all subscriptions with filtering options
**So that** I can monitor active subscriptions and billing status

**Tasks:**
- Create GET /api/admin/payments/subscriptions endpoint
- Build SubscriptionsTable component
- Add status, plan, billing date filters
- Implement search functionality
- Add pagination and sorting

**Acceptance Criteria:**
- Table shows: user, plan, status, amount (USD), billing date, next billing
- Filters: status, plan, date range
- Search by email, subscription ID, PayFast token
- Status badges color-coded
- Sortable columns

---

### Story 4.2: Subscription Detail with Payment History
**As a** finance team member
**I want** detailed subscription information and payment history
**So that** I can assist users with billing questions

**Tasks:**
- Create GET /api/admin/payments/subscriptions/:id endpoint
- Build SubscriptionDetailModal component
- Fetch payment history for subscription
- Display PayFast metadata
- Show next billing date and amount

**Acceptance Criteria:**
- Modal shows: plan, amount, currency, cycle, billing dates, status
- Payment history table with all transactions
- PayFast token and merchant reference visible
- Next billing date calculated correctly
- ITN logs accessible from modal

---

### Story 4.3: Manual Plan Change
**As a** finance admin
**I want** to manually change a user's subscription plan
**So that** I can accommodate special requests and retain customers

**Tasks:**
- Create PUT /api/admin/payments/subscriptions/:id endpoint
- Build PlanChangeDialog component
- Update subscription in PayFast
- Update database (plan, amount, billing cycle)
- Calculate prorated refund/charge (if applicable)
- Log action to audit trail

**Acceptance Criteria:**
- "Change Plan" button opens plan selection dialog
- Dialog shows current plan and available plans
- Proration calculation shown (if mid-cycle change)
- Confirmation before processing
- Success toast notification
- Action logged to admin_audit_logs

---

### Story 4.4: Cancel Subscription
**As a** finance admin
**I want** to cancel user subscriptions
**So that** I can process cancellation requests and stop billing

**Tasks:**
- Create POST /api/admin/payments/subscriptions/:id/cancel endpoint
- Cancel subscription via PayFast API
- Update database (status = cancelled, ended_at timestamp)
- Handle immediate vs end-of-cycle cancellation
- Add "Cancel Subscription" button
- Log action to audit trail

**Acceptance Criteria:**
- "Cancel Subscription" button in subscription detail
- Confirmation dialog with cancellation date (immediate vs end of cycle)
- PayFast cancellation request sent
- Database updated with status and ended_at
- Success/error notification
- Action logged to admin_audit_logs

---

### Story 4.5: Payment Transactions Log
**As a** finance team member
**I want** to view all payment transactions
**So that** I can reconcile payments and investigate issues

**Tasks:**
- Create GET /api/admin/payments/transactions endpoint
- Build PaymentTransactionsTable component
- Add status, date, amount filters
- Show PayFast transaction data
- Add transaction detail view

**Acceptance Criteria:**
- Table shows: transaction ID, user, amount (USD), status, payment method, date
- Filter by status, date range, user
- Search by transaction ID
- Failed payments highlighted
- Transaction detail shows full PayFast JSON data

---

### Story 4.6: Process Refunds
**As a** finance admin
**I want** to process full and partial refunds
**So that** I can handle customer disputes and cancellations

**Tasks:**
- Create POST /api/admin/payments/refund endpoint
- Integrate with PayFast refund API
- Build RefundDialog component
- Support full and partial refunds
- Add refund reason tracking
- Log refunds to payment_logs

**Acceptance Criteria:**
- "Refund" button on transaction detail
- Dialog shows transaction amount and refund amount (editable)
- Reason field required
- Confirmation before processing
- PayFast refund API called
- Refund logged in payment_logs and admin_audit_logs
- Success/error notification

---

### Story 4.7: Revenue Analytics Dashboard
**As a** finance admin
**I want** real-time revenue analytics
**So that** I can track business performance and growth

**Tasks:**
- Create GET /api/admin/payments/analytics endpoint
- Calculate MRR, churn rate, LTV
- Build RevenueAnalyticsWidget component
- Add MRR trend chart (last 12 months)
- Add revenue by plan pie chart
- Add new subscriptions vs cancellations chart
- Export to CSV functionality

**Acceptance Criteria:**
- MRR calculated: sum of active monthly subscriptions
- Churn rate: (cancelled / active) * 100
- LTV by plan shown
- MRR trend chart (line chart, last 12 months)
- Revenue by plan (pie chart)
- Export button downloads CSV with all metrics
- Metrics update daily

---

### Story 4.8: Failed Payment Retry
**As a** finance admin
**I want** to retry failed payments
**So that** I can recover revenue from temporary payment failures

**Tasks:**
- Create POST /api/admin/payments/retry-failed endpoint
- Retry payment via PayFast API
- Update payment_logs with retry attempt
- Add "Retry" button to failed transactions
- Log retry actions

**Acceptance Criteria:**
- "Retry" button visible for failed payments
- Retry sends new payment request to PayFast
- Payment_logs updated with retry status
- Success/error notification
- Action logged to admin_audit_logs
- Failed payment recovery rate tracked

---

### Story 4.9: ITN Logs Viewer for Debugging
**As a** developer/support admin
**I want** to view raw PayFast ITN webhook data
**So that** I can debug payment integration issues

**Tasks:**
- Create GET /api/admin/payments/itn-logs endpoint
- Build ITNLogViewer component
- Display JSON data pretty-printed
- Add search and filter functionality
- Highlight failed ITNs

**Acceptance Criteria:**
- ITN logs table shows: transaction ID, status, date, user, amount
- Raw JSON data viewable (formatted)
- Search by transaction ID
- Filter by status and date range
- Failed ITNs highlighted in red
- Pagination for large datasets

---

### Story 4.10: Subscription Pause/Resume
**As a** finance admin
**I want** to pause and resume subscriptions
**So that** I can accommodate user requests for temporary billing stops

**Tasks:**
- Create POST /api/admin/payments/subscriptions/:id/pause endpoint
- Create POST /api/admin/payments/subscriptions/:id/resume endpoint
- Update subscription status (paused)
- Pause billing via PayFast (if supported)
- Add "Pause" and "Resume" buttons

**Acceptance Criteria:**
- "Pause Subscription" button pauses billing
- "Resume Subscription" button restarts billing
- Status updated to "paused" / "active"
- Confirmation dialog before pause/resume
- Success/error notification
- Actions logged to admin_audit_logs

---

## Dependencies & Risks

### Dependencies
- **ADMIN-001:** Admin Panel Foundation (RBAC, auth, layout)
- **PayFast API:** Subscription management endpoints must be available

### Risks
| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| PayFast API rate limits on refunds | Low | Medium | Implement retry queue with backoff, monitor API usage |
| Incorrect MRR calculation | Medium | High | Write comprehensive unit tests, validate against PayFast reports |
| Refund reversal issues | Low | High | Log all refunds, implement reversal tracking, manual review process |
| Currency conversion errors (USD) | Low | Medium | Use fixed USD currency, validate all amounts in cents to avoid rounding errors |

---

## Success Metrics
- 100% of refunds processed within 5 seconds
- Failed payment recovery rate increases by 20%
- MRR calculation accuracy: 100% match with PayFast reports
- Finance team resolves billing issues 60% faster
- Zero unauthorized refunds (RBAC enforcement)

---

## Out of Scope (This Epic)
- Automated failed payment retry (future enhancement)
- Multi-currency support (PDFLab uses USD only)
- Tax calculation and reporting
- Dunning management (automated email sequences for failed payments)
- Coupon and discount code management

---

## Technical Notes

### MRR Calculation
```typescript
// Monthly Recurring Revenue
const activeSubs = await Subscription.findAll({
  where: { status: 'active' }
});

const mrr = activeSubs.reduce((sum, sub) => {
  // Convert annual to monthly if needed
  const monthlyAmount = sub.billing_cycle === 'annual'
    ? sub.amount / 12
    : sub.amount;
  return sum + monthlyAmount;
}, 0);
```

### Churn Rate Calculation
```typescript
// Churn Rate = (Cancelled this month / Active start of month) * 100
const startOfMonth = new Date(year, month, 1);
const endOfMonth = new Date(year, month + 1, 0);

const activeStart = await Subscription.count({
  where: { status: 'active', created_at: { [Op.lt]: startOfMonth } }
});

const cancelledThisMonth = await Subscription.count({
  where: {
    status: 'cancelled',
    ended_at: { [Op.between]: [startOfMonth, endOfMonth] }
  }
});

const churnRate = (cancelledThisMonth / activeStart) * 100;
```

### Refund API Call (Example)
```typescript
// PayFast refund endpoint (hypothetical - check PayFast docs)
const refundResponse = await axios.post(
  'https://api.payfast.co.za/refunds',
  {
    merchant_id: process.env.PAYFAST_MERCHANT_ID,
    merchant_key: process.env.PAYFAST_MERCHANT_KEY,
    transaction_id: transaction.payfast_payment_id,
    amount: refundAmount,  // in cents
    reason: refundReason
  },
  { headers: { 'Authorization': `Bearer ${apiToken}` } }
);
```

---

**Epic Owner:** Sarah (Product Owner)
**Created:** 2025-11-01
**Status:** Ready for Development
