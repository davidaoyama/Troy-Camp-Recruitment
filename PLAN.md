Transfer Counselor Selection System - Technical Specification
OVERVIEW
System Purpose
A web application to manage transfer counselor recruitment: application submission, grading coordination, score aggregation, and deliberations for ~100 applicants per semester.
Tech Stack

Frontend: Next.js 14 (App Router), React, Tailwind CSS
Backend: Next.js API Routes / Server Actions
Database: Supabase (PostgreSQL)
Storage: Supabase Storage (photos)
Auth: Supabase Auth (username/password)
Hosting: Vercel

User Roles

Admin: Manages system, assigns graders, controls deliberations
Grader: Grades applications, participates in deliberations
Applicant: Submits application (no login)

System Architecture
┌─────────────┐
│ Applicant │ (No Auth)
└──────┬──────┘
│
↓
┌─────────────────────────────────────────┐
│ PUBLIC APPLICATION FORM │
│ - Demographics + Photo Upload │
│ - 5 Written Response Questions │
└──────┬──────────────────────────────────┘
│
↓
┌─────────────────────────────────────────┐
│ SUPABASE DATABASE │
│ - Applications Table │
│ - Written Responses Table │
└──────┬──────────────────────────────────┘
│
↓
┌─────────────────────────────────────────┐
│ ADMIN DASHBOARD (Auth Required) │
│ - Assign Graders (Random Algorithm) │
│ - Configure Rubrics │
│ - Manage Deliberations │
└──────┬──────────────────────────────────┘
│
↓
┌─────────────────────────────────────────┐
│ GRADER PORTAL (Auth Required) │
│ - Written Grading Interface │
│ - Interview Grading Interface │
└──────┬──────────────────────────────────┘
│
↓
┌─────────────────────────────────────────┐
│ DELIBERATIONS MODE (Auth Required) │
│ - View All Applicant Data │
│ - See Aggregated Scores │
│ - Make Accept/Reject Decisions │
└─────────────────────────────────────────┘

PART 1: APPLICATION SUBMISSION
1.1 Frontend: Public Application Form
Route: /apply
Form Fields (in order):
typescriptinterface ApplicationForm {
firstName: string; // Required, 2-50 chars
lastName: string; // Required, 2-50 chars
photo: File; // Required, JPG/PNG, max 5MB
major: string; // Required, 2-100 chars
graduationYear: number; // Required, dropdown: 2025-2028
gender: string; // Required, dropdown: Male/Female/Non-binary/Prefer not to say
spanishFluent: boolean; // Required, dropdown: Yes/No
canAttendCamp: boolean; // Required, dropdown: Yes/No

// Written Responses (5 questions)
writtenResponse1: string; // Required, 50-500 chars
writtenResponse2: string; // Required, 50-500 chars
writtenResponse3: string; // Required, 50-500 chars
writtenResponse4: string; // Required, 50-500 chars
writtenResponse5: string; // Required, 50-500 chars
}

```

**Validation Rules**:
- Photo: Must be image/jpeg or image/png, max 5MB
- Text fields: Trim whitespace, no empty submissions
- Written responses: Minimum 50 characters, maximum 500 characters
- All fields required before submission

**UI Layout**:
```

[Page Title: Transfer Counselor Application]

[Section: Personal Information]
First Name: [________]
Last Name: [________]
Photo: [Upload Button] (Preview thumbnail after upload)

[Section: Demographics]
Major: [________]
Graduation Year: [Dropdown: 2025, 2026, 2027, 2028]
Gender: [Dropdown: Male, Female, Non-binary, Prefer not to say]
Spanish Fluent: [Dropdown: Yes, No]
Can Attend Camp: [Dropdown: Yes, No]

[Section: Written Responses]
Question 1: [Display question text from config]
[Large text area, 500 char limit, character counter]

Question 2: [Display question text from config]
[Large text area, 500 char limit, character counter]

... (repeat for Q3-Q5)

[Submit Application Button]
1.2 Backend: Application Submission Logic
API Route: POST /api/applications/submit
Process Flow:
typescript1. Receive form data + photo file 2. Validate all fields 3. Generate anonymous ID:

- Query database for max anonymous_id in current semester
- Format: "TC 001", "TC 002", etc.
- Zero-pad to 3 digits

4. Upload photo to Supabase Storage:
   - Bucket: "applicant-photos"
   - Path: "{semester}/{anonymous_id}.jpg"
   - Return public URL
