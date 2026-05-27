import type { ExtractedJob } from "../../shared/types";
import { JOB_PAGE_PATTERNS } from "../../shared/constants";
import { buildJob, firstText, parseJsonLdJobPosting, text } from "./utils";

export function looksLikeJobPage(): boolean {
  if (JOB_PAGE_PATTERNS.some((re) => re.test(location.href))) return true;
  const jsonLd = parseJsonLdJobPosting();
  return Boolean(jsonLd?.title);
}

export function extractGeneric(): ExtractedJob | null {
  const jsonLd = parseJsonLdJobPosting();
  if (jsonLd?.title) {
    return buildJob({
      ...jsonLd,
      url: jsonLd.url || window.location.href.split("?")[0],
      source: "json-ld",
      confidence: 0.88,
    });
  }

  const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute("content");
  const title =
    firstText(["h1", "[data-testid='job-title']", ".job-title", ".posting-title"]) ||
    ogTitle?.trim() ||
    "";

  if (!title || title.length < 3) return null;

  const company =
    firstText([
      "[data-company]",
      ".company-name",
      ".employer-name",
      "[class*='company']",
    ]) ||
    document.querySelector('meta[property="og:site_name"]')?.getAttribute("content") ||
    "";

  const location = firstText([
    "[data-location]",
    ".location",
    "[class*='location']",
  ]);

  const descEl =
    document.querySelector("article") ??
    document.querySelector("[role='main']") ??
    document.querySelector(".job-description") ??
    document.querySelector("#content");

  const ogDesc = document.querySelector('meta[property="og:description"]')?.getAttribute("content");
  const description = descEl ? text(descEl) : ogDesc ?? "";

  if (description.length < 40 && !looksLikeJobPage()) {
    return null;
  }

  return buildJob({
    title,
    company,
    location,
    description,
    url: window.location.href.split("?")[0],
    source: "generic",
    confidence: description.length > 200 ? 0.55 : 0.35,
  });
}
