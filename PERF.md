# Performance Budget and Results

## Budgets

| Metric                        |               Target |
| ----------------------------- | -------------------: |
| Lighthouse Performance        |                >= 90 |
| Largest Contentful Paint      |              < 2.5 s |
| Cumulative Layout Shift       |                < 0.1 |
| `/menu` first-load JavaScript | < 120 kB transferred |
| Largest delivered image       |             < 150 kB |

## Before and after

Measured with Lighthouse 13.5.0 against a production `next start` build on `/menu`, mobile emulation, 2026-10-10. JavaScript is the sum of script `transferSize` from Lighthouse's network requests; page transfer is Lighthouse `total-byte-weight`. Three final runs are reported as a range because the local machine produced substantial score/LCP variance.

| Metric                      |   Before |                After | Target status         |
| --------------------------- | -------: | -------------------: | --------------------- |
| Lighthouse Performance      |       69 |       64-85 (3 runs) | Not met consistently  |
| LCP                         |   7.77 s | 3.77-4.28 s (3 runs) | Not met               |
| CLS                         |  0.00005 |                    0 | Met                   |
| `/menu` JavaScript transfer | 181.0 kB |             165.5 kB | Not met               |
| Total page transfer         |  1.62 MB |               700 kB | Improved by about 57% |
| Largest delivered image     | 192.9 kB |             110.2 kB | Met                   |

## Optimizations in the measured build

- Only the first menu image is preloaded and given high fetch priority; the remaining card images are lazy-loaded.
- Menu card image quality is 35, allowed by `images.qualities` in `next.config.mjs`.
- Unused global query-library providers were removed. Search stays debounced and order status continues polling from server-provided initial data.
- App fonts use `next/font` with the Latin subset and `display: swap`.

## Day 48 follow-up measurement

Measured with Lighthouse 13.5.0 against a production next start server on /menu, mobile emulation, 2026-10-15. One post-change run scored 92. The page transferred 528 KiB, including 158.6 KiB of JavaScript. FCP was 1.0 s, LCP 3.3 s, TBT 80 ms, and CLS 0. The first Doro Wat card image was the LCP element; Lighthouse found it preloaded and optimized, with no estimated image-delivery savings. Its request took about 2.1 s under simulated mobile network conditions.

The changes for this measurement keep DishList server-rendered, use a 300 ms debounced URL navigation for menu search, render category links on the server, and remove the global SWR provider from the root layout. Body text now uses the system font stack while Fraunces remains for display text; this removed about 47 KiB of font transfer. The account file path is statically scoped, removing Next's warning that it was tracing the full project.

The performance score now exceeds the 90 target in this run, but LCP and the 120 KiB JavaScript target remain unmet. The local mobile audit is noisy and is not a substitute for deployed measurements. Repeat Lighthouse on the deployed URL after deployment and compare several runs.

## Day 47 additions

The measurement above predates the Day 47 admin and tracking work. The following changes affect bundles and images:

- The home hero now renders a background image through `next/image` with `fill`, `priority`, `quality={75}`, and `sizes="100vw"`, so the layout stays responsive and the LCP image is a single optimized request.
- The Leaflet map is imported with `next/dynamic` (`ssr: false`) inside `src/app/track/[id]/OrderTracker.jsx`, so the map library is code-split and loaded only on the `/track/[id]` route. The measured `/menu` budget is unaffected.
- The tracking route polls `/api/track/[id]` every four seconds while active and stops at a terminal status; the orders page keeps its ten-second status poll.
- Admin charts (Recharts) load only inside the `/admin` Dashboard tab.
- Re-run the measurement after the tracking and hero changes to confirm the `/menu` budget still holds and to capture a `/track/[id]` baseline.

## Reproduce

From the project directory:

```bash
npm ci
npm run build
PORT=3001 npm run start
npx --yes lighthouse@13.5.0 http://127.0.0.1:3001/menu --only-categories=performance --output=json --output-path=./lighthouse-menu.json --chrome-flags="--headless=new --no-sandbox"
```

Use the same machine, Lighthouse version, route, and production build for comparisons. Treat individual local scores as noisy until confirmed on a calibrated or deployed environment.

## Remaining gaps

The latest single local run met the performance score target, but LCP (3.3 s) and menu JavaScript (158.6 KiB) remain above target. The LCP element is the first dish image; it is already discovered early, prioritized, and has no Lighthouse-estimated compression savings. Measure the deployed site over several runs before deciding whether to change image quality or typography further. The Vercel project is not linked in this checkout, and no Vercel CLI credentials or deployment environment variables are available here, so the live deployment still needs to be connected and configured.
