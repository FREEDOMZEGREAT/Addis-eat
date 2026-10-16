"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import {
  canTransitionStatus,
  getOrder,
  isOrderStatus,
  updateOrderStatus,
} from "@/lib/orders";
import {
  addMenuItem,
  deleteMenuItem,
  getMenuItem,
  setMenuItemAvailability,
  updateMenuItem,
} from "@/lib/dishes";
import { dishSchema } from "@/lib/schema";

async function requireStaff() {
  const user = await getSession();
  if (!user || user.role !== "staff") {
    throw new Error("Staff sign-in is required to manage orders and the menu.");
  }
  return user;
}

function revalidateAdminAreas() {
  revalidatePath("/admin");
  revalidatePath("/kitchen");
  revalidatePath("/orders");
  revalidatePath("/menu");
  revalidatePath("/");
}

export async function setOrderStatusAction(orderId, status) {
  try {
    await requireStaff();

    const id = String(orderId ?? "").trim();
    if (!id) {
      return { ok: false, error: "That order id is not valid." };
    }

    if (!isOrderStatus(status)) {
      return { ok: false, error: "That status is not supported." };
    }

    const order = await getOrder(id);
    if (!order) {
      return { ok: false, error: "We could not find that order." };
    }

    if (!canTransitionStatus(order.status, status)) {
      return {
        ok: false,
        error: `A ${order.status} order cannot move to ${status}.`,
      };
    }

    await updateOrderStatus(id, status);

    revalidateAdminAreas();
    revalidatePath(`/orders/${id}`);

    return { ok: true, id, status };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not save the status.",
    };
  }
}

export async function saveMenuItemAction(menuId, payload) {
  try {
    await requireStaff();

    const parsed = dishSchema.safeParse(payload);
    if (!parsed.success) {
      const first = parsed.error.issues?.[0];
      return {
        ok: false,
        error: first
          ? `${first.path.join(". ") || "Menu item"}: ${first.message}`
          : "Please fix the highlighted fields.",
      };
    }

    const data = parsed.data;

    if (menuId) {
      const id = String(menuId).trim();
      if (!getMenuItem(id)) {
        return { ok: false, error: "We could not find that menu item." };
      }
      const updated = updateMenuItem(id, data);
      revalidateAdminAreas();
      revalidatePath(`/menu/${updated.id}`);
      return { ok: true, id: updated.id, item: updated };
    }

    const created = addMenuItem(data);
    revalidateAdminAreas();
    return { ok: true, id: created.id, item: created };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not save the menu item.",
    };
  }
}

export async function deleteMenuItemAction(menuId) {
  try {
    await requireStaff();

    const id = String(menuId ?? "").trim();
    if (!getMenuItem(id)) {
      return { ok: false, error: "We could not find that menu item." };
    }

    deleteMenuItem(id);

    revalidateAdminAreas();
    return { ok: true, id };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not delete the menu item.",
    };
  }
}

export async function setMenuItemAvailabilityAction(menuId, available) {
  try {
    await requireStaff();

    const id = String(menuId ?? "").trim();
    const item = setMenuItemAvailability(id, available);
    if (!item) {
      return { ok: false, error: "We could not find that menu item." };
    }

    revalidateAdminAreas();
    revalidatePath(`/menu/${item.id}`);
    return { ok: true, id: item.id, available: item.available };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Could not update availability.",
    };
  }
}
