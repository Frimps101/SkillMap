import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { api } from "../../api/axios";
import { getStoredUser } from "../../store/authStore";

interface SkillResource {
  title: string;
  url: string;
  type: "free" | "paid";
}

interface LearningSkill {
  name: string;
  priority_rank: number;
  reason: string;
  hours_to_proficiency: number;
  resources: SkillResource[];
}

interface LearningPath {
  id: number;
  skills: LearningSkill[];
  generated_at: string;
}

function BrainIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.5 2a2.5 2.5 0 0 1 2.5 2.5v.5h.5a2.5 2.5 0 0 1 0 5H12v.5a2.5 2.5 0 0 1-5 0V10h-.5a2.5 2.5 0 0 1 0-5H7V4.5A2.5 2.5 0 0 1 9.5 2z" />
      <path d="M14.5 2a2.5 2.5 0 0 0-2.5 2.5v.5h-.5a2.5 2.5 0 0 0 0 5H12v.5a2.5 2.5 0 0 0 5 0V10h.5a2.5 2.5 0 0 0 0-5H17V4.5A2.5 2.5 0 0 0 14.5 2z" />
      <path d="M12 15v7" />
      <path d="M8 19h8" />
    </svg>
  );
}

export default function LearningPathPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const user = getStoredUser();

  const hasProfile =
    user?.profile?.current_role?.trim() && user?.profile?.target_role?.trim();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["learning-path"],
    queryFn: async () => {
      const { data } = await api.get("/api/recommendations/");
      return data as LearningPath;
    },
  });

  const regenerate = useMutation({
    mutationFn: async () => {
      const { data } = await api.post("/api/recommendations/regenerate/");
      return data as LearningPath;
    },
    onSuccess: (newData) => {
      queryClient.setQueryData(["learning-path"], newData);
    },
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-4 max-w-2xl">
        <div className="h-8 w-48 bg-surface-secondary rounded animate-pulse" />
        <div className="h-4 w-72 bg-surface-secondary rounded animate-pulse" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 bg-surface-secondary rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  const skills = data?.skills ?? [];
  const generatedAt = data?.generated_at;
  const isEmpty = !isError && skills.length === 0;
  const showEmpty = isError || isEmpty;

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Learning Path</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Your personalized curriculum based on current market demands.
          </p>
        </div>
        {!showEmpty && (
          <button
            onClick={() => regenerate.mutate()}
            disabled={regenerate.isPending}
            className="text-sm text-gray-400 border border-surface-border px-3 py-1.5 rounded-lg hover:text-white hover:border-gray-500 transition-colors disabled:opacity-50"
          >
            {regenerate.isPending ? "Regenerating…" : "↻ Regenerate"}
          </button>
        )}
      </div>

      {generatedAt && !showEmpty && (
        <p className="text-xs text-gray-500 -mt-4">
          Last generated {new Date(generatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
        </p>
      )}

      {showEmpty ? (
        <div className="bg-surface-secondary border border-surface-border rounded-xl p-10 flex flex-col items-center text-center gap-4">
          <div className="text-brand opacity-60">
            <BrainIcon />
          </div>
          <div>
            <p className="text-sm font-medium text-white mb-1">No learning path yet</p>
            <p className="text-xs text-gray-400 max-w-xs">
              {!hasProfile
                ? "Set your current role and target role in Settings first, then generate your path."
                : "Claude will analyse trending skills and your career goals to build a ranked curriculum for you."}
            </p>
          </div>

          {!hasProfile ? (
            <button
              onClick={() => navigate("/settings")}
              className="bg-brand text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors hover:bg-brand-hover"
            >
              Set up my profile →
            </button>
          ) : (
            <button
              onClick={() => regenerate.mutate()}
              disabled={regenerate.isPending}
              className="bg-brand text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors hover:bg-brand-hover disabled:opacity-50"
            >
              {regenerate.isPending ? "Generating…" : "Generate my path"}
            </button>
          )}

          {isError && (
            <p className="text-xs text-red-400 mt-1">
              The recommendations service couldn't be reached. Make sure the backend is running.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {[...skills]
            .sort((a, b) => a.priority_rank - b.priority_rank)
            .map((skill) => (
              <div
                key={skill.name}
                className="bg-surface-secondary border border-surface-border rounded-xl p-4"
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="w-7 h-7 rounded-full bg-brand/20 text-brand text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {skill.priority_rank}
                  </span>
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-white capitalize">{skill.name}</h3>
                    <p className="text-xs text-gray-500">{skill.hours_to_proficiency}h to job-ready</p>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mb-3">{skill.reason}</p>
                <div className="flex flex-wrap gap-2">
                  {skill.resources.map((r) => (
                    <a
                      key={r.url}
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`text-[10px] px-2.5 py-1 rounded-full border transition-colors hover:opacity-80 ${
                        r.type === "free"
                          ? "border-green-500/30 text-green-400 bg-green-400/5"
                          : "border-amber-500/30 text-amber-400 bg-amber-400/5"
                      }`}
                    >
                      {r.title} · {r.type}
                    </a>
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
