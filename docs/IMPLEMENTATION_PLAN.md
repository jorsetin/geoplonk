# Specification review and implementation plan

The MVP is technically plausible as a local interface extension. Unlimited play means no application-imposed quota, not guaranteed Google availability. Public distribution remains a separate legal decision.

## Risks and decisions

- **Terms and distribution:** Google Maps Additional Terms prohibit creating a new product or service based on Maps, among other restrictions. Free distribution, local execution and avoiding API billing do not establish authorisation. Obtain qualified review of the proposed game, interface modifications, destination curation, branding and store listing before release. This repository is an experimental implementation, not a legal clearance.
- **DOM stability:** Maps has no supported UI customisation contract. Isolate selectors, target exact individual controls, preserve parent containers and fail open on unknown layouts. English labels and google.com only are supported initially. Country domains and translations need explicit testing and opt-in scope expansion.
- **Attribution:** Never hide logos, legal links, copyright, contributor credits, imagery dates or navigation. Avoid broad panels, overlays over credit areas and generic CSS classes. Fixture tests do not prove this on every live Maps layout.
- **Street View:** Coverage, panorama availability, redirects, cookies and consent screens vary. Curated destinations require manual verification; do not fetch private endpoints or automate imagery collection. A public Maps URL is navigation, not evidence of a guaranteed exact panorama.
- **Spoilers:** A Chrome popup reduces accidental URL exposure but is not an anti-cheat boundary. Place names and Google UI can reveal locations. Do not promise a completely clue-free view. Score against the initial curated destination, not coordinates after movement.
- **Privacy:** Extension settings and future scores stay in chrome.storage.local, not sync. Google still receives ordinary Maps browsing data. No telemetry, accounts, remote scripts or API keys. Never store imagery, browsing history or moved-to coordinates.
- **Lifecycle:** MV3 workers can stop. Persist game transitions and deadlines rather than depending on worker timers. Reconcile closed windows, reloads and stale messages. Use schema versions and validate messages.
- **Guessing map:** Use a separately licensed, bundled vector world map for an interactive local coordinate picker. It needs attribution, keyboard controls and clear limitations at small scales. Public tile servers have usage limits and external data flows; do not assume free unlimited hosting. Review combining this map with Maps in the legal release review.
- **Multiplayer:** Later opt-in transport behind a port; server-authoritative scoring adds hosting and security requirements. Local-first module boundaries do not themselves provide fair multiplayer.

## Architecture

| Module | Responsibility |
| --- | --- |
| src/shared | Validated settings, versioned storage; later typed messages |
| src/content | Isolated-world observer and narrow Maps UI adapter |
| src/popup | React extension action popup; preference editing and recovery |
| future background | MV3 worker: owned popup window lifecycle and durable session coordination |
| future destinations | Independently sourced curated coordinates, provenance, verification dates; no imagery |
| future game | Pure five-round state machine, Haversine distance, score and results |
| future guess-map | Bundled licensed vector geography, coordinate selection and keyboard support |
| future persistence | Local sessions and aggregate statistics with schema migrations |
| future transport | Local implementation first; optional multiplayer interface later |

Vite emits the React popup and separately bundles the content script as a self-contained IIFE. No service worker is necessary for checkpoint one. Permission: storage plus narrowly scoped declarative content scripts; no tabs, webRequest or all-sites access.

## Checkpoint 1 — interface customiser

Implemented: opt-in Clean View, search controls and recognised category shortcuts, local persistence, immediate updates in open supported tabs, SPA replacement handling, restore button, accessible settings and error reporting. Unknown layouts remain unchanged. Retain native layout space to avoid changing map geometry. No blanket panel hiding.

Gate: typecheck, production build and DOM regression tests; then manually load unpacked dist in Chrome. Test live Maps and Street View, attribution in every state, navigation, keyboard focus, reload/persistence, SPA transitions and restore. A live Chrome test remains necessary before calling this checkpoint accepted.

## Checkpoint 2 — random exploration and immersive window

After checkpoint-one acceptance, add worker and independently curated destination records. Validate coordinate ranges and source licences. Launch Google Maps directly using a documented public Maps URL with Street View action in chrome.windows.create({type: 'popup'}). Preserve native movement. Track only extension-owned windows; show retry/skip when coverage is absent. Add optional user-supplied donation URL only when a real project donation destination exists.

