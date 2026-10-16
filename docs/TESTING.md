import {cameraFromUrl,observeCamera,adjustedCameraUrl,type Trail} from '../explorer/navigation';
import {readSettings} from '../shared/settings';
import { distanceKm, gameView } from '../game/model';
import { gameState, handleGame } from './game';
import { destinations, pickDestination, panoramaUrl, startingPointFromUrl } from '../explorer/destinations';
const KEY = 'explorer.session.v1';
type Session = { windowId: number; tabId: number; destinationId: string; mode?: 'explorer' | 'game' };
let queue: Promise<unknown> = Promise.resolve();
async function owned(): Promise<Session | null> {
  const stored = (await chrome.storage.session.get(KEY))[KEY] as Session | undefined;
  if (!stored || !Number.isInteger(stored.windowId) || !Number.isInteger(stored.tabId)) return null;
  try {
    const window = await chrome.windows.get(stored.windowId);
    const tab = await chrome.tabs.get(stored.tabId);
    if (window.type === 'popup' && tab.windowId === window.id) return stored;
  } catch { /* Closed window or tab; forget only our session. */ }
  await chrome.storage.session.remove([KEY,'game.navigation.v1']);
  return null;
}
async function handle(type: string, sender: chrome.runtime.MessageSender, message:Record<string,unknown>={}) {
  const session = await owned();
  const actionPage = !sender.tab && sender.url === chrome.runtime.getURL('popup.html');
  const explorerPage = !!session && sender.tab?.id === session.tabId && sender.tab?.windowId === session.windowId;
  if (!actionPage && !explorerPage) return { ok: false, error: 'Explorer is not connected.' };
  if(type==='EXPLORER_NAV') {
    if(!session||session.mode!=='game')throw Error('No active game window.');
    const game=(await gameState()).game;if(game?.phase!=='exploring')throw Error('Wait for the round to start.');
    if(message.gameId!==game.id||message.round!==game.round)throw Error('This round has changed.');
    const settings=await readSettings();
    const action=message.action;
    if(action==='north'||action==='zoomIn'||action==='zoomOut'){
      if(action==='north'?settings.disablePanning:settings.disableZooming)throw Error('This control is disabled.');
      const camera=cameraFromUrl(typeof message.url==='string'?message.url:sender.url??'');if(!camera)throw Error('Wait for the panorama to load.');
      await chrome.tabs.update(session.tabId,{url:adjustedCameraUrl(camera,action)});return {ok:true};
    }
    if(settings.disableMoving)throw Error('Movement is disabled.');
    let trail=(await chrome.storage.session.get('game.navigation.v1'))['game.navigation.v1'] as Trail|undefined;
    if(!trail||trail.round!==`${game.id}:${game.round}`)throw Error('Navigation is still loading.');
    const latest=cameraFromUrl(typeof message.url==='string'?message.url:sender.url??'');if(latest)trail=observeCamera(trail,latest);
    
    let target:string|undefined;
    if(action==='undo'&&trail.history.length>1){trail.history.pop();target=trail.history.at(-1)!.url;trail.pending=trail.history.at(-1)!.key;}
    if(action==='start'){target=panoramaUrl(game.targets[game.round]);trail.history=[];trail.pending=cameraFromUrl(target)?.key;}
    if(!target)throw Error('That navigation action is not available yet.');
    await chrome.storage.session.set({'game.navigation.v1':trail});await chrome.tabs.update(session.tabId,{url:target});return {ok:true};
  }
  if (type === 'EXPLORER_STATUS') {
    const game=session?.mode==='game'?(await gameState()).game:null;
    let navigation={heading:0,canUndo:false};
    if(game?.phase==='exploring'&&explorerPage){
      const camera=cameraFromUrl(typeof message.url==='string'?message.url:sender.url??'');
      if(camera){const key=`${game.id}:${game.round}`,saved=(await chrome.storage.session.get('game.navigation.v1'))['game.navigation.v1'] as Trail|undefined;
        const trail=observeCamera(saved?.round===key?saved:{round:key,history:[]},camera);
        if(JSON.stringify(saved)!==JSON.stringify(trail))await chrome.storage.session.set({'game.navigation.v1':trail});
        navigation={heading:camera.heading,canUndo:trail.history.length>1};
      }
    }
    return {ok:true,active:!!session,mode:session?.mode??'explorer',game:gameView(game),navigation};
  }
  if(session?.mode==='game' && type !== 'EXPLORER_CLOSE') throw Error('Finish or abandon the game before exploring.');
  if (type === 'EXPLORER_CLOSE') {
    if (session) await chrome.windows.remove(session.windowId);
    await chrome.storage.session.remove([KEY,'game.navigation.v1']);
    return { ok: true };
  }
  if (type !== 'EXPLORER_START' && type !== 'EXPLORER_NEXT' && type !== 'EXPLORER_RETRY') return { ok: false };
  const destination = type === 'EXPLORER_RETRY' && session
    ? destinations.find(item => item.id === session.destinationId) ?? pickDestination()
    : pickDestination(session?.destinationId);
  const url = panoramaUrl({...destination,heading:Math.floor(Math.random()*360)});
  if (session) {
    await chrome.tabs.update(session.tabId, { url });
    await chrome.windows.update(session.windowId, { focused: true });
    await chrome.storage.session.set({ [KEY]: { ...session, destinationId: destination.id, mode: 'explorer' } });
  } else {
    const window = await chrome.windows.create({ type: 'popup', url, width: 1200, height: 800, focused: true });
    const tabId = window.tabs?.[0]?.id;
    if (window.id === undefined || tabId === undefined) throw new Error('Could not create the explorer window.');
    await chrome.storage.session.set({ [KEY]: { windowId: window.id, tabId, destinationId: destination.id, mode: 'explorer' } });
  }
  return { ok: true, active: true };
}
async function launchGame(destinationId: string) {
  const game=(await gameState()).game;
  const destination=game?.targets[game.round]?.id===destinationId?game.targets[game.round]:destinations.find(item=>item.id===destinationId);
  await chrome.storage.session.remove('game.navigation.v1');
  if(!destination)throw Error('Destination unavailable.');
  const session=await owned();
  if(session){
    await chrome.storage.session.set({[KEY]:{...session,destinationId,mode:'game'}});
    await chrome.tabs.update(session.tabId,{url:panoramaUrl(destination)});
    await chrome.windows.update(session.windowId,{focused:true});
  }else{
    const window=await chrome.windows.create({type:'popup',url:panoramaUrl(destination),width:1200,height:800,focused:true});
    if(window.id===undefined||window.tabs?.[0]?.id===undefined)throw Error('Could not open game window.');
    await chrome.storage.session.set({[KEY]:{windowId:window.id,tabId:window.tabs[0].id,destinationId,mode:'game'}});
  }
}
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if(typeof message?.type!=='string'||! /^(EXPLORER_(START|NEXT|RETRY|CLOSE|STATUS|NAV)|GAME_(STATUS|START|RESUME|ABANDON|READY|BEGIN|GUESS|SUBMIT|SKIP|NEXT|CLEAR_STATS))$/.test(message.type))return;
  queue=queue.then(async()=>{
    if(message.type.startsWith('EXPLORER_'))return handle(message.type,sender,message);
    const session=await owned();
    const extensionPage=sender.url?.split('?')[0]===chrome.runtime.getURL('game.html');
    const ownedPage=session?.mode==='game'&&sender.tab?.id===session.tabId&&sender.tab?.windowId===session.windowId;
    if(message.type==='GAME_READY'?!ownedPage:!extensionPage)throw Error('Game is not connected.');
    if(message.type==='GAME_READY' && message.ready===true && sender.url) {
      const current=(await gameState()).game;
      const position=startingPointFromUrl(sender.url);
      if(!current || !position || distanceKm(position,current.targets[current.round])>0.2) message={...message,ready:false};
    }
    const result=await handleGame(message,launchGame,async()=>{if(session)await chrome.windows.update(session.windowId,{focused:true});});
    if(['GAME_SUBMIT','GAME_SKIP'].includes(message.type)||(message.type==='GAME_STATUS'&&'game' in result&&(result.game?.phase==='result'||result.game?.phase==='complete')))await chrome.storage.session.remove('game.navigation.v1');
    if(message.type==='GAME_ABANDON' && session?.mode==='game') {
      try { await chrome.windows.remove(session.windowId); } catch { /* Already closed. */ }
      await chrome.storage.session.remove([KEY,'game.navigation.v1']);
    }
    return result;
  }).then(respond,error=>respond({ok:false,error:error instanceof Error?error.message:'Could not open Street View. Try again.'}));
  return true;
});
chrome.windows.onRemoved.addListener(windowId => {
  queue = queue.then(async () => {
    const stored = (await chrome.storage.session.get(KEY))[KEY];
    if (stored?.windowId === windowId) await chrome.storage.session.remove([KEY,'game.navigation.v1']);
  }).catch(() => {});
});

