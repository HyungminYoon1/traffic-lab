# TRAFFIC LAB architecture

## Purpose

Single-lane 1 km ring-road traffic with bounded IDM-inspired following, one-car braking, editable density/speed/time gap and measured model metrics. Seeded traffic-control challenges add timed driver-policy interventions and a temporary speed-restriction segment on the same lane; free experiment remains available.

## Structure

Independent static GitHub Pages site at /traffic-lab/. dist/src/model.js owns pure calculation; dist/src/app.js owns UI, bounded inputs, playback and page lifecycle; dist/styles.css owns responsive presentation. SI-unit ring-road model -> geometry/chart renderer; fixed substeps and collision bounds independent of UI.

dist/src/challenge.js is a pure model-layer module for deterministic event schedules, intervention budgets, paired baseline simulation, bounded measurement windows and target evaluation. Every production step is 0.05 seconds; the challenge clock uses integer ticks. The UI never decides a score. The original IDM-inspired acceleration, actual units, vehicle length, ring geometry and non-overlap boundary are preserved. A restriction segment changes desired speed, not topology or the car population. No intersections, lane changes, entry/exit or extra traffic streams.

Challenge state consists of two worlds of at most 60 cars, at most 1200 substep samples (final 60 seconds), at most 240 chart samples per world, a fixed schedule of at most three events and an intervention log of at most six entries. Each UI frame performs at most 20 paired steps; deliberate 10-second advance performs at most 200. Challenge runs stop after 180 or 240 model seconds. Free experiment retains bounded history; all state disappears with the page.

No backend, account, tracking, cookies, visitor persistence, external fonts or runtime API. Input and experiments are transient page memory; explicit image download is user-owned local output, not server storage. Optional page-scoped WebMCP tools use the same validated state/actions as the visible controls, and feature-detect unsupported browsers. Tool summaries contain no private image bytes.

No eval, user HTML injection or remote embeds. External links use noopener/noreferrer. CSP restricts connections and execution; GitHub hosting logs are separate. Only dist is deployed. UTF-8 without BOM / CRLF. Preserve all other repositories.

## Visual direction

white/yellow engineering road diagram. The working surface opens immediately; no marketing landing page ahead of controls. Keyboard controls, touch input, readable labels and reduced motion are part of the UI. Diagrams/canvas represent actual computed state rather than decorative or fictional results.
