import Link from "next/link";
import { redirect } from "next/navigation";
import { getMenuItems } from "@/lib/dishes";
import { DELIVERY_AREAS } from "@/lib/schema";
import { getAllOrders } from "@/lib/orders";
import { getSession } from "@/lib/session";
import SignOutButton from "@/app/SignOutButton";
import AdminWorkspace from "./AdminWorkspace";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Admin dashboard",
  description: "Order activity and menu management for Addis Eats staff.",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  const user = await getSession();
  if (!user) redirect("/signin?next=%2Fadmin");
  if (user.role !== "staff") redirect("/orders");

  const orders = await getAllOrders();
  const dishes = getMenuItems();

  const activeOrders = orders.filter((order) => order.status !== "cancelled");
  const activeValue = activeOrders.reduce((sum, order) => sum + order.total, 0);
  const openOrders = orders.filter((order) =>
    ["pending", "preparing", "delivering"].includes(order.status),
  ).length;
  const deliveredOrders = orders.filter(
    (order) => order.status === "delivered",
  ).length;
  const availableItems = dishes.filter((dish) => dish.available !== false).length;

  const areaData = DELIVERY_AREAS.map((area) => ({
    area,
    total: activeOrders
      .filter((order) => order.area === area)
      .reduce((sum, order) => sum + order.total, 0),
  })).sort((first, second) => second.total - first.total);

  const metrics = {
    totalOrders: orders.length,
    revenue: activeValue,
    openOrders,
    deliveredOrders,
    averageOrder: activeOrders.length ? activeValue / activeOrders.length : 0,
    availableItems,
    totalItems: dishes.length,
    ordersToday: countOrdersToday(orders),
  };

  const orderTrend = getOrderTrend(orders);

  return (
    <section className="mx-auto w-full max-w-7xl px-5 py-10 sm:px-6 sm:py-14">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Staff · {user.email}</p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Admin dashboard
          </h1>
          <p className="mt-2 text-sm text-sand-500">
            Manage incoming orders and keep the menu current.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/kitchen" className="btn btn-outline">
            Kitchen queue
          </Link>
          <SignOutButton />
        </div>
      </header>

      <AdminWorkspace
        orders={orders}
        dishNames={Object.fromEntries(
          dishes.map((dish) => [dish.id, dish.name]),
        )}
        dishes={dishes}
        metrics={metrics}
        areaData={areaData}
        orderTrend={orderTrend}
      />
    </section>
  );
}

function countOrdersToday(orders) {
  const today = new Date().toISOString().slice(0, 10);
  return orders.filter((order) => order.createdAt.slice(0, 10) === today).length;
}

function getOrderTrend(orders) {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setUTCDate(today.getUTCDate() - 6 + index);
    const key = date.toISOString().slice(0, 10);
    return {
      date: new Intl.DateTimeFormat("en-ET", {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      }).format(date),
      orders: orders.filter((order) => order.createdAt.slice(0, 10) === key)
        .length,
    };
  });
}
