"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";

export default function LiveDishSearch({ initialCategory, initialQuery }) {
  const [search, setSearch] = useState(initialQuery);
  const [isPending, startTransition] = useTransition();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const query = search.trim();
    if (query === initialQuery) return undefined;

    const timeout = setTimeout(() => {
      const params = new URLSearchParams();
      if (initialCategory !== "All") {
        params.set("category", initialCategory);
      }
      if (query) params.set("q", query);
      const suffix = params.toString();

      startTransition(() => {
        router.replace(suffix ? pathname + "?" + suffix : pathname, {
          scroll: false,
        });
      });
    }, 300);

    return () => clearTimeout(timeout);
  }, [search, initialCategory, initialQuery, pathname, router]);

  return (
    <section className="space-y-2" aria-label="Live menu search">
      <label htmlFor="live-menu-search" className="sr-only">
        Search dishes
      </label>
      <input
        id="live-menu-search"
        type="search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search dishes, ingredients, or tags..."
        className="field w-full sm:max-w-md"
        aria-busy={isPending}
      />
      <div className="min-h-5 text-sm text-sand-500" aria-live="polite">
        {search.trim() !== initialQuery || isPending ? "Updating results..." : ""}
      </div>
    </section>
  );
}