5. Insert into applications table
6. Insert 5 rows into written_responses table
7. Return success + anonymous_id to user
   Anonymous ID Generation Algorithm:
   typescriptasync function generateAnonymousId(semester: string): Promise<string> {
   // Get current semester's max ID
   const { data } = await supabase
   .from('applications')
   .select('anonymous_id')
   .eq('semester', semester)
   .order('anonymous_id', { ascending: false })
   .limit(1);

if (!data || data.length === 0) {
return 'TC 001'; // First applicant
}

// Extract number from "TC 042" → 42
const lastNumber = parseInt(data[0].anonymous_id.split(' ')[1]);
const nextNumber = lastNumber + 1;

// Zero-pad to 3 digits
return `TC ${nextNumber.toString().padStart(3, '0')}`;
}
Database Operations:
sql-- Insert application
INSERT INTO applications (
id,
anonymous_id,
first_name,
last_name,
photo_url,
major,
graduation_year,
gender,
spanish_fluent,
can_attend_camp,
status,
semester,
created_at
) VALUES (
gen_random_uuid(),
'TC 001',
'John',
'Doe',
'https://supabase.co/storage/...',
'Computer Science',
2026,
'Male',
true,
false,
'pending',
'Spring 2026',
now()
);

-- Insert written responses (5 rows)
INSERT INTO written_responses (
id,
application_id,
question_number,
question_text,
response_text
) VALUES
(gen_random_uuid(), {app_id}, 1, 'Why do you want...', 'I want to be...'),
(gen_random_uuid(), {app_id}, 2, 'Describe your...', 'My leadership...'),
... (repeat for Q3-Q5)
Success Response:
json{
"success": true,
"anonymousId": "TC 042",
"message": "Application submitted successfully"
}

```

**Confirmation Page**: `/apply/success?id=TC042`
- Display anonymous ID prominently
- Message: "Your application has been submitted. Your ID is TC 042. Please save this for your records."

---

## **PART 2: GRADING SYSTEM**

### **2.1 Admin: Grading Assignment**

**Route**: `/admin/assignments`

#### **2.1.1 Written Response Assignment**

**UI**:
```

[Button: Auto-Assign Written Grading]

[Table: Written Response Assignments]
Applicant | Grader 1 | Grader 2 | Grader 3 | Actions
TC 001 | Sarah | Mike | Alex | [Reassign]
TC 002 | Jessica | David | Sarah | [Reassign]
...
Auto-Assignment Algorithm:
typescriptasync function autoAssignWrittenGrading(semeste: string) {
// Get all applications for semester
const applications = await getApplicationsBySemester(semester);

// Get all graders (role = 'grader')
const graders = await getGraderUsers();

// For each application, assign 3 random unique graders
for (const app of applications) {
const shuffled = [...graders].sort(() => Math.random() - 0.5);
const assigned = shuffled.slice(0, 3);

    // Insert assignments (via written_grades table structure)
    // Note: We don't create written_grades rows yet, just track who should grade
    // Option A: Create placeholder rows with score = null
    // Option B: Create separate written_assignments table

    // Using Option A:
    for (let i = 1; i <= 5; i++) { // 5 questions
      for (const grader of assigned) {
        await supabase.from('written_grades').insert({
          application_id: app.id,
          grader_id: grader.id,
          question_number: i,
          score: null, // Not graded yet
        });
      }
    }

}
}

```

**Constraints**:
- Each applicant gets exactly 3 unique graders
- Try to distribute workload evenly (each grader gets ~same number of apps)
- No grader should grade the same applicant more than once across written + interview

#### **2.1.2 Interview Assignment**

**UI**:
```

[Table: Interview Assignments - Section 1]
Applicant | Grader 1 | Grader 2 | Actions
TC 001 | [Dropdown] | [Dropdown] | [Save]
TC 002 | [Dropdown] | [Dropdown] | [Save]

[Table: Interview Assignments - Section 2]
Applicant | Grader 1 | Grader 2 | Actions
TC 001 | [Dropdown] | [Dropdown] | [Save]
TC 002 | [Dropdown] | [Dropdown] | [Save]
Manual Assignment (no auto-assign):

Admin selects 2 graders per section per applicant
Dropdowns populated from graders list
Save button inserts into interview_assignments table

Database Insert:
sqlINSERT INTO interview_assignments (
id,
application_id,
grader_id,
section
) VALUES
(gen_random_uuid(), {app_id}, {grader1_id}, 1),
(gen_random_uuid(), {app_id}, {grader2_id}, 1),
(gen_random_uuid(), {app_id}, {grader3_id}, 2),
(gen_random_uuid(), {app_id}, {grader4_id}, 2);

2.2 Grader Portal: Written Response Grading
Route: /grader/written
2.2.1 Dashboard View
typescriptinterface GraderDashboard {
assignedApplications: {
anonymousId: string;
applicationId: string;
completedQuestions: number; // 0-5
totalQuestions: number; // Always 5
status: 'not_started' | 'in_progress' | 'completed';
}[];
}

```

**UI Layout**:
```

[Header: My Written Response Assignments]
Progress: 18/30 applications completed

