export interface UserProfile {
  id: string;
  full_name: string;
  avatar_url: string;
  email?: string;
}

export interface ResumeData {
  id: string;
  user_id: string;
  filename: string;
  file_path?: string;
  raw_text?: string;
  ats_score: number;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  parsed: {
    name: string;
    skills: string[];
    experienceCount: number;
    education: string[];
  };
  created_at: string;
}

export interface Interview {
  id: string;
  user_id: string;
  resume_id: string; // "no_resume" or specific resume id
  candidate_name: string;
  role: string;
  difficulty: "easy" | "medium" | "hard";
  total_questions: number;
  current_question_idx: number;
  status: "pending" | "in_progress" | "completed";
  started_at: string;
  ended_at?: string;
  decision?: "pending" | "shortlisted" | "rejected";
  resume_filename?: string;
  candidate_selfie?: string;
  tab_switch_count?: number;
  violations_log?: string[];
  preferred_voice?: "male" | "female" | "replica";
  manual_questions?: string[];
  mcq_score?: number;
  mcq_questions?: any[];
  mcq_answers?: Record<number, number>;
  fitment_work_mode_enabled?: boolean;
  fitment_work_mode?: "on-site" | "remote" | "hybrid";
  fitment_location_enabled?: boolean;
  fitment_location_type?: "current" | "preferred";
  fitment_bond_notice_enabled?: boolean;
  candidate_email?: string;
  expected_salary?: string;
  current_salary?: string;
  location?: string;
  job_description?: string;
  job_description_filename?: string;
}

export interface InterviewQuestion {
  id: string;
  interview_id: string;
  idx: number;
  question: string;
  answer_transcript?: string;
  is_mcq?: boolean;
  mcq_options?: string[];
  mcq_correct_index?: number;
  mcq_selected_index?: number;
  mcq_explanation?: string;
  scores?: {
    communication: number; // 1-10
    technical: number; // 1-10
    confidence: number; // 1-10
    score: number; // 0-100
    feedback: string;
  };
}

export interface InterviewReport {
  id: string;
  interview_id: string;
  overall_score: number;
  communication: number; // 1-10
  technical: number; // 1-10
  confidence: number; // 1-10
  recommendation: string;
  summary_md: string;
  created_at: string;
  body_language_score?: number; // 1-10
  eye_contact_score?: number; // 1-10
  distractions_count?: number;
}
