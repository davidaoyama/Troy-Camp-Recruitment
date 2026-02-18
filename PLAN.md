# Analytics/Demographics Page

## Implementation Checklist

- [ ] **Step 1: Install Recharts** — `npm install recharts`
- [ ] **Step 2: Server Action** — Create `app/admin/analytics/actions.ts` with `getAnalyticsData(semester)` that queries applications and aggregates all breakdowns
- [ ] **Step 3: Dumb Components** — Create `BarChartCard`, `PieChartCard`, and `StatCard` in `app/admin/analytics/components/`
- [ ] **Step 4: Analytics Page** — Create `app/admin/analytics/page.tsx` (client component, semester filter, grid layout of charts)
- [ ] **Step 5: Sidebar Nav** — Add "Analytics" link to `AdminSidebar.tsx`
- [ ] **Step 6: Verification** — Edge cases (empty data, null scores, fragmented text fields), accessibility, controlled inputs
