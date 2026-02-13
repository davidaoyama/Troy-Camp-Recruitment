-- TC Deliberations - Database Schema
-- Run this in the Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS TABLE (Admin & Grader accounts)
-- Linked to Supabase Auth via id = auth.users.id
-- ============================================
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'grader')),
  full_name TEXT NOT NULL,
  tc_name TEXT NOT NULL,          -- Counselor name (e.g. "TC David")
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- APPLICATIONS TABLE (Applicant submissions)
-- ============================================
CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  anonymous_id TEXT UNIQUE NOT NULL,  -- "TC 001", "TC 002", etc.
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  photo_url TEXT NOT NULL,
  major TEXT NOT NULL,
  graduation_year INTEGER NOT NULL CHECK (graduation_year BETWEEN 2025 AND 2030),
  gender TEXT NOT NULL,
  spanish_fluent BOOLEAN NOT NULL,
  can_attend_camp BOOLEAN NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'auto_accept', 'auto_reject', 'discuss', 'accepted', 'rejected')),
  total_score DECIMAL(4,2),           -- Calculated field, 0.00-5.00
  semester TEXT NOT NULL,             -- e.g. "Spring 2026"
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- WRITTEN RESPONSES TABLE (5 per application)
-- ============================================
CREATE TABLE written_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  question_number INTEGER NOT NULL CHECK (question_number BETWEEN 1 AND 5),
  question_text TEXT NOT NULL,
  response_text TEXT NOT NULL,
  UNIQUE (application_id, question_number)
);

-- ============================================
-- WRITTEN GRADES TABLE (3 graders x 5 questions = 15 per application)
-- ============================================
CREATE TABLE written_grades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  grader_id UUID NOT NULL REFERENCES users(id),
  question_number INTEGER NOT NULL CHECK (question_number BETWEEN 1 AND 5),
  score INTEGER CHECK (score BETWEEN 1 AND 5),  -- NULL = not yet graded
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (application_id, grader_id, question_number)
);

-- ============================================
-- INTERVIEW ASSIGNMENTS TABLE (who grades which section)
-- ============================================
CREATE TABLE interview_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  grader_id UUID NOT NULL REFERENCES users(id),
  section INTEGER NOT NULL CHECK (section IN (1, 2)),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (application_id, grader_id, section)
);

-- ============================================
-- INTERVIEW GRADES TABLE (2 graders x 2 sections = 4 per application)
-- ============================================
CREATE TABLE interview_grades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  grader_id UUID NOT NULL REFERENCES users(id),
  section INTEGER NOT NULL CHECK (section IN (1, 2)),
  score INTEGER NOT NULL CHECK (score BETWEEN 1 AND 5),
  notes TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (application_id, grader_id, section)
);

-- ============================================
-- RUBRICS TABLE (question text + scoring guides)
-- ============================================
CREATE TABLE rubrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_number INTEGER NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('written', 'interview')),
  question_text TEXT NOT NULL,
  rubric_content TEXT,        -- Scoring guide text or image URL
  section INTEGER,            -- NULL for written, 1 or 2 for interview
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- DELIBERATION DECISIONS TABLE (accept/reject log)
-- ============================================
CREATE TABLE deliberation_decisions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  decision TEXT NOT NULL CHECK (decision IN ('accept', 'reject')),
  decided_by UUID NOT NULL REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES (performance)
-- ============================================
CREATE INDEX idx_applications_semester ON applications(semester);
CREATE INDEX idx_applications_status ON applications(status);
CREATE INDEX idx_applications_anonymous_id ON applications(anonymous_id);
CREATE INDEX idx_written_responses_app ON written_responses(application_id);
CREATE INDEX idx_written_grades_app ON written_grades(application_id);
CREATE INDEX idx_written_grades_grader ON written_grades(grader_id);
CREATE INDEX idx_interview_grades_app ON interview_grades(application_id);
CREATE INDEX idx_interview_grades_grader ON interview_grades(grader_id);
CREATE INDEX idx_interview_assignments_app ON interview_assignments(application_id);
CREATE INDEX idx_interview_assignments_grader ON interview_assignments(grader_id);
CREATE INDEX idx_deliberation_decisions_app ON deliberation_decisions(application_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS) Policies
-- ============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE written_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE written_grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE rubrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliberation_decisions ENABLE ROW LEVEL SECURITY;

-- Applications: anyone can insert (public form), authenticated users can read
CREATE POLICY "Anyone can submit applications"
  ON applications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authenticated users can read applications"
  ON applications FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can update applications"
  ON applications FOR UPDATE
  TO authenticated
  USING (true);

-- Written responses: inserted with application, readable by authenticated
CREATE POLICY "Anyone can submit written responses"
  ON written_responses FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authenticated users can read written responses"
  ON written_responses FOR SELECT
  TO authenticated
  USING (true);

-- Written grades: authenticated users can manage
CREATE POLICY "Authenticated users can manage written grades"
  ON written_grades FOR ALL
  TO authenticated
  USING (true);

-- Interview assignments: authenticated users can manage
CREATE POLICY "Authenticated users can manage interview assignments"
  ON interview_assignments FOR ALL
  TO authenticated
  USING (true);

-- Interview grades: authenticated users can manage
CREATE POLICY "Authenticated users can manage interview grades"
  ON interview_grades FOR ALL
  TO authenticated
  USING (true);

-- Rubrics: readable by authenticated, writable by authenticated (admin check in app layer)
CREATE POLICY "Authenticated users can read rubrics"
  ON rubrics FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage rubrics"
  ON rubrics FOR ALL
  TO authenticated
  USING (true);

-- Users: authenticated users can read, manage own profile
CREATE POLICY "Authenticated users can read all users"
  ON users FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage users"
  ON users FOR ALL
  TO authenticated
  USING (true);

-- Deliberation decisions: authenticated users can manage
CREATE POLICY "Authenticated users can manage deliberation decisions"
  ON deliberation_decisions FOR ALL
  TO authenticated
  USING (true);
