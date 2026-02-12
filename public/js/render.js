import {
  getFilteredMovies,
  getUniqueYears,
  isTogglePending,
  state,
} from "./state.js";
import { hasPendingRequests } from "./api.js";
import { applyMasterCardLayout } from "./masterView.js";
import { animateCount, animateOrderNumberChanges } from "./interactions.js";
import { setupSectionScrollUX, syncSectionScrollUX } from "./scroll.js";

const movieCardTemplate = document.getElementById("movieCardTemplate");

export const elements = {
  body: document.body,
  app: document.getElementById("app"),
  appHeader: document.getElementById("app-header"),
  viewContainer: document.getElementById("view-container"),
  searchInput: document.getElementById("searchInput"),
  themeToggleBtn: document.getElementById("themeToggleBtn"),
  openAddViewBtn: document.getElementById("openAddViewBtn"),
  toastContainer: document.getElementById("toastContainer"),

  homeView: null,
  yearChips: null,
  modeSwitch: null,
  sectionModeBtn: null,
  masterModeBtn: null,
  statusMessage: null,
  loadingSpinner: null,
  loadingText: null,
  scrollSentinel: null,
  unwatchedSection: null,
  watchedSection: null,
  masterSection: null,
  unwatchedGrid: null,
  watchedGrid: null,
  masterGrid: null,
  unwatchedCount: null,
  watchedCount: null,
  masterCount: null,

  addView: null,
  addMovieForm: null,
  addViewTitle: null,
  saveMovieBtn: null,
  addTitle: null,
  addImage: null,
  addLink: null,
  addYear: null,
  addOrder: null,
  cancelAddBtn: null,
};

let renderedRoute = null;

function isBusy() {
  return hasPendingRequests();
}

function refreshDynamicRefs() {
  elements.homeView = document.getElementById("homeView");
  elements.yearChips = document.getElementById("yearChips");
  elements.modeSwitch = document.getElementById("orderModeSwitch");
  elements.sectionModeBtn = document.getElementById("sectionModeBtn");
  elements.masterModeBtn = document.getElementById("masterModeBtn");
  elements.statusMessage = document.getElementById("statusMessage");
  elements.loadingSpinner = document.getElementById("loadingSpinner");
  elements.loadingText = document.getElementById("loadingText");
  elements.scrollSentinel = document.getElementById("scrollSentinel");
  elements.unwatchedSection = document.getElementById("unwatchedSection");
  elements.watchedSection = document.getElementById("watchedSection");
  elements.masterSection = document.getElementById("masterSection");
  elements.unwatchedGrid = document.getElementById("unwatchedGrid");
  elements.watchedGrid = document.getElementById("watchedGrid");
  elements.masterGrid = document.getElementById("masterGrid");
  elements.unwatchedCount = document.getElementById("unwatchedCount");
  elements.watchedCount = document.getElementById("watchedCount");
  elements.masterCount = document.getElementById("masterCount");

  elements.addView = document.getElementById("addView");
  elements.addMovieForm = document.getElementById("addMovieForm");
  elements.addViewTitle = document.getElementById("addViewTitle");
  elements.saveMovieBtn = document.getElementById("saveMovieBtn");
  elements.addTitle = document.getElementById("addTitle");
  elements.addImage = document.getElementById("addImage");
  elements.addLink = document.getElementById("addLink");
  elements.addYear = document.getElementById("addYear");
  elements.addOrder = document.getElementById("addOrder");
  elements.cancelAddBtn = document.getElementById("cancelAddBtn");
}

