# Landing page

`dashboard/src/pages/Landing.tsx` introduces PrediSched at `/`, with **Open dashboard** links
to the live overview at `/dashboard`. The dashboard brand links back to `/`.
The feature routes remain `/cluster`, `/tasks`, `/predictions`, `/benchmarks`, `/chaos` and
`/logs`; see [dashboard.md](dashboard.md) for their data sources and controls.

The introduction explains submission, worker placement and inspection, then connects task history,
decision explanations and recorded benchmarks to the existing dashboard. It makes no performance
improvement claim. Its architecture is labelled illustrative: the desktop SVG shows tasks, the
primary, replicated backups, workers and prediction feedback. At 760 px and below, a simpler HTML
diagram replaces the SVG so labels remain readable.

## Design and behaviour

This is an ordinary extension of the existing blue and neutral identity. Page styles are scoped
under `landing-*` in `dashboard/src/landing.css`; the landing surface uses its own light colour
scheme while dashboard themes remain available inside the dashboard.

| Detail | Implementation |
| --- | --- |
| Palette | Blue `#246de7`, ink `#172b38`, muted text `#556570`, background `#f6f7f4`, rule `#d6dddF`; diagram background `#142a39` |
| Type | Segoe UI with system sans-serif fallbacks; desktop hero `clamp(58px, 6.2vw, 88px)` |
| Layout | Centred width up to 1280 px, 56 px desktop side margins; 32 px at 1050 px and below, 20 px at 760 px and below |
| Responsive layout | Desktop hero has two columns; mobile hero, process steps and capability rows use one column; mobile header retains the dashboard link |
| Links | Blue primary links have a 54 px minimum height and 5 px corners; keyboard focus uses a 3 px blue outline with 6 px offset |
| Accessibility | Skip-to-content link, labelled navigation and sections, SVG title/description and an accessible name for the mobile diagram |
| Motion | One illustrative task packet animates; reduced-motion preference hides the packet and removes button transitions |

`App.tsx` mounts the landing page separately from `DashboardApp`. Loading `/` starts no live API
polling or STOMP connection. Entering a dashboard route starts those hooks and the dashboard
keyboard controls.

## Run and check

From `dashboard/`, run `npm ci` and `npm run dev`, then open `http://localhost:5173/`.
Follow **Open dashboard** to `/dashboard`; live data requires the services described in
[dashboard.md](dashboard.md). Use the in-page links to inspect the process and capabilities, and
resize below 760 px to see the simplified diagram.

Acceptance checks recorded for this change (2026-10-24):

- Unit suite: 15 tests passed; lint and production build passed.
- Both landing routing checks passed after fixes.
- Independent visual review covered 1440 px desktop and 390 px mobile widths; final disposition
  was Ship after both requested issues were resolved.
- Final browser run: all nine checks passed, covering both landing layouts and all seven
  dashboard tabs.