[Cards Grid]
┌─────────────────────────────────┐
│ TC 015 │
│ Status: Not Started (0/5) │
│ [Grade Now Button] │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ TC 023 │
│ Status: In Progress (3/5) │
│ [Continue Grading Button] │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ TC 031 │
│ Status: Completed ✓ │
│ [View/Edit Button] │
└─────────────────────────────────┘
2.2.2 Grading Interface
Route: /grader/written/{applicationId}
Data Fetch:
typescriptasync function getWrittenGradingData(applicationId: string, graderId: string) {
// Get written responses
const responses = await supabase
.from('written_responses')
.select('\*')
.eq('application_id', applicationId)
.order('question_number');

// Get rubrics
const rubrics = await supabase
.from('rubrics')
.select('\*')
.eq('question_type', 'written')
.order('question_number');

// Get existing grades from this grader
const existingGrades = await supabase
.from('written_grades')
.select('\*')
.eq('application_id', applicationId)
.eq('grader_id', graderId);

return { responses, rubrics, existingGrades };
}

```

**UI Layout**:
```

[Header: Grading TC 015]

[Question 1]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Question: "Why do you want to be a transfer counselor?"

[Button: Show Rubric] → Opens modal/accordion with rubric

Response:
[Display full applicant response text]

Score: [1] [2] [3] [4] [5] (Radio buttons, large, colored)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Question 2]
... (same format)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Bottom Actions]
[Save Draft] [Submit All Grades]

Note: "Submit All Grades" disabled until all 5 questions scored

```

**Rubric Display** (Modal or Accordion):
```

[Modal: Question 1 Rubric]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Question: "Why do you want to be a transfer counselor?"

Scoring Guide:
5 - Exceptional: Clear passion, specific examples...
4 - Strong: Good reasoning, some examples...
3 - Adequate: Basic understanding...
2 - Weak: Vague, lacks depth...
1 - Poor: Off-topic or minimal effort...

[Close Button]
Save Logic:
typescriptasync function saveWrittenGrade(
applicationId: string,
graderId: string,
questionNumber: number,
score: number
) {
// Upsert (update if exists, insert if not)
await supabase
.from('written_grades')
.upsert({
application_id: applicationId,
grader_id: graderId,
question_number: questionNumber,
score: score,
created_at: new Date().toISOString(),
}, {
onConflict: 'application_id,grader_id,question_number'
});
}
Submit All Validation:
typescriptasync function canSubmitAllGrades(applicationId: string, graderId: string): Promise<boolean> {
const grades = await supabase
.from('written_grades')
.select('score')
.eq('application_id', applicationId)
.eq('grader_id', graderId);

// Must have 5 grades, all with non-null scores
return grades.data?.length === 5 && grades.data.every(g => g.score !== null);
}

2.3 Grader Portal: Interview Grading
Route: /grader/interviews
2.3.1 Dashboard View
typescriptinterface InterviewAssignment {
anonymousId: string;
applicationId: string;
section: 1 | 2;
isCompleted: boolean;
}

```

**UI Layout**:
```

[Header: My Interview Assignments]
Progress: 10/15 interviews completed

[Cards Grid]
┌─────────────────────────────────┐
│ TC 023 - Section 1 │
│ Status: Completed ✓ │
│ [View/Edit Button] │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ TC 031 - Section 2 │
│ Status: Not Graded │
│ [Grade Now Button] │
└─────────────────────────────────┘
2.3.2 Interview Grading Interface
Route: /grader/interviews/{applicationId}/{section}
Data Fetch:
typescriptasync function getInterviewGradingData(applicationId: string, section: number, graderId: string) {
// Get interview questions for reference
const questions = await supabase
.from('rubrics')
.select('question_text')
.eq('question_type', 'interview')
.eq('section', section) // Assuming we add section field to rubrics
.order('question_number');

// Get existing grade from this grader
const existingGrade = await supabase
.from('interview_grades')
.select('\*')
.eq('application_id', applicationId)
.eq('grader_id', graderId)
.eq('section', section)
.single();

return { questions, existingGrade };
}

```

**UI Layout**:
```

[Header: Interview - TC 023 - Section 1]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Section 1 Questions (Reference):

1. Tell us about a time when...
2. How would you handle...
3. Describe your leadership style...
   ... (up to 8 questions)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Interview Notes:
[Large text area, min 50 characters]
Placeholder: "Record your observations during the interview..."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Overall Section 1 Score:
[1] [2] [3] [4] [5] (Large radio buttons)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Submit Interview Grade]
Validation:

Notes: Minimum 50 characters
Score: Required (1-5)
Both must be filled to submit

Save Logic:
typescriptasync function saveInterviewGrade(
applicationId: string,
graderId: string,
section: number,
score: number,
notes: string
) {
if (notes.length < 50) {
throw new Error('Notes must be at least 50 characters');
}

if (score < 1 || score > 5) {
throw new Error('Score must be between 1 and 5');
}

// Upsert
await supabase
.from('interview_grades')
.upsert({
application_id: applicationId,
grader_id: graderId,
section: section,
score: score,
notes: notes,
created_at: new Date().toISOString(),
}, {
onConflict: 'application_id,grader_id,section'
});
}

