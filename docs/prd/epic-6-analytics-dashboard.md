# Epic 6: Analytics Dashboard

## Epic Overview
**Epic ID:** ADMIN-006
**Epic Name:** Analytics Dashboard
**Priority:** Medium
**Estimated Effort:** 1 day
**Dependencies:** ADMIN-001 (Admin Panel Foundation)

## Description
Build a comprehensive analytics dashboard that provides business intelligence and usage insights through interactive charts, metrics, and reports. Includes user growth trends, conversion analytics, revenue analytics, feature adoption tracking, and exportable reports for stakeholders.

## Business Value
- **Data-Driven Decisions:** Business intelligence informs product roadmap and marketing strategy
- **Growth Tracking:** Monitor user acquisition, activation, and retention metrics
- **Usage Insights:** Identify popular features and conversion types to optimize resources
- **Revenue Visibility:** Track MRR growth, plan distribution, and revenue trends
- **Stakeholder Reporting:** Export polished reports for investors and executives

## User Personas
- **Admin/Management:** Needs high-level business metrics and growth trends
- **Product Manager:** Needs feature adoption and usage analytics
- **Finance:** Needs revenue analytics and plan distribution
- **Marketing:** Needs user acquisition and retention metrics

## Epic Goals
1. Dashboard shows key metrics: total users, active users, conversions, MRR
2. User growth charts track signups, retention, churn
3. Conversion analytics show type distribution, success rates, file sizes
4. Revenue analytics display MRR trends, plan distribution, LTV by plan
5. Feature adoption metrics track merge usage, format preferences
6. Export functionality generates CSV/PDF reports
7. Date range selector allows custom time period analysis

## Technical Scope

### Backend Components

1. **Analytics API Endpoints**
   - `GET /api/admin/analytics/overview` - Key metrics summary
   - `GET /api/admin/analytics/users` - User growth and retention metrics
   - `GET /api/admin/analytics/conversions` - Conversion usage analytics
   - `GET /api/admin/analytics/revenue` - Revenue trends and plan distribution
   - `GET /api/admin/analytics/features` - Feature adoption metrics
   - `GET /api/admin/analytics/export` - Generate CSV/PDF report
   - All endpoints support date range query params (from, to)

2. **Analytics Services**
   - User analytics service (growth, retention cohorts, churn)
   - Conversion analytics service (type distribution, success rate, file size analysis)
   - Revenue analytics service (MRR, ARR, plan distribution, LTV)
   - Feature adoption service (merge usage, format preferences)
   - Report generation service (CSV, PDF export)

3. **Data Aggregation**
   - Daily/monthly aggregates for performance
   - Retention cohort analysis
   - Time-series data for charts
   - Percentile calculations (file size distribution)

### Frontend Components

1. **Analytics Dashboard Page (`/app/admin/analytics/page.tsx`)**
   - Key metrics cards (total users, active users, conversions, MRR)
   - Date range selector (last 7 days, 30 days, 90 days, custom)
   - Tabbed interface: Overview | Users | Conversions | Revenue | Features
   - Export button (CSV/PDF)
   - Auto-refresh option

2. **Overview Tab**
   - Key metrics cards:
     - Total users (with % change vs previous period)
     - Active users (last 30 days)
     - Total conversions (with % change)
     - MRR (with % change)
   - User growth chart (signups over time)
   - Conversion volume chart (conversions per day)
   - Revenue trend chart (MRR over time)
   - Top conversion types (pie chart)

3. **Users Tab**
   - User growth chart (signups over time)
   - Active users chart (DAU/WAU/MAU)
   - Retention cohort table
   - Churn rate trend
   - User distribution by plan (pie chart)
   - Signup source breakdown (if tracked)

4. **Conversions Tab**
   - Conversion type distribution (pie chart: PDF→PPTX, DOCX, XLSX, PNG, Merge)
   - Conversion success rate trend (line chart)
   - File size distribution (histogram)
   - Peak usage hours (heatmap)
   - Average processing time trend
   - Failed conversion reasons (bar chart)

5. **Revenue Tab**
   - MRR trend chart (last 12 months)
   - Revenue by plan (pie chart: Free, Starter, Pro, Enterprise)
   - New subscriptions vs cancellations (line chart)
   - LTV by plan (bar chart)
   - Failed payment recovery rate
   - ARPU (Average Revenue Per User) trend

