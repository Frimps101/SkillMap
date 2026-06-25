import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api/axios";
import { saveJob, unsaveJob } from "../../api/jobs";

interface Job {
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

interface JobsResponse {
  results: Job[];
  count: number;
  next: string | null;
  previous: string | null;
}

const PAGE_SIZE = 20;

const JOB_TYPE_COLORS: Record<string, string> = {
  remote: "text-green-400 bg-green-400/10",
  full_time: "text-blue-400 bg-blue-400/10",
  contract: "text-amber-400 bg-amber-400/10",
  internship: "text-purple-400 bg-purple-400/10",
  part_time: "text-gray-400 bg-gray-400/10",
};

const CATEGORY_STYLES: Record<string, string> = {
  tech: "text-cyan-400 bg-cyan-400/10",
  design: "text-pink-400 bg-pink-400/10",
  uiux: "text-violet-400 bg-violet-400/10",
};

const CATEGORY_LABELS: Record<string, string> = {
  tech: "Tech",
  design: "Design",
  uiux: "UI/UX",
};

const CATEGORIES = [
  { value: "", label: "All categories" },
  { value: "tech", label: "Tech" },
  { value: "design", label: "Design" },
  { value: "uiux", label: "UI/UX" },
];

const JOB_TYPES = [
  { value: "", label: "All types" },
  { value: "full_time", label: "Full-time" },
  { value: "remote", label: "Remote" },
  { value: "contract", label: "Contract" },
  { value: "internship", label: "Internship" },
  { value: "part_time", label: "Part-time" },
];

function verifiedLabel(dateStr: string): { text: string; fresh: boolean } {
  const diffDays = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
  if (diffDays === 0) return { text: "Verified today", fresh: true };
  if (diffDays === 1) return { text: "Verified yesterday", fresh: true };
  if (diffDays < 7)   return { text: `Verified ${diffDays}d ago`, fresh: true };
  if (diffDays < 30)  return { text: `Verified ${Math.floor(diffDays / 7)}w ago`, fresh: false };
  return { text: `Verified ${Math.floor(diffDays / 30)}mo ago`, fresh: false };
}

// Build a compact page-number list: [1, …, p-1, p, p+1, …, total]
function buildPageRange(current: number, total: number): (number | "…")[] {
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

function SaveJobButton({
  job,
  onToggle,
  pending,
}: {
  job: Job;
  onToggle: (job: Job) => void;
  pending: boolean;
}) {
  const saved = Boolean(job.is_saved);

  return (
    <button
      type="button"
      aria-label={saved ? "Unsave job" : "Save job"}
      title={saved ? "Unsave job" : "Save job"}
      aria-pressed={saved}
      disabled={pending}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onToggle(job);
      }}
      className={`p-1.5 rounded-lg transition-colors disabled:opacity-50 ${
        saved
          ? "text-brand bg-brand/15 hover:bg-brand/25"
          : "text-gray-500 hover:text-white hover:bg-surface-tertiary"
      }`}
    >
      {saved ? (
        <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"
            fill="#4f6ef7"
            stroke="#4f6ef7"
            strokeWidth="1"
          />
        </svg>
      ) : (
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        </svg>
      )}
    </button>
  );
}