PART 3: DELIBERATIONS MODE
3.1 Data Aggregation & Preparation
Route: /admin/deliberations
3.1.1 Score Calculation
Written Score Average:
sql-- Per applicant, per question
SELECT
application_id,
question_number,
AVG(score) as avg_score,
ARRAY_AGG(
JSON_BUILD_OBJECT(
'grader_name', users.full_name,
'score', written_grades.score
)
) as grader_details
FROM written_grades
JOIN users ON written_grades.grader_id = users.id
WHERE application_id = {app_id}
GROUP BY application_id, question_number;

-- Overall written average
SELECT
application_id,
AVG(score) as written_avg
FROM written_grades
WHERE application_id = {app_id}
GROUP BY application_id;
Interview Score Average:
sql-- Per applicant, per section
SELECT
application_id,
section,
AVG(score) as avg_score,
ARRAY_AGG(
JSON_BUILD_OBJECT(
'grader_name', users.full_name,
'score', interview_grades.score,
'notes', interview_grades.notes
)
) as grader_details
FROM interview_grades
JOIN users ON interview_grades.grader_id = users.id
WHERE application_id = {app_id}
GROUP BY application_id, section;

-- Overall interview average
SELECT
application_id,
AVG(score) as interview_avg
FROM interview_grades
WHERE application_id = {app_id}
GROUP BY application_id;
Total Score Calculation:
typescriptinterface ApplicantScores {
writtenAvg: number; // Average of all written response grades
interviewAvg: number; // Average of all interview grades
totalScore: number; // (writtenAvg + interviewAvg) / 2
}

function calculateTotalScore(writtenAvg: number, interviewAvg: number): number {
return (writtenAvg + interviewAvg) / 2;
}
3.1.2 Auto-Accept/Reject Categorization
typescriptasync function categorizeApplicants(semester: string) {
// Get all applicants with total scores
const applicants = await supabase
.from('applications')
.select('id, total_score')
.eq('semester', semester)
.order('total_score', { ascending: false });

const total = applicants.data.length;
const topCutoff = Math.ceil(total _ 0.25); // Top 25%
const bottomCutoff = Math.floor(total _ 0.25); // Bottom 25%

for (let i = 0; i < applicants.data.length; i++) {
let status: string;

    if (i < topCutoff) {
      status = 'auto_accept';
    } else if (i >= total - bottomCutoff) {
      status = 'auto_reject';
    } else {
      status = 'discuss';
    }

    await supabase
      .from('applications')
      .update({ status })
      .eq('id', applicants.data[i].id);

}
}

```

### **3.2 Deliberations UI**

#### **3.2.1 Main Layout**

**Component Structure**:
```

<DeliberationsLayout>
  <Sidebar>
    <FilterTabs />
    <ApplicantList />
  </Sidebar>
  
  <MainContent>
    <Navigation /> (Previous/Next buttons + current applicant)
    <ApplicantCard>
      <PhotoAndDemographics />
      <ScoreSummary />
      <WrittenResponsesAccordion />
      <InterviewGradesAccordion />
      <DecisionButtons />
    </ApplicantCard>
  </MainContent>
</DeliberationsLayout>
Data Fetch:
typescriptinterface DeliberationsData {
  applicant: {
    id: string;
    anonymousId: string;
    firstName: string;
    lastName: string;
    photoUrl: string;
    major: string;
    graduationYear: number;
    gender: string;
    spanishFluent: boolean;
    canAttendCamp: boolean;
    status: string;
    totalScore: number;
  };
  
  writtenResponses: {
    questionNumber: number;
    questionText: string;
    responseText: string;
    avgScore: number;
    graderDetails: {
      graderName: string;
      score: number;
    }[];
  }[];
  
  writtenAvg: number;
  
  interviewGrades: {
    section: number;
    avgScore: number;
    graderDetails: {
      graderName: string;
      score: number;
      notes: string;
    }[];
  }[];
  
  interviewAvg: number;
}

async function getDeliberationsData(applicationId: string): Promise<DeliberationsData> {
// Fetch all necessary data with joins
// Return structured object
}
3.2.2 Sidebar Component
typescript// Sidebar.tsx

<div className="w-64 bg-gray-50 h-screen overflow-y-auto">
  {/* Filter Tabs */}
  <div className="p-4 border-b">
    <button 
      onClick={() => setFilter('all')}
      className={filter === 'all' ? 'active' : ''}
    >
      All
    </button>
    <button 
      onClick={() => setFilter('auto_accept')}
      className={filter === 'auto_accept' ? 'active' : ''}
    >
      Auto-Accept ({autoAcceptCount})
    </button>
    <button 
      onClick={() => setFilter('discuss')}
      className={filter === 'discuss' ? 'active' : ''}
    >
      Discuss ({discussCount})
    </button>
    <button 
      onClick={() => setFilter('auto_reject')}
      className={filter === 'auto_reject' ? 'active' : ''}
    >
      Auto-Reject ({autoRejectCount})
    </button>
  </div>
  
  {/* Applicant List */}
  <div className="p-2">
    {filteredApplicants.map(app => (
      <div 
        key={app.id}
        onClick={() => navigateToApplicant(app.id)}
        className={`
          p-3 mb-2 rounded cursor-pointer
          ${currentApplicantId === app.id ? 'bg-usc-cardinal text-white' : 'bg-white'}
          ${app.decisionMade ? 'opacity-60' : ''}
        `}
      >
        <div className="flex justify-between items-center">
          <span className="font-medium">{app.anonymousId}</span>
          {app.decisionMade && <span>✓</span>}
        </div>
      </div>
    ))}
  </div>