6. **Features Tab**
   - Feature usage table (merge, PDF→PPTX, PDF→DOCX, etc.) with counts
   - Feature adoption rate trend
   - Format preference distribution
   - Power user identification (top 10 users by conversions)
   - Feature combination analysis (users who merge + convert)

7. **Components**
   - AnalyticsDashboard component
   - KeyMetricsCard component
   - DateRangeSelector component
   - UserGrowthChart component
   - ConversionAnalyticsChart component
   - RevenueChart component
   - FeatureAdoptionTable component
   - ExportButton component

## Acceptance Criteria

### Overview Tab
- [ ] Key metrics cards display: total users, active users (30d), total conversions, MRR
- [ ] Each metric shows percentage change vs previous period (e.g., +12% vs last month)
- [ ] User growth chart shows signups over selected date range
- [ ] Conversion volume chart shows conversions per day
- [ ] Revenue trend chart shows MRR over time
- [ ] Top conversion types pie chart shows distribution
- [ ] All charts interactive (hover for details)

### Users Tab
- [ ] User growth chart (line chart, signups per day/week/month)
- [ ] Active users chart shows DAU/WAU/MAU trends
- [ ] Retention cohort table shows user retention by signup month
- [ ] Churn rate trend chart (monthly churn %)
- [ ] User distribution by plan (pie chart)
- [ ] Metrics update based on selected date range

### Conversions Tab
- [ ] Conversion type distribution pie chart (PDF→PPTX, DOCX, XLSX, PNG, Merge)
- [ ] Success rate trend line chart (% of successful conversions)
- [ ] File size distribution histogram (0-1MB, 1-10MB, 10-50MB, 50MB+)
- [ ] Peak usage hours heatmap (hour of day vs day of week)
- [ ] Average processing time trend (seconds)
- [ ] Failed conversion reasons bar chart (top 5 error types)

### Revenue Tab
- [ ] MRR trend chart (last 12 months, line chart)
- [ ] Revenue by plan pie chart ($ per plan)
- [ ] New subscriptions vs cancellations line chart
- [ ] LTV by plan bar chart
- [ ] Failed payment recovery rate (%)
- [ ] ARPU trend line chart

### Features Tab
- [ ] Feature usage table with counts (merge, PDF→PPTX, PDF→DOCX, etc.)
- [ ] Feature adoption rate trend (% of users who used feature)
- [ ] Format preference distribution (pie chart)
- [ ] Power users table (top 10 by conversions)
- [ ] Feature combination analysis (e.g., "40% of users who merge also convert to DOCX")

### Date Range Selector
- [ ] Preset options: Last 7 days, 30 days, 90 days, 12 months, All time
- [ ] Custom date range picker (from/to calendar)
- [ ] Selected range shown in UI
- [ ] All charts/metrics update when date range changes
- [ ] Date range persisted in URL query params

### Export Functionality
- [ ] "Export" button visible in toolbar
- [ ] Export format selector (CSV, PDF)
- [ ] CSV export includes all metrics and raw data
- [ ] PDF export includes charts as images and formatted tables
- [ ] Filename includes date range (analytics_2025-10-01_to_2025-10-31.csv)
- [ ] Download triggers automatically

### Performance & Quality
- [ ] Analytics dashboard loads within 3 seconds
- [ ] Charts render smoothly without lag
- [ ] Date range changes update within 1 second
- [ ] Large datasets (>100k conversions) aggregated efficiently
- [ ] All components TypeScript typed
- [ ] Charts responsive on tablet (768px+)
- [ ] Accessibility: keyboard navigation, screen reader support

## User Stories (Derived)

### Story 6.1: Analytics Overview Dashboard
**As an** admin
**I want** a high-level analytics overview
**So that** I can quickly assess business performance

**Tasks:**
- Create GET /api/admin/analytics/overview endpoint
- Calculate key metrics (total users, active users, conversions, MRR)
- Build AnalyticsDashboard component
- Create KeyMetricsCard component
- Add user growth, conversion volume, revenue charts

