import {
  createMovieApi,
  deleteMovieApi,
  fetchMoviesApi,
  setApiRequestListener,
  toggleMovieApi,
  updateMovieApi,
} from "./api.js";
import { setupDragAndDrop } from "./drag.js";
import { setupFilters } from "./filters.js";
import { setupInteractions } from "./interactions.js";
import {
  elements,
  fillAddFormFields,
  renderAddView,
  renderHome,
  renderLayout,
  renderSections,
  resetAddFormFields,
  showToast,
} from "./render.js";
import { navigateTo, setupRouting } from "./router.js";
import {
  ensureVisibleCountAtLeast,
  getMovieById,
  increaseVisibleCount,
  isTogglePending,
  markTogglePending,
  removeMovie,
  replaceMovies,
  resetVisibleCount,
  setLoading,
  setMovies,
  setOrderMode,
  setStatus,
  snapshotMovies,
  state,
  toggleMovieLocally,
  upsertMovie,
} from "./state.js";
import { setupTheme } from "./theme.js";

const TOGGLE_ANIMATION_MS = 300;

let editingMovieId = null;
let infiniteObserver = null;
let pendingHomeRenderOptions = null;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function handleRequestError(error, userMessage) {
  console.error("AJAX request failed:", error);
  setStatus(userMessage, true);
  showToast(userMessage, "error");
}

function isValidUrl(value) {
  try {
    new URL(value);
    return true;
  } catch (error) {
    return false;
  }
}

function buildMoviePayload() {
  return {
    title: elements.addTitle?.value.trim(),
    image: elements.addImage?.value.trim(),
    link: elements.addLink?.value.trim(),
    year: Number(elements.addYear?.value),
    priorityNumber: Number(elements.addOrder?.value),
  };
}

function validatePayload(payload) {
  if (
    !payload.title ||
    !payload.image ||
    !payload.link ||
    !payload.year ||
    payload.priorityNumber === undefined ||
    payload.priorityNumber === null
  ) {
    return "Please fill title, image URL, watch link, year, and priority number.";
  }

  if (!Number.isInteger(payload.year) || payload.year < 1888 || payload.year > 2100) {
    return "Year must be a number between 1888 and 2100.";
  }

  if (!Number.isInteger(payload.priorityNumber) || payload.priorityNumber < 1) {
    return "Priority number must be a positive integer.";
  }

  if (!isValidUrl(payload.image) || !isValidUrl(payload.link)) {
    return "Image URL and watch link must be valid URLs.";
  }

  return null;
}

function getNextPriorityNumber() {
  if (!state.movies.length) return 1;
  return Math.max(...state.movies.map((movie) => Number(movie.order) || 0)) + 1;
}

function observeCurrentSentinel() {
  if (!infiniteObserver) return;

  infiniteObserver.disconnect();
  if (elements.scrollSentinel) {
    infiniteObserver.observe(elements.scrollSentinel);
  }
}

function setupInfiniteScroll() {
  if (infiniteObserver) {
    infiniteObserver.disconnect();
  }

  infiniteObserver = new IntersectionObserver(
    (entries) => {
      const [entry] = entries;
      if (!entry.isIntersecting || state.ui.currentView !== "home") return;

      const changed = increaseVisibleCount(6);
      if (changed) {
        renderSections();
      }
    },
    {
      root: null,
      threshold: 0.01,
      rootMargin: "240px 0px",
    }
  );
}

function closeAddView({ scrollTop = true } = {}) {
  editingMovieId = null;
  setStatus("");
  pendingHomeRenderOptions = { keepScroll: false };
  navigateTo("home", { replace: true, scrollTop });
}

function openAddView() {
  setStatus("");
  editingMovieId = null;

  if (state.ui.currentView === "add") {
    resetAddFormFields();
    if (elements.addOrder) {
      elements.addOrder.value = String(getNextPriorityNumber());
    }
    return;
  }

  navigateTo("add", { scrollTop: true });
}

function openEditView(movieId) {
  const movie = getMovieById(movieId);
  if (!movie) return;

  editingMovieId = movieId;
  setStatus("");
  navigateTo("add", { scrollTop: true });
  fillAddFormFields(movie);
}

function handleRouteChange(view) {
  renderLayout();

  if (view === "add") {
    renderAddView();
    if (editingMovieId) {
      const movie = getMovieById(editingMovieId);
      if (movie) {
        fillAddFormFields(movie);
      } else {
        editingMovieId = null;
        resetAddFormFields();
      }
    } else {
      resetAddFormFields();
      if (elements.addOrder) {
        elements.addOrder.value = String(getNextPriorityNumber());
      }
    }

    if (infiniteObserver) {
      infiniteObserver.disconnect();
    }
    return;
  }

  // Home route should always reset pending edit context.
  editingMovieId = null;
  const renderOptions = pendingHomeRenderOptions || { keepScroll: false };
  pendingHomeRenderOptions = null;
  renderHome(renderOptions);
  observeCurrentSentinel();
}

async function loadMovies() {
  try {
    const data = await fetchMoviesApi();
    setMovies(data);
    resetVisibleCount();
    setStatus("");

    if (state.ui.currentView === "home") {
      renderHome({ keepScroll: false });
      observeCurrentSentinel();
    } else {
      renderLayout();
    }
  } catch (error) {
    handleRequestError(error, "Failed to load movies.");
    renderLayout();
  }
}