</div>
3.2.3 Main Content - Applicant Card
typescript// ApplicantCard.tsx
<div className="flex-1 p-8 overflow-y-auto">
  {/* Navigation */}
  <div className="flex justify-between items-center mb-6">
    <button 
      onClick={goToPrevious}
      disabled={!hasPrevious}
      className="px-4 py-2 bg-gray-200 rounded"
    >
      ← Previous
    </button>
    
    <h1 className="text-2xl font-bold">
      {applicant.anonymousId}: {applicant.firstName} {applicant.lastName}
    </h1>
    
    <button 
      onClick={goToNext}
      disabled={!hasNext}
      className="px-4 py-2 bg-gray-200 rounded"
    >
      Next →
    </button>
  </div>
  
  {/* Two Column Layout */}
  <div className="grid grid-cols-2 gap-8">
    {/* Left Column: Photo + Demographics */}
    <div>
      <img 
        src={applicant.photoUrl} 
        alt="Applicant"
        className="w-full aspect-square object-cover rounded-lg mb-4"
      />
      
      <div className="space-y-2 text-lg">
        <p><strong>Major:</strong> {applicant.major}</p>
        <p><strong>Spanish Fluency:</strong> {applicant.spanishFluent ? 'Yes' : 'No'}</p>
        <p><strong>Graduation Year:</strong> {applicant.graduationYear}</p>
        <p><strong>Gender:</strong> {applicant.gender}</p>
        <p><strong>Can Attend Camp:</strong> {applicant.canAttendCamp ? 'Yes' : 'No'}</p>
      </div>
    </div>
    
    {/* Right Column: Scores + Responses */}
    <div>
      {/* Score Summary Box */}
      <div className="bg-gray-100 p-4 rounded-lg mb-6">
        <p className="text-lg"><strong>Written Score Total Avg:</strong> {writtenAvg.toFixed(2)}</p>
        <p className="text-lg"><strong>Interview Score Total Avg:</strong> {interviewAvg.toFixed(2)}</p>
        <p className="text-xl mt-2"><strong>Total Score:</strong> {totalScore.toFixed(2)}</p>
      </div>
      
      {/* Written Responses Accordion */}
      <div className="space-y-3">
        {writtenResponses.map((response, idx) => (
          <Accordion key={idx}>
            <AccordionTrigger className="text-left">
              <div className="flex justify-between w-full">
                <span>Written Response {response.questionNumber}</span>
                <span className="text-gray-600">avg score: {response.avgScore.toFixed(1)}</span>
              </div>
            </AccordionTrigger>
            
            <AccordionContent>
              <div className="p-4 bg-gray-50 rounded">
                <p className="font-semibold mb-2">Question:</p>
                <p className="mb-4 italic">{response.questionText}</p>
                
                <p className="font-semibold mb-2">Response:</p>
                <p className="mb-4">{response.responseText}</p>
                
                <p className="font-semibold mb-2">Graded by:</p>
                <div className="space-y-1">
                  {response.graderDetails.map((grader, i) => (
                    <p key={i}>
                      {grader.graderName} ({grader.score})
                    </p>
                  ))}
                </div>
              </div>
            </AccordionContent>
          </Accordion>
        ))}
      </div>
      
      {/* Interview Grades Accordion */}
      <div className="space-y-3 mt-4">
        {interviewGrades.map((interview, idx) => (
          <Accordion key={idx}>
            <AccordionTrigger className="text-left">
              <div className="flex justify-between w-full">
                <span>Interview Section {interview.section}</span>
                <span className="text-gray-600">avg score: {interview.avgScore.toFixed(1)}</span>
              </div>
            </AccordionTrigger>
            
            <AccordionContent>
              <div className="p-4 bg-gray-50 rounded">
                <p className="font-semibold mb-2">Graded by:</p>
                <div className="space-y-3">
                  {interview.graderDetails.map((grader, i) => (
                    <div key={i} className="border-b pb-2">
                      <p><strong>{grader.graderName}</strong> ({grader.score})</p>
                      <p className="text-sm mt-1"><strong>Notes:</strong> {grader.notes}</p>
                    </div>
                  ))}
                </div>
              </div>
            </AccordionContent>
          </Accordion>
        ))}
      </div>
    </div>
  </div>
  
  {/* Decision Buttons */}
  <div className="mt-8 text-center">
    <p className="text-xl mb-4">Do you think we should accept this applicant?</p>
    <div className="flex justify-center gap-4">
      <button 
        onClick={() => makeDecision('accept')}
        className="px-12 py-4 bg-green-500 text-white text-xl rounded-lg hover:bg-green-600"
      >
        YES
      </button>
      <button 
        onClick={() => makeDecision('reject')}
        className="px-12 py-4 bg-red-500 text-white text-xl rounded-lg hover:bg-red-600"
      >
        NO
      </button>
    </div>
  </div>
