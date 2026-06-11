import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  CVDocument,
  CVReview,
  deleteCV,
  listCVs,
  rereviewCV,
  uploadCV,
} from "../../api/cv";
import { getStoredUser } from "../../store/authStore";

function scoreColor(score: number): string {
  if (score >= 70) return "text-emerald-400";
  if (score >= 45) return "text-amber-400";
  return "text-red-400";
}

function scoreRing(score: number): string {
  if (score >= 70) return "stroke-emerald-400";
  if (score >= 45) return "stroke-amber-400";
  return "stroke-red-400";
}

function ScoreRing({ score }: { score: number }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative w-24 h-24 flex-shrink-0">
      <svg viewBox="0 0 80 80" className="w-24 h-24 -rotate-90">
        <circle cx="40" cy="40" r={r} fill="none" strokeWidth="7" className="stroke-surface-tertiary" />
        <circle
          cx="40" cy="40" r={r} fill="none" strokeWidth="7" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)}
          className={scoreRing(score)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-2xl font-bold ${scoreColor(score)}`}>{score}</span>
        <span className="text-[9px] text-gray-500 uppercase tracking-wider">/ 100</span>
      </div>
    </div>
  );
}

export default function CVReviewPage() {
  const queryClient = useQueryClient();
  const user = getStoredUser();
  const fileRef = useRef<HTMLInputElement>(null);
  const [targetRole, setTargetRole] = useState(
    user?.profile?.target_role || "Software Engineer"
  );
  const [uploadError, setUploadError] = useState("");
  const [dragging, setDragging] = useState(false);

  const { data: cvs, isLoading } = useQuery({
    queryKey: ["cvs"],
    queryFn: listCVs,
    refetchInterval: (query) => {
      const docs = query.state.data as CVDocument[] | undefined;
      const busy = docs?.some(
        (d) =>
          d.latest_review?.status === "pending" ||
          d.latest_review?.status === "processing"
      );
      return busy ? 2500 : false;
    },
  });

  const upload = useMutation({
    mutationFn: (file: File) => uploadCV(file, targetRole),
    onSuccess: () => {
      setUploadError("");
      queryClient.invalidateQueries({ queryKey: ["cvs"] });
    },
    onError: (err: unknown) => {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? "Upload failed. Try a different file.";
      setUploadError(detail);
    },
  });

  const rereview = useMutation({
    mutationFn: (cvId: number) => rereviewCV(cvId, targetRole),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cvs"] }),
  });

  const remove = useMutation({
    mutationFn: (cvId: number) => deleteCV(cvId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cvs"] }),
  });

  function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    upload.mutate(file);
  }

  if (isLoading) {
    return (
      <div className="p-14 space-y-4 max-w-3xl">
        <div className="h-8 w-48 bg-surface-secondary rounded animate-pulse" />
        <div className="h-40 bg-surface-secondary rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="p-14 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-xl font-semibold text-white">CV Review</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          Get your CV scored against live market demand for your target role.
        </p>
      </div>

      {/* Upload card */}
      <div className="bg-surface-secondary border border-surface-border rounded-xl p-5 space-y-4">
        <div className="flex gap-2">
          <input
            value={targetRole}
            onChange={(e) => setTargetRole(e.target.value)}
            placeholder="Target role, e.g. Senior Frontend Engineer"
            className="flex-1 bg-surface border border-surface-border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand"
          />
        </div>

        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            handleFiles(e.dataTransfer.files);
          }}
          onClick={() => fileRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
            dragging ? "border-brand bg-brand/5" : "border-surface-border hover:border-gray-500"
          }`}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.docx,.txt"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          {upload.isPending ? (
            <p className="text-sm text-brand animate-pulse">Uploading & analysing…</p>
          ) : (
            <>
              <p className="text-sm text-gray-300">
                Drop your CV here or <span className="text-brand">browse</span>
              </p>
              <p className="text-xs text-gray-500 mt-1">PDF, DOCX, or TXT — max 5 MB</p>
            </>
          )}
        </div>

        {uploadError && (
          <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-2.5">
            {uploadError}
          </p>
        )}
      </div>

      {/* Reviews */}
      {(cvs ?? []).map((cv) => (
        <CVCard
          key={cv.id}
          cv={cv}
          onRereview={() => rereview.mutate(cv.id)}
          onDelete={() => remove.mutate(cv.id)}
          rereviewPending={rereview.isPending}
        />
      ))}

      {(cvs ?? []).length === 0 && (
        <p className="text-sm text-gray-500 text-center py-8">
          No CVs uploaded yet. Drop one above to get your first market-grounded review.
        </p>
      )}
    </div>
  );
}