## v0.3.5 — north reset without reload and a larger pool

Tests cover native north clicks at the element centre, waiting for an animation longer than 350ms, a feedback-driven mouse-drag fallback while movement is disabled, and guaranteeing that north never calls the reload callback. Worker tests verify that a confirmed same-document undo returns a history delta without tabs.update; document and round boundaries reject invalid history traversal.

Nineteen new road destinations were opened on the original Maps site and checked for a loaded Street View application, a resolved public panorama ID/coordinate and native road-panorama URL type 2e0. Unsupported/contributor results were excluded. Only coordinate/ID metadata is recorded in location-pool-check.json; no imagery is saved. New York was separately checked and pinned to a road panorama. Pool total is 24.

The installed browser still used its previous content bundle in a fresh ordinary Maps tab. A temporary native-controls verification hook was not visible there and was removed from source and the final build. Installed-extension north/undo must therefore be checked after extension reload; do not report those actions as live-verified. Local preview verifies the changed toolbar, Close hover label, available-location count and ten-round setup.

Final v0.3.5 verification: 74 tests, TypeScript and all production bundles pass. Browser preview showed 24 available locations, accepted a ten-round untimed game, rendered all ten score cells, omitted Place a pin, and displayed the Close game window tooltip on hover.

## v0.3.6

