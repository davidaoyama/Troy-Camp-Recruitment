# Interview Grading System: 2 Rounds x 2 Sub-Sections

## Implementation Checklist

- [ ] **Step 1: Database Migration** — Add `sub_section` to `rubrics` and `interview_grades`, update constraints, update `supabase/schema.sql`
- [ ] **Step 2: Type Updates** — Update `lib/types.ts` (RubricRow, InterviewGradeRow, InterviewSectionDetail, UserInterviewAssignment)
- [ ] **Step 3: Rubric Admin** — Update `app/admin/rubrics/actions.ts` + `page.tsx` (sub-section param, form dropdown, grouping)
- [ ] **Step 4: Grader Interview Actions** — Update `app/grader/interview/actions.ts` (sub-section in queries, `saveInterviewScore`, `submitAllInterviewGrades`, scoreCount)
- [ ] **Step 5: Grader Interview Grading Page** — Update `app/grader/interview/[assignmentId]/page.tsx` (two score widgets, Round labels, dual score state, submit validation)
- [ ] **Step 6: Grader Interview Dashboard** — Update `app/grader/interview/page.tsx` ("Round X" labels, "X/2 scored" badges)
- [ ] **Step 7: Admin Interview Assignment Page** — Update `app/admin/assignments/interview/page.tsx` (label changes: "Section" → "Round")
- [ ] **Step 8: Deliberations** — Update `app/admin/deliberations/actions.ts` + `components/InterviewGradesAccordion.tsx` (fetch sub_section, build subScores, display)
- [ ] **Step 9: User Detail View** — Update `app/admin/users/actions.ts` + `[id]/UserProfile.tsx` (return scores[] per assignment, display 2 scores per card)
- [ ] **Step 10: Export Actions** — Update `app/admin/export/actions.ts` (4 interview avg columns: R1-Sub1, R1-Sub2, R2-Sub1, R2-Sub2)
