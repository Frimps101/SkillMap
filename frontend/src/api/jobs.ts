import { api } from "./axios";

export async function saveJob(jobId: number): Promise<void> {
  await api.post(`/api/jobs/save/${jobId}/`);
}

export async function unsaveJob(jobId: number): Promise<void> {
  await api.delete(`/api/jobs/save/${jobId}/`);
}