function CVCard({
  cv,
  onRereview,
  onDelete,
  rereviewPending,
}: {
  cv: CVDocument;
  onRereview: () => void;
  onDelete: () => void;
  rereviewPending: boolean;
}) {
  const review = cv.latest_review;

  return (
    <div className="bg-surface-secondary border border-surface-border rounded-xl p-6 space-y-5">
      {/* Header row */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h2 className="text-sm font-medium text-white truncate">{cv.original_filename}</h2>
          <p className="text-xs text-gray-500">
            Uploaded {new Date(cv.uploaded_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
            {review?.target_role && <> · target: {review.target_role}</>}
            {review && review.market_job_count > 0 && (
              <> · {review.market_job_count} live postings analysed</>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onRereview}
            disabled={rereviewPending || review?.status === "processing" || review?.status === "pending"}
            className="text-xs px-3 py-1.5 rounded-lg bg-surface border border-surface-border text-gray-300 hover:text-white transition-colors disabled:opacity-50"
          >
            ↻ Re-review
          </button>
          <button
            onClick={onDelete}
            className="text-xs px-3 py-1.5 rounded-lg bg-surface border border-surface-border text-gray-500 hover:text-red-400 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Status states */}
      {!review && <p className="text-sm text-gray-500">No review yet.</p>}

      {review && (review.status === "pending" || review.status === "processing") && (
        <div className="flex items-center gap-3 py-4">
          <svg className="animate-spin w-4 h-4 text-brand" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <p className="text-sm text-brand animate-pulse">
            Analysing your CV against live job market data…
          </p>
        </div>
      )}

      {review && review.status === "failed" && (
        <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-2.5">
          Review failed{review.error ? `: ${review.error}` : "."} Hit Re-review to try again.
        </p>
      )}

      {review && review.status === "done" && <ReviewResult review={review} />}
    </div>
  );
}

function ReviewResult({ review }: { review: CVReview }) {
  return (
    <div className="space-y-5">
      {/* Score + summary */}
      <div className="flex gap-5 items-start">
        <ScoreRing score={review.overall_score} />
        <p className="text-sm text-gray-300 leading-relaxed flex-1">{review.summary}</p>
      </div>

      {/* Strengths & improvements */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-surface rounded-lg p-4">
          <h3 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2">Strengths</h3>
          <ul className="space-y-1.5">
            {review.strengths.map((s, i) => (
              <li key={i} className="text-xs text-gray-300 flex gap-2">
                <span className="text-emerald-400 flex-shrink-0">✓</span>{s}
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-surface rounded-lg p-4">
          <h3 className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-2">Improvements</h3>
          <ul className="space-y-1.5">
            {review.improvements.map((s, i) => (
              <li key={i} className="text-xs text-gray-300 flex gap-2">
                <span className="text-amber-400 flex-shrink-0">→</span>{s}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Skill gap vs market */}
      {review.missing_skills.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            In-demand skills missing from your CV
          </h3>
          <div className="space-y-1.5">
            {review.missing_skills.slice(0, 8).map((s) => (
              <div key={s.name} className="flex items-center gap-3">
                <span className="text-xs text-gray-300 capitalize w-36 truncate flex-shrink-0">{s.name}</span>
                <div className="flex-1 h-2 bg-surface rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand rounded-full"
                    style={{ width: `${Math.min(100, s.pct)}%` }}
                  />
                </div>
                <span className="text-[10px] text-gray-500 w-24 flex-shrink-0 text-right">
                  {s.pct}% of postings
                </span>
              </div>
            ))}
          </div>
          <Link
            to="/learning"
            className="inline-block mt-3 text-xs text-brand hover:underline"
          >
            Build these into your Learning Path →
          </Link>
        </div>
      )}

      {/* Matched skills */}
      {review.matched_skills.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Skills employers recognised in your CV
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {review.matched_skills.map((s) => (
              <span
                key={s.name}
                className="text-[10px] px-2.5 py-1 rounded-full bg-emerald-400/10 text-emerald-400 border border-emerald-500/20 capitalize"
              >
                {s.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Job matches */}
      {review.job_matches.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Best matches in the jobs feed
          </h3>
          <div className="space-y-2">
            {review.job_matches.map((m) => (
              <div
                key={m.job_id}
                className="flex items-center gap-3 bg-surface rounded-lg px-4 py-2.5"
              >
                <span className={`text-sm font-bold w-12 flex-shrink-0 ${scoreColor(m.score)}`}>
                  {m.score}%
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-white truncate">{m.title}</p>
                  <p className="text-[10px] text-gray-500 truncate">
                    {m.company || "Unknown"} · matches: {m.matched.join(", ") || "—"}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <Link to="/jobs" className="inline-block mt-2 text-xs text-brand hover:underline">
            See all jobs →
          </Link>
        </div>
      )}
    </div>
  );
}