function renderHomeShell() {
  elements.viewContainer.innerHTML = `
    <section id="homeView" data-view="home" class="view-shell home-shell">
      <div class="home-toolbar controls-row">
        <div id="yearChips" class="chips-wrap filters-group"></div>

        <div id="orderModeSwitch" class="mode-switch view-toggle-group">
          <button id="sectionModeBtn" class="mode-btn" type="button" data-mode="section">
            Section View
          </button>
          <button id="masterModeBtn" class="mode-btn" type="button" data-mode="master">
            Master List View
          </button>
        </div>
      </div>

      <div class="loading-row">
        <div id="loadingSpinner" class="spinner hidden" aria-hidden="true"></div>
        <span id="loadingText"></span>
      </div>
      <div id="statusMessage" class="status-message"></div>

      <section id="masterSection" class="section movie-section hidden" data-section="master">
        <div class="section-inner">
          <div class="section-header">
            <h2>Master List</h2>
            <span id="masterCount" class="count-badge">0</span>
          </div>
          <div class="movie-container master-container">
            <div id="masterGrid" class="movies-grid master-grid master-list" data-section="master"></div>
          </div>
        </div>
      </section>

      <section id="unwatchedSection" class="section movie-section" data-section="unwatched">
        <div class="section-inner">
          <div class="section-header">
            <h2>Unwatched Movies</h2>
            <span id="unwatchedCount" class="count-badge">0</span>
          </div>
          <div class="section-wrapper">
            <button class="scroll-arrow scroll-left" type="button" aria-label="Scroll left">
              &#10094;
            </button>
            <div class="movies-scroll-wrapper">
              <div class="movie-container">
                <div
                  id="unwatchedGrid"
                  class="movies-grid movie-grid horizontal-scroll-grid"
                  data-section="unwatched"
                ></div>
              </div>
            </div>
            <button class="scroll-arrow scroll-right" type="button" aria-label="Scroll right">
              &#10095;
            </button>
            <div class="scroll-indicator"><div class="scroll-progress"></div></div>
          </div>
        </div>
      </section>

      <section id="watchedSection" class="section movie-section" data-section="watched">
        <div class="section-inner">
          <div class="section-header">
            <h2>Watched Movies</h2>
            <span id="watchedCount" class="count-badge">0</span>
          </div>
          <div class="section-wrapper">
            <button class="scroll-arrow scroll-left" type="button" aria-label="Scroll left">
              &#10094;
            </button>
            <div class="movies-scroll-wrapper">
              <div class="movie-container">
                <div
                  id="watchedGrid"
                  class="movies-grid movie-grid horizontal-scroll-grid"
                  data-section="watched"
                ></div>
              </div>
            </div>
            <button class="scroll-arrow scroll-right" type="button" aria-label="Scroll right">
              &#10095;
            </button>
            <div class="scroll-indicator"><div class="scroll-progress"></div></div>
          </div>
        </div>
      </section>

      <div id="scrollSentinel" class="scroll-sentinel" aria-hidden="true"></div>
    </section>
  `;
  renderedRoute = "home";
  refreshDynamicRefs();
}

function renderAddShell() {
  elements.viewContainer.innerHTML = `
    <section id="addView" data-view="add" class="view-shell add-view-shell">
      <div class="add-modal">
        <h2 id="addViewTitle">Add New Movie</h2>
        <form id="addMovieForm" novalidate>
          <label>
            <span>Title</span>
            <input id="addTitle" type="text" placeholder="Spider-Man: No Way Home" required />
          </label>

          <label>
            <span>Poster URL</span>
            <input id="addImage" type="url" placeholder="https://image.example/poster.jpg" required />
          </label>

          <label>
            <span>Watch Link</span>
            <input id="addLink" type="url" placeholder="https://www.hotstar.com/..." required />
          </label>

          <label>
            <span>Release Year</span>
            <input id="addYear" type="number" min="1888" max="2100" placeholder="2019" required />
          </label>

          <label>
            <span>Priority Number</span>
            <input id="addOrder" type="number" min="1" step="1" placeholder="1" required />
          </label>

          <div class="form-actions">
            <button id="saveMovieBtn" class="btn btn-primary" type="submit">Save Movie</button>
            <button id="cancelAddBtn" class="btn btn-secondary" type="button">Cancel</button>
          </div>
        </form>
      </div>
    </section>
  `;
  renderedRoute = "add";
  refreshDynamicRefs();
}