Removed zoom's public-URL reload and undo's page-load fallback. Worker tests assert that unavailable native undo neither updates the tab nor discards its recorded position. Camera tests cover delayed native compass insertion, delayed native animation and selection of the visible viewport instead of offscreen canvases. Native actions remain subject to live verification after reloading the unpacked extension; fixture tests cannot prove every Maps panorama accepts synthetic input.

## v0.3.7 — compass indicator wraparound

The compass tracks a continuous angle across 359/0 degrees and does not apply a second CSS transform transition over the native heading animation. Regression tests cover forward and reverse crossings. This fixes the extension needle replay; it does not establish whether a particular Maps scene performs additional native camera movement. Undo remains available only for confirmed same-document browser history entries.

## v0.3.8 — retained native move history

Tests exercise replacement-to-push conversion only on panorama-ID changes in an active game, opaque native state forwarding, orientation updates without entry creation, ordinary Maps without the flag, Back restoration suppression, stable entry keys when indices shift, and failed-traversal trail rollback. Worker integration verifies a keyed undo response without tabs.update and continued round isolation.

The adapter is installed by the MAIN-world document_start script; old open tabs cannot gain it just by receiving rebuilt files. Reload the unpacked extension and start a fresh game for live verification. Tests validate browser adapter logic and worker contracts; they do not prove Google's current router restores every retained entry correctly.

## v0.3.9 — consecutive undo restoration

The native-history adapter now keeps restoration suspended when the player clicks the extension toolbar. While suspended, outgoing panorama writes through either pushState or replaceState cannot overwrite the restored browser entry. Native panorama input resumes recording. The worker tracks discarded entry keys so delayed status messages cannot resurrect an undone move, and a retained browser entry cannot acquire a different panorama identity from a transitional URL. Failed traversal removes its discarded key before rolling the trail back.

Regression coverage includes A → B → C → D followed by three consecutive undos, delayed outgoing statuses after each arrival, transitional URLs, toolbar clicks during restoration, late native push/replace writes, and a fresh forward move after undo. Worker integration also verifies that none of those undos reloads the tab and that round completion clears the trail. All 85 tests, TypeScript and production bundles pass. This is simulated browser/worker coverage; live Maps restoration remains unverified in this session. Reload the unpacked extension and start a new game to load the MAIN-world adapter.

## v0.3.10 — recorded-position undo

The retained-history approach did not work reliably in the user's live Maps game despite its simulated tests. Undo now opens the previous sanitised public Maps panorama URL in the owned tab, preserving heading, pitch and field of view. This deliberately reloads the panorama. Native history writes are observed without altering, replacing, suppressing or manufacturing their state/entries. Browser keys and browser Back are no longer used to decide whether a recorded move can be undone.