Gate: unit tests for URL validation and random selection, worker/window integration checks, manual Street View verification for all seed destinations, consent handling, close/reopen recovery and platform-specific browser chrome. No game launch until this passes.

## Checkpoint 3 — five-round game

Add ready → exploring → submitted → round-result → final-result state machine, five unique destinations when available, a separate extension guessing window and local world map. Require a selected guess before submitting. Use Haversine distance (Earth radius 6371.0088 km) and proposed score round(5000 × exp(-distanceKm / 2000)), bounded to 0–5000. Make the scale explicit and version it. Persist initial targets and absolute deadlines; select optional timed or untimed play. Timeout with no guess scores zero. Final screen reports each distance and score, total out of 25,000 and local statistics; provide erase/export controls.

Gate: tests for known distances, antimeridian, poles, score bounds, double submission, five-round completion, deadlines/recovery and statistic idempotency. Integration tests with fake Chrome APIs; manual full sessions, native movement, guessing map accessibility, popup lifecycle and attribution review. Do not advance to public distribution until legal and store-policy review is complete.

## Primary references

- https://maps.google.com/help/terms_maps/
- https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts
- https://developer.chrome.com/docs/extensions/reference/api/windows

## Checkpoint 2 implementation update — v0.2.0

Implemented `src/background` for serialized, session-persisted owned-popup lifecycle, `src/explorer` for project-authored seed coordinates and documented Maps URLs, and a Shadow DOM explorer toolbar for Next/Retry/Close. No additional permissions. The action popup includes a launch button. Current saved locks apply to Explorer just as to ordinary Maps.

The starter pool contains three live-checked panoramas; a larger road-only pool remains necessary for five unique game rounds. Coordinate links may resolve to indoor or contributor panoramas, so only checked entries ship. Readiness currently recognises a Street View scene and English unavailable-imagery notice; it does not guarantee image completion or recognise every localised error. Consent handling remains native to Google. Checkpoint 3 has not started.

## Checkpoint 3 implementation — v0.3.0

Implemented a pure five-round game model and a worker coordinator with validated transitions, redacted views (future targets stay out of the game UI), serialized messages, saved guesses/deadlines, timeout reconciliation and atomic completion/statistics updates. Games use five unique seed IDs. Each round starts explicitly after scene recognition so loading does not consume the timer. Closing and reopening retains the deadline. Guess Mode reuses the owned popup lifecycle and neutral title; the guessing panel is an extension-origin iframe inside that original Maps page, with only `game.html` exposed as a web-accessible resource. No new Chrome permissions.

The local map module uses bundled Leaflet 1.9.4, Natural Earth 1:50m country polygons, major-city labels, pan/zoom/click/keyboard controls and guess/answer/result-line overlays. Labels are prioritised to reduce collisions. It makes no remote tile requests. Street-level detail requires a future provider decision; public OSM tiles are not treated as unlimited infrastructure. A live installed Chrome session is required to accept the embedded-frame integration.

## v0.3.1 layout and timing correction

User feedback supersedes manual timer start and footer hiding. Current-scene readiness automatically begins the round exactly once; no Begin control is shown. The HUD shows a centred countdown and top-right per-round/total score panel. Its Shadow DOM contains a small corner iframe dock expanding on hover/focus, with a touch pin control and automatic expansion for results. The dock leaves 42px below for the original Google legal/keyboard-shortcut footer. Copyright containers and their recognised ancestors are protected from Clean View hiding. A local simulated layout preview verifies resize behaviour without accessing restricted extension pages.


## v0.3.2 user-directed changes

The user requested WorldGuessr's map source after the supported Google Map Tiles API's key/billing requirements were explained. Source inspection confirmed its keyless `mt*.google.com/vt` roadmap tiles in Leaflet. The project now uses that source rather than bundled country geometry; this explicitly changes the earlier documented-endpoints-only architecture. Google tile delivery and guessing-map privacy now depend on external Google requests. No distribution authorisation is assumed.

The lobby requires explicit Start/Resume, mirrors saved input locks, and gates each round through loading → countdown (3 seconds) → exploring. Absolute reveal/deadline timestamps survive worker suspension. Result maps fill the viewport, retaining the top-right scoreboard and adding elapsed time/distance/score navigation. Theme is forest green, warm cream and brass. Footer filtering preserves legal and keyboard controls while hiding only requested non-legal fields.
