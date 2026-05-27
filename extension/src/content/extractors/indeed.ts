import type { ExtractedJob } from "../../shared/types";
import { buildJob, firstText, text } from "./utils";

export function isIndeedJobPage(): boolean {
  return /indeed\.com\/(viewjob|rc\/clk)/i.test(location.href);
}

export function extractIndeed(): ExtractedJob | null {
  const title = firstText([
    "h1.jobsearch-JobInfoHeader-title",
    "[data-testid='jobsearch-JobInfoHeader-title']",
    "h1",
  ]);

  if (!title) return null;

  const company =
    firstText([
      "[data-company-name]",
      ".jobsearch-InlineCompanyRating a",
      "[data-testid='inlineHeader-companyName']",
    ]) || attrCompany();

  const location = firstText([
    "[data-testid='job-location']",
    "#jobLocationText",
    ".jobsearch-JobInfoHeader-subtitle div",
  ]);

  const descEl =
    document.querySelector("#jobDescriptionText") ??
    document.querySelector("[id*='jobDescription']");

  const description = descEl ? text(descEl) : "";

  return buildJob({
    title,
    company,
    location,
    description,
    url: window.location.href.split("&")[0],
    source: "indeed",
    confidence: description.length > 80 ? 0.85 : 0.65,
  });
}

function attrCompany(): string {
  const el = document.querySelector("[data-company-name]");
  return el?.getAttribute("data-company-name")?.trim() ?? "";
}
