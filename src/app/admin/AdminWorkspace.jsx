"use client";

import { useState } from "react";
import RevenueCharts from "./RevenueCharts";
import OrderManager from "./OrderManager";
import MenuManager from "./MenuManager";

const CURRENCY = new Intl.NumberFormat("en-ET", {
  style: "currency",
  currency: "ETB",
  maximumFractionDigits: 0,
});

const TABS = [
  { id: "dashboard", label: "Dashboard" },
  { id: "orders", label: "Orders" },
  { id: "menu", label: "Menu" },
];

export default function AdminWorkspace({
  orders,
  dishNames,
  dishes,
  metrics,
  areaData,
  orderTrend,
}) {
  const [tab, setTab] = useState("dashboard");

  return (
    <div className="space-y-6">
      <div
        role="tablist"
        aria-label="Admin sections"
        className="inline-flex flex-wrap gap-1 rounded-full border border-sand-200 bg-white p-1 shadow-soft"
      >
        {TABS.map((entry) => {
          const active = tab === entry.id;
          return (
            <button
              key={entry.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(entry.id)}
              className={
                "rounded-full px-5 py-2 text-sm font-semibold transition-colors " +
                (active
                  ? "bg-brand-700 text-white shadow-soft"
                  : "text-sand-600 hover:bg-sand-100 hover:text-sand-900")
              }
            >
              {entry.label}
            </button>
          );
        })}
      </div>

      {tab === "dashboard" && (
        <DashboardPanel
          metrics={metrics}
          areaData={areaData}
          orderTrend={orderTrend}
        />
      )}
      {tab === "orders" && (
        <OrderManager orders={orders} dishNames={dishNames} />
      )}
      {tab === "menu" && <MenuManager dishes={dishes} />}
    </div>
  );
}

function DashboardPanel({ metrics, areaData, orderTrend }) {
  const stats = [
    {
      label: "Total orders",
      value: metrics.totalOrders,
      hint: `${metrics.ordersToday} today`,
      tone: "text-sand-900",
    },
    {
      label: "Revenue",
      value: CURRENCY.format(metrics.revenue),
      hint: "Excludes cancellations",
      tone: "text-brand-700",
    },
    {
      label: "Open orders",
      value: metrics.openOrders,
      hint: "Pending, preparing, delivering",
      tone: "text-gold-700",
    },
    {
      label: "Delivered",
      value: metrics.deliveredOrders,
      hint: "Completed",
      tone: "text-success-700",
    },
    {
      label: "Average order",
      value: CURRENCY.format(metrics.averageOrder),
      hint: "Per non-cancelled order",
      tone: "text-sand-900",
    },
    {
      label: "Menu items",
      value: metrics.availableItems,
      hint: `${metrics.totalItems} total · ${metrics.totalItems - metrics.availableItems} unavailable`,
      tone: "text-sand-900",
    },
  ];

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {stats.map((stat) => (
          <article key={stat.label} className="card p-5">
            <p className="eyebrow">{stat.label}</p>
            <p className={`mt-3 font-display text-3xl font-semibold ${stat.tone}`}>
              {stat.value}
            </p>
            <p className="mt-1 text-xs text-sand-400">{stat.hint}</p>
          </article>
        ))}
      </section>

      <RevenueCharts areaData={areaData} orderTrend={orderTrend} />
    </div>
  );
}
