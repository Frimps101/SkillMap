import type { ExtractedJob } from "../../shared/types";
import { buildJob, firstText, text } from "./utils";

export function isLinkedInJobPage(): boolean {
  return (
    /linkedin\.com\/jobs\/view\//i.test(location.href) ||
    /currentJobId=/i.test(location.href) ||
    /linkedin\.com\/jobs\/collections\//i.test(location.href)
  );
}

export function extractLinkedIn(): ExtractedJob | null {
  const title = firstText([
    "h1.job-details-jobs-unified-top-card__job-title",
    "h1.t-24",
    ".jobs-unified-top-card__job-title",
    ".job-details-jobs-unified-top-card__job-title",
    "[data-test-id='job-title']",
    ".jobs-details-top-card__job-title",
    "main h1",
    "h1",
  ]);

  if (!title) return null;

  const company = firstText([
    ".job-details-jobs-unified-top-card__company-name a",
    ".jobs-unified-top-card__company-name a",
    ".job-details-jobs-unified-top-card__primary-description a",
    "[data-test-job-company-name]",
    ".jobs-details-top-card__company-name a",
    "a[data-test-app-aware-link][href*='/company/']",
  ]);

  const location = firstText([
    ".job-details-jobs-unified-top-card__bullet",
    ".jobs-unified-top-card__bullet",
    ".job-details-jobs-unified-top-card__primary-description-container + *",
  ]);

  const descEl =
    document.querySelector("#job-details") ??
    document.querySelector(".jobs-description__content") ??
    document.querySelector(".jobs-box__html-content");

  const description = descEl ? text(descEl) : "";

  return buildJob({
    title,
    company,
    location,
    description,
    url: canonicalUrl(),
    source: "linkedin",
    confidence: description.length > 100 ? 0.85 : 0.65,
  });
}

function canonicalUrl(): string {
  const match = location.href.match(/(https:\/\/[^/]+\/jobs\/view\/\d+)/);
  return match?.[1] ?? location.href.split("?")[0];
}
