import type { ExtractedJob, JobCategory, JobType } from "../../shared/types";

export function text(el: Element | null | undefined): string {
  return el?.textContent?.trim().replace(/\s+/g, " ") ?? "";
}

export function attr(el: Element | null | undefined, name: string): string {
  return el?.getAttribute(name)?.trim() ?? "";
}

export function firstText(selectors: string[]): string {
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    const t = text(el);
    if (t) return t;
  }
  return "";
}

export function inferCategory(title: string, description: string): JobCategory {
  const blob = `${title} ${description}`.toLowerCase();
  if (/\b(ui\/ux|ux designer|ui designer|product designer|user experience)\b/.test(blob)) {
    return "uiux";
  }
  if (/\b(designer|figma|sketch|visual design|graphic design|brand design)\b/.test(blob)) {
    return "design";
  }
  return "tech";
}

export function inferJobType(location: string, description: string): JobType {
  const blob = `${location} ${description}`.toLowerCase();
  if (/\b(remote|work from home|wfh)\b/.test(blob)) return "remote";
  if (/\b(intern|internship)\b/.test(blob)) return "internship";
  if (/\b(contract|contractor|freelance)\b/.test(blob)) return "contract";
  if (/\b(part[- ]?time)\b/.test(blob)) return "part_time";
  return "full_time";
}

export function cleanDescription(raw: string, maxLen = 12_000): string {
  const cleaned = raw.replace(/\s+/g, " ").trim();
  return cleaned.length > maxLen ? `${cleaned.slice(0, maxLen)}…` : cleaned;
}

export function buildJob(partial: Partial<ExtractedJob> & Pick<ExtractedJob, "title" | "url">): ExtractedJob {
  const description = partial.description ?? "";
  const location = partial.location ?? "";
  return {
    title: partial.title,
    company: partial.company ?? "",
    location,
    job_type: partial.job_type ?? inferJobType(location, description),
    category: partial.category ?? inferCategory(partial.title, description),
    description: cleanDescription(description),
    url: partial.url,
    logo_url: partial.logo_url ?? "",
    posted_at: partial.posted_at ?? null,
    source: partial.source ?? "generic",
    confidence: partial.confidence ?? 0.5,
  };
}

export function parseJsonLdJobPosting(): Partial<ExtractedJob> | null {
  const scripts = document.querySelectorAll('script[type="application/ld+json"]');
  for (const script of scripts) {
    try {
      const raw = script.textContent?.trim();
      if (!raw) continue;
      const data = JSON.parse(raw) as Record<string, unknown> | Record<string, unknown>[];
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        const job = findJobPosting(item);
        if (job) return job;
      }
    } catch {
      /* ignore invalid JSON-LD */
    }
  }
  return null;
}

function findJobPosting(node: Record<string, unknown>): Partial<ExtractedJob> | null {
  const type = node["@type"];
  const types = Array.isArray(type) ? type : [type];
  if (types.some((t) => typeof t === "string" && /JobPosting/i.test(t))) {
    const hiring = node.hiringOrganization as Record<string, unknown> | undefined;
    const loc = node.jobLocation as Record<string, unknown> | { address?: Record<string, unknown> };
    let location = "";
    if (loc && typeof loc === "object") {
      const addr = (loc as { address?: Record<string, unknown> }).address;
      if (addr && typeof addr === "object") {
        location = [addr.addressLocality, addr.addressRegion, addr.addressCountry]
          .filter(Boolean)
          .join(", ");
      } else if ("name" in loc) {
        location = String(loc.name);
      }
    }
    const desc =
      typeof node.description === "string"
        ? node.description.replace(/<[^>]+>/g, " ")
        : "";
    return {
      title: String(node.title ?? ""),
      company: hiring ? String(hiring.name ?? "") : "",
      location,
      description: desc,
      url: String(node.url ?? window.location.href),
      posted_at: node.datePosted ? String(node.datePosted) : null,
      logo_url: hiring && typeof hiring.logo === "string" ? hiring.logo : "",
      source: "json-ld",
      confidence: 0.9,
    };
  }

  if (Array.isArray(node["@graph"])) {
    for (const child of node["@graph"] as Record<string, unknown>[]) {
      const found = findJobPosting(child);
      if (found) return found;
    }
  }

  return null;
}
