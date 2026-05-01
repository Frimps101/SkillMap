const STORAGE_KEY = "skillmap-theme";

type Theme = "dark" | "light";

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
}

export function initTheme() {
  applyTheme(getTheme());
}

export function getTheme(): Theme {
  return (localStorage.getItem(STORAGE_KEY) as Theme) ?? "dark";
}

export function toggleTheme(): Theme {
  const next = getTheme() === "dark" ? "light" : "dark";
  localStorage.setItem(STORAGE_KEY, next);
  applyTheme(next);
  return next;
}
