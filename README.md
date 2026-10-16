# geoplonk

A Chrome Manifest V3 customiser for the original Google Maps website, built with TypeScript, React and Vite. Includes Clean View, Random Explorer and singleplayer geography guessing with configurable rounds, movement rules, local statistics and end-of-game map reviews. A separate website provides downloads and launches games through the installed extension.

## Build and load

Use Node.js 24 and npm:

```sh
npm ci
npm run check
```

At `chrome://extensions`, enable Developer mode, choose **Load unpacked**, and select this repository's `dist` directory. Reload the extension and existing Maps tabs after updating it. Open the extension action to change settings.

Supports `www.google.com/maps` and `maps.google.com`. Country domains are deliberately outside the current permission scope. The English and French desktop Street View layouts have live coverage; map category matching currently recognises English labels.

## Controls

- **Clean View** enables selected UI hiding: search, categories, Street View toolbars/minimap and information panels.
- **Disable movement**, **Disable panning** and **Disable zooming** are independent of Clean View and each other. They update immediately. Movement locking also attempts to hide recognised navigation indicators.
- **Hide road names** and **Hide place bubbles** are separate experimental filters. Road textures are cached by Maps, so reload Maps after changing road-name hiding or toggling Clean View.
- **Restore everything** clears UI customisation and all locks. **Reload Maps** rebuilds cached annotations. Both recovery controls remain accessible at the top of the popup.

The popup reports whether the current renderer's annotation patterns have been recognised. “Not recognised yet” can mean the layout changed or that the corresponding annotations are absent. Recognition is a capability signal, not proof that every annotation is gone. Unknown patterns stay visible. A filter failure does not turn off the input locks.

The optional information-panel setting hides the top-left contributor/title card and bottom-right credit strip as requested. The Google logo remains visible. Real photographed signs remain visible. Browser navigation, inspection and direct URL changes remain possible; these are interface controls, not anti-cheat enforcement.

## Reliability architecture

Maps markup assumptions are isolated in `src/content/dom.ts` and `adapter.ts`. Accessible roles, normalised branding and semantic action attributes are used where available; narrow class selectors provide tested fallbacks. Normal map view is excluded from Street View locks.

The MAIN-world script installs capture-phase gesture guards before Maps' page handlers. Mouse, pointer and touch sequences distinguish clicks from drags; cleanup covers releases outside the scene, cancellation, pointer capture loss, focus loss, visibility changes, settings changes and scene replacement.

Experimental rendering wrappers use standard Canvas 2D and WebGL APIs. Road-text matching checks the active Street View scene and the observed text-texture properties. Icon/indicator matching combines exact uniform/attribute sets with shader structure; unknown programs and lost/error contexts pass through. Relinking invalidates program classification, and active programs are tracked to avoid querying GL state on every drawing call. These filters still depend on Google's implementation and can require maintenance.

No private Google APIs, imagery reads, shader-source logging, location history, analytics, backend, external scripts or API keys are used by the extension. Preferences stay in `chrome.storage.local`; capability status is transient, boolean-only page data. Google receives ordinary Maps browsing data. Permissions are `storage`, `activeTab` for the clicked-tab connection/reload controls, and narrowly scoped declarative content scripts.

## Verification

`npm run check` runs regression tests, TypeScript checking and all production bundles. See [the testing guide](docs/TESTING.md) and [the architecture/checkpoint plan](docs/IMPLEMENTATION_PLAN.md).

`scripts/live-checks.cua.mjs` runs repeatable native-input checks through the connected Chrome/CUA interface. It tests panorama position, orientation and FOV rather than selector counts, waits for Maps' delayed URL updates, and can restore original preferences and the starting URL. See the testing guide for use.

MIT-licensed code; Google imagery, marks and other third-party materials are not included in that licence. This is an experimental project, not an endorsement by Google. No donation destination has been supplied yet.

## Random Explorer (v0.2.0)

Open the extension and choose **Explore a random place**. A dedicated Chrome popup opens the original Google Maps website with your saved Clean View and input-lock settings. The small toolbar provides **Next place**, **Retry** (the same starting destination), and **Close**. Next place avoids an immediate repeat. The extension reuses only its own popup, and closing it allows a fresh launch. No new permissions, API keys or backend are needed.

