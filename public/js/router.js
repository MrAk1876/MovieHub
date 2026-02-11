import { setCurrentView } from "./state.js";

const HOME_PATH = "/";
const ADD_PATH = "/add";

let routeChangeHandler = null;

function normalizePath(pathname = "/") {
  let path = String(pathname || "/");

  if (path.endsWith("/index.html")) {
    path = path.slice(0, -"/index.html".length);
  }

  path = path.replace(/\/+$/, "");
  if (!path) return "/";

  return path;
}

function getViewFromPath(pathname) {
  const normalized = normalizePath(pathname);
  return normalized === ADD_PATH ? "add" : "home";
}

function getPathFromView(view) {
  return view === "add" ? ADD_PATH : HOME_PATH;
}

function notifyRouteChange(view) {
  if (typeof routeChangeHandler === "function") {
    routeChangeHandler(view);
  }
}

function applyRouteFromLocation() {
  const view = getViewFromPath(window.location.pathname);
  setCurrentView(view);
  notifyRouteChange(view);
  return view;
}

export function navigateTo(view, options = {}) {
  const { replace = false, scrollTop = false } = options;
  const normalizedView = view === "add" ? "add" : "home";
  const targetPath = getPathFromView(normalizedView);
  const currentPath = normalizePath(window.location.pathname);
  const historyState = { page: normalizedView };

  if (replace || currentPath === targetPath) {
    window.history.replaceState(historyState, "", targetPath);
  } else {
    // Push a new browser history entry so back/forward works naturally in SPA mode.
    window.history.pushState(historyState, "", targetPath);
  }

  setCurrentView(normalizedView);
  notifyRouteChange(normalizedView);

  if (scrollTop) {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "smooth",
    });
  }
}

export function setupRouting({ onRouteChange } = {}) {
  routeChangeHandler = typeof onRouteChange === "function" ? onRouteChange : null;

  const handlePopState = () => {
    // Back/forward should always render the view that matches the URL path.
    applyRouteFromLocation();
  };

  window.addEventListener("popstate", handlePopState);
  applyRouteFromLocation();

  return () => {
    window.removeEventListener("popstate", handlePopState);
  };
}