</div>
3.2.4 Navigation Logic
typescript// Navigation.ts
interface NavigationState {
  currentIndex: number;
  applicantList: string[]; // Array of application IDs
  filter: 'all' | 'auto_accept' | 'discuss' | 'auto_reject';
}

function goToNext(state: NavigationState): string | null {
if (state.currentIndex >= state.applicantList.length - 1) {
return null; // Already at last
}
return state.applicantList[state.currentIndex + 1];
}

function goToPrevious(state: NavigationState): string | null {
if (state.currentIndex <= 0) {
return null; // Already at first
}
return state.applicantList[state.currentIndex - 1];
}

function navigateToApplicant(applicantId: string, state: NavigationState): number {
const index = state.applicantList.indexOf(applicantId);
return index !== -1 ? index : state.currentIndex;
}
3.2.5 Decision Recording
typescriptasync function makeDecision(
applicationId: string,
decision: 'accept' | 'reject',
decidedBy: string // user ID of admin
) {
// Update application status
await supabase
.from('applications')
.update({
status: decision === 'accept' ? 'accepted' : 'rejected'
})
.eq('id', applicationId);

// Record decision in deliberation_decisions table
await supabase
.from('deliberation_decisions')
.insert({
id: crypto.randomUUID(),
application_id: applicationId,
decision: decision,
decided_by: decidedBy,
created_at: new Date().toISOString(),
});

// Auto-advance to next applicant
return goToNext(currentState);
}

PART 4: CALCULATIONS & SCORE AGGREGATION
4.1 Score Calculation Pipeline
Trigger: After all grading is complete, before deliberations
typescriptasync function recalculateAllScores(semester: string) {
const applications = await supabase
.from('applications')
.select('id')
.eq('semester', semester);

for (const app of applications.data) {
await recalculateSingleApplicant(app.id);
}
}

async function recalculateSingleApplicant(applicationId: string) {
// 1. Calculate written average
const { data: writtenGrades } = await supabase
.from('written_grades')
.select('score')
.eq('application_id', applicationId);

const writtenAvg = writtenGrades.reduce((sum, g) => sum + g.score, 0) / writtenGrades.length;

// 2. Calculate interview average
const { data: interviewGrades } = await supabase
.from('interview_grades')
.select('score')
.eq('application_id', applicationId);

const interviewAvg = interviewGrades.reduce((sum, g) => sum + g.score, 0) / interviewGrades.length;

// 3. Calculate total score
const totalScore = (writtenAvg + interviewAvg) / 2;

// 4. Update application
await supabase
.from('applications')
.update({
total_score: totalScore
})
.eq('id', applicationId);
}
4.2 Real-Time Score Updates
Option A: Eager Updates (Update immediately after each grade)
typescript// After saving a written grade
async function onWrittenGradeSaved(applicationId: string) {
await recalculateSingleApplicant(applicationId);
}

// After saving an interview grade
async function onInterviewGradeSaved(applicationId: string) {
await recalculateSingleApplicant(applicationId);
}
Option B: Lazy Updates (Calculate on-demand during deliberations)
typescript// When loading deliberations view
async function loadDeliberationsData(applicationId: string) {
await recalculateSingleApplicant(applicationId);
return await getDeliberationsData(applicationId);
}
Recommendation: Use Option A for better performance during deliberations
4.3 Edge Cases
Missing Grades:
typescriptasync function validateGradingComplete(applicationId: string): Promise<boolean> {
// Check written grades: Should have 15 total (3 graders × 5 questions)
const { count: writtenCount } = await supabase
.from('written_grades')
.select('\*', { count: 'exact' })
.eq('application_id', applicationId)
.not('score', 'is', null);

// Check interview grades: Should have 4 total (2 per section × 2 sections)
const { count: interviewCount } = await supabase
.from('interview_grades')
.select('\*', { count: 'exact' })
.eq('application_id', applicationId)
.not('score', 'is', null);

return writtenCount === 15 && interviewCount === 4;
}
Handling Partial Grades:
typescript// If grading is incomplete, exclude from calculations or mark as "incomplete"
async function getApplicantsForDeliberations(semester: string) {
const applicants = await supabase
.from('applications')
.select('\*')
.eq('semester', semester);

const complete = [];
const incomplete = [];

for (const app of applicants.data) {
const isComplete = await validateGradingComplete(app.id);
if (isComplete) {
complete.push(app);
} else {
incomplete.push(app);
}
}

return { complete, incomplete };
}

