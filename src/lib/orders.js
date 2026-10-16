import { randomUUID } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import { priceCart } from "./dishes";
import { AREA_FEE } from "./schema";
import { RESTAURANT_ORIGIN, destinationForArea } from "./locations";
import { fetchDrivingRoute } from "./routing";
import { buildRouteMetrics, pointAtDistance } from "./geo";
import {
  ORDER_STATUSES,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_TRANSITIONS,
  TERMINAL_STATUSES,
  allowedStatusTransitions,
  canTransitionStatus,
  isOrderStatus,
} from "./order-status";

export {
  ORDER_STATUSES,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_TRANSITIONS,
  TERMINAL_STATUSES,
  allowedStatusTransitions,
  canTransitionStatus,
  isOrderStatus,
};

// Local development falls back to an in-memory store. Production (Vercel) has
// no persistent filesystem, so orders are written to Neon Postgres whenever
// DATABASE_URL is configured.
//
// The fallback hangs off globalThis so every route/server component in the
// dev process shares a single array; a plain module variable is isolated per
// route graph and drops orders between pages. This is still per-process and
// clears on restart — it is only a local-development convenience.
const globalStore = globalThis;
const orders = (globalStore.__addisOrders ??= []);

let databaseClient;
let databaseSchemaPromise;

async function getOrderDatabase() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("DATABASE_URL must be configured in production.");
    }
    return null;
  }

  databaseClient ??= neon(connectionString);
  databaseSchemaPromise ??= (async () => {
    await databaseClient`
      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        area TEXT NOT NULL,
        address TEXT NOT NULL DEFAULT '',
        note TEXT NOT NULL DEFAULT '',
        items JSONB NOT NULL,
        subtotal INTEGER NOT NULL,
        delivery_fee INTEGER NOT NULL,
        total INTEGER NOT NULL,
        currency TEXT NOT NULL DEFAULT 'ETB',
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        cancelled_at TIMESTAMPTZ
      )
    `;
    await databaseClient`
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS dispatched_at TIMESTAMPTZ
    `;
    await databaseClient`
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking JSONB
    `;
  })()
    .then(() => undefined)
    .catch((error) => {
      databaseSchemaPromise = undefined;
      throw error;
    });

  await databaseSchemaPromise;
  return databaseClient;
}

function rowToOrder(row) {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    phone: row.phone,
    area: row.area,
    address: row.address,
    note: row.note,
    items: typeof row.items === "string" ? JSON.parse(row.items) : row.items,
    subtotal: Number(row.subtotal),
    deliveryFee: Number(row.delivery_fee),
    total: Number(row.total),
    currency: row.currency,
    status: row.status,
    createdAt: new Date(row.created_at).toISOString(),
    cancelledAt: row.cancelled_at
      ? new Date(row.cancelled_at).toISOString()
      : undefined,
    dispatchedAt: row.dispatched_at
      ? new Date(row.dispatched_at).toISOString()
      : undefined,
    tracking:
      typeof row.tracking === "string" ? JSON.parse(row.tracking) : row.tracking,
  };
}

export async function createOrder(data, userId) {
  if (!userId) throw new Error("An authenticated user is required.");

  const subtotal = await priceCart(data.items);
  const deliveryFee = AREA_FEE[data.area] ?? 0;
  const id = `ord_${randomUUID()}`;

  const database = await getOrderDatabase();

  if (database) {
    const rows = await database`
      INSERT INTO orders (
        id, user_id, name, phone, area, address, note, items,
        subtotal, delivery_fee, total
      )
      VALUES (
        ${id}, ${userId}, ${data.name}, ${data.phone}, ${data.area},
        ${data.address ?? ""}, ${data.note ?? ""},
        ${JSON.stringify(data.items)}::jsonb,
        ${subtotal}, ${deliveryFee}, ${subtotal + deliveryFee}
      )
      RETURNING *
    `;
    return rowToOrder(rows[0]);
  }

  const order = {
    id,
    userId,
    name: data.name,
    phone: data.phone,
    area: data.area,
    address: data.address ?? "",
    note: data.note ?? "",
    items: data.items,
    subtotal,
    deliveryFee,
    total: subtotal + deliveryFee,
    currency: "ETB",
    status: "pending",
    createdAt: new Date().toISOString(),
  };

  orders.push(order);
  return order;
}

async function readOrder(id) {
  const database = await getOrderDatabase();

  if (database) {
    const rows = await database`
      SELECT * FROM orders WHERE id = ${id} LIMIT 1
    `;
    return rows[0] ? rowToOrder(rows[0]) : null;
  }

  return orders.find((order) => order.id === id) ?? null;
}

async function applyStatus(id, status, extra = {}) {
  const database = await getOrderDatabase();

  if (database) {
    let rows;
    if (status === "delivering" && extra.tracking) {
      rows = await database`
        UPDATE orders
        SET status = ${status},
            dispatched_at = ${extra.dispatchedAt ?? new Date().toISOString()},
            tracking = ${JSON.stringify(extra.tracking)}::jsonb
        WHERE id = ${id}
        RETURNING *
      `;
    } else if (status === "cancelled") {
      rows = await database`
        UPDATE orders
        SET status = ${status}, cancelled_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `;
    } else {
      rows = await database`
        UPDATE orders
        SET status = ${status}
        WHERE id = ${id}
        RETURNING *
      `;
    }
    return rows[0] ? rowToOrder(rows[0]) : null;
  }

  const order = orders.find((entry) => entry.id === id);
  if (!order) return null;

  order.status = status;
  if (status === "delivering" && extra.tracking) {
    order.tracking = extra.tracking;
    order.dispatchedAt = extra.dispatchedAt ?? new Date().toISOString();
  }
  if (status === "cancelled") {
    order.cancelledAt = new Date().toISOString();
  }

  return order;
}

