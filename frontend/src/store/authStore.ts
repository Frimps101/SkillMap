import type { User } from "../api/auth";

let _user: User | null = null;

try {
  const stored = localStorage.getItem("user");
  if (stored) _user = JSON.parse(stored);
} catch {
  _user = null;
}

export function getStoredUser(): User | null {
  return _user;
}

export function isLoggedIn(): boolean {
  // return !!localStorage.getItem("access") && !!_user;
  return true;
}

export function saveAuth(user: User, access: string, refresh: string) {
  _user = user;
  localStorage.setItem("access", access);
  localStorage.setItem("refresh", refresh);
  localStorage.setItem("user", JSON.stringify(user));
}

export function clearAuth() {
  _user = null;
  localStorage.removeItem("access");
  localStorage.removeItem("refresh");
  localStorage.removeItem("user");
}
