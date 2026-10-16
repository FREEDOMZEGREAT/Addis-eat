"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ORDER_STATUSES,
  ORDER_STATUS_LABELS,
  allowedStatusTransitions,
} from "@/lib/order-status";
import { setOrderStatusAction } from "./admin-actions";
import OrderCsvExportButton from "@/app/OrderCsvExportButton";

const PAGE_SIZE = 8;

const CURRENCY = new Intl.NumberFormat("en-ET", {
  style: "currency",
  currency: "ETB",
  maximumFractionDigits: 0,
});

const DATE = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
});

const STATUS_BADGE = {
  pending: "badge-gold",
  preparing: "badge-brand",
  delivering: "badge-brand",
  delivered: "badge-success",
  cancelled: "badge-danger",
};

const SORTS = {
  newest: (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
  oldest: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
  highest: (a, b) => b.total - a.total,
};

export default function OrderManager({ orders, dishNames }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);

  const counts = useMemo(() => {
    const base = { all: orders.length };
    for (const value of ORDER_STATUSES) base[value] = 0;
    for (const order of orders) {
      base[order.status] = (base[order.status] ?? 0) + 1;
    }
    return base;
  }, [orders]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const list = orders.filter((order) => {
      if (status !== "all" && order.status !== status) return false;
      if (!needle) return true;
      return [order.id, order.name, order.phone, order.area]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
    return list.sort(SORTS[sort] ?? SORTS.newest);
  }, [orders, query, status, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const visible = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  function updateFilter(setter) {
    return (value) => {
      setter(value);
      setPage(1);
    };
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap gap-2">
        <FilterChip
          label="All orders"
          count={counts.all}
          active={status === "all"}
          onClick={() => updateFilter(setStatus)("all")}
        />
        {ORDER_STATUSES.map((value) => (
          <FilterChip
            key={value}
            label={ORDER_STATUS_LABELS[value]}
            count={counts[value] ?? 0}
            active={status === value}
            onClick={() => updateFilter(setStatus)(value)}
          />
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="relative w-full sm:max-w-xs">
          <span className="sr-only">Search orders</span>
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-sand-400"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(event) => updateFilter(setQuery)(event.target.value)}
            placeholder="Search by id, name, phone or area"
            className="field pl-10"
          />
        </label>

        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-sand-500">
            <span className="font-medium">Sort</span>
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value)}
              className="field max-w-[11rem] py-2"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="highest">Highest total</option>
            </select>
          </label>
          <OrderCsvExportButton
            orders={filtered}
            dishNames={dishNames}
            filename="addis-eats-orders.csv"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[48rem] border-collapse text-sm">
              <thead>
                <tr className="border-b border-sand-100 bg-sand-50/60 text-left text-xs font-semibold uppercase tracking-wide text-sand-500">
                  <th scope="col" className="px-5 py-3">
                    Order
                  </th>
                  <th scope="col" className="px-5 py-3">
                    Customer
                  </th>
                  <th scope="col" className="px-5 py-3">
                    Area
                  </th>
                  <th scope="col" className="px-5 py-3 text-right">
                    Total
                  </th>
                  <th scope="col" className="px-5 py-3">
                    Placed
                  </th>
                  <th scope="col" className="px-5 py-3">
                    Status
                  </th>
                  <th scope="col" className="px-5 py-3">
                    Move to
                  </th>
                </tr>
              </thead>
              <tbody>
                {visible.map((order) => (
                  <OrderRow key={order.id} order={order} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {totalPages > 1 && (
        <nav
          className="flex items-center justify-between gap-3"
          aria-label="Order pages"
        >
          <p className="text-sm text-sand-500">
            Page {safePage} of {totalPages} · {filtered.length} orders
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn btn-outline py-2"
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              disabled={safePage <= 1}
            >
              Previous
            </button>
            <button
              type="button"
              className="btn btn-outline py-2"
              onClick={() =>
                setPage((value) => Math.min(totalPages, value + 1))
              }
              disabled={safePage >= totalPages}
            >
              Next
            </button>
          </div>
        </nav>
      )}
    </section>
  );
}

function FilterChip({ label, count, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="chip"
    >
      {label}
      <span className="chip-count">{count}</span>
    </button>
  );
}

function OrderRow({ order }) {
  const itemCount = (order.items ?? []).reduce(
    (sum, item) => sum + Number(item.qty ?? 1),
    0,
  );

  return (
    <tr className="border-b border-sand-100/80 last:border-0 hover:bg-sand-50/50">
      <td className="px-5 py-4 align-top">
        <Link
          href={`/track/${order.id}`}
          className="font-semibold text-brand-700 hover:text-brand-800 hover:underline"
        >
          #{order.id.slice(-6).toUpperCase()}
        </Link>
        <p className="mt-0.5 text-xs text-sand-400">
          {itemCount} {itemCount === 1 ? "item" : "items"}
        </p>
      </td>
      <td className="px-5 py-4 align-top">
        <p className="font-medium text-sand-800">{order.name}</p>
        <p className="mt-0.5 text-xs text-sand-400">{order.phone}</p>
      </td>
      <td className="px-5 py-4 align-top text-sand-600">{order.area}</td>
      <td className="px-5 py-4 align-top text-right font-medium text-sand-800">
        {CURRENCY.format(order.total)}
      </td>
      <td className="px-5 py-4 align-top text-xs text-sand-500">
        {DATE.format(new Date(order.createdAt))}
      </td>
      <td className="px-5 py-4 align-top">
        <span className={"badge " + STATUS_BADGE[order.status]}>
          {ORDER_STATUS_LABELS[order.status] ?? order.status}
        </span>
      </td>
      <td className="px-5 py-4 align-top">
        <StatusControl order={order} />
      </td>
    </tr>
  );
}

function StatusControl({ order }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const options = allowedStatusTransitions(order.status);

  if (options.length === 0) {
    return (
      <span className="text-xs font-medium text-sand-400">No further action</span>
    );
  }

  function handleChange(event) {
    const next = event.target.value;
    if (!next) return;
    setError("");

    startTransition(async () => {
      const result = await setOrderStatusAction(order.id, next);
      if (!result.ok) {
        setError(result.error ?? "Something went wrong.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div>
      <label className="sr-only" htmlFor={`status-${order.id}`}>
        Update status for order {order.id}
      </label>
      <div className="flex items-center gap-2">
        <select
          id={`status-${order.id}`}
          value=""
          onChange={handleChange}
          disabled={pending}
          className="field max-w-[10rem] py-1.5 text-xs font-medium"
        >
          <option value="" disabled>
            Choose…
          </option>
          {options.map((value) => (
            <option key={value} value={value}>
              {ORDER_STATUS_LABELS[value]}
            </option>
          ))}
        </select>
        {pending && <span className="spinner" aria-hidden="true" />}
      </div>
      {error && <p className="field-error mt-1 text-xs">{error}</p>}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="card grid place-items-center px-6 py-16 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-sand-100 text-sand-400">
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-6 w-6"
        >
          <path d="M4 7h16l-1.5 12.5a1 1 0 0 1-1 .9H6.5a1 1 0 0 1-1-.9Z" />
          <path d="M9 7V5a3 3 0 0 1 6 0v2" />
        </svg>
      </span>
      <h3 className="mt-4 font-display text-lg font-semibold">No orders here</h3>
      <p className="mt-1 max-w-xs text-sm text-sand-500">
        Adjust the filters, or wait for the next order to arrive.
      </p>
    </div>
  );
}
