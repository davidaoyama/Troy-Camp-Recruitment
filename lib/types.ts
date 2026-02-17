// ============================================
// Application Form (client-side form data)
// ============================================

export interface ApplicationFormData {
  firstName: string;
  lastName: string;
  pronouns: string;
  email: string;
  phoneNumber: string;
  photo: File | null;
  major: string;
  graduationYear: string;
  gender: string;
  spanishFluent: boolean;
  canAttendCamp: boolean;
  writtenResponses: string[]; // 5 responses, index 0 = Q1
}

// ============================================
// Written Question Config
// ============================================

export interface WrittenQuestion {
  number: number; // 1-5
  text: string;
}

// ============================================
// Database Row Types (match supabase/schema.sql)
// ============================================

export interface ApplicationRow {
  id: string;
  anonymous_id: string;
  first_name: string;
  last_name: string;
  pronouns: string;
  email: string;
  phone_number: string;
  photo_url: string;
  major: string;
  graduation_year: string;
  gender: string;
  spanish_fluent: boolean;
  can_attend_camp: boolean;
  status: "pending" | "auto_accept" | "auto_reject" | "discuss" | "accepted" | "rejected";
  total_score: number | null;
  semester: string;
  created_at: string;
}

export interface WrittenResponseRow {
  id: string;
  application_id: string;
  question_number: number;
  question_text: string;
  response_text: string;
}

// ============================================
// Server Action Response
// ============================================

export type SubmitApplicationResult =
  | { success: true; anonymousId: string }
  | { success: false; error: string };

// ============================================
// User & Auth Types
// ============================================

export interface UserRow {
  id: string;
  username: string;
  role: "admin" | "grader";
  full_name: string;
  tc_name: string;
  email: string | null;
  created_at: string;
}

export interface CreateUserInput {
  username: string;
  password: string;
  fullName: string;
  tcName: string;
  role: "admin" | "grader";
}

// ============================================
// Written Grades Types
// ============================================

export interface WrittenGradeRow {
  id: string;
  application_id: string;
  grader_id: string;
  question_number: number;
  score: number | null;
  created_at: string;
}

// ============================================
// Interview Assignment Types
// ============================================

export interface InterviewAssignmentRow {
  id: string;
  application_id: string;
  grader_id: string;
  section: 1 | 2;
  created_at: string;
}

// ============================================
// Interview Grade & Note Types
// ============================================

export interface InterviewGradeRow {
  id: string;
  assignment_id: string;
  score: number | null;
  created_at: string;
}

export interface InterviewNoteRow {
  id: string;
  assignment_id: string;
  question_number: number;
  notes: string | null;
  created_at: string;
}

// ============================================
// Rubric Types
// ============================================

export interface RubricRow {
  id: string;
  question_number: number;
  question_type: "written" | "interview";
  question_text: string;
  rubric_content: string | null;
  section: number | null;
  created_at: string;
}

// ============================================
// Dashboard Stats
// ============================================

export interface DashboardStats {
  totalApplications: number;
  pendingCount: number;
  totalGraders: number;
  writtenGradingProgress: {
    completed: number;
    total: number;
  };
  interviewGradingProgress: {
    completed: number;
    total: number;
  };
}

// ============================================
// Score Calculation Types
// ============================================

export interface ApplicantScore {
  applicationId: string;
  anonymousId: string;
  writtenAvg: number | null;
  interviewAvg: number | null;
  totalScore: number | null;
  writtenGradeCount: number;
  interviewGradeCount: number;
  isComplete: boolean; // true if 15 written + 4 interview grades
}

export interface CategorizationResult {
  autoAcceptCount: number;
  autoRejectCount: number;
  discussCount: number;
  skippedCount: number; // applicants with null total_score
}

// ============================================
// Deliberation Types
// ============================================

export interface DeliberationApplicant {
  id: string;
  anonymousId: string;
  firstName: string;
  lastName: string;
  status: ApplicationRow["status"];
  totalScore: number | null;
  hasDecision: boolean;
}

export interface WrittenResponseDetail {
  questionNumber: number;
  questionText: string;
  responseText: string;
  avgScore: number | null;
  graderDetails: { graderName: string; score: number }[];
}

export interface InterviewSectionDetail {
  section: number;
  avgScore: number | null;
  graderDetails: {
    graderName: string;
    score: number;
    notes: { questionNumber: number; questionText: string; notes: string }[];
  }[];
}

export interface DeliberationDetail {
  applicant: {
    id: string;
    anonymousId: string;
    firstName: string;
    lastName: string;
    photoUrl: string;
    major: string;
    pronouns: string;
    graduationYear: string;
    gender: string;
    spanishFluent: boolean;
    canAttendCamp: boolean;
    email: string;
    phoneNumber: string;
    status: ApplicationRow["status"];
    totalScore: number | null;
  };
  writtenAvg: number | null;
  interviewAvg: number | null;
  writtenResponses: WrittenResponseDetail[];
  interviewSections: InterviewSectionDetail[];
}

// ============================================
// Data Export Types
// ============================================

export interface ExportApplicantRow {
  anonymousId: string;
  firstName: string;
  lastName: string;
  pronouns: string;
  email: string;
  phoneNumber: string;
  major: string;
  graduationYear: string;
  gender: string;
  spanishFluent: boolean;
  canAttendCamp: boolean;
  writtenQ1Avg: number | null;
  writtenQ2Avg: number | null;
  writtenQ3Avg: number | null;
  writtenQ4Avg: number | null;
  writtenQ5Avg: number | null;
  writtenAvg: number | null;
  interviewS1Avg: number | null;
  interviewS2Avg: number | null;
  interviewAvg: number | null;
  totalScore: number | null;
  status: ApplicationRow["status"];
  decision: "accept" | "reject" | null;
}

export interface SemesterBackup {
  exportedAt: string;
  semester: string;
  applications: ApplicationRow[];
  writtenResponses: WrittenResponseRow[];
  writtenGrades: WrittenGradeRow[];
  interviewAssignments: InterviewAssignmentRow[];
  interviewGrades: InterviewGradeRow[];
  interviewNotes: InterviewNoteRow[];
  deliberationDecisions: DeliberationDecisionRow[];
}

export interface DeliberationDecisionRow {
  id: string;
  application_id: string;
  decision: "accept" | "reject";
  decided_by: string;
  notes: string | null;
  created_at: string;
}

export interface StatusOverview {
  autoAcceptCount: number;
  discussCount: number;
  autoRejectCount: number;
  acceptedCount: number;
  rejectedCount: number;
}

// ============================================
// Server Action Results (generic)
// ============================================

export type ActionResult<T = void> =
  | ({ success: true } & (T extends void ? {} : T))
  | { success: false; error: string };
