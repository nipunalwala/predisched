# Dashboard clarity improvements

Implement the six requested changes in order, preserving the dashboard's current visual language.
Commit the completed landing page first, then one commit per improvement. No push requested.

- [x] Commit verified landing page.
- [x] 1. Inline workload submission beside cluster summary, honest idle/degraded states, feedback and errors.
- [x] 2. Distinguish stream connection, cluster readiness, fresh snapshot, available workers and prediction strategy/model availability.
- [x] 3. Discoverable task decision action and selected-worker summary with prediction values, overload and fallback.
- [x] 4. Scenario and baseline benchmark comparison, metrics together, run/task counts and measured variation. Missing uncertainty remains explicit.
- [x] 5. Demo readiness, recovery progress, per-step results and final measured summary. Provide a copyable host recovery command and recheck for crashed containers; no Docker socket privileges added to the API.
- [x] 6. Shared human-readable metric labels/units and bounded time-axis labels.

Use real existing APIs; do not fabricate live data, confidence intervals, completed-task attribution or prediction availability. Distinguish historical measurements and simulator results. Verify each change with focused behavioural tests, full unit suite, lint and build before committing. Finish with live browser checks of all tabs and desktop/mobile captures of changed surfaces.
