import { hasPendingRequests, reorderMoviesApi } from "./api.js";
import {
  replaceMovies,
  setDragging,
  setStatus,
  snapshotMovies,
  sortMovies,
  state,
} from "./state.js";
import {
  captureCardPositions,
  elements,
  renderLayout,
  renderSections,
  runFlipAnimation,
  showToast,
} from "./render.js";

let draggedMovieId = null;
let draggedSourceSection = null;
let currentDropContext = null;
let touchDragActive = false;

const dropIndicator = document.createElement("div");
dropIndicator.className = "drop-indicator";
document.body.appendChild(dropIndicator);

function hideDropIndicator() {
  dropIndicator.classList.remove("visible");
}

function clearSectionHighlights() {
  document.querySelectorAll(".movie-section.drag-over").forEach((section) => {
    section.classList.remove("drag-over");
  });
}

function highlightSection(section) {
  clearSectionHighlights();
  const element =
    section === "master"
      ? elements.masterSection
      : section === "watched"
        ? elements.watchedSection
        : elements.unwatchedSection;
  element?.classList.add("drag-over");
}

function resetDragState() {
  document.querySelectorAll(".movie-card.dragging").forEach((card) => {
    card.classList.remove("dragging");
  });

  hideDropIndicator();
  clearSectionHighlights();

  draggedMovieId = null;
  draggedSourceSection = null;
  currentDropContext = null;

  setDragging(false);
  renderLayout();
}

function getSectionSeen(section) {
  return section === "watched";
}

function findInsertionIndexForSection(sortedMovies, section) {
  if (section !== "watched" && section !== "unwatched") {
    return sortedMovies.length;
  }

  const targetSeen = getSectionSeen(section);

  if (targetSeen) {
    let lastWatched = -1;
    sortedMovies.forEach((movie, cursor) => {
      if (movie.seen) {
        lastWatched = cursor;
      }
    });
    return lastWatched === -1 ? sortedMovies.length : lastWatched + 1;
  }

  const firstWatched = sortedMovies.findIndex((movie) => movie.seen);
  return firstWatched === -1 ? sortedMovies.length : firstWatched;
}

function showDropIndicator(container, index) {
  const cards = [...container.querySelectorAll(".movie-card:not(.dragging)")];
  const containerRect = container.getBoundingClientRect();
  const left = containerRect.left + 10;
  const width = Math.max(containerRect.width - 20, 40);

  let top = containerRect.top + 12;
  if (cards.length > 0) {
    if (index >= cards.length) {
      top = cards[cards.length - 1].getBoundingClientRect().bottom + 2;
    } else {
      top = cards[index].getBoundingClientRect().top - 2;
    }
  }

  dropIndicator.style.left = `${Math.max(0, left)}px`;
  dropIndicator.style.width = `${width}px`;
  dropIndicator.style.top = `${Math.max(0, top)}px`;
  dropIndicator.classList.add("visible");
}

// Calculates insertion index based on pointer Y. No DOM element swapping is done.
export function getDropIndex(container, mouseY) {
  const cards = [...container.querySelectorAll(".movie-card:not(.dragging)")];

  for (let index = 0; index < cards.length; index += 1) {
    const rect = cards[index].getBoundingClientRect();
    const midpoint = rect.top + rect.height / 2;
    if (mouseY < midpoint) {
      return index;
    }
  }

  return cards.length;
}

function getDropContext(target, mouseY) {
  const grid = target?.closest(".movies-grid[data-section]");
  if (!grid) return null;

  const section = grid.dataset.section;
  const cards = [...grid.querySelectorAll(".movie-card:not(.dragging)")];
  const index = getDropIndex(grid, mouseY);
  const targetCard = cards[index] || null;

  return {
    grid,
    section,
    index,
    targetId: targetCard?.dataset?.id || null,
  };
}

function buildNextMovieState({ movieList, draggedId, targetContext, sourceSection }) {
  const orderedMovies = sortMovies(movieList).map((movie) => ({ ...movie }));
  const draggedIndex = orderedMovies.findIndex((movie) => movie._id === draggedId);
  if (draggedIndex === -1) return null;

  const [draggedMovie] = orderedMovies.splice(draggedIndex, 1);
  const mode = state.ui.orderMode;

  if (mode === "section" && targetContext.section !== "master") {
    const targetSeen = getSectionSeen(targetContext.section);
    draggedMovie.seen = targetSeen;
  }

  let insertIndex = orderedMovies.length;
  if (targetContext.targetId) {
    const indexFromTargetId = orderedMovies.findIndex(
      (movie) => movie._id === targetContext.targetId
    );
    insertIndex = indexFromTargetId === -1 ? orderedMovies.length : indexFromTargetId;
  } else if (mode === "section") {
    insertIndex = findInsertionIndexForSection(orderedMovies, targetContext.section);
  }

  orderedMovies.splice(insertIndex, 0, draggedMovie);

  const nextMovies = orderedMovies.map((movie, index) => ({
    ...movie,
    order: index + 1,
  }));

  const changed = nextMovies.some((movie, index) => {
    const previous = movieList.find((item) => item._id === movie._id);
    if (!previous) return true;
    return movie.order !== previous.order || movie.seen !== previous.seen;
  });

  if (!changed) return null;

  const orderedIds = nextMovies.map((movie) => movie._id);
  const movedAcrossSections =
    mode === "section" &&
    sourceSection &&
    targetContext.section &&
    sourceSection !== targetContext.section &&
    targetContext.section !== "master";

  return {
    nextMovies,
    orderedIds,
    movedAcrossSections,
    targetSection: targetContext.section,
  };
}

function renderWithFlip(beforeRects, options = {}) {
  renderSections(options);
  runFlipAnimation(beforeRects);
}

