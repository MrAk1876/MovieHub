const API_BASE = "/api/movies";

let activeRequests = 0;
let onRequestStateChange = null;

function notifyRequestState(loadingText = "") {
  if (typeof onRequestStateChange === "function") {
    onRequestStateChange({
      activeRequests,
      isLoading: activeRequests > 0,
      loadingText,
    });
  }
}

function beginRequest(loadingText = "Loading...") {
  activeRequests += 1;
  notifyRequestState(loadingText);
}

function endRequest() {
  activeRequests = Math.max(0, activeRequests - 1);
  const loadingText = activeRequests > 0 ? "Working..." : "";
  notifyRequestState(loadingText);
}

export function setApiRequestListener(listener) {
  onRequestStateChange = listener;
}

export function hasPendingRequests() {
  return activeRequests > 0;
}

export async function request(url, options = {}) {
  // Centralized fetch wrapper keeps headers, JSON handling, and loading state consistent.
  beginRequest(options.loadingText || "Loading...");

  try {
    const headers = {
      Accept: "application/json",
      ...(options.headers || {}),
    };

    if (options.body && !headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    const contentType = response.headers.get("content-type") || "";
    const payload = contentType.includes("application/json")
      ? await response.json()
      : null;

    if (!response.ok) {
      throw new Error(payload?.message || `Request failed (${response.status}).`);
    }

    return payload;
  } finally {
    endRequest();
  }
}

export function fetchMoviesApi() {
  return request(API_BASE, {
    method: "GET",
    loadingText: "Fetching movies...",
  });
}

export function createMovieApi(payload) {
  return request(API_BASE, {
    method: "POST",
    body: JSON.stringify(payload),
    loadingText: "Adding movie...",
  });
}

export function updateMovieApi(movieId, payload) {
  return request(`${API_BASE}/${movieId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
    loadingText: "Updating movie...",
  });
}

export function deleteMovieApi(movieId) {
  return request(`${API_BASE}/${movieId}`, {
    method: "DELETE",
    loadingText: "Deleting movie...",
  });
}

export function toggleMovieApi(movieId) {
  return request(`${API_BASE}/${movieId}/toggle`, {
    method: "PATCH",
    loadingText: "Updating status...",
  });
}

export function reorderMoviesApi(orderedIds) {
  return request(`${API_BASE}/reorder-global`, {
    method: "PUT",
    body: JSON.stringify({
      orderedIds,
    }),
    loadingText: "Saving global order...",
  });
}