export default function JobsFeedPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [category, setCategory] = useState("");
  const [jobType, setJobType] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [page, setPage] = useState(1);
  const filterRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  // Reset to page 1 when filters / search change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, category, jobType]);

  // Scroll list to top on page change
  useEffect(() => {
    listRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [page]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const activeFilterCount = [category, jobType].filter(Boolean).length;
  const queryClient = useQueryClient();

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["jobs", debouncedSearch, category, jobType, page],
    queryFn: async () => {
      const params: Record<string, string | number> = { page };
      if (debouncedSearch) params.search = debouncedSearch;
      if (category) params.category = category;
      if (jobType) params.job_type = jobType;
      const { data } = await api.get("/api/jobs/", { params });
      return data as JobsResponse;
    },
    placeholderData: (prev) => prev, // keep previous page visible while fetching
  });

  const saveMutation = useMutation({
    mutationFn: async ({ job, save }: { job: Job; save: boolean }) => {
      if (save) await saveJob(job.id);
      else await unsaveJob(job.id);
    },
    onMutate: async ({ job, save }) => {
      const key = ["jobs", debouncedSearch, category, jobType, page];
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<JobsResponse>(key);
      queryClient.setQueryData<JobsResponse>(key, (old) => {
        if (!old) return old;
        return {
          ...old,
          results: old.results.map((j) =>
            j.id === job.id ? { ...j, is_saved: save } : j
          ),
        };
      });
      return { previous, key };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(context.key, context.previous);
      }
    },
  });

  const jobs = data?.results ?? [];
  const totalCount = data?.count ?? 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const from = totalCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, totalCount);

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="px-14 pt-10 pb-4">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h1 className="text-xl font-semibold text-white">Jobs Feed</h1>
              <p className="text-sm text-gray-400 mt-0.5">
                {totalCount > 0
                  ? `Showing ${from}–${to} of ${totalCount.toLocaleString()} jobs`
                  : "No jobs found"}
              </p>
            </div>
            {isFetching && !isLoading && (
              <span className="text-xs text-gray-500 flex items-center gap-1.5">
                <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
                Updating…
              </span>
            )}
          </div>

          {/* Search + Filter row */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search roles, companies, skills…"
                className="w-full bg-surface-secondary border border-surface-border rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand transition-colors"
              />
            </div>

            {/* Filter button + dropdown */}
            <div className="relative" ref={filterRef}>
              <button
                onClick={() => setFilterOpen((o) => !o)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
                  filterOpen || activeFilterCount > 0
                    ? "border-brand text-brand bg-brand/10"
                    : "border-surface-border text-gray-400 hover:text-white hover:border-gray-500 bg-surface-secondary"
                }`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                </svg>
                Filters
                {activeFilterCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-brand text-white text-[10px] font-bold flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </button>

              {filterOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-surface-secondary border border-surface-border rounded-xl p-4 z-20 space-y-4">
                  <div>
                    <label className="block text-xs text-gray-500 uppercase tracking-wider mb-2">
                      Category
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {CATEGORIES.map(({ value, label }) => (
                        <button
                          key={value}
                          onClick={() => setCategory(value)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                            category === value
                              ? "bg-brand text-white"
                              : "bg-surface-tertiary text-gray-400 hover:text-white"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-500 uppercase tracking-wider mb-2">
                      Job Type
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {JOB_TYPES.map(({ value, label }) => (
                        <button
                          key={value}
                          onClick={() => setJobType(value)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                            jobType === value
                              ? "bg-brand text-white"
                              : "bg-surface-tertiary text-gray-400 hover:text-white"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {activeFilterCount > 0 && (
                    <button
                      onClick={() => { setCategory(""); setJobType(""); }}
                      className="w-full text-xs text-gray-500 hover:text-white py-1.5 border border-surface-border rounded-lg transition-colors"
                    >
                      Clear all filters
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Active filter chips */}
          {activeFilterCount > 0 && (
            <div className="flex items-center gap-2 mt-3">
              {category && (
                <span className="flex items-center gap-1.5 text-xs bg-brand/10 text-brand border border-brand/20 px-2.5 py-1 rounded-full">
                  {CATEGORIES.find(c => c.value === category)?.label}
                  <button onClick={() => setCategory("")} className="hover:text-white">✕</button>
                </span>
              )}
              {jobType && (
                <span className="flex items-center gap-1.5 text-xs bg-brand/10 text-brand border border-brand/20 px-2.5 py-1 rounded-full">
                  {JOB_TYPES.find(t => t.value === jobType)?.label}
                  <button onClick={() => setJobType("")} className="hover:text-white">✕</button>
                </span>
              )}
            </div>
          )}
      </div>

      {/* Job list */}
      <div ref={listRef} className="flex-1 overflow-y-auto px-14 pb-14">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-36 bg-surface-secondary rounded-xl animate-pulse" />
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-24 text-gray-500">
            <svg className="mx-auto mb-4 text-gray-700" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <path d="M8 21h8M12 17v4" />
            </svg>
            <p className="text-base mb-1">No jobs yet</p>
            <p className="text-sm">
              Go to <Link to="/sources" className="text-brand hover">Source Manager</Link> and trigger a scrape to populate the feed.
            </p>
          </div>
        ) : (
          <>
            <div className={`grid grid-cols-2 gap-3 w-full transition-opacity ${isFetching ? "opacity-60" : "opacity-100"}`}>
              {jobs.map((job) => (
                <div
                  key={job.id}
                  className="flex flex-col bg-surface-secondary border border-surface-border rounded-xl p-5 min-h-[160px] hover:border-brand/40 transition-colors group"
                >
                  {/* Card header */}
                  <div className="flex items-start gap-3 mb-4">
                    {job.logo_url ? (
                      <img
                        src={job.logo_url}
                        alt={job.company}
                        className="w-9 h-9 rounded-lg object-contain bg-surface-tertiary flex-shrink-0"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                          (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden");
                        }}
                      />
                    ) : null}
                    <div className={`w-9 h-9 rounded-lg bg-surface-tertiary flex-shrink-0 flex items-center justify-center ${job.logo_url ? "hidden" : ""}`}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-500">
                        <rect x="2" y="7" width="20" height="14" rx="2" />
                        <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
                        <line x1="12" y1="12" x2="12" y2="16" />
                        <line x1="10" y1="14" x2="14" y2="14" />
                      </svg>
                    </div>
                    <a
                      href={job.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 min-w-0"
                    >
                      <h3 className="text-sm font-medium text-white group-hover:text-brand transition-colors leading-snug line-clamp-2">
                        {job.title}
                      </h3>
                      <p className="text-xs text-gray-400 mt-0.5 truncate">
                        {job.company}{job.location ? ` · ${job.location}` : ""}
                      </p>
                    </a>
                    <div className="flex items-center gap-0.5 flex-shrink-0">
                      <SaveJobButton
                        job={job}
                        pending={
                          saveMutation.isPending &&
                          saveMutation.variables?.job.id === job.id
                        }
                        onToggle={(j) =>
                          saveMutation.mutate({ job: j, save: !j.is_saved })
                        }
                      />
                      <a
                        href={job.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg text-gray-600 hover:text-brand hover:bg-surface-tertiary transition-colors"
                        aria-label="Open job posting"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M7 17L17 7M7 7h10v10" />
                        </svg>
                      </a>
                    </div>
                  </div>

                  {/* Skills */}
                  {job.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {job.skills.slice(0, 4).map((s) => (
                        <span key={s.id} className="text-[10px] px-2 py-0.5 bg-surface-tertiary text-gray-300 rounded">
                          {s.name}
                        </span>
                      ))}
                      {job.skills.length > 4 && (
                        <span className="text-[10px] px-2 py-0.5 text-gray-500">
                          +{job.skills.length - 4}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Badges + date */}
                  <a
                    href={job.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-2 mt-auto flex-wrap"
                  >
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${CATEGORY_STYLES[job.category] ?? "text-gray-400 bg-gray-400/10"}`}>
                        {CATEGORY_LABELS[job.category] ?? job.category}
                      </span>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${JOB_TYPE_COLORS[job.job_type] ?? "text-gray-400 bg-gray-400/10"}`}>
                        {job.job_type.replace("_", " ")}
                      </span>
                      {job.source_name && (
                        <span className="text-[10px] text-gray-500 px-2 py-0.5 rounded-full bg-surface-tertiary">
                          {job.source_name}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-0.5">
                      {job.posted_at && (
                        <span className="text-[10px] text-gray-500 whitespace-nowrap">
                          {new Date(job.posted_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                      )}
                      {job.last_verified_at && (() => {
                        const { text, fresh } = verifiedLabel(job.last_verified_at);
                        return (
                          <span className={`flex items-center gap-1 text-[10px] whitespace-nowrap ${fresh ? "text-emerald-500" : "text-gray-500"}`}>
                            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                              {fresh && <path d="M9 12l2 2 4-4" />}
                            </svg>
                            {text}
                          </span>
                        );
                      })()}
                    </div>
                  </a>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between">
                <p className="text-xs text-gray-500">
                  Page {page} of {totalPages}
                </p>

                <div className="flex items-center gap-1">
                  {/* Prev */}
                  <button
                    onClick={() => setPage((p) => p - 1)}
                    disabled={page === 1}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-gray-400 border border-surface-border bg-surface-secondary hover:text-white hover:border-gray-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M15 18l-6-6 6-6" />
                    </svg>
                    Prev
                  </button>

                  {/* Page numbers */}
                  <div className="flex items-center gap-1 mx-1">
                    {buildPageRange(page, totalPages).map((p, i) =>
                      p === "…" ? (
                        <span key={`ellipsis-${i}`} className="px-2 text-xs text-gray-600">…</span>
                      ) : (
                        <button
                          key={p}
                          onClick={() => setPage(p)}
                          className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors ${
                            p === page
                              ? "bg-brand text-white"
                              : "text-gray-400 hover:text-white hover:bg-surface-tertiary"
                          }`}
                        >
                          {p}
                        </button>
                      )
                    )}
                  </div>

                  {/* Next */}
                  <button
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page === totalPages}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-gray-400 border border-surface-border bg-surface-secondary hover:text-white hover:border-gray-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
