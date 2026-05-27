export type JobCategory = "tech" | "design" | "uiux";
export type JobType =
  | "full_time"
  | "part_time"
  | "contract"
  | "internship"
  | "remote";

export interface ExtractedJob {
  title: string;
  company: string;
  location: string;
  job_type: JobType;
  category: JobCategory;
  description: string;
  url: string;
  logo_url: string;
  posted_at: string | null;
  /** Which extractor produced this payload */
  source: string;
  /** 0–1 confidence that this page is a job posting */
  confidence: number;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface StorageSettings {
  apiBaseUrl: string;
  email: string;
}

export type MessageType =
  | { type: "PING" }
  | { type: "GET_EXTRACTED_JOB" }
  | { type: "RE_EXTRACT" }
  | { type: "IMPORT_JOB"; job: ExtractedJob }
  | { type: "LOGIN"; email: string; password: string }
  | { type: "LOGOUT" }
  | { type: "GET_AUTH_STATUS" }
  | { type: "SAVE_SETTINGS"; settings: Partial<StorageSettings> };

export interface MessageResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}
