import { api } from "./axios";
import type { JobsResponse } from "../types/job";

export async function saveJob(jobId: number): Promise<void> {
  await api.post(`/api/jobs/save/${jobId}/`);
}

export async function unsaveJob(jobId: number): Promise<void> {
  await api.delete(`/api/jobs/save/${jobId}/`);
}

export async function listSavedJobs(page = 1): Promise<JobsResponse> {
  const { data } = await api.get("/api/jobs/saved/", { params: { page } });
  return data;
}
