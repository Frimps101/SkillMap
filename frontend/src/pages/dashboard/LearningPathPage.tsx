import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../api/axios";

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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["learning-path"] }),
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-8 w-48 bg-surface-secondary rounded animate-pulse" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 bg-surface-secondary rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6 text-center py-20">
        <p className="text-gray-400 mb-4">Failed to load your learning path.</p>
        <button
          onClick={() => regenerate.mutate()}
          className="bg-brand text-white px-4 py-2 rounded-lg text-sm"
        >
          Generate my path
        </button>
      </div>
    );
  }

  const skills = data?.skills ?? [];

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Learning Path</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Your personalized curriculum based on current market demands.
          </p>
        </div>
        <button
          onClick={() => regenerate.mutate()}
          disabled={regenerate.isPending}
          className="text-sm text-gray-400 border border-surface-border px-3 py-1.5 rounded-lg hover:text-white hover:border-gray-500 transition-colors disabled:opacity-50"
        >
          {regenerate.isPending ? "Regenerating…" : "Regenerate"}
        </button>
      </div>

      {skills.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p className="mb-4">No learning path generated yet.</p>
          <button
            onClick={() => regenerate.mutate()}
            className="bg-brand text-white px-5 py-2.5 rounded-lg text-sm"
          >
            Generate my path
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {[...skills]
            .sort((a, b) => b.priority_rank - a.priority_rank)
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
