import { setTheme, state } from "./state.js";
import { elements, renderLayout } from "./render.js";

const THEME_KEY = "mmh-theme";

function normalizeTheme(value) {
  return value === "light" ? "light" : "dark";
}

function applyTheme(theme) {
  const normalized = normalizeTheme(theme);
  setTheme(normalized);

  document.body.classList.remove("light", "dark");
  document.body.classList.add(normalized);

  localStorage.setItem(THEME_KEY, normalized);
  renderLayout();
}

export function setupTheme() {
  const bodyTheme = document.body.classList.contains("light") ? "light" : "dark";
  const savedTheme = localStorage.getItem(THEME_KEY);
  const initialTheme = savedTheme ? normalizeTheme(savedTheme) : bodyTheme;

  applyTheme(initialTheme);

  elements.themeToggleBtn.addEventListener("click", () => {
    const nextTheme = state.theme === "dark" ? "light" : "dark";
    applyTheme(nextTheme);
  });
}

