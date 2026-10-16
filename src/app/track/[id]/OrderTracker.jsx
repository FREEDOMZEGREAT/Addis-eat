"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import {
  buildRouteMetrics,
  formatDistanceRemaining,
  formatEta,
  pointAtDistance,
} from "@/lib/geo";
import { ORDER_STATUS_LABELS } from "@/lib/order-status";

const TrackingMap = dynamic(() => import("./TrackingMap"), {
  ssr: false,
  loading: () => (
    <div className="h-[26rem] w-full rounded-card bg-sand-100 skeleton" />
  ),
});

const STAGES = [
  { id: "pending", label: "Received" },
  { id: "preparing", label: "Preparing" },
  { id: "delivering", label: "On the way" },
  { id: "delivered", label: "Delivered" },
];

const STATUS_BADGE = {
  pending: "badge-gold",
  preparing: "badge-brand",
  delivering: "badge-brand",
  delivered: "badge-success",
  cancelled: "badge-danger",
};

function computeLive(tracking, now) {
  const { status, route, dispatchReady } = tracking;
  const origin = tracking.origin;

  if (status === "delivered") {
    return {
      status,
      progress: 1,
      courier: tracking.destination ?? origin,
      distanceRemaining: 0,
      etaSeconds: 0,
    };
  }

  if (status === "cancelled") {
    return {
      status,
      progress: 0,
      courier: origin,
      distanceRemaining: null,
      etaSeconds: null,
    };
  }

  if (dispatchReady && route && tracking.dispatchedAt && tracking.durationSeconds) {
    const elapsed =
      (now - new Date(tracking.dispatchedAt).getTime()) / 1000;
    const progress = Math.max(
      0,
      Math.min(1, elapsed / tracking.durationSeconds),
    );

    const metrics = buildRouteMetrics(route.coordinates);
    const courier =
      pointAtDistance(
        route.coordinates,
        metrics.cumulative,
        metrics.total * progress,
      ) ?? origin;

    return {
      status: progress >= 1 ? "delivered" : status,
      progress,
      courier,
      distanceRemaining: Math.max(
        0,
        Math.round((tracking.distanceMeters ?? metrics.total) * (1 - progress)),
      ),
      etaSeconds: Math.max(
        0,
        Math.round(tracking.durationSeconds * (1 - progress)),
      ),
    };
  }

  return {
    status,
    progress: 0,
    courier: origin,
    distanceRemaining: null,
    etaSeconds: null,
  };
}

export default function OrderTracker({ initial }) {
  const { data } = useSWR(`/api/track/${initial.orderId}`, fetcher, {
    fallbackData: initial,
    refreshInterval: (latest) =>
      latest && ["delivered", "cancelled"].includes(latest.status) ? 0 : 4000,
  });

  const tracking = data ?? initial;
  const isFinal = ["delivered", "cancelled"].includes(tracking.status);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (isFinal) return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [isFinal]);

  const withFlags = useMemo(
    () => ({
      ...tracking,
      dispatchReady:
        tracking.status === "delivering" &&
        Boolean(tracking.route) &&
        Boolean(tracking.dispatchedAt),
    }),
    [tracking],
  );

  const live = useMemo(() => computeLive(withFlags, now), [withFlags, now]);
  const fitKey = tracking.route
    ? `${tracking.orderId}-route`
    : `${tracking.orderId}-start`;

  const status = live.status;
  const isDelivering = status === "delivering";
  const isDelivered = status === "delivered";
  const isCancelled = status === "cancelled";

  return (
    <section className="mx-auto w-full max-w-4xl px-5 py-10 sm:px-6 sm:py-14">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Live tracking</p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Order #{tracking.orderId.slice(-6).toUpperCase()}
          </h1>
          <p className="mt-2 text-sm text-sand-500">
            Delivering to {tracking.destination?.label ?? tracking.area}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`badge ${STATUS_BADGE[status] ?? "badge-neutral"}`}>
            {ORDER_STATUS_LABELS[status] ?? status}
          </span>
          <Link href="/orders" className="btn btn-outline">
            Back to orders
          </Link>
        </div>
      </div>

      {!isCancelled && <StageStepper status={status} />}

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Status"
          value={ORDER_STATUS_LABELS[status] ?? status}
          hint={statusHint(status)}
        />
        <StatCard
          label="Distance left"
          value={
            isDelivered
              ? "0 m"
              : isDelivering
                ? (formatDistanceRemaining(live.distanceRemaining) ?? "—")
                : "Starts on dispatch"
          }
          hint={isDelivering ? "To your door" : "Route begins when out for delivery"}
        />
        <StatCard
          label="ETA"
          value={
            isDelivered
              ? "Delivered"
              : isDelivering
                ? (formatEta(live.etaSeconds) ?? "—")
                : "—"
          }
          hint={isDelivering ? "Estimated arrival" : "Not on the road yet"}
        />
      </div>

      <div className="mt-6 card overflow-hidden p-2">
        <TrackingMap
          origin={tracking.origin}
          destination={tracking.destination}
          route={tracking.route}
          courier={live.courier}
          fitKey={fitKey}
        />
      </div>

      <p className="mt-4 text-sm text-sand-500">
        {isCancelled
          ? "This order was cancelled."
          : isDelivered
            ? "Delivered — enjoy your meal!"
            : isDelivering
              ? "Your courier is on the way, following the road route."
              : "We are preparing your order. The route will appear once it leaves the kitchen."}
      </p>
    </section>
  );
}

function statusHint(status) {
  if (status === "pending") return "Waiting on the kitchen";
  if (status === "preparing") return "Being cooked now";
  if (status === "delivering") return "Courier en route";
  if (status === "delivered") return "Completed";
  return "Cancelled";
}

function StatCard({ label, value, hint }) {
  return (
    <div className="card px-5 py-4">
      <p className="eyebrow">{label}</p>
      <p className="mt-2 font-display text-2xl font-semibold text-sand-900">
        {value}
      </p>
      <p className="mt-1 text-xs text-sand-400">{hint}</p>
    </div>
  );
}

function StageStepper({ status }) {
  const currentIndex = STAGES.findIndex((stage) => stage.id === status);

  return (
    <ol className="flex flex-wrap items-center gap-y-3">
      {STAGES.map((stage, index) => {
        const done = index <= currentIndex;
        return (
          <li key={stage.id} className="flex items-center gap-3">
            <span
              className={
                "grid h-8 w-8 place-items-center rounded-full text-xs font-semibold " +
                (done
                  ? "bg-brand-700 text-white"
                  : "bg-sand-100 text-sand-400")
              }
            >
              {index + 1}
            </span>
            <span
              className={
                "text-sm font-medium " +
                (done ? "text-sand-900" : "text-sand-400")
              }
            >
              {stage.label}
            </span>
            {index < STAGES.length - 1 && (
              <span
                aria-hidden="true"
                className={
                  "mx-1 hidden h-px w-8 sm:block " +
                  (index < currentIndex ? "bg-brand-700" : "bg-sand-200")
                }
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