async function buildTracking(order) {
  const destination = destinationForArea(order.area);
  if (!destination) {
    throw new Error(`No delivery coordinates are configured for ${order.area}.`);
  }

  const route = await fetchDrivingRoute(RESTAURANT_ORIGIN, destination);

  return {
    geometry: route.geometry,
    distanceMeters: route.distanceMeters,
    durationSeconds: route.durationSeconds,
    origin: RESTAURANT_ORIGIN,
    destination,
  };
}

function isDeliveryComplete(order) {
  if (order.status !== "delivering" || !order.dispatchedAt || !order.tracking) {
    return false;
  }
  const arrivesAt =
    new Date(order.dispatchedAt).getTime() +
    order.tracking.durationSeconds * 1000;
  return Date.now() >= arrivesAt;
}

async function reconcile(order) {
  if (!isDeliveryComplete(order)) return order;
  const updated = await applyStatus(order.id, "delivered");
  return updated ?? order;
}

export async function getOrders(userId) {
  if (!userId) return [];

  const database = await getOrderDatabase();

  if (database) {
    const rows = await database`
      SELECT * FROM orders WHERE user_id = ${userId} ORDER BY created_at ASC
    `;
    return Promise.all(rows.map(rowToOrder).map(reconcile));
  }

  return Promise.all(
    orders
      .filter((order) => order.userId === userId)
      .map((order) => reconcile(order)),
  );
}

export async function getAllOrders() {
  const database = await getOrderDatabase();

  if (database) {
    const rows = await database`SELECT * FROM orders ORDER BY created_at ASC`;
    return Promise.all(rows.map(rowToOrder).map(reconcile));
  }

  return Promise.all([...orders].map((order) => reconcile(order)));
}

export async function getOrder(id) {
  const order = await readOrder(id);
  if (!order) return null;
  return reconcile(order);
}

export async function updateOrderStatus(id, status) {
  if (!isOrderStatus(status)) {
    throw new Error(`Unknown order status: ${status}`);
  }

  const current = await readOrder(id);
  if (!current) return null;

  if (!canTransitionStatus(current.status, status)) {
    throw new Error(`Cannot move an order from ${current.status} to ${status}.`);
  }

  const extra = {};
  if (status === "delivering") {
    extra.tracking = await buildTracking(current);
    extra.dispatchedAt = new Date().toISOString();
  }

  return applyStatus(id, status, extra);
}

export async function markCancelled(id) {
  const order = await readOrder(id);
  if (!order || !canTransitionStatus(order.status, "cancelled")) {
    return null;
  }

  return updateOrderStatus(id, "cancelled");
}

export function getTrackingPayload(order) {
  const destination = order.tracking?.destination ?? destinationForArea(order.area);
  const origin = order.tracking?.origin ?? RESTAURANT_ORIGIN;
  const geometry = order.tracking?.geometry ?? null;
  const distanceMeters = order.tracking?.distanceMeters ?? null;
  const durationSeconds = order.tracking?.durationSeconds ?? null;

  let progress = 0;
  let courier = { lat: origin.lat, lng: origin.lng };
  let distanceRemaining = distanceMeters;
  let etaSeconds = durationSeconds;

  if (order.status === "delivered") {
    progress = 1;
    distanceRemaining = 0;
    etaSeconds = 0;
    courier = destination
      ? { lat: destination.lat, lng: destination.lng }
      : courier;
  } else if (
    order.status === "delivering" &&
    order.dispatchedAt &&
    durationSeconds &&
    geometry
  ) {
    const elapsed =
      (Date.now() - new Date(order.dispatchedAt).getTime()) / 1000;
    progress = Math.max(0, Math.min(1, elapsed / durationSeconds));

    const metrics = buildRouteMetrics(geometry.coordinates);
    courier =
      pointAtDistance(
        geometry.coordinates,
        metrics.cumulative,
        metrics.total * progress,
      ) ?? courier;

    distanceRemaining = Math.max(0, Math.round(distanceMeters * (1 - progress)));
    etaSeconds = Math.max(0, Math.round(durationSeconds * (1 - progress)));
  }

  return {
    orderId: order.id,
    status: order.status,
    area: order.area,
    origin: { lat: origin.lat, lng: origin.lng, label: origin.label },
    destination: destination
      ? { lat: destination.lat, lng: destination.lng, label: destination.label }
      : null,
    route: geometry ? { type: "LineString", coordinates: geometry.coordinates } : null,
    distanceMeters,
    durationSeconds,
    dispatchedAt: order.dispatchedAt ?? null,
    courier,
    progress,
    distanceRemaining,
    etaSeconds,
    updatedAt: new Date().toISOString(),
  };
}
