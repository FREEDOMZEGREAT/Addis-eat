# Addis Eats — Project Strategy

## Overview

Location: `module-03-react-nextjs/days/Day_47/addis-eats-next`

Stack: Next.js 16.3.6 App Router · React 19 · Tailwind CSS 4 · NextAuth v5 beta · Zod 4 · SWR · Recharts · Leaflet/OSRM

Status: Day 47. The app keeps its SEO metadata work and now adds a staff admin workspace (order status management and menu CRUD), live delivery tracking with a Leaflet/OpenStreetMap map and OSRM road routing, and responsive UI work (background hero, mobile hamburger navigation, and a left-hand category sidebar).

Purpose: Keep project goals, guardrails, and day-by-day progress aligned with the code that is actually in this folder.

## 1. Product and route strategy

Addis Eats is a teaching app for an Ethiopian food-ordering experience in Addis Ababa. Its routes intentionally demonstrate different Next.js rendering and data-flow patterns, and Days 45–47 add staff operations, live tracking, and a mobile-first layout.

| Route        | Strategy                | Current implementation                                                                 |
| ------------ | ----------------------- | -------------------------------------------------------------------------------------- |
| `/`          | Revalidated page        | Responsive background-image hero and three real dish cards; one-hour revalidation      |
| `/menu`      | Dynamic + revalidated   | Server-filtered dish list with a left category sidebar and debounced live search       |
| `/menu/[id]` | Static generation       | Dish pages generated from the catalog and given page-specific metadata                 |
| `/cart`      | Client-side state       | Browser-persisted cart and quantity editing                                            |
| `/checkout`  | Dynamic + server action | Session guard, validation, authoritative pricing, order write                          |
| `/orders`    | Dynamic + protected     | Orders scoped to the signed-in app user, with a live status badge                      |
| `/track/[id]`| Dynamic + protected     | Owner- or staff-only live map, road route, per-second courier animation, distance/ETA  |
| `/kitchen`   | Dynamic + staff-only    | Staff queue guarded by role                                                            |
| `/admin`     | Dynamic + staff-only    | Tabbed workspace: dashboard, order management, and menu management                     |
| `/api/*`     | Route handlers          | Dish, protected order, and protected tracking APIs                                     |
| `/signin`    | Auth entry route        | Google OAuth and demo credentials for the teaching environment                         |

## 2. Non-negotiable guardrails

- Prices and delivery fees are recomputed on the server from the dish catalog and validated order data.
- Cart state belongs to the browser and is not trusted as an order total.
- Order flow checks the session and payload limits before schema validation, server-side pricing, and writing.
- Order status changes follow the state machine in `src/lib/order-status.js`; only legal transitions are accepted, and `delivered`/`cancelled` are terminal.
- Dish detail routes use `generateMetadata` and `generateStaticParams` to keep metadata and URL output aligned with the catalog.
- Root app metadata is defined in `src/app/layout.js` with `metadataBase`, title template, description, and Open Graph defaults.
- Order writes go through the serialized flow in `src/lib/orders.js`; menu writes go through the in-memory store in `src/lib/dishes.js`.
- The app's signed `session` cookie remains the authorization source for pages, actions, and order/tracking routes; Google OAuth must create this app session before redirecting into protected routes.
- The proxy is not the only security boundary. Protected server pages, actions, and route handlers enforce their own session and role/ownership checks. `/track/[id]` and `/api/track/[id]` are guarded in the page and route handler.
- Keep server components as the default; use client components near the interactive controls, and dynamically import heavy client-only libraries (Leaflet) so they load on demand.
- Use shared design tokens and UI patterns from `src/app/globals.css`.
- Currency is ETB and prices are integer-valued.

## 3. Day 45–47 priorities

### Completed

- Added the staff admin workspace at `/admin` with tabbed Dashboard, Orders, and Menu sections.
- Added order status management with a validated transition state machine and per-row controls in `src/app/admin/OrderManager.jsx`.
- Added menu CRUD and availability toggling through server actions in `src/app/admin/admin-actions.js` and `src/lib/dishes.js`.
- Added live delivery tracking at `/track/[id]` using Leaflet/OpenStreetMap tiles, an OSRM road route, and a moving courier marker.
- Added automatic delivery: an order is reconciled to `delivered` once its route duration elapses.
- Added responsive UI: a background-image hero, a mobile hamburger navigation panel, and a sticky left category sidebar on the menu page.
- Verified the project lints and builds successfully.

### Remaining risks and limitations

- Menu edits are in-memory and reset when the server process restarts.
- `/menu/[id]` is statically generated with `dynamicParams = false`, so newly added dishes have no detail page until the next build, and availability changes are not reflected there; `/menu` is dynamic and reflects changes.
- Delivery coordinates are hardcoded per area and the restaurant origin; live courier GPS is simulated from route progress, not a real device feed.
- Tracking depends on the OSRM public server, which is rate-limited and not intended for production traffic.
- Orders are stored in memory during local development and disappear when the server restarts.
- Automated coverage for pricing, validation, authorization, status transitions, tracking payloads, and SEO metadata output is still useful.

## 4. Next steps

1. Add focused tests for server-side pricing, delivery-area fees, ownership checks, role enforcement, status transitions, and metadata output.
2. Persist menu items alongside orders so admin edits survive restarts.
3. Replace simulated courier progress with a real driver location feed before treating tracking as production-ready.
4. Keep the README, AUTH.md, DATA.md, PERF.md, and this strategy document in sync with route, auth, data, and tracking changes.

## Log

- Day 40: Documented the original route rendering split and project guardrails.
- Day 41: Continued correctness and mobile navigation work.
- Day 42: Fixed checkout payload handling, delivery-area validation, and cart-clearing behavior; refreshed the project README and strategy for the active folder.
- Day 43: Added Google OAuth and bridged successful Google sign-in to the app session; refreshed the home specials layout and simplified menu controls. Updated project and authentication docs to reflect current behavior and limitations.
- Day 44: Added site-wide metadata and per-dish SEO metadata, including Open Graph and title template support, and aligned the docs with the final implementation state.
- Day 45–47: Added the staff admin workspace with order status management and menu CRUD, live delivery tracking with Leaflet/OpenStreetMap and OSRM, automatic delivery reconciliation, and responsive UI updates (background hero, mobile hamburger navigation, and a left category sidebar).