The curated pool contains 24 pinned panoramas across multiple continents. The expanded road destinations were checked on the original Maps website; see docs/location-pool-check.json. Coverage can change. Consent screens must be completed in Maps, and scene recognition does not guarantee that every image has finished rendering.

Only the owned window/tab IDs and selected destination ID are held in Chrome session storage, across worker restarts but not browser restarts. Gameplay undo keep up to 100 sanitised public panorama positions for the current round in session storage. This temporary trail is removed when the owned window closes and is never exported with statistics. Explorer controls appear only in the owned popup. A Chrome popup hides the ordinary address bar on the tested desktop. Since v0.2.1, the owned popup uses a neutral “geoplonk” page title. Chrome still owns the title bar and may briefly display a native title during navigation before the content script runs; this is exploration, not Guess Mode.

## Guess Mode (v0.3.0)

Choose **Play Guess Mode** in the extension popup. Select untimed play or a 1/2/3-minute round limit, then start the five-round game. The original Google Maps website opens in an owned Chrome popup. A small bottom-right guessing map expands on hover or keyboard focus; the current Street View scene is recognised, then a three-second blurred countdown precedes the round timer. Click the map to place a guess and submit it. Keyboard users can focus the map, pan with arrows, zoom with plus/minus, and press Enter or choose **Guess at map centre**.

Each round scores `round(5000 × exp(-distanceKm / 2000))`, bounded to 0–5,000, using Haversine distance from the curated starting coordinate. Timeouts score the last saved guess, or zero if no guess was placed. Movement does not change the target. For missing imagery, Game options offers **Skip this round · 0 points**. Results reveal the starting location, your marker, distance and score; the five-round total is out of 25,000.

The guessing map uses bundled Leaflet with the keyless Google roadmap tile source also used by WorldGuessr. It includes street detail up to zoom 20 and visible Google attribution. This is an undocumented tile endpoint, not the supported Map Tiles API. Google receives tile requests (including the viewed map areas and ordinary network metadata); the guessing map requires a network connection. No tiles are scraped, exported, prefetched in bulk or stored in application storage. This user-requested change supersedes the earlier no-undocumented-endpoints design choice; public availability is not evidence of distribution authorisation. Google Street View still needs an internet connection. The five-place seed pool is small: two distinct Paris locations, Tokyo station, Sydney and New York. Coverage can change; four seeds include manually recorded public panorama IDs through the documented Maps URL `pano` parameter, with coordinate fallback. No imagery is copied or stored.

Active games, guesses, absolute deadlines and statistics remain in `chrome.storage.local`. Closing a timed game window does not pause its timer. Reopen **Play Guess Mode** and choose **Open game window** to recover. Abandoning an unfinished game closes the owned popup without counting a completed game. Statistics include completed-game count, best/average score and up to 100 recent game totals, with export and clear controls. Clear statistics does not erase the active game. There are no accounts or telemetry.

Development preview: run `npx vite --host 127.0.0.1`, then open `/game.html`. This is explicitly labelled as a simulated Street View preview, uses separate localStorage and does not contact the installed extension. Production bundles exclude that preview adapter.

Checkpoint acceptance: automated checks and a complete preview session pass; full installed-extension gameplay, the embedded extension-frame loading policy and native popup recovery still need a human Chrome check because the browser automation tool rejects extension-page inspection.


## Guess Mode layout update (v0.3.1)

Rounds now start automatically after the current panorama is recognised; there is no Begin round button. A centred countdown and top-right five-round scoreboard stay separate from the guessing map. The bottom-right map is approximately 290×205px, expands to 560×470px on hover/focus (bounded by the window), and supports an explicit pin button for touch/keyboard use. Result panels expand automatically. The native Google copyright, terms and keyboard-shortcut strip is restored, with room below the map dock. Hiding the location information card remains a separate existing preference.

The local `/layout-preview.html` page demonstrates this layout against an explicitly simulated background, using the same HUD, map iframe and game coordinator. It is development-only and excluded from production bundles.


