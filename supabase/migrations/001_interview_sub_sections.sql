-- Migration: Add sub-section support to interview grading
-- Run this against your live Supabase database

-- 1. Add sub_section column to rubrics
ALTER TABLE rubrics ADD COLUMN sub_section INTEGER;

-- 2. Add sub_section column to interview_grades
ALTER TABLE interview_grades ADD COLUMN sub_section INTEGER NOT NULL DEFAULT 1 CHECK (sub_section IN (1, 2));

-- 3. Drop old unique constraint (assignment_id alone)
ALTER TABLE interview_grades DROP CONSTRAINT interview_grades_assignment_id_key;

-- 4. Add new unique constraint (assignment_id + sub_section)
ALTER TABLE interview_grades ADD CONSTRAINT interview_grades_assignment_subsection_unique UNIQUE (assignment_id, sub_section);
