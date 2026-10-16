export const ORDER_STATUSES = [
  "pending",
  "preparing",
  "delivering",
  "delivered",
  "cancelled",
];

export const ORDER_STATUS_TRANSITIONS = {
  pending: ["preparing", "cancelled"],
  preparing: ["delivering", "cancelled"],
  delivering: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};

export const TERMINAL_STATUSES = ["delivered", "cancelled"];

export const ORDER_STATUS_LABELS = {
  pending: "Pending",
  preparing: "Preparing",
  delivering: "Delivering",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export function isOrderStatus(value) {
  return ORDER_STATUSES.includes(value);
}

export function allowedStatusTransitions(status) {
  return ORDER_STATUS_TRANSITIONS[status] ?? [];
}

export function canTransitionStatus(from, to) {
  if (!isOrderStatus(to)) return false;
  return allowedStatusTransitions(from).includes(to);
}
