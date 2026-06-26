export interface Job {
  id: number;
  title: string;
  company: string;
  location: string;
  job_type: string;
  category: string;
  url: string;
  logo_url: string;
  posted_at: string | null;
  last_verified_at: string | null;
  source_name: string | null;
  is_saved: boolean;
  skills: { id: number; name: string; category: string }[];
}

export interface JobsResponse {
  results: Job[];
  count: number;
  next: string | null;
  previous: string | null;
}

export const PAGE_SIZE = 20;

export const JOB_TYPE_COLORS: Record<string, string> = {
  remote: "text-green-400 bg-green-400/10",
  full_time: "text-blue-400 bg-blue-400/10",
  contract: "text-amber-400 bg-amber-400/10",
  internship: "text-purple-400 bg-purple-400/10",
  part_time: "text-gray-400 bg-gray-400/10",
};

export const CATEGORY_STYLES: Record<string, string> = {
  tech: "text-cyan-400 bg-cyan-400/10",
  design: "text-pink-400 bg-pink-400/10",
  uiux: "text-violet-400 bg-violet-400/10",
};

export const CATEGORY_LABELS: Record<string, string> = {
  tech: "Tech",
  design: "Design",
  uiux: "UI/UX",
};

export function verifiedLabel(dateStr: string): { text: string; fresh: boolean } {
  const diffDays = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
  if (diffDays === 0) return { text: "Verified today", fresh: true };
  if (diffDays === 1) return { text: "Verified yesterday", fresh: true };
  if (diffDays < 7) return { text: `Verified ${diffDays}d ago`, fresh: true };
  if (diffDays < 30) return { text: `Verified ${Math.floor(diffDays / 7)}w ago`, fresh: false };
  return { text: `Verified ${Math.floor(diffDays / 30)}mo ago`, fresh: false };
}

export function buildPageRange(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "…")[] = [1];
  if (current > 3) pages.push("…");
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) {
    pages.push(p);
  }
  if (current < total - 2) pages.push("…");
  pages.push(total);
  return pages;
}
