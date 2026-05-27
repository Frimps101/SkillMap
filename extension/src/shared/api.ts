import { getSettings, getTokens, saveTokens } from "./storage";
import type { AuthTokens, ExtractedJob, MessageResponse } from "./types";

async function apiFetch(
  path: string,
  init: RequestInit = {},
  retry = true
): Promise<Response> {
  const { apiBaseUrl } = await getSettings();
  const tokens = await getTokens();
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (tokens?.access) {
    headers.set("Authorization", `Bearer ${tokens.access}`);
  }

  const res = await fetch(`${apiBaseUrl}${path}`, { ...init, headers });

  if (res.status === 401 && retry && tokens?.refresh) {
    const refreshed = await refreshAccessToken(tokens.refresh);
    if (refreshed) {
      return apiFetch(path, init, false);
    }
  }

  return res;
}

async function refreshAccessToken(refresh: string): Promise<boolean> {
  const { apiBaseUrl } = await getSettings();
  try {
    const res = await fetch(`${apiBaseUrl}/api/auth/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { access: string };
    const tokens = await getTokens();
    if (!tokens) return false;
    await saveTokens({ access: data.access, refresh: tokens.refresh });
    return true;
  } catch {
    return false;
  }
}

export async function login(
  email: string,
  password: string
): Promise<MessageResponse<AuthTokens>> {
  const { apiBaseUrl } = await getSettings();
  try {
    const res = await fetch(`${apiBaseUrl}/api/auth/login/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return {
        ok: false,
        error: (err as { detail?: string }).detail ?? "Invalid email or password.",
      };
    }
    const tokens = (await res.json()) as AuthTokens;
    await saveTokens(tokens);
    return { ok: true, data: tokens };
  } catch {
    return {
      ok: false,
      error: `Cannot reach SkillMap API at ${apiBaseUrl}. Is Docker running?`,
    };
  }
}

export interface ImportResult {
  created: boolean;
  skipped: boolean;
  job_id: number;
  detail: string;
}

export async function importJob(
  job: ExtractedJob
): Promise<MessageResponse<ImportResult>> {
  const payload = {
    title: job.title,
    company: job.company || "Unknown",
    location: job.location,
    job_type: job.job_type,
    category: job.category,
    description: job.description,
    url: job.url,
    logo_url: job.logo_url,
    posted_at: job.posted_at,
  };

  try {
    const res = await apiFetch("/api/jobs/import/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    const data = (await res.json()) as ImportResult & { detail?: string };
    if (!res.ok) {
      return { ok: false, error: data.detail ?? `Import failed (${res.status})` };
    }
    return { ok: true, data };
  } catch {
    return { ok: false, error: "Network error while importing." };
  }
}

export async function checkAuth(): Promise<MessageResponse<{ email: string }>> {
  const tokens = await getTokens();
  if (!tokens) {
    return { ok: false, error: "Not signed in." };
  }
  try {
    const res = await apiFetch("/api/auth/me/");
    if (!res.ok) {
      return { ok: false, error: "Session expired. Sign in again." };
    }
    const user = (await res.json()) as { email: string };
    return { ok: true, data: { email: user.email } };
  } catch {
    return { ok: false, error: "Cannot reach API." };
  }
}