async function saveMovie(event) {
  event.preventDefault();

  const payload = buildMoviePayload();
  const validationError = validatePayload(payload);
  if (validationError) {
    setStatus(validationError, true);
    showToast(validationError, "error");
    renderLayout();
    return;
  }

  try {
    const wasEditing = Boolean(editingMovieId);
    let affectedMovieId = null;

    if (wasEditing) {
      const updatedMovie = await updateMovieApi(editingMovieId, payload);
      upsertMovie(updatedMovie);
      affectedMovieId = editingMovieId;
      setStatus("Movie updated.");
      showToast("Movie Updated");
    } else {
      const createdMovie = await createMovieApi(payload);
      upsertMovie(createdMovie);
      affectedMovieId = createdMovie._id;
      setStatus("Movie added.");
      showToast("Movie Added");
    }

    editingMovieId = null;
    ensureVisibleCountAtLeast(6);
    pendingHomeRenderOptions = {
      keepScroll: false,
      addedId: affectedMovieId,
    };

    // Keep Add view open after creating a movie (no forced redirect to home).
    if (!wasEditing) {
      resetAddFormFields();
      if (elements.addOrder) {
        elements.addOrder.value = String(getNextPriorityNumber());
      }
      renderLayout();
      return;
    }

    // Editing keeps existing behavior: return to home after successful update.
    resetAddFormFields();
    navigateTo("home", { scrollTop: true });
  } catch (error) {
    handleRequestError(error, "Unable to save movie.");
    renderLayout();
  }
}

async function deleteMovie(movieId) {
  try {
    await deleteMovieApi(movieId);
    removeMovie(movieId);
    setStatus("Movie deleted.");
    showToast("Movie Deleted");
    renderSections();
  } catch (error) {
    handleRequestError(error, "Unable to delete movie.");
    renderSections();
  }
}

async function toggleMovieSeen(movieId) {
  if (isTogglePending(movieId)) return;

  const movie = getMovieById(movieId);
  if (!movie) return;

  markTogglePending(movieId, true);

  const previousSnapshot = snapshotMovies();
  const card = document.querySelector(`.movie-card[data-id="${movieId}"]`);
  if (card) {
    card.classList.add("moving-out");
    await sleep(TOGGLE_ANIMATION_MS);
  }

  toggleMovieLocally(movieId);
  renderSections({ movingInId: movieId });

  try {
    const updatedMovie = await toggleMovieApi(movieId);
    upsertMovie(updatedMovie);
    setStatus("Status updated.");
    showToast("Status Updated");
    renderSections({ movingInId: movieId });
  } catch (error) {
    replaceMovies(previousSnapshot);
    handleRequestError(error, "Unable to update watched status.");
    renderSections();
  } finally {
    markTogglePending(movieId, false);
    renderLayout();
  }
}

function watchMovie(movieId) {
  const movie = getMovieById(movieId);
  if (!movie) return;

  window.open(movie.link, "_blank", "noopener,noreferrer");

  if (!movie.seen) {
    toggleMovieSeen(movieId);
  }
}

function handleCardClick(event) {
  const card = event.target.closest(".movie-card");
  if (!card) return;

  const movieId = card.dataset.id;

  if (event.target.closest(".watch-btn")) {
    watchMovie(movieId);
    return;
  }

  if (event.target.closest(".edit-btn")) {
    openEditView(movieId);
    return;
  }

  if (event.target.closest(".delete-btn")) {
    deleteMovie(movieId);
  }
}

function handleToggleChange(event) {
  const toggle = event.target.closest(".seen-toggle");
  if (!toggle) return;

  const card = toggle.closest(".movie-card");
  if (!card) return;

  toggleMovieSeen(card.dataset.id);
}

function handleViewClick(event) {
  const modeButton = event.target.closest(".mode-btn[data-mode]");
  if (modeButton) {
    setOrderMode(modeButton.dataset.mode);
    setStatus("");
    renderSections({ keepScroll: false });
    return;
  }

  if (event.target.closest("#cancelAddBtn")) {
    closeAddView({ scrollTop: true });
    return;
  }

  handleCardClick(event);
}

function handleViewSubmit(event) {
  if (event.target.id === "addMovieForm") {
    saveMovie(event);
  }
}

function handleGlobalKeydown(event) {
  if (event.key !== "Escape") return;
  if (state.ui.currentView !== "add") return;

  event.preventDefault();
  closeAddView({ scrollTop: true });
}

function bindEvents() {
  elements.openAddViewBtn.addEventListener("click", openAddView);
  elements.viewContainer.addEventListener("click", handleViewClick);
  elements.viewContainer.addEventListener("change", handleToggleChange);
  elements.viewContainer.addEventListener("submit", handleViewSubmit);
  window.addEventListener("keydown", handleGlobalKeydown);
}

function initApiListener() {
  setApiRequestListener(({ isLoading, loadingText }) => {
    if (isLoading) {
      setLoading(true, loadingText || "Loading...");
    } else {
      setLoading(false);
    }
    renderLayout();
  });
}

function init() {
  initApiListener();
  setupTheme();
  setupFilters();
  setupInteractions(document);
  setupInfiniteScroll();
  setupDragAndDrop();
  bindEvents();
  setupRouting({ onRouteChange: handleRouteChange });
  loadMovies();
}

init();