```

---

## **PART 5: FINAL STATUS & DATA EXPORT**

### **5.1 Status Workflow**

**Status Flow**:
```

pending
→ (after grading complete) auto_accept / discuss / auto_reject
→ (after deliberations) accepted / rejected
Status Definitions:

pending: Application submitted, grading not yet complete
auto_accept: Top 25% by score (pre-deliberations)
auto_reject: Bottom 25% by score (pre-deliberations)
discuss: Middle 50%, requires deliberation
accepted: Final decision - accepted
rejected: Final decision - rejected

5.2 Admin Dashboard - Status Overview
Route: /admin/dashboard
typescriptinterface StatusOverview {
semester: string;
totalApplications: number;
pending: number;
autoAccept: number;
discuss: number;
autoReject: number;
accepted: number;
rejected: number;
gradingProgress: {
writtenComplete: number;
interviewComplete: number;
};
}

```

**UI**:
```

[Dashboard: Spring 2026 Recruitment]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Applications Overview
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Total Applications: 97

Status Breakdown:

- Pending: 12
- Auto-Accept: 24 (25%)
- Discuss: 49 (50%)
- Auto-Reject: 12 (25%)
- Accepted: 30 (Final)
- Rejected: 67 (Final)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Grading Progress
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Written Response Grading: 95/97 complete (98%)
Interview Grading: 92/97 complete (95%)

[View Incomplete Assignments]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Actions
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Recalculate Scores]
[Categorize Applicants] (Top/Middle/Bottom 25%)
[Export Data]
[Start Deliberations]
5.3 Data Export
5.3.1 Export Formats
CSV Export (Spreadsheet format):
typescriptasync function exportToCSV(semester: string): Promise<string> {
const applicants = await supabase
.from('applications')
.select(`       *,
      written_grades (*),
      interview_grades (*)
    `)
.eq('semester', semester);

// Generate CSV with columns:
// Anonymous ID, Name, Major, Year, Gender, Spanish, Camp,
// Written Q1 Avg, Written Q2 Avg, ..., Written Avg,
// Interview S1 Avg, Interview S2 Avg, Interview Avg,
// Total Score, Status

const csv = generateCSV(applicants.data);
return csv;
}
PDF Export (Individual applicant reports):
typescriptasync function exportApplicantPDF(applicationId: string): Promise<Blob> {
const data = await getDeliberationsData(applicationId);

// Generate PDF with:
// - Photo
// - Demographics
// - All written responses with scores
// - Interview grades and notes
// - Final decision

const pdf = await generatePDF(data);
return pdf;
}
Database Backup:
typescriptasync function backupSemesterData(semester: string) {
// Export entire database for semester as SQL dump
// Or export as JSON

const tables = [
'applications',
'written_responses',
'written_grades',
'interview_assignments',
'interview_grades',
'deliberation_decisions',
];

const backup = {};

for (const table of tables) {
const { data } = await supabase
.from(table)
.select('\*')
.eq('semester', semester); // If applicable

    backup[table] = data;

}

return JSON.stringify(backup, null, 2);
}

```

#### **5.3.2 Export UI**

**Route**: `/admin/export`
```

[Export Data - Spring 2026]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Export Options
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Export All Applicants as CSV]
→ Download: spring_2026_applications.csv

[Export Accepted Applicants Only (CSV)]
→ Download: spring_2026_accepted.csv

[Export Deliberations Summary (PDF)]
→ Download: spring_2026_deliberations_summary.pdf

[Backup Full Database (JSON)]
→ Download: spring_2026_backup.json

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Archive Semester
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Archive Spring 2026]
→ Marks all data as archived
→ Removes from active views
→ Data retained in database for historical records

