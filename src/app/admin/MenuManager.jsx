"use client";

import { useMemo, useOptimistic, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { dishCategories } from "@/lib/schema";
import { getMenuSection } from "@/lib/dishes";
import Modal from "./Modal";
import {
  deleteMenuItemAction,
  saveMenuItemAction,
  setMenuItemAvailabilityAction,
} from "./admin-actions";

const CURRENCY = new Intl.NumberFormat("en-ET", {
  style: "currency",
  currency: "ETB",
  maximumFractionDigits: 0,
});

export default function MenuManager({ dishes }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [section, setSection] = useState("all");
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const sections = useMemo(
    () => ["all", ...new Set(dishes.map((dish) => getMenuSection(dish)))],
    [dishes],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return dishes.filter((dish) => {
      if (section !== "all" && getMenuSection(dish) !== section) return false;
      if (!needle) return true;
      return [dish.name, dish.category, ...(dish.tags ?? [])]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [dishes, query, section]);

  const availableCount = dishes.filter((dish) => dish.available !== false).length;

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {sections.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setSection(value)}
              aria-pressed={section === value}
              className="chip"
            >
              {value === "all" ? "All sections" : value}
              <span className="chip-count">
                {value === "all"
                  ? dishes.length
                  : dishes.filter((dish) => getMenuSection(dish) === value)
                      .length}
              </span>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setEditing({ mode: "add", item: null })}
          className="btn btn-accent shrink-0"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            className="h-4 w-4"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
          Add menu item
        </button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="relative w-full sm:max-w-xs">
          <span className="sr-only">Search menu</span>
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
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search dishes"
            className="field pl-10"
          />
        </label>
        <p className="text-sm text-sand-500">
          <span className="font-semibold text-sand-800">{availableCount}</span>{" "}
          of {dishes.length} available
        </p>
      </div>

      {filtered.length === 0 ? (
        <div className="card grid place-items-center px-6 py-16 text-center">
          <h3 className="font-display text-lg font-semibold">No dishes found</h3>
          <p className="mt-1 max-w-xs text-sm text-sand-500">
            Try a different search, or add a new item to the menu.
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[48rem] border-collapse text-sm">
              <thead>
                <tr className="border-b border-sand-100 bg-sand-50/60 text-left text-xs font-semibold uppercase tracking-wide text-sand-500">
                  <th scope="col" className="px-5 py-3">
                    Item
                  </th>
                  <th scope="col" className="px-5 py-3">
                    Category
                  </th>
                  <th scope="col" className="px-5 py-3 text-right">
                    Price
                  </th>
                  <th scope="col" className="px-5 py-3 text-right">
                    Prep
                  </th>
                  <th scope="col" className="px-5 py-3">
                    Availability
                  </th>
                  <th scope="col" className="px-5 py-3 text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((dish) => (
                  <MenuRow
                    key={dish.id}
                    dish={dish}
                    onEdit={() => setEditing({ mode: "edit", item: dish })}
                    onDelete={() => setDeleteTarget(dish)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editing && (
        <MenuItemModal
          key={editing.item?.id ?? "new"}
          mode={editing.mode}
          item={editing.item}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      )}

      {deleteTarget && (
        <DeleteModal
          key={deleteTarget.id}
          target={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={() => {
            setDeleteTarget(null);
            router.refresh();
          }}
        />
      )}
    </section>
  );
}

function MenuRow({ dish, onEdit, onDelete }) {
  const unavailable = dish.available === false;

  return (
    <tr className="border-b border-sand-100/80 last:border-0 hover:bg-sand-50/50">
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-field bg-sand-100">
            <Image
              src={dish.image}
              alt=""
              fill
              sizes="44px"
              className="object-cover"
            />
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold text-sand-900">{dish.name}</p>
            <p className="truncate text-xs text-sand-400">{dish.category}</p>
          </div>
        </div>
      </td>
      <td className="px-5 py-4 text-sand-600">{getMenuSection(dish)}</td>
      <td className="px-5 py-4 text-right font-medium text-sand-800">
        {CURRENCY.format(dish.price)}
      </td>
      <td className="px-5 py-4 text-right text-sand-500">
        {dish.prepMinutes} min
      </td>
      <td className="px-5 py-4">
        <div className="flex items-center gap-2">
          <AvailabilitySwitch dish={dish} />
          <span
            className={
              unavailable
                ? "text-xs font-medium text-danger-600"
                : "text-xs font-medium text-success-700"
            }
          >
            {unavailable ? "Unavailable" : "Available"}
          </span>
        </div>
      </td>
      <td className="px-5 py-4">
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="btn btn-outline py-1.5 text-xs"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="btn btn-outline py-1.5 text-xs text-danger-700 hover:border-danger-300 hover:bg-danger-50"
          >
            Delete
          </button>
        </div>
      </td>
    </tr>
  );
}

function AvailabilitySwitch({ dish }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [available, setAvailable] = useOptimistic(
    dish.available !== false,
    (_current, next) => next,
  );

  function toggle() {
    const next = !available;
    startTransition(async () => {
      setAvailable(next);
      await setMenuItemAvailabilityAction(dish.id, next);
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={available}
      aria-label={`Toggle availability for ${dish.name}`}
      onClick={toggle}
      disabled={pending}
      className={
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-60 " +
        (available ? "bg-success-600" : "bg-sand-300")
      }
    >
      <span
        className={
          "inline-block h-5 w-5 transform rounded-full bg-white shadow-soft transition-transform " +
          (available ? "translate-x-5.5" : "translate-x-0.5")
        }
      />
    </button>
  );
}

function MenuItemModal({ mode, item, onClose, onSaved }) {
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const isEdit = mode === "edit";

  function handleSubmit(event) {
    event.preventDefault();
    const payload = Object.fromEntries(
      new FormData(event.currentTarget).entries(),
    );
    setError("");

    startTransition(async () => {
      const result = await saveMenuItemAction(isEdit ? item.id : null, payload);
      if (!result.ok) {
        setError(result.error ?? "Could not save the item.");
        return;
      }
      onSaved();
    });
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={isEdit ? "Edit menu item" : "Add menu item"}
      description={
        isEdit
          ? `Update the details for ${item.name}.`
          : "Fill in the details for the new dish."
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="sm:col-span-2">
            <span className="field-label">Name</span>
            <input
              name="name"
              required
              defaultValue={item?.name ?? ""}
              placeholder="e.g. Doro Wat"
              className="field"
            />
          </label>

          <label>
            <span className="field-label">Category</span>
            <select
              name="category"
              defaultValue={item?.category ?? dishCategories[0]}
              className="field"
            >
              {dishCategories.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="field-label">Price (ETB)</span>
            <input
              name="price"
              type="number"
              min="1"
              step="1"
              required
              defaultValue={item?.price ?? ""}
              placeholder="180"
              className="field"
            />
          </label>

          <label>
            <span className="field-label">Prep time (minutes)</span>
            <input
              name="prepMinutes"
              type="number"
              min="1"
              max="240"
              required
              defaultValue={item?.prepMinutes ?? ""}
              placeholder="15"
              className="field"
            />
          </label>

          <label className="flex items-center gap-3 self-end pb-1">
            <input
              name="available"
              type="checkbox"
              defaultChecked={item ? item.available !== false : true}
              className="h-4 w-4 rounded border-sand-300 text-brand-700 focus:ring-brand-500"
            />
            <span className="text-sm font-medium text-sand-700">
              Available to order
            </span>
          </label>

          <label className="sm:col-span-2">
            <span className="field-label">Description</span>
            <textarea
              name="description"
              required
              rows={3}
              defaultValue={item?.description ?? ""}
              placeholder="A short, appetising description."
              className="field resize-y"
            />
          </label>

          <label>
            <span className="field-label">Tags</span>
            <input
              name="tags"
              defaultValue={(item?.tags ?? []).join(", ")}
              placeholder="Vegan, Spicy"
              className="field"
            />
            <span className="field-hint">Comma separated</span>
          </label>

          <label>
            <span className="field-label">Ingredients</span>
            <input
              name="ingredients"
              defaultValue={(item?.ingredients ?? []).join(", ")}
              placeholder="Chicken, Berbere, Onion"
              className="field"
            />
            <span className="field-hint">Comma separated</span>
          </label>
        </div>

        {error && (
          <p className="field-error" role="alert">
            {error}
          </p>
        )}

        <div className="flex items-center justify-end gap-3 border-t border-sand-100 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="btn btn-outline"
            disabled={pending}
          >
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={pending}>
            {pending && <span className="spinner" aria-hidden="true" />}
            {isEdit ? "Save changes" : "Add item"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function DeleteModal({ target, onClose, onDeleted }) {
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function handleConfirm() {
    setError("");
    startTransition(async () => {
      const result = await deleteMenuItemAction(target.id);
      if (!result.ok) {
        setError(result.error ?? "Could not delete the item.");
        return;
      }
      onDeleted();
    });
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Delete menu item"
      description="This removes the dish from the menu immediately."
    >
      <p className="text-sm text-sand-600">
        Are you sure you want to delete{" "}
        <span className="font-semibold text-sand-900">{target.name}</span>? This
        cannot be undone.
      </p>

      {error && (
        <p className="field-error mt-3" role="alert">
          {error}
        </p>
      )}

      <div className="mt-6 flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          className="btn btn-outline"
          disabled={pending}
        >
          Keep item
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          className="btn btn-danger"
          disabled={pending}
        >
          {pending && <span className="spinner" aria-hidden="true" />}
          Delete item
        </button>
      </div>
    </Modal>
  );
}
