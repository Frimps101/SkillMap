import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../../api/axios";

interface Source {
  id: number;
  name: string;
  url: string;
  source_type: "api" | "scrape";
  status: "active" | "pending" | "error" | "paused";
  frequency: string;
  selector_config: Record<string, string>;
  is_builtin: boolean;
  last_scraped_at: string | null;
  owner_email: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  active: "text-green-400 bg-green-400/10",
  pending: "text-blue-400 bg-blue-400/10",
  error: "text-red-400 bg-red-400/10",
  paused: "text-gray-400 bg-gray-400/10",
};

export default function SourceManagerPage() {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [newSource, setNewSource] = useState<{
    name: string;
    url: string;
    source_type: "api" | "scrape";
    frequency: string;
    selector_config: Record<string, string>;
  }>({
    name: "",
    url: "",
    source_type: "scrape",
    frequency: "6h",
    selector_config: {},
  });
  const [selectorInput, setSelectorInput] = useState("{}");

  const { data } = useQuery({
    queryKey: ["sources"],
    queryFn: async () => {
      const { data } = await api.get("/api/sources/");
      return data as { results: Source[] };
    },
  });

  const triggerScrape = useMutation({
    mutationFn: (id: number) => api.post(`/api/sources/${id}/trigger/`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sources"] }),
  });

  const deleteSource = useMutation({
    mutationFn: (id: number) => api.delete(`/api/sources/${id}/`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sources"] }),
  });

  const addSource = useMutation({
    mutationFn: () => {
      let selectors = {};
      try { selectors = JSON.parse(selectorInput); } catch { selectors = {}; }
      return api.post("/api/sources/", { ...newSource, selector_config: selectors });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sources"] });
      setShowAdd(false);
      setNewSource({ name: "", url: "", source_type: "scrape", frequency: "6h", selector_config: {} });
      setSelectorInput("{}");
    },
  });

  const sources = data?.results ?? [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Data Sources</h1>
          <p className="text-sm text-gray-400 mt-0.5">Manage your active data ingestion pipelines.</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 bg-brand hover:bg-brand-hover text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Add Source
        </button>
      </div>

      {/* Table */}
      <div className="bg-surface-secondary border border-surface-border rounded-xl overflow-hidden">
        <div className="grid grid-cols-5 gap-4 px-4 py-3 border-b border-surface-border text-xs text-gray-500 uppercase tracking-wider font-medium">
          <div className="col-span-2">Source Name</div>
          <div>Type</div>
          <div>Last Scraped</div>
          <div>Status</div>
        </div>

        {sources.length === 0 ? (
          <p className="text-center text-gray-500 text-sm py-12">No sources yet. Add one above.</p>
        ) : (
          sources.map((source) => (
            <div
              key={source.id}
              className="grid grid-cols-5 gap-4 px-4 py-3.5 border-b border-surface-border last:border-0 items-center hover:bg-surface-tertiary/50 transition-colors"
            >
              <div className="col-span-2">
                <p className="text-sm text-white font-medium">{source.name}</p>
                <p className="text-xs text-gray-500 truncate">{source.url}</p>
              </div>
              <div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                  source.source_type === "api"
                    ? "text-blue-400 bg-blue-400/10"
                    : "text-purple-400 bg-purple-400/10"
                }`}>
                  {source.source_type.toUpperCase()}
                </span>
              </div>
              <div className="text-xs text-gray-400">
                {source.last_scraped_at
                  ? new Date(source.last_scraped_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" })
                  : "Never"}
              </div>
              <div className="flex items-center justify-between">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[source.status]}`}>
                  {source.status.charAt(0).toUpperCase() + source.status.slice(1)}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => triggerScrape.mutate(source.id)}
                    className="text-xs text-gray-400 hover:text-white transition-colors"
                    title="Trigger scrape"
                  >
                    ▶
                  </button>
                  {!source.is_builtin && (
                    <button
                      onClick={() => deleteSource.mutate(source.id)}
                      className="text-xs text-gray-500 hover:text-red-400 transition-colors"
                      title="Delete"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add source drawer */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-end" onClick={() => setShowAdd(false)}>
          <div
            className="w-96 h-full bg-surface-secondary border-l border-surface-border p-6 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-base font-semibold text-white">Add Source</h2>
              <button onClick={() => setShowAdd(false)} className="text-gray-500 hover:text-white">✕</button>
            </div>

            <div className="space-y-4">
              {[
                { key: "name", label: "Source Name", placeholder: "My Job Board" },
                { key: "url", label: "Target URL", placeholder: "https://example.com/jobs" },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="block text-xs text-gray-400 mb-1.5">{label}</label>
                  <input
                    value={newSource[key as "name" | "url"]}
                    onChange={(e) => setNewSource((s) => ({ ...s, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full bg-surface border border-surface-border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand"
                  />
                </div>
              ))}

              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Ingestion Type</label>
                <select
                  value={newSource.source_type}
                  onChange={(e) => setNewSource((s) => ({ ...s, source_type: e.target.value as "api" | "scrape" }))}
                  className="w-full bg-surface border border-surface-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand"
                >
                  <option value="scrape">Web Scrape</option>
                  <option value="api">API</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Frequency</label>
                <select
                  value={newSource.frequency}
                  onChange={(e) => setNewSource((s) => ({ ...s, frequency: e.target.value }))}
                  className="w-full bg-surface border border-surface-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand"
                >
                  <option value="1h">Every 1 Hour</option>
                  <option value="6h">Every 6 Hours</option>
                  <option value="12h">Every 12 Hours</option>
                  <option value="24h">Every 24 Hours</option>
                </select>
              </div>

              {newSource.source_type === "scrape" && (
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">
                    CSS Selectors (JSON)
                  </label>
                  <textarea
                    value={selectorInput}
                    onChange={(e) => setSelectorInput(e.target.value)}
                    rows={6}
                    placeholder='{"job_container": ".job", "title": "h2", "company": ".company"}'
                    className="w-full bg-surface border border-surface-border rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-brand font-mono"
                  />
                </div>
              )}

              <button
                onClick={() => addSource.mutate()}
                disabled={addSource.isPending || !newSource.name || !newSource.url}
                className="w-full bg-brand hover:bg-brand-hover disabled:opacity-50 text-white py-2.5 rounded-lg text-sm font-medium transition-colors"
              >
                {addSource.isPending ? "Adding…" : "Add Source"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
