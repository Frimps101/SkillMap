import { DEFAULT_API_BASE_URL, STORAGE_KEYS } from "./constants";
import type { AuthTokens, StorageSettings } from "./types";

export async function getSettings(): Promise<StorageSettings> {
  const data = await chrome.storage.local.get([
    STORAGE_KEYS.apiBaseUrl,
    STORAGE_KEYS.email,
  ]);
  return {
    apiBaseUrl: data[STORAGE_KEYS.apiBaseUrl] ?? DEFAULT_API_BASE_URL,
    email: data[STORAGE_KEYS.email] ?? "",
  };
}

export async function saveSettings(partial: Partial<StorageSettings>): Promise<void> {
  const patch: Record<string, string> = {};
  if (partial.apiBaseUrl !== undefined) {
    patch[STORAGE_KEYS.apiBaseUrl] = partial.apiBaseUrl.replace(/\/$/, "");
  }
  if (partial.email !== undefined) {
    patch[STORAGE_KEYS.email] = partial.email;
  }
  await chrome.storage.local.set(patch);
}

export async function getTokens(): Promise<AuthTokens | null> {
  const data = await chrome.storage.local.get([
    STORAGE_KEYS.accessToken,
    STORAGE_KEYS.refreshToken,
  ]);
  if (!data[STORAGE_KEYS.accessToken] || !data[STORAGE_KEYS.refreshToken]) {
    return null;
  }
  return {
    access: data[STORAGE_KEYS.accessToken],
    refresh: data[STORAGE_KEYS.refreshToken],
  };
}

export async function saveTokens(tokens: AuthTokens): Promise<void> {
  await chrome.storage.local.set({
    [STORAGE_KEYS.accessToken]: tokens.access,
    [STORAGE_KEYS.refreshToken]: tokens.refresh,
  });
}

export async function clearTokens(): Promise<void> {
  await chrome.storage.local.remove([
    STORAGE_KEYS.accessToken,
    STORAGE_KEYS.refreshToken,
  ]);
}
