# Edge-case verification — 2026-10-13 — traffic-lab

LOCAL ONLY. Parent integrates/releases. No commit, push, deployment, sibling change or new server. Main loopback server remains running. Baseline tracked tree was clean; starting HEAD: 451510e.

## Results and reproducible commands

- NEW ordinary Node tests: **8** in `test/edge-20261013.test.js`. E01 etc. below mean declaration order in that file.
- Initial new regression batch: **4 actual failures** on unchanged production modules; remaining initial cases passed on baseline and are coverage additions, not RED_GREEN. 
- Confirmed defect groups: **4** (group repeated write/delete manifestations by the boundary described below). Four Node failures plus one separately reproduced browser regression.
- Full `npm test`: **48/48 PASS**. `npm run check` and `git diff --check`: PASS.
- NEW browser B: `tools/browser-edge-20261013.mjs`, local Chrome, fresh isolated contexts, muted audio, 1440/390/320 pixels, real keyboard and mobile-emulated taps. Full results in `output/playwright/edge-20261013/browser.json`. No uncaught page exceptions; no horizontal overflow.
- CI: new Node file is automatically discovered by existing `node --test` / `npm test` in `.github/workflows/pages.yml`. Workflow unchanged. Browser script is repeatable optional tooling, **NOT in ordinary CI** (Playwright is an existing local QA dependency). Remote CI and LIVE: **NOT_RUN**.

Run from this repository:
```powershell
node --test test/edge-20261013.test.js
npm test
npm run check
node tools/browser-edge-20261013.mjs
git diff --check
```

Browser defaults: existing sibling-root `../output/playwright/implement-20261012/package.json` (Playwright 1.61.1), Chrome `C:/Program Files/Google/Chrome/Application/chrome.exe`, URL `http://127.0.0.1:59540/traffic-lab/`. Overrides: `PLAYWRIGHT_PACKAGE`, `CHROME_PATH`, `EDGE_BASE_URL`; `EDGE_FIXTURES_ONLY=1` runs just the injected fixture group. Dependencies are read only; evidence is written only within this owned repo. Script closes its own browser/contexts and never controls the shared server.

## Actual red / green evidence

Node E01–03 unconfirmed private/aggregate writes and clears reported success; E04 a sparse action array was silently skipped by map. Browser delayed File.text followed by clear repopulated deleted policies. Exact readback, dense iteration and import-generation invalidation fix these separate boundaries.

Production edits: `dist/src/storage.js, dist/src/progress.js, dist/src/policy.js, dist/src/app.js`. Test doubles are explicit bounded in-memory fixtures, not real device denial/quota measurements or external validation. Readback confirms the value observed immediately afterward; it cannot make two localStorage keys transactional or prevent future concurrent writes.

- `output/playwright/edge-20261013/red.tap`: original new tests before production edits.
- `output/playwright/edge-20261013/green.tap`: same regression tests after minimal changes.
- `output/playwright/edge-20261013/full-test.txt`, `check.txt`: full suite and static check.
- `red-corrected.tap`: corrected test-only fixture speed30/140 and gap0.6 to documented 60/120 and 0.7, while production was still unchanged. Original E07 failure was a test-authoring error, NOT a product bug. Corrected baseline: 4 fail / 4 pass.
- `browser-fixture-baseline.txt`: actual FAIL after delayed policy read / clear. `browser-fixture-green.txt`: same fixture PASS after app import invalidation.

Evidence folder is ignored. Red logs are preserved, not reconstructed by reverting code. Previously documented 2026-10-13 bugs are existing work and are not counted here.

## Feature/control matrix