## Start and results update (v0.3.2)

The game page opens in a lobby and starts a new game only when **Start game** is clicked. Saved unfinished games offer explicit Resume/Discard controls. Movement, panning and zoom locks can be set on that page; they mirror the extension's saved controls. Each panorama is concealed while loading, followed by a durable three-second blur/countdown. The gameplay deadline starts after that countdown, not during it.

After submission, the guessing map fills the game viewport and shows the player's pin, starting-location flag and connection line. A floating forest-green/brass summary bar reports time, distance and score, with Next round or Play again. The five-round scoreboard remains at the top right. The native footer is preserved, while image capture (recognised English label), country and the imagery-report link are selectively hidden in Clean View.

Tile-source evidence: https://github.com/codergautam/worldguessr/blob/master/components/Map.js and https://github.com/codergautam/worldguessr/blob/master/components/ResultsMap.js. Only the endpoint choice was referenced; WorldGuessr's implementation/assets were not copied into this project. Its source availability does not confer Google's tile-distribution rights on this project.

## v0.3.3 singleplayer controls

Move / No Move / NMPZ presets are available on the setup page alongside individual restrictions. Move shows gradual zoom, north reset, undo, return to start. No Move shows zoom and interactive compass; NMPZ shows a read-only compass. The guessing map expands on hover/focus; clicking or Enter selects a guess. Buttons follow independent restrictions as well as presets. Unavailable native controls report a message rather than acting on another page. Navigation changes use documented public Maps URLs, preserving the active timer and scoring target.

Choose 1–10 rounds (default five) with the current 24-location pool, and 0–3,600 seconds per round (zero is untimed). The model accepts larger counts when a larger unique pool is supplied. Singleplayer state and scoring remain separate from the UI for a future multiplayer checkpoint. Game overlay now starts at document_start and checks readiness every 500ms; three seconds of blur still precede the timer. Actual panorama/network loading time varies.

The guessing map uses Leaflet.SmoothWheelZoom (MIT, mutsuyuki; @luomus fork). Failed tiles retry twice with alternate Google hosts/standard-resolution fallback. World bounds prevent out-of-range tiles; isolated failures do not leave a permanent connectivity warning. A fully unavailable map offers Retry. Keyless Google tiles remain the WorldGuessr-style source, with Google/Terms attribution preserved.

## v0.3.4 — panorama controls

Toolbar icons use explicit zero padding, border-box sizing and centred SVGs. Buttons keep their DOM across status updates, preserving hover/focus tooltips. The live native compass supplies the heading and cardinal direction; north reset uses the native compass first, with a documented Maps camera URL fallback. Zoom uses a small pixel wheel event, with a five-degree field-of-view fallback rather than a full native zoom-button level. Camera changes keep the active round deadline.

Starting headings are randomised per round, persisted in the game targets, and retained on resume and Return to start. Undo uses the current page URL sent by the owned content script, is cleared at round completion and new-round launch, and rejects stale round actions. Checkpoint controls and actions have been removed. The specific native “No Street View imagery available here.” notice and its close-button container are hidden in the game and immersive Clean View; other alerts, panoramas and attribution stay visible. This is notification suppression, not a coverage repair.

## v0.3.5 — native north and expanded destinations

North reset never navigates/reloads the page. It sends a mouse gesture at the native compass centre and waits for the native animation. If that does not finish, standard panorama mouse drags use live compass feedback to turn north; an unsupported panorama reports a control message rather than reloading. Zoom retains its separate documented camera-URL fallback.

Undo listens to the browser Navigation API's currententrychange event, recording only current-round camera positions, entry indices and a per-document identifier. It traverses native browser history only when the previous position is a confirmed earlier entry in the same document; otherwise the public Maps URL fallback still loads a new page. It never manufactures Maps history state or reads private Maps objects. Closed/finished rounds clear the trail.

Place a pin has been removed. Close has the same immediate hover/focus tooltip as the other controls. Leaflet.SmoothWheelZoom sensitivity is 1.5, up from 1. The 24-location pool includes 19 newly checked road panoramas; New York now uses a pinned road panorama rather than a contributor photo. Ten rounds are selectable, with five as the default.

