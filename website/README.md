# geoplonk landing page

The standalone, dependency-free website lives in `geoplonk/dist`. It is separate from the extension's Vite entry points and production extension bundle.

The private Sites preview is https://geoplonk-explore.maplefrost11.chatgpt.site. Its persisted project identity is in `geoplonk/.openai/hosting.json`; reuse it for updates. Deployment source is tracked by the nested Sites repository. No credentials are stored here.

## Refresh downloads

From the project root:

```sh
npm run check
python scripts/package-downloads.py
```

The packaging script writes versioned Chrome and source ZIPs plus `release.json` into `geoplonk/dist`. The Chrome ZIP extracts to a `geoplonk` folder containing `manifest.json`, ready for Chrome's Load unpacked option. Source packaging uses an explicit allowlist, excluding Git metadata, hosting credentials, node_modules and browser/runtime state. If the version changes, update the version text and download URLs in `index.html` as well.

## Preview

```sh
python -m http.server 4174 --bind 127.0.0.1 --directory website/geoplonk/dist
```

The page uses local SVG illustrations, CSS and JavaScript, with no external fonts, analytics, forms, API calls or third-party assets. The hero is labelled as an illustration, not a live game screenshot.

## Verification

Desktop (1365px) and mobile (390px) DOM layout checks found no horizontal overflow or missing images. Browser testing checked navigation to installation instructions and clipboard copying. An actual browser download was verified as an intact ZIP with the same SHA-256 as release.json and the expected extension manifest version. The extension's 80 tests and all production bundles passed before packaging. Sites deployment returned succeeded; its audience remains private.

## Play hub

`play.html`, `play.css` and `play.js` provide the game launcher. This page requires extension v0.3.11 or later in the same Chrome profile. It does not embed the extension game page or Google Maps; the updated extension opens its own popup. Starts are explicit button actions and use the existing game engine. A narrow isolated content script on this exact website handles connection and launch messages. Local/in-app previews show the not-connected state; real installed detection requires Chrome on the official origin.

## Public Cloudflare Pages build

The GitHub repository builds a separate, explicit public output without the nested Sites repository or hosting metadata:

```sh
npm ci
npm run build:website
```

Cloudflare Pages settings: repository `jorsetin/geoplonk`, production branch `main`, repository root `/`, framework preset None, build command `npm run build:website`, build output directory `website/public-dist`, environment variable `NODE_VERSION=24`. Dependency installation is handled by Pages. The build runs the tests, builds the extension, generates versioned downloads and validates their hashes. No Workers/Functions, database, secret variables or paid services are required for the current static site.

The extension accepts only its explicitly configured website origin. When the public project address is assigned, update `WEBSITE_ORIGIN` in `src/website/protocol.ts` and the website content-script match in `public/manifest.json`, bump the extension version and rebuild before publishing the download. Do not allow arbitrary pages.dev subdomains or preview branches to launch games. A custom domain needs the same explicit update.