DATABASE SCHEMA (Complete)
sql-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
username TEXT UNIQUE NOT NULL,
password_hash TEXT NOT NULL,
role TEXT NOT NULL CHECK (role IN ('admin', 'grader')),
full_name TEXT NOT NULL,
email TEXT,
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Applications table
CREATE TABLE applications (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
anonymous_id TEXT UNIQUE NOT NULL,
first_name TEXT NOT NULL,
last_name TEXT NOT NULL,
photo_url TEXT NOT NULL,
major TEXT NOT NULL,
graduation_year INTEGER NOT NULL,
gender TEXT NOT NULL,
spanish_fluent BOOLEAN NOT NULL,
can_attend_camp BOOLEAN NOT NULL,
status TEXT NOT NULL DEFAULT 'pending'
CHECK (status IN ('pending', 'auto_accept', 'auto_reject', 'discuss', 'accepted', 'rejected')),
total_score DECIMAL(3,2), -- Calculated field, 0.00-5.00
semester TEXT NOT NULL, -- e.g., "Spring 2026"
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Written responses table
CREATE TABLE written_responses (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
question_number INTEGER NOT NULL CHECK (question_number BETWEEN 1 AND 5),
question_text TEXT NOT NULL,
response_text TEXT NOT NULL,
UNIQUE (application_id, question_number)
);

-- Written grades table
CREATE TABLE written_grades (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
grader_id UUID NOT NULL REFERENCES users(id),
question_number INTEGER NOT NULL CHECK (question_number BETWEEN 1 AND 5),
score INTEGER CHECK (score BETWEEN 1 AND 5),
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
UNIQUE (application_id, grader_id, question_number)
);

-- Interview assignments table
CREATE TABLE interview_assignments (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
grader_id UUID NOT NULL REFERENCES users(id),
section INTEGER NOT NULL CHECK (section IN (1, 2)),
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
UNIQUE (application_id, grader_id, section)
);

-- Interview grades table
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

-- Rubrics table (configuration)
CREATE TABLE rubrics (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
question_number INTEGER NOT NULL,
question_type TEXT NOT NULL CHECK (question_type IN ('written', 'interview')),
question_text TEXT NOT NULL,
rubric_content TEXT, -- Can store text or image URL
section INTEGER, -- NULL for written, 1 or 2 for interview
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Deliberation decisions table
CREATE TABLE deliberation_decisions (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
decision TEXT NOT NULL CHECK (decision IN ('accept', 'reject')),
decided_by UUID NOT NULL REFERENCES users(id),
notes TEXT,
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_applications_semester ON applications(semester);
CREATE INDEX idx_applications_status ON applications(status);
CREATE INDEX idx_written_grades_app ON written_grades(application_id);
CREATE INDEX idx_written_grades_grader ON written_grades(grader_id);
CREATE INDEX idx_interview_grades_app ON interview_grades(application_id);
CREATE INDEX idx_interview_assignments_grader ON interview_assignments(grader_id);

AUTHENTICATION & AUTHORIZATION
Setup Supabase Auth
typescript// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);
Login Flow
typescript// app/login/page.tsx
async function handleLogin(username: string, password: string) {
// Custom auth implementation (username/password, not email)
// Option 1: Use Supabase Auth with email (set email = username@internal.app)
// Option 2: Custom auth table + session management

// Using Option 1:
const { data, error } = await supabase.auth.signInWithPassword({
email: `${username}@internal.app`,
password: password,
});

if (error) {
return { success: false, error: error.message };
}

// Fetch user role
const { data: userData } = await supabase
.from('users')
.select('role')
.eq('username', username)
.single();

// Store in session/cookie
return { success: true, role: userData.role };
}
Protected Routes
typescript// middleware.ts
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
const res = NextResponse.next();
const supabase = createMiddlewareClient({ req, res });

const {
data: { session },
} = await supabase.auth.getSession();

// Protected routes
if (req.nextUrl.pathname.startsWith('/admin')) {
if (!session) {
return NextResponse.redirect(new URL('/login', req.url));
}

    // Check if admin
    const { data: user } = await supabase
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (user?.role !== 'admin') {
      return NextResponse.redirect(new URL('/grader', req.url));
    }

}

if (req.nextUrl.pathname.startsWith('/grader')) {
if (!session) {
return NextResponse.redirect(new URL('/login', req.url));
}
}

return res;
}

export const config = {
matcher: ['/admin/:path*', '/grader/:path*'],
};

IMPLEMENTATION CHECKLIST
Phase 1: Setup & Foundation

Create Next.js 14 project with App Router
Set up Supabase project
Run database schema SQL
Configure Supabase Storage bucket for photos
Implement authentication (login/logout)
Create protected route middleware
Set up Tailwind CSS + shadcn/ui components

Phase 2: Application Submission

Build public application form (/apply)
Implement photo upload to Supabase Storage
Create anonymous ID generation logic
Build form validation with Zod
Create success confirmation page
Test full submission flow

Phase 3: Admin Dashboard

Build admin dashboard layout
Create applicant list view
Implement written grading auto-assignment algorithm
Build interview grading manual assignment UI
Create rubric management interface
Test assignment workflows

Phase 4: Grader Portal - Written

Build grader dashboard (assigned apps list)
Create written grading interface
Implement rubric display (modal/accordion)
Add save draft functionality
Implement submit all grades logic
Test grading workflow

Phase 5: Grader Portal - Interview

Build interview assignments dashboard
Create interview grading interface
Add notes text area with validation
Implement score submission
Test interview grading flow

Phase 6: Score Calculation

Implement written score aggregation
Implement interview score aggregation
Build total score calculation
Create auto-categorization logic (top/middle/bottom 25%)
Add score recalculation endpoint

Phase 7: Deliberations Mode

Build deliberations layout (sidebar + main)
Implement sidebar filtering (all/accept/discuss/reject)
Create applicant card with photo + demographics
Build written responses accordion
Build interview grades accordion
Implement navigation (prev/next + sidebar click)
Add decision recording (YES/NO buttons)
Test full deliberations flow

Phase 8: Data Export & Polish

Implement CSV export
Add PDF export (optional)
Create database backup functionality
Build admin status overview dashboard
Add loading states and error handling
Conduct user testing with counselors
Deploy to Vercel
