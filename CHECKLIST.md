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
- [x] Create `app/apply/success/page.tsx` — thank you message (no anonymous ID shown to applicants)

### 2.7 Integration Test
- [x] Test full flow end-to-end: fill form → submit → verify row in Supabase → confirm redirect to success page

### 2.8 Misc
- [x] Home page with Apply Now + Staff Login buttons
- [x] Styled back links on apply and login pages
- [x] Updated root layout metadata
- [x] `next.config.ts` — `serverActions.bodySizeLimit: "6mb"` for photo uploads
- [x] Seed script (`scripts/seed-users.ts`) for creating test accounts

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
- [x] Create rubric management interface
  - [x] Server actions (`getRubrics`, `saveRubric`, `deleteRubric`) in `app/admin/rubrics/actions.ts`
  - [x] Build `app/admin/rubrics/page.tsx` — grouped tables (Written / Interview S1 / Interview S2), create/edit modal, delete with confirmation
  - [x] Verify edge cases (empty state, missing section for interview, duplicate Q#)

## Phase 4: Grader Portal - Written

### 4.0 Layout & Navigation
- [x] Create grader layout (`app/grader/layout.tsx`) with `requireAuth()` + sidebar
- [x] Create `GraderSidebar` component (nav links, logout)
- [x] Create grader root page (`app/grader/page.tsx`) — redirect to `/grader/written`

### 4.1 Server Actions
- [x] Create `app/grader/written/actions.ts` — `getGraderAssignments()`, `getGradingData()`, `saveGrade()`, `submitAllGrades()`

### 4.2 Written Dashboard
- [x] Build `/grader/written/page.tsx` — assigned applications card grid with progress indicators

### 4.3 Grading Interface
- [x] Build `/grader/written/[applicationId]/page.tsx` — question display, score radio buttons, rubric modal, save draft, submit all

## Phase 5: Grader Portal - Interview

- [x] Update DB schema — `interview_grades` (per-assignment score) + `interview_notes` (per-question notes)
- [x] Add `InterviewGradeRow` and `InterviewNoteRow` types to `lib/types.ts`
- [x] Create server actions (`app/grader/interview/actions.ts`) — `getInterviewAssignments`, `getInterviewGradingData`, `saveInterviewNote`, `saveInterviewScore`, `submitAllInterviewGrades`
- [x] Build interview assignments dashboard (`app/grader/interview/page.tsx`)
- [x] Create interview grading interface (`app/grader/interview/[assignmentId]/page.tsx`) — section score, per-question notes with 50-char validation, rubric modal
- [x] Update `GraderSidebar` with Interview Grading nav link

## Phase 6: Score Calculation

- [ ] Implement written score aggregation
- [ ] Implement interview score aggregation
- [ ] Build total score calculation
- [ ] Create auto-categorization logic (top/middle/bottom 25%)
- [ ] Add score recalculation endpoint

## Phase 7: Deliberations Mode

### 7.0 Types & Sidebar Nav
- [x] Add deliberation types to `lib/types.ts` (`DeliberationApplicant`, `WrittenResponseDetail`, `InterviewSectionDetail`, `DeliberationDetail`)
- [x] Add "Deliberations" link to `AdminSidebar.tsx`

### 7.1 Server Actions
- [x] Create `app/admin/deliberations/actions.ts` — `getDeliberationApplicants()`, `getApplicantDetail()`, `recordDecision()`

### 7.2 Dumb Components
- [x] Create `DeliberationsSidebar.tsx` — filter tabs (All / Auto-Accept / Discuss / Auto-Reject) + scrollable applicant list
- [x] Create `ApplicantCard.tsx` — photo + demographics (2-col) + score summary box
- [x] Create `WrittenResponsesAccordion.tsx` — expandable per-question written responses with grader scores
- [x] Create `InterviewGradesAccordion.tsx` — expandable per-section interview grades with grader scores + notes
- [x] Create `DecisionButtons.tsx` — YES/NO buttons with loading + already-decided states

### 7.3 Smart Container (Page)
- [x] Create `app/admin/deliberations/page.tsx` — wires all components, manages state, prev/next navigation, auto-advance after decision

## Phase 8: Data Export & Polish

### 8.1 Types & Nav
- [x] Add `ExportApplicantRow`, `SemesterBackup`, `StatusOverview` types to `lib/types.ts`
- [x] Add "Export Data" link to `AdminSidebar.tsx`

### 8.2 Server Actions
- [x] Create `app/admin/export/actions.ts` — `exportAllCSV()`, `exportAcceptedCSV()`, `exportBackupJSON()`

### 8.3 Export Page UI
- [x] Create `app/admin/export/page.tsx` — export buttons with loading states, client-side file download

### 8.4 Dashboard Enhancement
- [x] Enhance `app/admin/page.tsx` — add status breakdown cards (auto_accept, discuss, auto_reject, accepted, rejected counts)

### 8.5 Polish & Deploy
- [x] Loading/error state audit across app — added `error.tsx` + `loading.tsx` boundaries for admin & grader
- [ ] Deploy to Vercel