## v0.3.6 — remove camera/undo reload fallbacks

Zoom now delivers one small wheel event directly to the largest visible panorama canvas (or viewport), without treating delayed URL updates as failure. No camera command can navigate via the worker. Undo is enabled only for confirmed same-document native history; unavailable undo is disabled instead of reopening Maps. Return to start and new rounds still navigate intentionally. The compass waits for native-control readiness, and its temporary observer follows replacement controls during Maps rerenders.

## v0.3.7

Compass indicator updates cross north by the shortest rotation and follow native heading updates without an additional CSS animation. Undo remains limited to native same-document history: Maps may replace rather than append its current entry, leaving no safe in-place Back step.

## v0.3.8 — preserve moves before Maps replaces them

In an active game round, a MAIN-world standard History API adapter promotes a panorama-changing replaceState call to pushState. It forwards the native call's state unchanged, keeping the previous real URL/state pair. Turning, zooming, unknown URLs and ordinary Maps tabs keep native replace behaviour. Back restoration is not treated as a new forward move until a genuine user input occurs. No private Maps JavaScript objects, imagery endpoints or extra permissions are used.

The current-round trail records browser entry keys as well as panorama IDs. Undo traverses a confirmed retained entry using Chrome's Navigation API, verifies its panorama identity first, and restores the trail if traversal fails. This supports moves that previously discarded browser history, provided they are made after the new extension scripts load. Start a fresh round after reloading the extension; past discarded entries cannot be recovered.

## v0.3.9 — consecutive undos

Undo retains earlier moves across repeated Back operations. Toolbar clicks no longer restart forward recording during restoration, late outgoing URL writes cannot overwrite the restored entry, and delayed status messages from discarded entries are ignored. Moving forward in the panorama resumes recording with fresh browser entries. Reload the extension and start a fresh game to use the updated history adapter.

## v0.3.10 — recorded-position undo

Undo now reopens the previous recorded public Street View URL. This reloads the panorama, with a loading blur; the timer continues and the round, score and guess stay in local game state. Consecutive undos use the current-round trail across page loads, without depending on native browser-history entries. Failed navigation retains the move for retry. The extension observes native URL changes but no longer converts or suppresses Maps history writes. This supersedes the native-history approach in v0.3.8–0.3.9. Reload the extension and start a fresh game to use the new scripts.

## Separate download website

The landing page, introduction, project motivation, installation guide and versioned extension/source downloads live separately under `website/geoplonk/dist`. See [website/README.md](website/README.md) for preview and release-packaging instructions. It does not change the extension UI or its Vite build.

## Website game hub (v0.3.11)

Open the website's **Play** page in the Chrome profile with geoplonk installed. It detects the extension, starts singleplayer with selected round/time/movement rules, resumes saved games and opens Random Explorer or the game manager. Install or update to v0.3.11 and reload the website first; earlier versions do not have the bridge. Website launch uses the same local game engine, countdown and storage as extension launch.

A separate content script now matches only the official website origin in addition to the existing Maps scripts. The website can request a small set of launch actions; it cannot read guesses, answer locations, location trails or personal statistics. Installation detection exposes version, pool size and a saved-game availability flag. No fixed unpacked extension ID, account or backend is required. See `src/website` and `src/background/website.ts` for the bridge.

## End-of-game summary (v0.3.13)

Completed games show every round's location, distance, time and score, with a total and selectable map review. Skipped rounds and expired timers are labelled. The manager's **Review last game** button reopens the most recent completed results until another game replaces them. **Play again** uses the same round count and timer.

## Public website (v0.3.14)

The public deployment uses https://geoplonk.pages.dev and builds automatically from GitHub `main` with Cloudflare Pages. The Play page requires extension v0.3.14 or later; earlier builds connect only to the legacy ChatGPT-hosted preview. `npm run build:website` verifies the extension and assembles the static site with reproducible extension/source ZIPs. See `website/README.md` for deployment settings. No application server or database is used.
