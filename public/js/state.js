const VISIBLE_STEP = 6;
const SECTION_KEYS = ["unwatched", "watched"];

const initialTheme = document.body.classList.contains("dark") ? "dark" : "light";

export const state = {
  movies: [],
  filters: {
    search: "",
    year: null,
  },
  theme: initialTheme,
  ui: {
    currentView: "home",
    orderMode: "section", // section | master
    // Master view vertical pagination count.
    visibleCount: VISIBLE_STEP,
    // Section view horizontal pagination counts per rail.
    visibleBySection: {
      unwatched: VISIBLE_STEP,
      watched: VISIBLE_STEP,
    },
    loading: false,
    loadingText: "",
    statusMessage: "",
    statusError: false,
    dragging: false,
  },
  pendingToggleIds: new Set(),
};

export function normalizeMovie(movie) {
  return {
    ...movie,
    year: Number(movie.year),
    order: Number.isFinite(Number(movie.order)) ? Number(movie.order) : 0,
    seen: Boolean(movie.seen),
  };
}

export function sortMovies(list) {
  // Global ordering contract: always by order ascending.
  return [...list].sort((a, b) => Number(a.order) - Number(b.order));
}

export function setMovies(movies) {
  state.movies = sortMovies(movies.map(normalizeMovie));
}

export function replaceMovies(moviesSnapshot) {
  state.movies = sortMovies(moviesSnapshot.map(normalizeMovie));
}

export function snapshotMovies() {
  return state.movies.map((movie) => ({ ...movie }));
}

export function upsertMovie(movie) {
  const normalized = normalizeMovie(movie);
  const existingIndex = state.movies.findIndex((item) => item._id === normalized._id);

  if (existingIndex === -1) {
    state.movies = [...state.movies, normalized];
  } else {
    const nextMovies = [...state.movies];
    nextMovies[existingIndex] = normalized;
    state.movies = nextMovies;
  }

  state.movies = sortMovies(state.movies);
}

export function removeMovie(movieId) {
  state.movies = state.movies.filter((movie) => movie._id !== movieId);
}

export function getMovieById(movieId) {
  return state.movies.find((movie) => movie._id === movieId) || null;
}

export function getUniqueYears() {
  return [...new Set(state.movies.map((movie) => movie.year).filter(Number.isInteger))].sort(
    (a, b) => a - b
  );
}

export function setSearchFilter(search) {
  state.filters.search = String(search ?? "");
}

export function setYearFilter(year) {
  if (year === null || year === undefined) {
    state.filters.year = null;
    return;
  }
  const parsedYear = Number(year);
  state.filters.year = Number.isFinite(parsedYear) ? parsedYear : null;
}

export function setCurrentView(view) {
  state.ui.currentView = view === "add" ? "add" : "home";
}

export function setOrderMode(mode) {
  state.ui.orderMode = mode === "master" ? "master" : "section";
}

export function setTheme(theme) {
  state.theme = theme === "dark" ? "dark" : "light";
}

export function setLoading(isLoading, loadingText = "Loading...") {
  state.ui.loading = isLoading;
  state.ui.loadingText = isLoading ? loadingText : "";
}

export function setStatus(message = "", isError = false) {
  state.ui.statusMessage = message;
  state.ui.statusError = Boolean(isError);
}

export function setDragging(isDragging) {
  state.ui.dragging = Boolean(isDragging);
}

export function markTogglePending(movieId, isPending) {
  if (isPending) {
    state.pendingToggleIds.add(movieId);
    return;
  }
  state.pendingToggleIds.delete(movieId);
}

export function isTogglePending(movieId) {
  return state.pendingToggleIds.has(movieId);
}

export function resetVisibleCount() {
  state.ui.visibleCount = VISIBLE_STEP;
  state.ui.visibleBySection.unwatched = VISIBLE_STEP;
  state.ui.visibleBySection.watched = VISIBLE_STEP;
}

export function ensureVisibleCountAtLeast(minimum) {
  state.ui.visibleCount = Math.max(state.ui.visibleCount, minimum);
  SECTION_KEYS.forEach((section) => {
    state.ui.visibleBySection[section] = Math.max(state.ui.visibleBySection[section], minimum);
  });
}

function getFilteredSectionTotal(section) {
  const target = section === "watched" ? "watched" : "unwatched";
  const wantsSeen = target === "watched";
  return getFilteredMovies().filter((movie) => Boolean(movie.seen) === wantsSeen).length;
}

export function increaseVisibleCount(step = VISIBLE_STEP, section = null) {
  if (section === "unwatched" || section === "watched") {
    const total = getFilteredSectionTotal(section);
    const current = state.ui.visibleBySection[section];
    const next = Math.min(total, current + step);
    const changed = next !== current;
    state.ui.visibleBySection[section] = next;
    return changed;
  }

  const total = getFilteredMovies().length;
  const next = Math.min(total, state.ui.visibleCount + step);
  const changed = next !== state.ui.visibleCount;
  state.ui.visibleCount = next;
  return changed;
}

export function getFilteredMovies() {
  const search = state.filters.search.trim().toLowerCase();
  const yearFilter = state.filters.year;

  return sortMovies(
    state.movies.filter((movie) => {
      const yearMatches = yearFilter === null || movie.year === yearFilter;
      if (!yearMatches) return false;

      if (!search) return true;
      return (
        movie.title.toLowerCase().includes(search) ||
        String(movie.year).toLowerCase().includes(search)
      );
    })
  );
}

export function getVisibleMovies() {
  return getFilteredMovies().slice(0, state.ui.visibleCount);
}

export function toggleMovieLocally(movieId) {
  const movie = getMovieById(movieId);
  if (!movie) return null;

  state.movies = sortMovies(
    state.movies.map((item) =>
      item._id === movieId
        ? {
            ...item,
            seen: !item.seen,
          }
        : item
    )
  );

  return getMovieById(movieId);
}