| Feature/control | Concrete test / command | Result and boundary |
| --- | --- | --- |
| Ring physics / population / speed corners | NEW E07 count12/60, speed60/120, gap0.7 deterministic 50 ticks, non-overlap/population; existing model/challenge invariants | PASS; original IDM acceleration and collision bounds unchanged |
| Three missions / checkpoints / budgets / intervention expiry | Existing challenge/policy suites; NEW B real wave success with two visible timed interventions | PASS; targets, idm-v1, event times and 30/60 costs unchanged |
| Terminal / replay / reset / repeated input | NEW E06 failed replay remains terminal under five extra steps; B duplicate Enter blocked, successful table reproduced, reset | PASS; replay does not earn independent credit |
| Policy schema / sparse / seed / exact byte edge | NEW E04 sparse action rejection; E05 4096/4097 bytes, malformed/expanded, max seed9999 and invalid types | RED_GREEN E04; holes are direct model fixture, JSON null was already invalid |
| Private storage / quota retry / clone / peer isolation | NEW E01/E02/E08 no-op write/delete, quota retry, mutable caller isolation, repeated clear; B readback error UI | RED_GREEN E01/E02; stored schemas/counts unchanged |
| Aggregate write / clear / malformed peers | NEW E03 no-op set/clear; existing storage malformed, size, independent replay tests | RED_GREEN; synchronous verification only |
| Async file read after full delete | NEW B delayed File.text fixture, clear, release | RED_GREEN browser; clear and pagehide invalidate pending read, no resurrection |
| Real keyboard / mobile / invalid files | NEW B Enter apply, taps, empty seed, malformed/oversize policy, active/replay locks at 1440/390/320 | PASS; file fixtures contain only synthetic policy settings |
| Visibility / audio / image decode / undo | Existing visibility handler inspected; new visibility automation NOT_RUN; audio/decode/undo absent | N/A absent features; playback/reset supported, physical background lifecycle NOT_RUN |

B = the new browser command above. Existing tests are explicitly marked; running them again does not make them new coverage. No source-string-only test was added.

## Source accounting

- **VERIFIED**: `architecture.md`, `README.md`, `docs/decisions.md` read with authority precedence. `api-spec.md`, `requirements.md` absent in this repo (N/A, not silently skipped).
- **VERIFIED**: modified production modules `dist/src/storage.js, dist/src/progress.js, dist/src/policy.js, dist/src/app.js`, added executable test/browser files, `package.json`, `.gitattributes`, `.gitignore`, and Pages workflow.
- **PARTIAL**: whole `dist/`, `test/`, `tools/`, `docs/` source review. Inventoried first; inspected applicable storage, model, UI lifecycle and existing regression files. All ordinary tests executed, but this is not a claim of full line-by-line review of every renderer, historical verification note or optional browser script.
- Existing `docs/verification.md` receives a new top link; old LOCAL/CI/LIVE claims remain historical.
- **NOT_INSPECTED / out of scope**: siblings' implementation and private files. No .env/credential values read or printed.

Inventory at intake (repository files, excluding .git/dependencies/output; inventory is not full-file review):

```text
tools\serve.mjs
tools\check.mjs
tools\browser-audit-20261013.js
test\storage.test.js
test\policy.test.js
test\model.test.js
test\challenge.test.js
README.md
package.json
docs\verification.md
docs\decisions.md
dist\styles.css
dist\src\ui.js
dist\src\storage.js
dist\src\progress.js
dist\src\policy.js
dist\src\model.js
dist\src\challenge.js
dist\src\app.js
dist\index.html
architecture.md
.gitignore
.github\workflows\pages.yml
.gitattributes
```

## Capture and limitations

`output/playwright/edge-20261013/viewport-1440.png`, `viewport-390.png`, `viewport-320.png` and injected storage-error capture. Narrow captures inspected for clipping/overlap; no layout/CSS redesign was made. Browser validation covers Chrome emulation, not a physical touchscreen, screen reader, Firefox/WebKit or all OS lifecycle behavior. No actual clinical/audio/photometric or real-world traffic/biology measurement. Concurrency fixtures are deterministic schedules, not exhaustive races. 

See [decision log](decisions.md) for D11. Preserve existing scientific model, game rules, safety and retention boundaries.
