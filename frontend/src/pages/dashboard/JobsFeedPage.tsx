import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { api } from "../../api/axios";
import JobCard from "../../components/jobs/JobCard";
import { useSaveJobMutation } from "../../hooks/useSaveJobMutation";
import { buildPageRange, PAGE_SIZE, type JobsResponse } from "../../types/job";

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

export default function JobsFeedPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [category, setCategory] = useState("");
  const [jobType, setJobType] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [page, setPage] = useState(1);
  const filterRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, category, jobType]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [page]);

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
  const queryKey = ["jobs", debouncedSearch, category, jobType, page];

  const { data, isLoading, isFetching } = useQuery({
    queryKey,
    queryFn: async () => {
      const params: Record<string, string | number> = { page };
      if (debouncedSearch) params.search = debouncedSearch;
      if (category) params.category = category;
      if (jobType) params.job_type = jobType;
      const { data } = await api.get("/api/jobs/", { params });
      return data as JobsResponse;
    },
    placeholderData: (prev) => prev,
  });

  const saveMutation = useSaveJobMutation(queryKey);

  const jobs = data?.results ?? [];
  const totalCount = data?.count ?? 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const from = totalCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, totalCount);

  return (
    <div className="flex flex-col h-full">
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

        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
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
                    onClick={() => {
                      setCategory("");
                      setJobType("");
                    }}
                    className="w-full text-xs text-gray-500 hover:text-white py-1.5 border border-surface-border rounded-lg transition-colors"
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {activeFilterCount > 0 && (
          <div className="flex items-center gap-2 mt-3">
            {category && (
              <span className="flex items-center gap-1.5 text-xs bg-brand/10 text-brand border border-brand/20 px-2.5 py-1 rounded-full">
                {CATEGORIES.find((c) => c.value === category)?.label}
                <button onClick={() => setCategory("")} className="hover:text-white">
                  ✕
                </button>
              </span>
            )}
            {jobType && (
              <span className="flex items-center gap-1.5 text-xs bg-brand/10 text-brand border border-brand/20 px-2.5 py-1 rounded-full">
                {JOB_TYPES.find((t) => t.value === jobType)?.label}
                <button onClick={() => setJobType("")} className="hover:text-white">
                  ✕
                </button>
              </span>
            )}
          </div>
        )}
      </div>

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
              Go to{" "}
              <Link to="/sources" className="text-brand hover:underline">
                Source Manager
              </Link>{" "}
              and trigger a scrape to populate the feed.
            </p>
          </div>
        ) : (
          <>
            <div className={`grid grid-cols-2 gap-3 w-full transition-opacity ${isFetching ? "opacity-60" : "opacity-100"}`}>
              {jobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  savePending={
                    saveMutation.isPending && saveMutation.variables?.job.id === job.id
                  }
                  onToggleSave={(j) => saveMutation.mutate({ job: j, save: !j.is_saved })}
                />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between">
                <p className="text-xs text-gray-500">
                  Page {page} of {totalPages}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => p - 1)}
                    disabled={page === 1}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-gray-400 border border-surface-border bg-surface-secondary hover:text-white hover:border-gray-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    Prev
                  </button>
                  <div className="flex items-center gap-1 mx-1">
                    {buildPageRange(page, totalPages).map((p, i) =>
                      p === "…" ? (
                        <span key={`ellipsis-${i}`} className="px-2 text-xs text-gray-600">
                          …
                        </span>
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
                  <button
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page === totalPages}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-gray-400 border border-surface-border bg-surface-secondary hover:text-white hover:border-gray-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
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