**Acceptance Criteria:**
- Overview shows: total users, active users, conversions, MRR
- Each metric shows % change vs previous period
- Charts: user growth, conversion volume, revenue trend
- Charts interactive (hover tooltips)
- Date range selector functional

---

### Story 6.2: User Growth Analytics
**As a** product manager
**I want** detailed user growth and retention analytics
**So that** I can optimize user acquisition and retention strategies

**Tasks:**
- Create GET /api/admin/analytics/users endpoint
- Calculate DAU/WAU/MAU metrics
- Generate retention cohort data
- Build UserGrowthChart component
- Add retention cohort table
- Calculate churn rate

**Acceptance Criteria:**
- User growth chart shows signups over time
- Active users chart shows DAU/WAU/MAU
- Retention cohort table shows % retained by month
- Churn rate trend chart displayed
- User distribution by plan shown

---

### Story 6.3: Conversion Analytics
**As a** product manager
**I want** conversion usage analytics
**So that** I can understand which features are most popular and optimize accordingly

**Tasks:**
- Create GET /api/admin/analytics/conversions endpoint
- Calculate conversion type distribution
- Calculate success rate trend
- Analyze file size distribution
- Build ConversionAnalyticsChart component
- Add peak usage heatmap

**Acceptance Criteria:**
- Conversion type distribution pie chart
- Success rate trend line chart
- File size distribution histogram
- Peak usage hours heatmap
- Average processing time trend
- Failed conversion reasons bar chart

---

### Story 6.4: Revenue Analytics
**As a** finance admin
**I want** detailed revenue analytics
**So that** I can track business growth and plan performance

**Tasks:**
- Create GET /api/admin/analytics/revenue endpoint
- Calculate MRR trend (last 12 months)
- Calculate revenue by plan
- Calculate LTV by plan
- Build RevenueChart component
- Add ARPU calculation

**Acceptance Criteria:**
- MRR trend chart (last 12 months)
- Revenue by plan pie chart
- New subscriptions vs cancellations chart
- LTV by plan bar chart
- Failed payment recovery rate shown
- ARPU trend chart

---

### Story 6.5: Feature Adoption Analytics
**As a** product manager
**I want** feature adoption metrics
**So that** I can prioritize feature development and marketing

**Tasks:**
- Create GET /api/admin/analytics/features endpoint
- Track feature usage (merge, formats)
- Calculate adoption rates
- Identify power users (top 10 by usage)
- Build FeatureAdoptionTable component
- Analyze feature combinations

**Acceptance Criteria:**
- Feature usage table with counts
- Adoption rate trend chart
- Format preference distribution
- Power users table (top 10)
- Feature combination analysis

---

### Story 6.6: Date Range Selector
**As an** admin
**I want** to filter analytics by date range
**So that** I can analyze specific time periods

**Tasks:**
- Build DateRangeSelector component
- Add preset options (7d, 30d, 90d, 12m, all)
- Add custom date picker
- Pass date range to all API calls
- Persist date range in URL

**Acceptance Criteria:**
- Presets: Last 7/30/90 days, 12 months, All time
- Custom date range picker functional
- Selected range visible in UI
- All charts update on date change
- Date range in URL query params

---

### Story 6.7: Export Analytics Report
**As an** admin
**I want** to export analytics data
**So that** I can share reports with stakeholders

**Tasks:**
- Create GET /api/admin/analytics/export endpoint
- Generate CSV with all metrics
- Generate PDF with charts and tables
- Build ExportButton component
- Add format selector (CSV/PDF)
- Stream large exports

**Acceptance Criteria:**
- Export button in toolbar
- Format selector (CSV/PDF)
- CSV includes all raw data
- PDF includes charts as images
- Filename includes date range
- Download automatic

---

### Story 6.8: Retention Cohort Analysis
**As a** product manager
**I want** retention cohort analysis
**So that** I can measure long-term user retention

**Tasks:**
- Calculate retention cohorts (by signup month)
- Build retention cohort table
- Calculate retention % for each cohort over time
- Add cohort visualization (heatmap)

**Acceptance Criteria:**
- Retention cohort table shows % retained
- Cohorts organized by signup month
- Retention % calculated for each subsequent month
- Color-coded heatmap (green=high retention, red=low)
- Exportable to CSV

---

