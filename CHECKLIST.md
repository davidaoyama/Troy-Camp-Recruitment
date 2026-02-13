# TC Deliberations - Implementation Checklist

## Phase 1: Setup & Foundation

- [ ] Write complete SQL schema file (all tables, constraints, indexes)
- [ ] Run schema SQL against Supabase
- [ ] Create Supabase Storage bucket for applicant photos
- [ ] Install Supabase JS client and set up `lib/supabase.ts`
- [ ] Configure environment variables (semester, app URL)

## Phase 2: Application Submission

- [ ] Build public application form (`/apply`)
- [ ] Implement photo upload to Supabase Storage
- [ ] Create anonymous ID generation logic
- [ ] Build form validation with Zod
- [ ] Create success confirmation page
- [ ] Test full submission flow

## Phase 3: Admin Dashboard

- [ ] Build admin dashboard layout
- [ ] Create applicant list view
- [ ] Implement written grading auto-assignment algorithm
- [ ] Build interview grading manual assignment UI
- [ ] Create rubric management interface

## Phase 4: Grader Portal - Written

- [ ] Build grader dashboard (assigned apps list)
- [ ] Create written grading interface
- [ ] Implement rubric display (modal/accordion)
- [ ] Add save draft functionality
- [ ] Implement submit all grades logic

## Phase 5: Grader Portal - Interview

- [ ] Build interview assignments dashboard
- [ ] Create interview grading interface
- [ ] Add notes text area with validation
- [ ] Implement score submission

## Phase 6: Score Calculation

- [ ] Implement written score aggregation
- [ ] Implement interview score aggregation
- [ ] Build total score calculation
- [ ] Create auto-categorization logic (top/middle/bottom 25%)
- [ ] Add score recalculation endpoint

## Phase 7: Deliberations Mode

- [ ] Build deliberations layout (sidebar + main)
- [ ] Implement sidebar filtering (all/accept/discuss/reject)
- [ ] Create applicant card with photo + demographics
- [ ] Build written responses accordion
- [ ] Build interview grades accordion
- [ ] Implement navigation (prev/next + sidebar click)
- [ ] Add decision recording (YES/NO buttons)

## Phase 8: Data Export & Polish

- [ ] Implement CSV export
- [ ] Add PDF export (optional)
- [ ] Create database backup functionality
- [ ] Build admin status overview dashboard
- [ ] Add loading states and error handling
- [ ] Deploy to Vercel
