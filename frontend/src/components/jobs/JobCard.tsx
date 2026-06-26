import type { Job } from "../../types/job";
import {
  CATEGORY_LABELS,
  CATEGORY_STYLES,
  JOB_TYPE_COLORS,
  verifiedLabel,
} from "../../types/job";

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

export default function JobCard({
  job,
  onToggleSave,
  savePending,
}: {
  job: Job;
  onToggleSave: (job: Job) => void;
  savePending: boolean;
}) {
  return (
    <div className="flex flex-col bg-surface-secondary border border-surface-border rounded-xl p-5 min-h-[160px] hover:border-brand/40 transition-colors group">
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
        <div
          className={`w-9 h-9 rounded-lg bg-surface-tertiary flex-shrink-0 flex items-center justify-center ${job.logo_url ? "hidden" : ""}`}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="text-gray-500"
          >
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
            {job.company}
            {job.location ? ` · ${job.location}` : ""}
          </p>
        </a>
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <SaveJobButton job={job} pending={savePending} onToggle={onToggleSave} />
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

      {job.skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {job.skills.slice(0, 4).map((s) => (
            <span key={s.id} className="text-[10px] px-2 py-0.5 bg-surface-tertiary text-gray-300 rounded">
              {s.name}
            </span>
          ))}
          {job.skills.length > 4 && (
            <span className="text-[10px] px-2 py-0.5 text-gray-500">+{job.skills.length - 4}</span>
          )}
        </div>
      )}

      <a
        href={job.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-between gap-2 mt-auto flex-wrap"
      >
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${CATEGORY_STYLES[job.category] ?? "text-gray-400 bg-gray-400/10"}`}
          >
            {CATEGORY_LABELS[job.category] ?? job.category}
          </span>
          <span
            className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${JOB_TYPE_COLORS[job.job_type] ?? "text-gray-400 bg-gray-400/10"}`}
          >
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
              {new Date(job.posted_at).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
          )}
          {job.last_verified_at && (() => {
            const { text, fresh } = verifiedLabel(job.last_verified_at);
            return (
              <span
                className={`flex items-center gap-1 text-[10px] whitespace-nowrap ${fresh ? "text-emerald-500" : "text-gray-500"}`}
              >
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
  );
}