The round trail persists across document loads. A pending navigation waits for a scene-ready target observation from a replacement document; late observations from the departing/retired documents are ignored. A failed tabs.update restores the trail so the action can be retried. Timer, score, guess and round state are independent of this navigation. The loading view uses a blur rather than another three-second round countdown.

Regression checks cover moves made with native replaceState, consecutive D → C → B → A undos across new documents, outdated status messages, old-document target-URL changes, scenes still loading, duplicate clicks, rejected tab navigation with retry, saved camera orientation, and unchanged timer/score/round. Chrome live testing was blocked before tabs could be listed by “Unable to load browser request-header policy”; do not report this build as live-verified. No screen recording was created.

After restarting Chrome and the desktop app, Chrome tab discovery succeeded and showed the installed geoplonk game tab. The persistent restriction on inspecting chrome-extension pages still prevents direct installed-game verification. The rebuilt v0.3.10 TypeScript check and all production bundles passed. The latest automated suite has 80 passing tests; obsolete retained-native-history tests were replaced with recorded-position navigation coverage.

## v0.3.11 — website Play hub

The official website has a separate Play page with rounds, round duration and Move / No Move / NMPZ setup, plus saved-game resume, the extension game manager and Random Explorer. A single isolated content script runs only on https://geoplonk-explore.maplefrost11.chatgpt.site. It connects the page to the worker using bounded, same-window/origin messages; discovery does not depend on a fixed unpacked-extension ID. Launch requests target the detected installation so multiple unpacked copies do not all launch a game.

Worker authentication checks the exact HTTPS sender origin, top-level frame and sender tab. The action list is limited to status, singleplayer start/resume, open game manager and open explorer. Status exposes only extension version, saved-game availability and pool count; guesses, targets, trails, personal statistics and arbitrary URL/tab commands are not exposed. Starts use the existing local game engine, preserve unrelated settings, reject active-game overwrites and roll back settings/game state if popup creation fails. No startup or detection action launches a game.

Automated coverage exercises malformed/foreign/iframe requests, option bounds, duplicate launch blocking, installation targeting, saved-game protection, failed-popup recovery, game restrictions, the actual worker path and the real Play-page script's installed/start/resume UI. Browser QA on a preview without the extension verifies the disconnected/install-update path and layout. Positive installed-extension behavior remains subject to live testing after extension update and website reload; the in-app browser cannot use the user's Chrome extension.

Final v0.3.11 automated verification: 88 tests in 19 files pass, TypeScript passes, and all six production bundles build. The new worker integration additionally covers expired-game resume opening the result manager and completed games allowing Random Explorer. The browser preview verified disabled launch controls with a working install/update link when the bridge is absent and no horizontal overflow. No live installed-extension launch is claimed.

### Chrome verification of v0.3.11

After the user completed the private website sign-in in their existing Chrome profile, the official Play page reported “geoplonk 0.3.11 is connected”. Check again re-established that connection. A saved game was detected, fresh setup was hidden and Random Explorer was disabled. Resume opened the extension's game-manager tab; Manage saved game reused that tab instead of creating a duplicate, verified through Chrome's tab inventory. The extension page itself was not inspected through a blocked origin or another surface. Fresh-game and Explorer launch checks are pending the user finishing/discarding the saved game. The website's generic resume-success wording may imply a panorama window even when the game manager opens; revise it to cover both destinations.

### Continued live Chrome checks

The user cleared the previous saved game. In their existing Chrome profile, the website's Open Random Explorer opened a real Maps popup with a native Street View application and the neutral geoplonk title. Next place changed the public panorama URL and loaded another Street View scene; the extension's Close control removed that popup.

The website then started a one-round untimed Move game. Its owned Maps popup loaded native Street View; the website switched back to saved-game controls and disabled Explorer. Face North changed the displayed compass to N / 0° and the public camera URL to yaw 0. One Zoom In changed native FOV from 90 to 63.5. Two ArrowUp movements produced distinct public panorama IDs. The first Undo returned to the first moved-to panorama and left Undo enabled; the second returned to the original panorama and correctly disabled Undo at the start. These are real Chrome checks, not a simulated fixture. The test round is left open and no guess was submitted.

