import { api } from "./axios";

export interface MatchedSkill {
  name: string;
  category: string;
}

export interface MissingSkill {
  name: string;
  category: string;
  job_count: number;
  pct: number;
}

export interface JobMatch {
  job_id: number;
  title: string;
  company: string;
  score: number;
  matched: string[];
  total: number;
}

export interface CVReview {
  id: number;
  status: "pending" | "processing" | "done" | "failed";
  target_role: string;
  overall_score: number;
  summary: string;
  strengths: string[];
  improvements: string[];
  matched_skills: MatchedSkill[];
  missing_skills: MissingSkill[];
  job_matches: JobMatch[];
  market_job_count: number;
  error: string;
  created_at: string;
}

export interface CVDocument {
  id: number;
  original_filename: string;
  uploaded_at: string;
  latest_review: CVReview | null;
}

export async function listCVs(): Promise<CVDocument[]> {
  const { data } = await api.get("/api/cv/");
  return data;
}

export async function uploadCV(
  file: File,
  targetRole: string
): Promise<{ cv: CVDocument; review: CVReview }> {
  const form = new FormData();
  form.append("file", file);
  form.append("target_role", targetRole);
  const { data } = await api.post("/api/cv/upload/", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function getReview(cvId: number): Promise<CVReview> {
  const { data } = await api.get(`/api/cv/${cvId}/review/`);
  return data;
}

export async function rereviewCV(
  cvId: number,
  targetRole: string
): Promise<CVReview> {
  const { data } = await api.post(`/api/cv/${cvId}/rereview/`, {
    target_role: targetRole,
  });
  return data;
}

export async function deleteCV(cvId: number): Promise<void> {
  await api.delete(`/api/cv/${cvId}/`);
}