### Story 6.9: Peak Usage Hours Heatmap
**As an** operations admin
**I want** to see peak usage hours
**So that** I can optimize infrastructure capacity

**Tasks:**
- Aggregate conversions by hour of day and day of week
- Build heatmap component
- Calculate intensity (conversions per hour)
- Add tooltips with exact counts

**Acceptance Criteria:**
- Heatmap shows hour (0-23) vs day of week (Mon-Sun)
- Color intensity represents conversion count
- Tooltips show exact count on hover
- Peak hours clearly visible
- Helps capacity planning

---

### Story 6.10: Power Users Identification
**As a** product manager
**I want** to identify power users
**So that** I can engage them for feedback and case studies

**Tasks:**
- Query top users by conversion count
- Build power users table
- Show user email, plan, conversion count, last active
- Add "View User" link to user management page

**Acceptance Criteria:**
- Power users table (top 10 by conversions)
- Shows: email, plan, conversion count, last active
- Sortable by conversion count
- "View User" link opens user detail
- Exportable to CSV

---

## Dependencies & Risks

### Dependencies
- **ADMIN-001:** Admin Panel Foundation (RBAC, auth, layout)

### Risks
| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Analytics queries slow with large dataset | Medium | Medium | Use aggregated tables, cache results, optimize queries with indexes |
| Chart rendering performance issues | Low | Low | Use efficient charting library (Recharts), limit data points, use sampling for large datasets |
| Inaccurate metrics calculations | Low | High | Write comprehensive unit tests, validate against manual calculations, peer review logic |
| Export timeouts for large datasets | Medium | Low | Stream large exports, limit export to current date range, paginate if needed |

---

## Success Metrics
- Analytics dashboard used 20+ times per week by management
- Exported reports delivered to stakeholders monthly
- Decision-making speed improved by 30% (data-informed vs gut feeling)
- User retention rate increased by 15% (informed by cohort analysis)
- Feature adoption tracking guides product roadmap prioritization

---

## Out of Scope (This Epic)
- Real-time analytics (daily aggregates sufficient for MVP)
- Advanced segmentation (custom filters, user segments)
- Predictive analytics (churn prediction, LTV forecasting)
- A/B testing analytics
- Multi-tenant analytics (per-customer dashboards)

---

## Technical Notes

### Analytics API Response Format
```typescript
// GET /api/admin/analytics/overview
{
  metrics: {
    total_users: { value: 5000, change_percent: 12.5 },
    active_users_30d: { value: 3200, change_percent: 8.3 },
    total_conversions: { value: 15000, change_percent: 22.1 },
    mrr: { value: 12500, change_percent: 15.7 }  // USD
  },
  charts: {
    user_growth: [
      { date: '2025-10-01', signups: 50 },
      { date: '2025-10-02', signups: 65 },
      ...
    ],
    conversion_volume: [
      { date: '2025-10-01', conversions: 120 },
      ...
    ],
    revenue_trend: [
      { month: '2025-01', mrr: 8500 },
      { month: '2025-02', mrr: 9200 },
      ...
    ]
  },
  conversion_types: [
    { type: 'pdf-to-pptx', count: 6000, percentage: 40 },
    { type: 'pdf-to-docx', count: 4500, percentage: 30 },
    { type: 'pdf-to-xlsx', count: 2250, percentage: 15 },
    { type: 'pdf-to-png', count: 1500, percentage: 10 },
    { type: 'merge', count: 750, percentage: 5 }
  ]
}
```

### Retention Cohort Calculation
```typescript
// Cohort retention example
// Month 0 = signup month, Month 1 = 1 month later, etc.
const cohort = {
  signup_month: '2025-01',
  cohort_size: 100,
  retention: {
    month_0: 100,  // 100%
    month_1: 75,   // 75%
    month_2: 60,   // 60%
    month_3: 50,   // 50%
    ...
  }
};
```

### Chart Library Recommendation
- **Recharts:** Composable, React-friendly, good for most chart types
- **Chart.js + react-chartjs-2:** More chart types, good performance
- **Victory:** Fully featured, animatable, accessibility support

**Recommendation: Recharts** for consistency with React ecosystem and ease of customization.

---

**Epic Owner:** Sarah (Product Owner)
**Created:** 2025-11-01
**Status:** Ready for Development