Only native Maps content and the content script's top-level controls were inspected. The protected extension page and embedded extension guessing-map frame were not inspected via another surface, so guess submission/results are not claimed as live-tested. A camera-restoration detail remains: after north-facing movement and Undo, the starting view returned at FOV 90 rather than the previously zoomed FOV 63.5. The public-URL parser currently expects an explicit heading component, while Maps omits it for north; investigate preserving FOV/pitch for omitted URL components in a subsequent fix.


## v0.3.12 — embedded map startup

The user reported a completely blank guessing-map frame in the live Chrome test. The outer iframe exists, but the regular Maps console returned no captured errors. This does not establish a confirmed root cause. The manifest previously exposed game.html without explicitly exposing its generated assets. The update exposes packaged assets only on the two supported Maps origins, uses relative Vite asset paths, and checks the generated HTML plus bundled JavaScript/CSS against the packaged manifest after every build.

The frame now has a static loading message, a dynamic-import bootstrap failure message, and a React error boundary. The parent dock has a 12-second startup watchdog and a Retry map action that reloads only the guessing frame. Startup health is accepted only from the iframe window, its expected origin and a fresh per-load token; no locations or game state cross this channel. Tests cover rejected foreign/stale messages, timeout, retry, ready/error handling and timer cleanup.

89 automated tests pass. TypeScript and all six production bundles pass; the embedded asset packaging check passes. Live verification of the updated extension and actual tile rendering remains pending a Chrome extension reload. The existing test game is saved locally; no score was submitted.

## v0.3.13 — end-of-game round summary

Completing a game now opens a summary instead of leaving the last-round result on screen. It lists every round's location, distance, elapsed time, status and score, alongside the total and a selectable map review. Missing guesses and unavailable elapsed times show a dash. The saved completed game can be reviewed from the manager until a new game replaces it. The floating Maps scoreboard/brand hide on completion so they do not cover the summary. Play again retains the completed game's duration and round count.

92 automated tests pass, TypeScript and all production bundles build, and the embedded asset check passes. New component tests cover all rows/totals, guessed/expired/skipped rounds, missing times, switching the read-only map review, one-round totals and busy restart blocking. Layout coverage checks that completion styling resets for a new game.

A separate local Chrome preview was played through two rounds: one guess submitted, one skipped. Completion automatically displayed both results and the correct total; selecting the second round updated the map review. Reloading the preview retained the completed results. The embedded summary layout was visually checked with Google attribution visible. This used separate preview storage and simulated Street View, not the installed game's saved data. Live installed-extension verification requires reloading the updated extension.

## v0.3.14 — public Cloudflare Pages hosting

The canonical website bridge origin and declarative content-script match now use exactly https://geoplonk.pages.dev. HTTP, subdomains, unrelated pages.dev sites and the legacy preview origin are rejected. A manifest/worker contract test prevents origin drift. Public website output is assembled from an explicit file list into website/public-dist, excluding Sites state, Git metadata and earlier downloads; only the current extension/source ZIPs are included. Generated download hashes and sizes are checked before assembly. ZIP metadata is fixed, so repeated builds from unchanged sources produce identical archives.

93 automated tests pass. TypeScript, all production bundles, embedded-asset access and the public-site assembly pass locally. The public build rewrites download links and required extension-version help from release metadata. Cloudflare is configured for GitHub main, npm run build:website, website/public-dist and Node 24. Production deployment and live public checks are recorded after they complete.

The first Cloudflare build failed during npm ci because Vitest 5.0.4 referenced an unavailable @jridgewell/trace-mapping 0.3.81 tarball. Vitest 5.0.5 uses the published 0.3.31 dependency. The lockfile was regenerated in a fresh directory from the public npm registry, then verified with a fresh npm ci (no shared node_modules), 93 tests, all production bundles and the complete public-site build. No dependency override is needed.

Cloudflare production deployment c9abd54 completed successfully at https://geoplonk.pages.dev. The public homepage, versioned download links and Play route were verified in the user's Chrome. The downloaded Chrome ZIP is intact, reports v0.3.14, matches the published release.json SHA-256 and restricts its website bridge to the exact public origin. After extension reload, Check again confirmed “geoplonk 0.3.14 is connected”. An initial page/isolated-script discovery race was then reproduced and fixed with bounded retries of STATUS only; launches are never retried. The regression test verifies delayed extension discovery, enabled setup, no launch and retry cleanup. The updated suite has 94 passing tests and the full public build passes.
