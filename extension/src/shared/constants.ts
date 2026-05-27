export const DEFAULT_API_BASE_URL = "http://localhost:8000";

export const STORAGE_KEYS = {
  accessToken: "accessToken",
  refreshToken: "refreshToken",
  apiBaseUrl: "apiBaseUrl",
  email: "email",
} as const;

/** URL path/query hints that often indicate a single job posting */
export const JOB_PAGE_PATTERNS: RegExp[] = [
  /linkedin\.com\/jobs\/view\//i,
  /linkedin\.com\/jobs\/collections\/.*currentJobId=/i,
  /indeed\.com\/viewjob/i,
  /indeed\.com\/rc\/clk/i,
  /greenhouse\.io\/.*\/jobs\//i,
  /boards\.greenhouse\.io\/.*\/jobs\//i,
  /jobs\.lever\.co\//i,
  /apply\.workable\.com\//i,
  /careers\./i,
  /\/jobs?\//i,
  /\/job\//i,
  /\/careers?\//i,
  /\/positions?\//i,
  /\/opening\//i,
];