function ensureRouteShell() {
  const nextRoute = state.ui.currentView === "add" ? "add" : "home";
  if (renderedRoute === nextRoute) return;

  if (nextRoute === "add") {
    renderAddShell();
    return;
  }
  renderHomeShell();
}

function applyThemeButtonLabel() {
  if (!elements.themeToggleBtn) return;

  const isDark = state.theme === "dark";
  elements.themeToggleBtn.innerHTML = isDark ? "&#9728;" : "&#9790;";
  elements.themeToggleBtn.setAttribute(
    "aria-label",
    isDark ? "Switch to light mode" : "Switch to dark mode"
  );
  elements.themeToggleBtn.title = isDark ? "Switch to light mode" : "Switch to dark mode";
}

function applyHeaderState() {
  if (elements.searchInput && elements.searchInput !== document.activeElement) {
    if (elements.searchInput.value !== state.filters.search) {
      elements.searchInput.value = state.filters.search;
    }
  }

  if (elements.openAddViewBtn) {
    const inAddView = state.ui.currentView === "add";
    elements.openAddViewBtn.classList.toggle("active", inAddView);
  }
}

function applyLoadingState() {
  if (!elements.loadingSpinner || !elements.loadingText) return;

  elements.loadingSpinner.classList.toggle("hidden", !state.ui.loading);
  elements.loadingText.textContent = state.ui.loading ? state.ui.loadingText : "";
}

function applyStatusMessage(filteredLength = 0, visibleLength = 0) {
  if (!elements.statusMessage) return;

  let message = state.ui.statusMessage;
  let isError = state.ui.statusError;

  if (!message) {
    if (!filteredLength) {
      message = "No movies match your current search/filter.";
      isError = false;
    } else if (visibleLength < filteredLength) {
      message = `Showing ${visibleLength} of ${filteredLength} movies`;
      isError = false;
    } else {
      message = "";
      isError = false;
    }
  }

  elements.statusMessage.textContent = message;
  elements.statusMessage.classList.toggle("error", isError);
}

function applyBusyState() {
  const busy = isBusy();
  const dragging = state.ui.dragging;

  elements.body.classList.toggle("dragging", dragging);

  document.querySelectorAll("button").forEach((button) => {
    const keepEnabledAddButton = button.id === "openAddViewBtn" && state.ui.currentView === "add";
    button.disabled = keepEnabledAddButton ? false : busy;
  });

  document.querySelectorAll("input").forEach((input) => {
    input.disabled = busy;
  });

  document.querySelectorAll(".seen-toggle").forEach((toggle) => {
    const card = toggle.closest(".movie-card");
    const movieId = card?.dataset?.id;
    toggle.disabled = busy || dragging || (movieId ? isTogglePending(movieId) : false);
  });
}

function renderYearChips() {
  if (!elements.yearChips) return;

  const years = getUniqueYears();
  const chips = ["all", ...years];
  const activeYear = state.filters.year;
  const busy = isBusy();

  elements.yearChips.innerHTML = "";
  chips.forEach((value) => {
    const chip = document.createElement("button");
    const chipValue = value === "all" ? "all" : String(value);
    const isActive =
      chipValue === "all" ? activeYear === null : Number(chipValue) === activeYear;

    chip.type = "button";
    chip.className = `chip${isActive ? " active" : ""}`;
    chip.dataset.year = chipValue;
    chip.textContent = chipValue === "all" ? "All" : chipValue;
    chip.disabled = busy;

    elements.yearChips.appendChild(chip);
  });
}

function renderOrderModeSwitch() {
  if (!elements.sectionModeBtn || !elements.masterModeBtn) return;

  const mode = state.ui.orderMode;
  elements.sectionModeBtn.classList.toggle("active", mode === "section");
  elements.masterModeBtn.classList.toggle("active", mode === "master");
}

