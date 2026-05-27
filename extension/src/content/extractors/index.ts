import type { ExtractedJob } from "../../shared/types";
import { extractIndeed, isIndeedJobPage } from "./indeed";
import { extractLinkedIn, isLinkedInJobPage } from "./linkedin";
import { extractGeneric, looksLikeJobPage } from "./generic";

export function extractJobFromPage(): ExtractedJob | null {
  if (isLinkedInJobPage()) {
    const job = extractLinkedIn();
    if (job) return job;
  }

  if (isIndeedJobPage()) {
    const job = extractIndeed();
    if (job) return job;
  }

  if (looksLikeJobPage()) {
    return extractGeneric();
  }

  return null;
}
