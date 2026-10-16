"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export default function MobileNav({ items }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const triggerRef = useRef(null);
  const panelRef = useRef(null);

  const closeMenu = useCallback((restoreFocus = true) => {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.querySelector("[data-menu-close]")?.focus();

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu();
        return;
      }

      if (event.key !== "Tab") return;

      const focusable = panelRef.current?.querySelectorAll(
        'a[href], button:not(:disabled):not([tabindex="-1"])',
      );
      if (!focusable?.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, closeMenu]);

  return (
    <div className="md:hidden">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        aria-expanded={open}
        aria-controls="mobile-menu-dialog"
        className="grid h-11 w-11 place-items-center rounded-field border border-sand-200 bg-white text-sand-700 shadow-soft transition-colors hover:bg-sand-100 hover:text-sand-900"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          className="h-5 w-5"
        >
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>

      {open &&
        createPortal(
          <div className="fixed inset-0 z-[60] md:hidden">
            <button
              type="button"
              tabIndex={-1}
              aria-label="Close menu"
              onClick={() => closeMenu()}
              className="absolute inset-0 cursor-default bg-sand-900/40 backdrop-blur-sm"
            />

            <div
              id="mobile-menu-dialog"
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-label="Main navigation"
              className="absolute right-0 top-0 flex h-full w-72 max-w-[85%] flex-col bg-white shadow-lift"
            >
              <div className="flex items-center justify-between border-b border-sand-100 px-5 py-4">
                <span className="font-display text-lg font-semibold tracking-tight">
                  Addis <span className="text-orange-300">Eats</span>
                </span>
                <button
                  type="button"
                  data-menu-close
                  onClick={() => closeMenu()}
                  aria-label="Close menu"
                  className="grid h-11 w-11 place-items-center rounded-full text-sand-500 transition-colors hover:bg-sand-100 hover:text-sand-800"
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    className="h-5 w-5"
                  >
                    <path d="M6 6l12 12M18 6 6 18" />
                  </svg>
                </button>
              </div>

              <nav id="mobile-menu" aria-label="Main">
                <ul className="space-y-1 overflow-y-auto p-4">
                  {items.map((item) => {
                    const active =
                      item.href === "/"
                        ? pathname === "/"
                        : pathname === item.href ||
                          pathname.startsWith(item.href + "/");

                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={() => closeMenu(false)}
                          aria-current={active ? "page" : undefined}
                          className={
                            "block rounded-xl px-4 py-3 text-sm font-semibold transition-colors " +
                            (active
                              ? "bg-brand-50 text-brand-800"
                              : "text-sand-700 hover:bg-sand-100 hover:text-sand-900")
                          }
                        >
                          {item.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </nav>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