function createMovieCard(movie, { addedId = null, movingInId = null, masterMode = false } = {}) {
  const card = movieCardTemplate.content.firstElementChild.cloneNode(true);
  const busy = isBusy();
  const pendingToggle = isTogglePending(movie._id);

  card.dataset.id = movie._id;
  card.dataset.section = movie.seen ? "watched" : "unwatched";
  card.dataset.order = String(movie.order);
  card.draggable = true;
  card.classList.toggle("seen", movie.seen);
  card.classList.toggle("master-card", masterMode);
  card.classList.toggle("master-item", masterMode);

  if (addedId === movie._id) {
    card.classList.add("adding");
  }
  if (movingInId === movie._id) {
    card.classList.add("moving-in");
  }

  const poster = card.querySelector(".poster");
  poster.src = movie.image;
  poster.alt = `${movie.title} poster`;

  const orderBadge = card.querySelector(".order-badge");
  if (orderBadge) {
    orderBadge.textContent = `#${movie.order}`;
  }

  const orderHero = card.querySelector(".order-hero");
  if (orderHero) {
    orderHero.textContent = String(movie.order);
  }

  card.querySelector(".movie-title").textContent = movie.title;
  card.querySelector(".movie-year").textContent = String(movie.year);

  const statusChip = card.querySelector(".status-chip");
  if (statusChip) {
    statusChip.textContent = movie.seen ? "Watched" : "Unwatched";
    statusChip.classList.toggle("seen", movie.seen);
    statusChip.classList.toggle("unseen", !movie.seen);
  }

  const watchedPill = card.querySelector(".watched-pill");
  if (watchedPill) {
    watchedPill.textContent = movie.seen ? "Watched" : "Unwatched";
    watchedPill.classList.toggle("show", movie.seen);
  }

  if (masterMode) {
    applyMasterCardLayout(card, movie);
  }

  const toggle = card.querySelector(".seen-toggle");
  toggle.checked = movie.seen;
  toggle.disabled = busy || state.ui.dragging || pendingToggle;

  const toggleLabel = card.querySelector(".toggle-label");
  toggleLabel.textContent = movie.seen ? "Watched" : "Unwatched";

  if (busy || pendingToggle) {
    card.querySelectorAll("button").forEach((button) => {
      button.disabled = true;
    });
  }

  requestAnimationFrame(() => {
    if (card.classList.contains("adding")) {
      requestAnimationFrame(() => card.classList.remove("adding"));
    }
    if (card.classList.contains("moving-in")) {
      requestAnimationFrame(() => card.classList.remove("moving-in"));
    }
  });

  return card;
}

export function renderMovies(grid, movies, options = {}) {
  if (!grid) return;

  grid.classList.add("updating");

  const fragment = document.createDocumentFragment();
  movies.forEach((movie) => {
    fragment.appendChild(createMovieCard(movie, options));
  });

  grid.innerHTML = "";
  grid.appendChild(fragment);

  requestAnimationFrame(() => {
    grid.classList.remove("updating");
  });
}

export function captureCardPositions() {
  const positions = new Map();
  document.querySelectorAll(".movie-card[data-id]").forEach((card) => {
    positions.set(card.dataset.id, card.getBoundingClientRect());
  });
  return positions;
}

// FLIP animation: compare First and Last rects and animate inverse transform.
export function runFlipAnimation(previousPositions, options = {}) {
  if (!(previousPositions instanceof Map) || previousPositions.size === 0) return;

  const duration = Number(options.duration) || 320;
  const easing = options.easing || "cubic-bezier(0.22, 1, 0.36, 1)";

  document.querySelectorAll(".movie-card[data-id]").forEach((card) => {
    const before = previousPositions.get(card.dataset.id);
    if (!before) return;

    const after = card.getBoundingClientRect();
    const deltaX = before.left - after.left;
    const deltaY = before.top - after.top;

    if (Math.abs(deltaX) < 0.5 && Math.abs(deltaY) < 0.5) return;

    card.animate(
      [
        { transform: `translate(${deltaX}px, ${deltaY}px)` },
        { transform: "translate(0, 0)" },
      ],
      {
        duration,
        easing,
        fill: "none",
      }
    );
  });
}

