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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sources"] });
      // Poll every 2 s for up to 30 s so the status update from the background thread is reflected
      let attempts = 0;
      const interval = setInterval(() => {
        attempts++;
        queryClient.invalidateQueries({ queryKey: ["sources"] });
        if (attempts >= 15) clearInterval(interval);
      }, 2000);
    },
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
    <div className="p-14 space-y-6">
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
        <div className="grid grid-cols-[2fr_1fr_1.5fr_1fr_72px] gap-4 px-4 py-3 border-b border-surface-border text-xs text-gray-500 uppercase tracking-wider font-medium">
          <div>Source Name</div>
          <div>Type</div>
          <div>Last Synced</div>
          <div>Status</div>
          <div>Actions</div>
        </div>

        {sources.length === 0 ? (
          <p className="text-center text-gray-500 text-sm py-12">No sources yet. Add one above.</p>
        ) : (
          sources.map((source) => (
            <div
              key={source.id}
              className="grid grid-cols-[2fr_1fr_1.5fr_1fr_72px] gap-4 px-4 py-3.5 border-b border-surface-border last:border-0 items-center hover:bg-surface-tertiary/50 transition-colors"
            >
              <div className="min-w-0">
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
              <div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[source.status]}`}>
                  {source.status.charAt(0).toUpperCase() + source.status.slice(1)}
                </span>
              </div>
              {/* Actions — own column so they never get squeezed */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => triggerScrape.mutate(source.id)}
                  disabled={triggerScrape.isPending && triggerScrape.variables === source.id}
                  className="p-1.5 rounded-md text-green-400 hover:text-green-300 hover:bg-green-400/10 transition-colors disabled:opacity-40"
                  title="Run scrape now"
                >
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
                      <polygon points="5,3 19,12 5,21" />
                    </svg>
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Remove "${source.name}"?`)) deleteSource.mutate(source.id);
                  }}
                  className="p-1.5 rounded-md text-red-400 hover:text-red-300 hover:bg-red-400/10 transition-colors"
                  title="Delete source"
                >
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3,6 5,6 21,6" />
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      <path d="M10 11v6M14 11v6" />
                      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                    </svg>
                </button>
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

              {/* Ingestion Type */}
              <div>
                <label className="block text-xs text-gray-400 mb-2">Ingestion Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["api", "scrape"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setNewSource((s) => ({ ...s, source_type: t }))}
                      className={`py-2 rounded-lg text-sm font-medium border transition-colors ${
                        newSource.source_type === t
                          ? "bg-brand/15 border-brand/40 text-white"
                          : "bg-surface border-surface-border text-gray-400 hover:text-white hover:border-gray-600"
                      }`}
                    >
                      {t === "api" ? "JSON API" : "Web Scrape"}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-gray-600 mt-1.5">
                  {newSource.source_type === "api"
                    ? "URL returns a JSON response (e.g. Remotive, Greenhouse)."
                    : "URL is an HTML page — CSS selectors are used to extract jobs."}
                </p>
              </div>

              {/* Frequency */}
              <div>
                <label className="block text-xs text-gray-400 mb-2">Refresh Frequency</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(["1h", "6h", "12h", "24h"] as const).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setNewSource((s) => ({ ...s, frequency: f }))}
                      className={`py-2 rounded-lg text-xs font-medium border transition-colors ${
                        newSource.frequency === f
                          ? "bg-brand/15 border-brand/40 text-white"
                          : "bg-surface border-surface-border text-gray-400 hover:text-white hover:border-gray-600"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {/* CSS Selectors — only for web scrape */}
              {newSource.source_type === "scrape" && (
                <div>
                  <label className="block text-xs text-gray-400 mb-1">CSS Selectors</label>
                  <p className="text-[11px] text-gray-600 mb-2">
                    Map field names to the CSS selectors that identify them on the page. Required for web scrape sources.
                  </p>
                  <textarea
                    value={selectorInput}
                    onChange={(e) => setSelectorInput(e.target.value)}
                    rows={5}
                    placeholder={'{\n  "job_container": ".job-card",\n  "title": "h2.title",\n  "company": ".company-name"\n}'}
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