function startDragFromCard(card) {
  if (!card || hasPendingRequests() || state.ui.currentView !== "home") return false;
  draggedMovieId = card.dataset.id;
  draggedSourceSection = card.dataset.section;
  currentDropContext = null;

  setDragging(true);
  renderLayout();

  // Delay the class to avoid inconsistent browser drag snapshots.
  setTimeout(() => {
    card.classList.add("dragging");
  }, 0);
  return true;
}

function handleDragStart(event) {
  const card = event.target.closest(".movie-card");
  if (!startDragFromCard(card)) return;

  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", draggedMovieId);
  }
}

function handleDragEnter(event) {
  if (!draggedMovieId) return;

  const context = getDropContext(event.target, event.clientY);
  if (!context) return;

  currentDropContext = context;
  highlightSection(context.section);
  showDropIndicator(context.grid, context.index);
}

function handleDragOver(event) {
  event.preventDefault();
  if (!draggedMovieId) return;

  const context = getDropContext(event.target, event.clientY);
  if (!context) return;

  currentDropContext = context;
  highlightSection(context.section);
  showDropIndicator(context.grid, context.index);

  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = "move";
  }
}

function handleDragLeave(event) {
  if (!draggedMovieId) return;

  const grid = event.target.closest(".movies-grid[data-section]");
  if (!grid || event.target !== grid) return;

  const related = event.relatedTarget;
  if (!related || !grid.contains(related)) {
    hideDropIndicator();
    clearSectionHighlights();
  }
}

async function handleDrop(event) {
  event.preventDefault();
  if (!draggedMovieId) return;

  const context = getDropContext(event.target, event.clientY) || currentDropContext;
  await finalizeDrop(context);
}

async function finalizeDrop(context) {
  if (!draggedMovieId) return;

  if (!context) {
    resetDragState();
    touchDragActive = false;
    return;
  }

  const previousSnapshot = snapshotMovies();
  const computed = buildNextMovieState({
    movieList: previousSnapshot,
    draggedId: draggedMovieId,
    targetContext: context,
    sourceSection: draggedSourceSection,
  });

  if (!computed) {
    resetDragState();
    touchDragActive = false;
    return;
  }

  const movedId = draggedMovieId;
  const beforeRects = captureCardPositions();
  replaceMovies(computed.nextMovies);
  renderWithFlip(beforeRects, { movingInId: movedId });

  if (computed.movedAcrossSections) {
    const message =
      computed.targetSection === "watched" ? "Moved to Watched" : "Moved to Unwatched";
    setStatus(message);
    showToast(message);
  } else {
    setStatus("Order updated.");
  }

  resetDragState();

  try {
    const payload = await reorderMoviesApi(computed.orderedIds);
    if (Array.isArray(payload?.movies)) {
      const syncBefore = captureCardPositions();
      replaceMovies(payload.movies);
      renderWithFlip(syncBefore, { movingInId: movedId });
    }
  } catch (error) {
    console.error("Global reorder sync failed:", error);
    const rollbackBefore = captureCardPositions();
    replaceMovies(previousSnapshot);
    renderWithFlip(rollbackBefore);
    setStatus("Unable to save new order.", true);
    showToast("Unable to save new order", "error");
  } finally {
    touchDragActive = false;
  }
}

function handleDragEnd() {
  resetDragState();
  touchDragActive = false;
}

function getDropContextFromPoint(clientX, clientY) {
  const target = document.elementFromPoint(clientX, clientY);
  if (!target) return null;
  return getDropContext(target, clientY);
}

function handleTouchStart(event) {
  if (event.touches.length !== 1) return;

  const dragHandle = event.target.closest(".drag-pill");
  if (!dragHandle) return;

  const card = dragHandle.closest(".movie-card");
  if (!startDragFromCard(card)) return;

  touchDragActive = true;

  const touch = event.touches[0];
  const context = getDropContextFromPoint(touch.clientX, touch.clientY);
  if (context) {
    currentDropContext = context;
    highlightSection(context.section);
    showDropIndicator(context.grid, context.index);
  }

  if (event.cancelable) {
    event.preventDefault();
  }
}

function handleTouchMove(event) {
  if (!touchDragActive || !draggedMovieId) return;
  if (!event.touches.length) return;

  const touch = event.touches[0];
  const context = getDropContextFromPoint(touch.clientX, touch.clientY);
  if (context) {
    currentDropContext = context;
    highlightSection(context.section);
    showDropIndicator(context.grid, context.index);
  }

  if (event.cancelable) {
    event.preventDefault();
  }
}

async function handleTouchEnd(event) {
  if (!touchDragActive || !draggedMovieId) return;

  const touch = event.changedTouches?.[0];
  const context = touch
    ? getDropContextFromPoint(touch.clientX, touch.clientY) || currentDropContext
    : currentDropContext;

  await finalizeDrop(context);
}

function handleTouchCancel() {
  if (!touchDragActive && !draggedMovieId) return;
  resetDragState();
  touchDragActive = false;
}

export function setupDragAndDrop() {
  const root = elements.viewContainer;
  root.addEventListener("dragstart", handleDragStart);
  root.addEventListener("dragenter", handleDragEnter);
  root.addEventListener("dragover", handleDragOver);
  root.addEventListener("dragleave", handleDragLeave);
  root.addEventListener("drop", handleDrop);
  root.addEventListener("dragend", handleDragEnd);
  root.addEventListener("touchstart", handleTouchStart, { passive: false });
  root.addEventListener("touchmove", handleTouchMove, { passive: false });
  root.addEventListener("touchend", handleTouchEnd);
  root.addEventListener("touchcancel", handleTouchCancel);
}