function applyOrderModeVisibility() {
  const masterMode = state.ui.orderMode === "master";
  elements.masterSection?.classList.toggle("hidden", !masterMode);
  elements.unwatchedSection?.classList.toggle("hidden", masterMode);
  elements.watchedSection?.classList.toggle("hidden", masterMode);
}

export function renderSections(options = {}) {
  if (state.ui.currentView !== "home") return;
  ensureRouteShell();

  const { keepScroll = true, addedId = null, movingInId = null } = options;
  const previousScrollY = window.scrollY;

  renderYearChips();
  renderOrderModeSwitch();
  applyOrderModeVisibility();

  const filtered = getFilteredMovies();
  const visible = filtered.slice(0, state.ui.visibleCount);
  const masterMode = state.ui.orderMode === "master";

  if (masterMode) {
    renderMovies(elements.masterGrid, visible, {
      addedId,
      movingInId,
      masterMode: true,
    });
    if (elements.masterCount) {
      animateCount(elements.masterCount, visible.length);
    }
  } else {
    const unwatched = visible.filter((movie) => !movie.seen);
    const watched = visible.filter((movie) => movie.seen);

    renderMovies(elements.unwatchedGrid, unwatched, { addedId, movingInId });
    renderMovies(elements.watchedGrid, watched, { addedId, movingInId });

    if (elements.unwatchedCount) {
      animateCount(elements.unwatchedCount, unwatched.length);
    }
    if (elements.watchedCount) {
      animateCount(elements.watchedCount, watched.length);
    }
  }

  // Animate order labels only when values actually change across renders.
  animateOrderNumberChanges(elements.homeView || elements.viewContainer);

  if (elements.scrollSentinel) {
    elements.scrollSentinel.classList.toggle("hidden", visible.length >= filtered.length);
  }

  applyStatusMessage(filtered.length, visible.length);
  setupSectionScrollUX(elements.homeView || elements.viewContainer);
  applyBusyState();
  if (!isBusy()) {
    syncSectionScrollUX(elements.homeView || elements.viewContainer);
  }

  if (keepScroll) {
    window.scrollTo({
      top: previousScrollY,
      left: 0,
      behavior: "auto",
    });
  }
}

export function renderHome(options = {}) {
  ensureRouteShell();
  renderSections(options);
}

export function renderAddView() {
  ensureRouteShell();
}

export function renderLayout() {
  ensureRouteShell();
  applyThemeButtonLabel();
  applyHeaderState();
  applyLoadingState();
  applyBusyState();
}

export function renderApp(options = {}) {
  renderLayout();
  if (state.ui.currentView === "home") {
    renderSections(options);
  }
}

export function showToast(message, variant = "success") {
  const toast = document.createElement("div");
  toast.className = `toast ${variant}`;
  toast.textContent = message;
  elements.toastContainer.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add("show");
  });

  setTimeout(() => {
    toast.classList.remove("show");
    toast.classList.add("hide");
    setTimeout(() => toast.remove(), 260);
  }, 1900);
}

export function setAddFormMode(mode) {
  if (!elements.addViewTitle || !elements.saveMovieBtn) return;

  if (mode === "edit") {
    elements.addViewTitle.textContent = "Update Movie";
    elements.saveMovieBtn.textContent = "Update Movie";
    return;
  }

  elements.addViewTitle.textContent = "Add New Movie";
  elements.saveMovieBtn.textContent = "Save Movie";
}

export function resetAddFormFields() {
  if (!elements.addMovieForm) return;
  elements.addMovieForm.reset();
  setAddFormMode("add");
}

export function fillAddFormFields(movie) {
  if (
    !elements.addTitle ||
    !elements.addImage ||
    !elements.addLink ||
    !elements.addYear ||
    !elements.addOrder
  ) {
    return;
  }

  elements.addTitle.value = movie.title;
  elements.addImage.value = movie.image;
  elements.addLink.value = movie.link;
  elements.addYear.value = String(movie.year);
  elements.addOrder.value = String(movie.order);
  setAddFormMode("edit");
}
