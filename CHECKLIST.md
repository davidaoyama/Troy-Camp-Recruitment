# TC Deliberations - Implementation Checklist

## Phase 1: Setup & Foundation

- [x] Write complete SQL schema file (all tables, constraints, indexes)
- [x] Run schema SQL against Supabase
- [x] Create Supabase Storage bucket for applicant photos
- [x] Install Supabase JS client and set up `lib/supabase.ts`
- [x] Configure environment variables (semester, app URL)

## Phase 2: Application Submission

### 2.1 Shared Types & Validation
- [x] Install Zod (`npm i zod`) — v4.3.6
- [x] Create `lib/types.ts` — TypeScript interfaces (`ApplicationFormData`, `WrittenQuestion`, `ApplicationRow`, `WrittenResponseRow`, `SubmitApplicationResult`)
- [x] Create `lib/validations.ts` — Zod schema for the application form (all field rules from PLAN.md §1.1)

### 2.2 Written Questions Config
- [x] Create `lib/questions.ts` — array of 5 question objects (`{ number, text }`) used by both form and DB insert

### 2.3 Anonymous ID Generation
- [x] Create `lib/generate-anonymous-id.ts` — race-condition-safe ID generation using `supabaseAdmin` (query max `anonymous_id` for semester, return next `"TC 0XX"`)

### 2.4 Server Action — Submit Application
- [x] Create `app/apply/actions.ts` — `submitApplication` server action:
  - Validate with Zod
  - Generate anonymous ID
  - Upload photo to Supabase Storage (`{semester}/{anonymous_id}.{ext}`)
  - Insert row into `applications` table
  - Insert 5 rows into `written_responses` table
  - Return `{ success, anonymousId }` or `{ success: false, error }`

### 2.5 Application Form UI
- [x] Create `app/apply/page.tsx` — public form page (Smart Container: state, submission handler)
- [x] Build form sections: Personal Info, Demographics, Written Responses (with char counters)
- [x] Add photo upload with client-side preview + file type/size validation
- [x] Wire form submission to server action, handle `loading` / `error` / `success` states

### 2.6 Success Confirmation Page
- [x] Create `app/apply/success/page.tsx` — displays anonymous ID from URL search params, "save this for your records" message

### 2.7 Integration Test
- [ ] Test full flow end-to-end: fill form → submit → verify row in Supabase → confirm redirect to success page

## Phase 3: Admin Dashboard

### 3.0 Authentication (prerequisite)
- [x] Add new types to `lib/types.ts` — `UserRow`, `CreateUserInput`, `WrittenGradeRow`, `InterviewAssignmentRow`, `RubricRow`, `DashboardStats`, `ActionResult`
- [x] Browser-side Supabase client (`lib/supabase-browser.ts`) — already existed
- [x] Create auth helpers (`lib/auth.ts`) — `getUser()`, `requireAdmin()`, `requireAuth()`
- [x] Create login page (`app/login/page.tsx`) + server action (`app/login/actions.ts`) — username/password via Supabase Auth with `username@internal.app` email pattern
- [x] Create middleware (`middleware.ts`) — protects `/admin/*` and `/grader/*` routes, checks admin role

### 3.1 Admin Dashboard
- [x] Build admin layout with sidebar (`app/admin/layout.tsx`, `app/admin/components/AdminSidebar.tsx`)
- [x] Build dashboard overview page (`app/admin/page.tsx`) — stats cards, grading progress bars
- [x] Implement user management (`app/admin/users/page.tsx`, `app/admin/users/actions.ts`) — create/delete grader & admin accounts via Supabase Auth admin API
- [x] Build applicant list view (`app/admin/applicants/page.tsx`, `app/admin/applicants/ApplicantTable.tsx`) — sortable table with status filter tabs
- [x] Implement written grading auto-assignment (`app/admin/assignments/written/actions.ts`, `app/admin/assignments/written/page.tsx`) — balanced round-robin algorithm (3 graders per app), batch insert, clear ungraded
- [x] Build interview grading manual assignment UI (`app/admin/assignments/interview/actions.ts`, `app/admin/assignments/interview/page.tsx`) — per-row grader dropdowns for Section 1 & 2
- [ ] Create rubric management interface (actions written, UI in progress)

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
