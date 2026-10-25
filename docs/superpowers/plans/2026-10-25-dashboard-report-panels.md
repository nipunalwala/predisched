# Dashboard report panels implementation plan

**Goal:** Populate the existing latency CDF and execution-model feature-importance panels with saved evidence.

**Spec:** `spec/PROJECT-CONTEXT.md` sections 15.5 and 15.6.

**Approach:** Read archived per-task benchmark CSVs through a read-only API, group completed non-negative finite latencies by scenario and strategy, and render an empirical step CDF including warm-up. Export exact fitted feature weights into each immutable model version at save/load. Read the current live registry version's numeric sidecar in the API and render interactive horizontal bars with top-15/all selection, hover values and an exact-weight table. Use the existing shared model volume; no images or reconstructed weights.

**Constraints:** Retain existing React/Recharts and Spring patterns and pinned dependencies. Preserve prior uncommitted outage fixes. No synthetic curves or inferred importance values. Preserve fitted models and registry versions; export metadata only.

- [x] Add API tests for exact CDF counts, ties, invalid/missing files and live-version weight selection.
- [x] Export fitted weights on model save/load and read them through the existing model-volume mount.
- [x] Add frontend tests for CDF transformation and interactive full-precision weight display.
- [x] Replace placeholders with scenario-selectable CDF and interactive model-weight bars; retain overload heatmap's separate unavailable state.
- [x] Verify unit tests, lint, build and live browser rendering; review the final diff, update component docs, and rebuild local dashboard/API containers.

**Validation notes:** The live missing CDF endpoint reproduced as HTTP 404 before implementation.
Frontend tests: 38 passed. Controller/stream tests passed using the compiled Maven image with
repository fixtures mounted. A broader Java verification attempt stopped on a missing mounted
client workload fixture; targeted API verification was rerun with the fixture directories.
Seven smoke checks, outage/recovery and both report-panel browser checks passed (the CDF test
needed a 30-second allowance for an approximately eight-second Windows archive read). Review
found no blocking defects; CDF polling was aligned with benchmark history. Desktop/mobile
captures were inspected. Local API and dashboard containers are healthy and updated.

**Review focus:** Keep suites/scenarios isolated; missing evidence must remain explicit; equal latencies must reach their full cumulative count; API path parameters cannot escape report roots; importance must match the selected registry version and preserve numeric precision.

**Interactive importance validation:** 35 Python tests passed, including exact fitted-weight
export, legacy backfill and version isolation. API tests prove that a changed live registry
version selects its own weights. The running M1 v1 sidecar's 51 values exactly matched its
fitted estimator. Frontend exact-precision tests, TypeScript, lint and production builds
passed. Nine browser checks passed, including hover details, 15/all-51 selection and the
full-precision table on desktop/mobile. Prediction/API/dashboard images are updated locally;
the existing model binaries and live version remain unchanged.
