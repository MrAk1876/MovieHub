import { setTheme, state } from "./state.js";
import { elements, renderLayout } from "./render.js";

const THEME_KEY = "mmh-theme";

function normalizeTheme(value) {
  return value === "light" ? "light" : "dark";
}

function getSystemTheme() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme, { persist = true } = {}) {
  const normalized = normalizeTheme(theme);
  setTheme(normalized);

  document.body.classList.remove("light", "dark");
  document.body.classList.add(normalized);

  if (persist) {
    localStorage.setItem(THEME_KEY, normalized);
  }
  renderLayout();
}

export function setupTheme() {
  const savedTheme = localStorage.getItem(THEME_KEY);
  const hasSavedTheme = savedTheme === "light" || savedTheme === "dark";
  const initialTheme = hasSavedTheme ? normalizeTheme(savedTheme) : getSystemTheme();

  applyTheme(initialTheme, { persist: hasSavedTheme });

  if (!hasSavedTheme) {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", (event) => {
      // Follow OS theme only while user has not explicitly selected one.
      const stillNoSavedTheme = !localStorage.getItem(THEME_KEY);
      if (!stillNoSavedTheme) return;
      applyTheme(event.matches ? "dark" : "light", { persist: false });
    });
  }

  elements.themeToggleBtn.addEventListener("click", () => {
    const nextTheme = state.theme === "dark" ? "light" : "dark";
    applyTheme(nextTheme, { persist: true });
  });
}
