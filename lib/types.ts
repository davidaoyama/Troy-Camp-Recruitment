// ============================================
// Application Form (client-side form data)
// ============================================

export interface ApplicationFormData {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  photo: File | null;
  major: string;
  graduationYear: number;
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
  email: string;
  phone_number: string;
  photo_url: string;
  major: string;
  graduation_year: number;
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
// Server Action Results (generic)
// ============================================

export type ActionResult<T = void> =
  | ({ success: true } & (T extends void ? {} : T))
  | { success: false; error: string };
