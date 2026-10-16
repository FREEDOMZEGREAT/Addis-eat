# Addis Eats

Addis Eats is a teaching app that demonstrates a food-ordering experience for Addis Ababa. It uses the Next.js App Router to cover customer ordering, staff operations, authentication, and delivery tracking.

## Tech stack

- Next.js 16 App Router and React 19
- Tailwind CSS 4
- NextAuth v5 beta for Google OAuth
- Zod for input validation
- SWR for live order status and delivery tracking
- Neon Postgres (optional locally; configure for persistent production data)
- Recharts for admin charts
- Leaflet, OpenStreetMap, and OSRM for delivery maps and routes

## Features

- Responsive home page and searchable, category-filtered menu
- Dish detail pages with metadata and sitemap/robots support
- Browser-persisted cart and server-validated checkout with server-calculated prices
- Google OAuth, customer registration, and configured email/password demo sign-in
- Customer order history and status updates
- Staff-only kitchen queue and admin workspace for orders, menu management, and charts
- Owner- or staff-protected delivery tracking with a simulated courier on an OSRM road route
- Responsive mobile navigation

## Requirements

- Node.js 20.9 or newer
- npm

## Run locally

Install dependencies from this directory:

    npm ci

Create a private environment file:

    Copy-Item .env.example .env.local

Edit .env.local before using authentication. Set distinct random values for AUTH_SECRET and SESSION_SECRET (SESSION_SECRET must be at least 32 characters). Configure Google OAuth credentials if needed; the local callback URL is http://localhost:3000/api/auth/callback/google.

Local accounts are stored in the ignored data/users.json file when writable. Without DATABASE_URL, orders and menu changes are kept in memory and reset when the server restarts. Set DATABASE_URL to a Neon Postgres connection string to persist accounts and orders. See [AUTH.md](AUTH.md) for authentication configuration and [DATA.md](DATA.md) for storage and data-fetching behavior.

Start the development server with npm run dev, then open http://localhost:3000.

## Available scripts

- npm run dev — start the development server
- npm run lint — run ESLint
- npm run build — create a production build
- npm run start — serve a production build

## Event handling concepts

React event handlers let an interactive component respond to a user action. This project uses these patterns:

| User action | React pattern | Example in this app |
| --- | --- | --- |
| Click a button | onClick | Add dishes in [AddToCartButton.jsx](src/app/menu/AddToCartButton.jsx), change cart quantities in [CartList.jsx](src/app/cart/CartList.jsx), or open/close [MobileNav.jsx](src/app/MobileNav.jsx) |
| Type or choose a value | onChange | Live menu search in [SearchBox.jsx](src/app/menu/SearchBox.jsx), and order search, sorting, and status filters in [OrderManager.jsx](src/app/admin/OrderManager.jsx) |
| Submit a form | form action or onSubmit | Sign-in and sign-up use server actions; checkout uses a form action; the admin menu editor handles submit in [MenuManager.jsx](src/app/admin/MenuManager.jsx) |
| Press a keyboard key | keydown listener | The mobile menu closes on Escape in [MobileNav.jsx](src/app/MobileNav.jsx) |

A client component (marked with "use client") can use browser event props such as onClick and onChange. Pass a function to the prop; React calls it when the event occurs. For example:

    <button type="button" onClick={() => setOpen(true)}>
      Open menu
    </button>

For inputs, read the new value from the event target. A controlled input stores that value in React state and displays the state back in the input:

    <input
      value={search}
      onChange={(event) => setSearch(event.target.value)}
    />

Use onSubmit for a client-side form handler when the component needs to do work before submission, such as validating fields or showing a confirmation. Call event.preventDefault() only when you intend to stop the browser's normal submission. The menu search input debounces typing and updates the URL with App Router navigation; the admin menu editor handles validation and saving in its submit handler.

For forms that can directly invoke a server action, use the form action prop. The sign-in, sign-up, and checkout forms use this approach so their data can be processed on the server. Server actions must validate submitted data and check authorization on the server; client-side checks are for usability, not security.

Use type="button" for buttons inside a form when they should not submit it. Use type="submit" for the form's main action. For asynchronous button work, show a pending state and prevent duplicate submissions; the admin order and menu controls use React's useTransition for this. Give controls clear labels so they work with keyboards and assistive technology.

## Main routes

| Route | Purpose |
| --- | --- |
| / | Restaurant landing page and featured dishes |
| /menu | Browse, filter, and search dishes |
| /menu/[id] | Dish details |
| /cart | Review and edit cart |
| /checkout | Submit an order |
| /orders | View the signed-in customer's orders |
| /track/[id] | Track an order (owner or staff only) |
| /kitchen | Staff order queue |
| /admin | Staff dashboard, order management, and menu management |
| /signin, /signup | Authentication and customer registration |
| /api/* | Dish, order, tracking, and authentication endpoints |

## Order lifecycle

Orders follow the validated transitions defined in src/lib/order-status.js:

pending -> preparing -> delivering -> delivered

Active orders may also be cancelled. delivered and cancelled are terminal states. Dispatching an order requests a route from OSRM; tracking simulates courier progress along that route.

## Project notes

This is a learning/demo application. Staff access is controlled by configured accounts, tracking uses fixed delivery-area coordinates, and the public OSRM demo service may be rate-limited. Review [AUTH.md](AUTH.md), [DATA.md](DATA.md), and [PERF.md](PERF.md) for security, persistence, and measured performance details.
