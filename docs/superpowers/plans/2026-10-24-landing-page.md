# PrediSched Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Introduce PrediSched at `/` and provide a clear button to the live dashboard at `/dashboard`.

**Architecture:** Keep the landing page outside the dashboard's polling, WebSocket and keyboard-shortcut lifecycle. Preserve the existing feature URLs; update overview navigation and demo destinations to `/dashboard`.

**Tech Stack:** Existing React, TypeScript, React Router and CSS; no new dependencies.

**Spec:** User request: a proper landing page with a button routing to the existing dashboard. Inherit the blue and neutral visual language, use factual product copy and a clearly illustrative architecture diagram.

## Global Constraints

- Existing dashboard features and deep links keep working.
- The landing page makes no live-data or performance claims and does not require the API.
- Primary action: `Open dashboard`, linking to `/dashboard`.
- Provide mobile layouts, keyboard focus, reduced-motion support and semantic content.

## Review Focus

- Home and dashboard routes remain distinct after refresh and browser back.
- Landing-page visits do not start dashboard API requests.
- All overview links, numeric shortcuts and demo destinations use the new route.
- The hero and architecture diagram remain readable on narrow screens.
- Page controls link to real destinations and factual content.

### Task 1: Landing page and routing

**Files:** `dashboard/src/pages/Landing.tsx`, `dashboard/src/landing.css`, `dashboard/src/App.tsx`, `dashboard/src/components/TopBar.tsx`, `dashboard/src/components/DemoMode.tsx`, `dashboard/index.html`, `dashboard/e2e/pages.ts`, `dashboard/e2e/screenshots.spec.ts`, `dashboard/e2e/landing.spec.ts`.

- [x] Add browser regressions for the introductory page, API independence and dashboard navigation.
- [x] Run the regression before implementation and confirm it fails on the existing root dashboard.
- [x] Build the responsive page and isolate dashboard lifecycle; update overview destinations.
- [x] Run unit tests, lint, build and the landing plus seven-tab browser checks.
- [x] Inspect desktop and mobile captures together, batch any corrections, and request a fresh finish review.
- [x] Build and activate the dashboard Docker image; verify the served landing page and dashboard links.

No push is part of this request.
