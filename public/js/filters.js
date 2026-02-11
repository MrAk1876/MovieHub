import {
  getFilteredMovies,
  resetVisibleCount,
  setSearchFilter,
  setStatus,
  setYearFilter,
  state,
} from "./state.js";
import { elements, renderSections } from "./render.js";

let debounceTimer = null;

export function applyFilters() {
  return getFilteredMovies();
}

function handleSearchInput() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    setSearchFilter(elements.searchInput.value);
    resetVisibleCount();
    setStatus("");

    if (state.ui.currentView === "home") {
      renderSections({ keepScroll: false });
    }
  }, 400);
}

function handleYearChipClick(event) {
  const chip = event.target.closest(".chip");
  if (!chip) return;

  const yearValue = chip.dataset.year;
  if (!yearValue || yearValue === "all") {
    setYearFilter(null);
  } else {
    setYearFilter(Number(yearValue));
  }

  resetVisibleCount();
  setStatus("");
  renderSections({ keepScroll: false });
}

export function setupFilters() {
  if (elements.searchInput) {
    elements.searchInput.addEventListener("input", handleSearchInput);
  }

  // Year chips are rendered inside the home view, so delegate from the persistent container.
  elements.viewContainer.addEventListener("click", handleYearChipClick);
}

