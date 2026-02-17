# TC Deliberations

Internal recruitment management system for Troy Camp (TC), a student-run organization at USC. Streamlines the Transfer Counselor selection process from application intake through grading, deliberation, and final decisions.

## What It Does

- **Public Application Portal** — Applicants submit personal info, a photo, and five written responses (250-word max each) via a public form. They receive an anonymous TC applicant number.
- **Admin Dashboard** — Admins manage grader accounts, assign written and interview grading, configure rubrics, view applicant details, and export data.
- **Grader Portals** — Graders score written responses (1-5 per question, 3 graders per applicant) and interview sections (score + per-question notes) through dedicated interfaces. Applicant identities are hidden from graders.
- **Score Calculation** — Aggregates written and interview scores, auto-categorizes applicants into accept/discuss/reject tiers.
- **Deliberations Mode** — Admins review applicants one-by-one with full written responses, interview notes, scores, and demographics visible. YES/NO decisions with auto-advance.
- **Data Export** — CSV exports (all applicants or accepted-only) and full JSON backup.

## Tech Stack

- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS 4
- Supabase (Postgres + Auth + Storage)
- Zod 4

## Getting Started

```bash
npm install
npm run dev
```

Requires a `.env.local` with Supabase credentials and `NEXT_PUBLIC_CURRENT_SEMESTER`.
