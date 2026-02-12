const BADGE_SELECTOR = ".order-badge, .drag-pill, .drag-badge, .count-badge";
const MOBILE_QUERY = "(hover: none), (pointer: coarse)";
const MOBILE_COMPACT_QUERY = "(max-width: 480px)";
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const COUNT_ANIMATION_MS = 400;
const NUMBER_UPDATE_MS = 300;

let interactionsBound = false;
const countAnimationRafByElement = new WeakMap();
const numberUpdateTimerByElement = new WeakMap();
const previousOrderByMovieId = new Map();

function prefersReducedMotion() {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

function isMobileDevice() {
  return window.matchMedia(MOBILE_QUERY).matches;
}

function createRipple(event, target) {
  if (!target || prefersReducedMotion()) return;

  const rect = target.getBoundingClientRect();
  const compactMobile = window.matchMedia(MOBILE_COMPACT_QUERY).matches;
  const diameterBase = Math.max(rect.width, rect.height);
  const rippleSize = Math.max(10, diameterBase * (compactMobile ? 1.05 : 1.35));
  const ripple = document.createElement("span");
  ripple.className = "ripple";
  ripple.style.width = `${rippleSize}px`;
  ripple.style.height = `${rippleSize}px`;

  const fallbackX = rect.width / 2;
  const fallbackY = rect.height / 2;
  const clickX = Number.isFinite(event.clientX) ? event.clientX - rect.left : fallbackX;
  const clickY = Number.isFinite(event.clientY) ? event.clientY - rect.top : fallbackY;

  ripple.style.left = `${clickX - rippleSize / 2}px`;
  ripple.style.top = `${clickY - rippleSize / 2}px`;

  target.appendChild(ripple);
  ripple.addEventListener(
    "animationend",
    () => {
      ripple.remove();
    },
    { once: true }
  );
}

export function triggerHapticFeedback(pattern = 15) {
  if (prefersReducedMotion()) return;
  if (!isMobileDevice()) return;
  if (typeof navigator === "undefined") return;
  if (typeof navigator.vibrate !== "function") return;

  try {
    navigator.vibrate(pattern);
  } catch (error) {
    // Ignore unsupported/blocked haptics without interrupting UX.
  }
}

export function setupInteractions(root = document) {
  if (interactionsBound) return;

  root.addEventListener("click", (event) => {
    const badge = event.target.closest(BADGE_SELECTOR);
    if (!badge) return;

    createRipple(event, badge);
    triggerHapticFeedback(15);
  });

  interactionsBound = true;
}

export function animateCount(element, endValue) {
  if (!element) return;

  const end = Number(endValue);
  if (!Number.isFinite(end)) {
    element.textContent = "0";
    return;
  }

  const startFromText = Number.parseInt(element.textContent, 10);
  const startFromDataset = Number.parseInt(element.dataset.countValue || "", 10);
  const start = Number.isFinite(startFromText)
    ? startFromText
    : Number.isFinite(startFromDataset)
      ? startFromDataset
      : end;

  element.dataset.countValue = String(start);

  const previousRaf = countAnimationRafByElement.get(element);
  if (previousRaf) {
    cancelAnimationFrame(previousRaf);
    countAnimationRafByElement.delete(element);
  }

  if (prefersReducedMotion() || start === end) {
    element.textContent = String(end);
    element.dataset.countValue = String(end);
    return;
  }

  const startTime = performance.now();

  const tick = (currentTime) => {
    const progress = Math.min((currentTime - startTime) / COUNT_ANIMATION_MS, 1);
    const value = Math.floor(start + (end - start) * progress);
    element.textContent = String(value);
    element.dataset.countValue = String(value);

    if (progress < 1) {
      const raf = requestAnimationFrame(tick);
      countAnimationRafByElement.set(element, raf);
      return;
    }

    element.textContent = String(end);
    element.dataset.countValue = String(end);
    countAnimationRafByElement.delete(element);
  };

  const raf = requestAnimationFrame(tick);
  countAnimationRafByElement.set(element, raf);
}

function markNumberUpdating(node) {
  if (!node || prefersReducedMotion()) return;

  node.classList.remove("number-updating");
  // Force style recalculation so repeated updates replay the transition.
  void node.offsetWidth;
  node.classList.add("number-updating");

  const activeTimer = numberUpdateTimerByElement.get(node);
  if (activeTimer) {
    clearTimeout(activeTimer);
  }

  const timer = setTimeout(() => {
    node.classList.remove("number-updating");
    numberUpdateTimerByElement.delete(node);
  }, NUMBER_UPDATE_MS);

  numberUpdateTimerByElement.set(node, timer);
}

export function animateOrderNumberChanges(root = document) {
  if (!root) return;

  const cards = root.querySelectorAll(".movie-card[data-id]");
  const currentIds = new Set();

  cards.forEach((card) => {
    const movieId = card.dataset.id;
    const nextOrder = Number.parseInt(card.dataset.order || "", 10);
    if (!movieId || !Number.isFinite(nextOrder)) return;

    currentIds.add(movieId);
    const previousOrder = previousOrderByMovieId.get(movieId);

    if (Number.isFinite(previousOrder) && previousOrder !== nextOrder) {
      markNumberUpdating(card.querySelector(".order-number"));
      markNumberUpdating(card.querySelector(".order-badge"));
    }

    previousOrderByMovieId.set(movieId, nextOrder);
  });

  [...previousOrderByMovieId.keys()].forEach((movieId) => {
    if (!currentIds.has(movieId)) {
      previousOrderByMovieId.delete(movieId);
    }
  });
}
