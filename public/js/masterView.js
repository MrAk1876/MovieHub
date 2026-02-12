// Master-list specific card shaping is isolated here so render/state logic stays clean.
export function applyMasterCardLayout(card, movie) {
  if (!card) return;

  card.classList.add("master-item");

  let orderNode = card.querySelector(".order-number");
  if (!orderNode) {
    orderNode = document.createElement("div");
    orderNode.className = "order-number";
    card.prepend(orderNode);
  }

  orderNode.textContent = String(movie.order);
}
