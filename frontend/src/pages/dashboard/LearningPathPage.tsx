import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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

export default function LearningPathPage() {
  const queryClient = useQueryClient();
  const user = getStoredUser();

  const [targetRole, setTargetRole] = useState(
    user?.profile?.target_role || "Software Engineer"
  );

  const { data, isLoading } = useQuery({
    queryKey: ["learning-path"],
    queryFn: async () => {
      const { data } = await api.get("/api/recommendations/");
      return data as LearningPath;
    },
  });

  const generate = useMutation({
    mutationFn: async () => {
      const { data } = await api.post("/api/recommendations/regenerate/", {
        target_role: targetRole,
      });
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
  const hasSkills = skills.length > 0;

  return (
    <div className="p-14 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Learning Path</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          Your personalized curriculum based on current market demands.
        </p>
      </div>

      {/* Role input */}
      <div className="bg-surface-secondary border border-surface-border rounded-xl p-5 space-y-3">
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wider text-center">Generate a path for</p>
        <div className="flex gap-2">
          <input
            value={targetRole}
            onChange={(e) => setTargetRole(e.target.value)}
            placeholder="e.g. Senior Full-Stack Engineer"
            className="flex-1 bg-surface border border-surface-border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand"
          />
          <button
            onClick={() => generate.mutate()}
            disabled={generate.isPending || !targetRole.trim()}
            className="flex items-center gap-2 bg-brand text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-brand-hover disabled:opacity-50 whitespace-nowrap"
          >
            {generate.isPending && (
              <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            )}
            {generate.isPending ? "Generating…" : hasSkills ? "↻ Regenerate" : "Generate"}
          </button>
        </div>
        {generate.isPending && (
          <p className="text-xs text-brand animate-pulse text-center">
            Claude is building your path… this takes ~20 seconds
          </p>
        )}
        {generatedAt && !generate.isPending && (
          <p className="text-xs text-gray-600 text-center">
            Last generated {new Date(generatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
          </p>
        )}
        {generate.isError && (
          <p className="text-xs text-red-400">
            Generation failed — check that your <code className="font-mono">ANTHROPIC_API_KEY</code> is set in <code className="font-mono">.env</code> and restart the backend.
          </p>
        )}
      </div>

      {/* Results */}
      {hasSkills && (
        <div className="grid grid-cols-2 gap-3">
          {[...skills]
            .sort((a, b) => a.priority_rank - b.priority_rank)
            .map((skill) => (
              <div
                key={skill.name}
                className="bg-surface-secondary border border-surface-border rounded-xl p-5"
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="w-7 h-7 rounded-full bg-brand/20 text-brand text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {skill.priority_rank}
                  </span>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-white capitalize truncate">{skill.name}</h3>
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
