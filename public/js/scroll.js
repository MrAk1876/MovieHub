const SCROLL_STEP = 300;
let hasResizeListener = false;

function getWrapperParts(wrapper) {
  const grid = wrapper.querySelector(".horizontal-scroll-grid");
  const wrapperScroll =
    wrapper.querySelector(".movie-scroll-container") ||
    wrapper.querySelector(".movies-scroll-wrapper");
  return {
    grid,
    scrollContainer: wrapperScroll || grid,
    leftButton: wrapper.querySelector(".scroll-left"),
    rightButton: wrapper.querySelector(".scroll-right"),
    progress: wrapper.querySelector(".scroll-progress"),
  };
}

function getScrollMetrics(scrollContainer) {
  if (!scrollContainer) {
    return { scrollLeft: 0, maxScrollLeft: 0, progress: 0, isScrollable: false };
  }

  const maxScrollLeft = Math.max(0, scrollContainer.scrollWidth - scrollContainer.clientWidth);
  const scrollLeft = Math.max(0, Math.min(scrollContainer.scrollLeft, maxScrollLeft));
  const progress = maxScrollLeft > 0 ? scrollLeft / maxScrollLeft : 0;

  return {
    scrollLeft,
    maxScrollLeft,
    progress,
    isScrollable: maxScrollLeft > 2,
  };
}

function updateWrapperState(wrapper) {
  if (!wrapper || wrapper.offsetParent === null) return;

  const { scrollContainer, leftButton, rightButton, progress } = getWrapperParts(wrapper);
  if (!scrollContainer) return;

  const metrics = getScrollMetrics(scrollContainer);
  const canScrollLeft = metrics.scrollLeft > 1;
  const canScrollRight = metrics.scrollLeft < metrics.maxScrollLeft - 1;

  wrapper.classList.toggle("is-scrollable", metrics.isScrollable);
  wrapper.classList.toggle("can-scroll-left", metrics.isScrollable && canScrollLeft);
  wrapper.classList.toggle("can-scroll-right", metrics.isScrollable && canScrollRight);

  if (leftButton) {
    leftButton.disabled = !metrics.isScrollable || !canScrollLeft;
  }

  if (rightButton) {
    rightButton.disabled = !metrics.isScrollable || !canScrollRight;
  }

  if (progress) {
    progress.style.width = `${Math.round(metrics.progress * 100)}%`;
  }
}

function bindWrapper(wrapper) {
  if (!wrapper || wrapper.dataset.scrollBound === "1") return;

  wrapper.dataset.scrollBound = "1";
  const { scrollContainer, leftButton, rightButton } = getWrapperParts(wrapper);
  if (!scrollContainer) return;

  leftButton?.addEventListener("click", () => {
    scrollContainer.scrollBy({ left: -SCROLL_STEP, behavior: "smooth" });
  });

  rightButton?.addEventListener("click", () => {
    scrollContainer.scrollBy({ left: SCROLL_STEP, behavior: "smooth" });
  });

  scrollContainer.addEventListener(
    "scroll",
    () => {
      updateWrapperState(wrapper);
    },
    { passive: true }
  );

  // Initial paint after layout calculations.
  requestAnimationFrame(() => {
    updateWrapperState(wrapper);
  });
}

export function setupSectionScrollUX(root = document) {
  const wrappers = root.querySelectorAll(".section-wrapper");
  wrappers.forEach(bindWrapper);

  if (!hasResizeListener) {
    window.addEventListener("resize", () => {
      syncSectionScrollUX(document);
    });
    hasResizeListener = true;
  }
}

export function syncSectionScrollUX(root = document) {
  const wrappers = root.querySelectorAll(".section-wrapper");
  wrappers.forEach((wrapper) => updateWrapperState(wrapper));
}
