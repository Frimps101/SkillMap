import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "../../api/axios";

interface Skill {
  id: number;
  name: string;
  category: string;
  weekly_mentions: number;
}

const CATEGORY_TABS = [
  { value: "", label: "All" },
  { value: "technical", label: "Technical" },
  { value: "design", label: "Design" },
  { value: "soft", label: "Soft Skills" },
];

const CATEGORY_STYLES: Record<string, string> = {
  design: "text-purple-400 bg-purple-400/10",
  soft: "text-green-400 bg-green-400/10",
  technical: "text-blue-400 bg-blue-400/10",
};

const BAR_COLOR: Record<string, string> = {
  design: "#a78bfa",
  soft: "#34d399",
  technical: "#4f6ef7",
};

export default function SkillsDashboardPage() {
  const [category, setCategory] = useState("");

  const { data: trending, isLoading: trendingLoading } = useQuery({
    queryKey: ["skills-trending"],
    queryFn: async () => {
      const { data } = await api.get("/api/skills/trending/");
      // endpoint may return a paginated envelope or a bare array
      return (Array.isArray(data) ? data : (data?.results ?? [])) as Skill[];
    },
  });

  const { data: skills, isLoading: skillsLoading } = useQuery({
    queryKey: ["skills", category],
    queryFn: async () => {
      const { data } = await api.get("/api/skills/", {
        params: category ? { category } : {},
      });
      // normalise: paginated envelope or bare array
      if (Array.isArray(data)) return { results: data as Skill[], count: data.length };
      return data as { results: Skill[]; count: number };
    },
  });

  const chartData = (trending ?? []).map((s) => ({
    name: s.name.length > 12 ? s.name.slice(0, 12) + "…" : s.name,
    fullName: s.name,
    mentions: s.weekly_mentions,
    category: s.category,
  }));

  const skillList = skills?.results ?? [];
  const isLoading = trendingLoading || skillsLoading;
  const hasData = skillList.length > 0 || (trending ?? []).length > 0;

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Skills Dashboard</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Real-time analysis of industry demand across monitored sources.
          </p>
        </div>
        {skills?.count != null && (
          <span className="text-xs text-gray-500 border border-surface-border px-3 py-1.5 rounded-lg">
            {skills.count} skills tracked
          </span>
        )}
      </div>

      {/* Category tabs */}
      <div className="flex gap-2">
        {CATEGORY_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setCategory(tab.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              category === tab.value
                ? "bg-brand text-white"
                : "bg-surface-secondary text-gray-400 hover:text-white border border-surface-border"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        /* Loading skeletons */
        <div className="space-y-6">
          <div className="bg-surface-secondary border border-surface-border rounded-xl p-5 h-64 animate-pulse" />
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-28 bg-surface-secondary rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      ) : !hasData ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-14 h-14 rounded-xl bg-surface-secondary border border-surface-border flex items-center justify-center mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-600">
              <path d="M3 3v18h18" />
              <path d="M18 17V9M13 17V5M8 17v-3" />
            </svg>
          </div>
          <p className="text-white font-medium mb-1">No skill data yet</p>
          <p className="text-sm text-gray-500 max-w-xs">
            Skills are extracted from job descriptions using AI. Add your{" "}
            <span className="text-brand">ANTHROPIC_API_KEY</span> to{" "}
            <code className="text-xs bg-surface-secondary px-1.5 py-0.5 rounded">.env</code>{" "}
            and trigger a scrape from Source Manager.
          </p>
        </div>
      ) : (
        <>
          {/* Bar chart */}
          {chartData.length > 0 && (
            <div className="bg-surface-secondary border border-surface-border rounded-xl p-5">
              <h2 className="text-sm font-medium text-white mb-4">
                Top 20 Skills by Weekly Mentions
              </h2>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "#6b7280", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "#6b7280", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#161b27",
                      border: "1px solid #252d3d",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    labelStyle={{ color: "#fff" }}
                    itemStyle={{ color: "#9ca3af" }}
                    formatter={(value, _name, props) => [value, props.payload.fullName]}
                  />
                  <Bar dataKey="mentions" radius={[3, 3, 0, 0]}>
                    {chartData.map((entry, i) => (
                      <Cell key={i} fill={BAR_COLOR[entry.category] ?? "#4f6ef7"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              {/* Legend */}
              <div className="flex items-center gap-4 mt-3">
                {Object.entries(BAR_COLOR).map(([cat, color]) => (
                  <div key={cat} className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-sm" style={{ background: color }} />
                    <span className="text-xs text-gray-500 capitalize">{cat}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Skill cards */}
          {skillList.length > 0 ? (
            <div className="grid grid-cols-3 gap-3">
              {skillList.map((skill) => (
                <div
                  key={skill.id}
                  className="bg-surface-secondary border border-surface-border rounded-xl p-4"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="text-sm font-medium text-white capitalize leading-tight">
                      {skill.name}
                    </p>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full flex-shrink-0 ${
                        CATEGORY_STYLES[skill.category] ?? "text-gray-400 bg-gray-400/10"
                      }`}
                    >
                      {skill.category}
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-white">
                    {skill.weekly_mentions.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">mentions this week</p>
                  <button className="mt-3 w-full text-xs text-brand border border-brand/30 rounded-lg py-1.5 hover:bg-brand/10 transition-colors">
                    Find learning resources
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 text-gray-500 text-sm">
              No skills match the selected category.
            </div>
          )}
        </>
      )}
    </div>
  );
}
