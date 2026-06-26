import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { listSavedJobs } from "../../api/jobs";
import JobCard from "../../components/jobs/JobCard";
import { useSaveJobMutation } from "../../hooks/useSaveJobMutation";
import { buildPageRange, PAGE_SIZE } from "../../types/job";

export default function SavedJobsPage() {
  const [page, setPage] = useState(1);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [page]);

  const queryKey = ["saved-jobs", page];
  const { data, isLoading, isFetching } = useQuery({
    queryKey,
    queryFn: () => listSavedJobs(page),
    placeholderData: (prev) => prev,
  });

  const saveMutation = useSaveJobMutation(queryKey, true);

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
            <h1 className="text-xl font-semibold text-white">Saved Jobs</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {totalCount > 0
                ? `Showing ${from}–${to} of ${totalCount.toLocaleString()} saved jobs`
                : "No saved jobs yet"}
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
      </div>

      <div ref={listRef} className="flex-1 overflow-y-auto px-14 pb-14">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-36 bg-surface-secondary rounded-xl animate-pulse" />
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-24 text-gray-500">
            <svg className="mx-auto mb-4 text-gray-700" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
            <p className="text-base mb-1">Nothing saved yet</p>
            <p className="text-sm">
              Browse the{" "}
              <Link to="/jobs" className="text-brand hover:underline">
                Jobs Feed
              </Link>{" "}
              and click the bookmark icon to save roles you want to track.
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
