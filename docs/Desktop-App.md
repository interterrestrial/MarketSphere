# MarketSphere — Desktop Application (Phase 11)

The macOS desktop app: what it is, how it is secured, how to build and sign
it, and what it deliberately does not do.

---

## 1. What the desktop app is

A **thin, hardened window onto the deployed web application.**

It is not a second copy of MarketSphere. The renderer loads the same HTTPS
origin a browser would, and the session cookie behaves identically — a user
signs in once on the web and the desktop app is already authenticated.

```
┌──────────────────────┐        https://market-sphere-one.vercel.app
│  MarketSphere.app    │  ─────────────────────────────►  Vercel / Next.js
│  (Electron shell)    │                                    │
│                      │                                    ▼
│  main.js             │                                  Neon
│  preload.js (bundle) │                              (the only DB holder)
│  navigation-policy   │
└──────────────────────┘
```

### Why it is not a bundled copy of the app

Two constraints from the phase brief drove this:

- **Reuse the existing frontend.** Loading the deployed origin means desktop
  users get every web improvement immediately, with no second release train.
- **Keep database access on the server.** Nothing in the bundle holds a
  database credential. The app has no Prisma client, no server code, and no
  `.env` — verified mechanically by `scripts/verify-desktop-build.sh`.

A bundled copy would have needed its own database access, or a local server
holding production credentials on every user's disk. That is the opposite of
what the brief asked for.

**The trade-off, stated plainly:** the app requires an internet connection and
does not work offline. That is the correct trade for a B2B marketplace whose
data is inherently server-side, but it is a real limitation, not an oversight.

---

## 2. Security model

The threat is a signed-in user's desktop being compromised, or the app being
turned into a browser that leaks the session to a hostile page.

| Control | Setting | Why |
| :--- | :--- | :--- |
| Context isolation | `contextIsolation: true` | The page cannot reach the preload's scope |
| Node integration | `nodeIntegration: false` | No `require` in the page |
| Sandbox | `sandbox: true` | The preload runs OS-sandboxed |
| Web security | `webSecurity: true` | Same-origin policy enforced |
| Webviews | `webviewTag: false` | No route to load local content |
| Insecure content | `allowRunningInsecureContent: false` | No mixed content |
| Preload surface | One frozen object, 4 keys | Anything exposed is reachable by page scripts |
| TLS | Certificate errors are fatal | A MITM must never be silent |

### The navigation policy

All URL decisions live in `electron/lib/navigation-policy.js`, which has no
Electron imports and is unit-tested directly:

- **Only the app origin may render.** Compared as a *parsed origin*, never a
  string prefix — a prefix check would accept
  `https://market-sphere-one.vercel.app.evil.example`.
- **Everything else opens in the system browser.** The app never navigates
  away from the marketplace.
- **Non-web schemes are refused outright.** `javascript:`, `data:`, `file:`,
  `blob:`, `about:`, `chrome://` and `devtools://` cannot reach a window.
- **Embedded credentials are stripped** before a URL is handed to the OS,
  because `https://user:pass@host` is a phishing primitive.
- **A malformed header is rejected, not ignored.** Treating an unparseable
  `Origin` as "no origin" would be a bypass.

### The preload bridge

```js
window.marketsphereDesktop = Object.freeze({
  platform,        // "darwin"
  isDesktop,       // true
  versions,        // { electron, chrome, node }
  openExternal,    // validated, twice
});
```

Nothing else. No `ipcRenderer`, no channels, no `require`.

### Verified in the real binary, not just in unit tests

The packaged app was launched against a local probe page that reported back
what the renderer could actually see:

```
bridgePresent: true
bridgeKeys:    ["platform", "isDesktop", "versions", "openExternal"]
frozen:        true
require:       absent      process:   absent
module:        absent      Buffer:    absent
ipcRenderer:   absent      electron:  absent
```

---

## 3. A bug worth recording

The first packaged build **silently had no preload bridge at all.**

A sandboxed preload runs in a restricted module loader that can resolve
`electron` and Node builtins but **not relative files**. So
`require("./lib/navigation-policy")` failed with
`module not found`, the preload aborted before calling `contextBridge`, and the
page simply had no bridge. The app still launched and looked fine; the tests
all passed, because they tested the policy module in isolation and never loaded
the preload.

The fix is `tools/build-preload.mjs`: esbuild bundles the preload so the
policy module is inlined, keeping both the sandbox and a single source of
truth. `electron/dist/preload.js` is generated and gitignored, and a unit test
now asserts the bundle exists and does not require relative paths.

---

## 4. Building

```bash
npm run electron:dev      # next dev + the shell, against localhost:3000
npm run electron:build    # both architectures -> release/*.dmg
npm run electron:pack     # unpacked app only (fast)
npm run electron:verify   # assert the bundle is safe
npm run electron:icon     # regenerate packaging/icon.icns
```

Output:

| File | Architecture |
| :--- | :--- |
| `release/MarketSphere-0.1.0-arm64.dmg` | Apple Silicon |
| `release/MarketSphere-0.1.0.dmg` | Intel |

> Architectures are built **one at a time on purpose**. Both disk images mount
> as `/Volumes/MarketSphere 0.1.0`, so parallel builds collide and one fails to
> detach the other's volume.

### What ships

Exactly five files, listed explicitly in `package.json` so an addition has to
be deliberate:

```
electron/main.js
electron/preload.js
electron/dist/preload.js          (bundled, generated)
electron/lib/navigation-policy.js
package.json
```

`node_modules` is excluded: the shell requires nothing but the Electron
runtime, and excluding it is what guarantees the server stack cannot leak into
the bundle.

---

## 5. Verification

```bash
npm run electron:verify
```

Asserts against the **built** app, not the source:

- the asar contains the five expected files and nothing else;
- no `DATABASE_URL`, `AUTH_SECRET`, `postgresql://`, `neon.tech`,
  `passwordHash`, `@prisma/client`, `bcryptjs` or storage secret anywhere in
  the archive;
- no `.env`, `.pem` or `.key` files;
- `CFBundleIdentifier`, `CFBundleName` and the category are correct;
- the signature is classified as Developer ID, ad-hoc, or unsigned.

Expected file lists are derived from the electron-builder config, so the
script cannot drift away from what is meant to ship.

---

## 6. Signing and notarization

**The college/demo build is intentionally unsigned.** It does not require an
Apple Developer account. macOS may block the first launch because the DMG was
downloaded from the internet; this is expected for any unsigned app:

1. Drag `MarketSphere.app` to `Applications`.
2. In Finder, Control-click (or right-click) the app and choose **Open**.
3. Confirm **Open** in the dialog. Future launches work normally.

Do not remove Gatekeeper globally with `xattr -dr` or by changing system
security settings. The one-time Finder approval is the safe path for a college
submission.

The build configuration sets `mac.identity` to `null`, so electron-builder
does not create an ad-hoc signature. It also disables hardened runtime and
notarization because those are useful only with a real Apple signing identity.

A public release with no first-launch warning needs:

| Variable | Purpose |
| :--- | :--- |
| `CSC_LINK` | Path to the `Developer ID Application` certificate (`.p12`) |
| `CSC_KEY_PASSWORD` | Password for that certificate |
| `APPLE_ID` | Apple account email |
| `APPLE_APP_SPECIFIC_PASSWORD` | App-specific password (not the account password) |
| `APPLE_TEAM_ID` | 10-character team id |

`packaging/notarize.js` runs after signing and submits to Apple's notary
service. With no credentials it **skips loudly** rather than failing quietly;
setting `CI=true` turns a missing credential into a hard error so a pipeline
can never publish an unsigned build by accident.

Requires a paid Apple Developer Program membership ($99/year). See
`packaging/entitlements.mac.plist` — deliberately minimal: network access and
JIT only, no camera, microphone, location, or file access.

### After signing, check

```bash
codesign -dv --verbose=4 release/mac-arm64/MarketSphere.app   # Developer ID + hardened runtime
spctl -a -vvv release/mac-arm64/MarketSphere.app             # accepted, source=Notarized Developer ID
```

---

## 7. Configuration

| Variable | Purpose |
| :--- | :--- |
| `MARKETSPHERE_APP_URL` | Origin to display. Defaults to the deployed app; `npm run electron:dev` uses `http://localhost:3000` |
| `MARKETSPHERE_DEV` | Set to `1` to enable reload and developer tools in a packaged app |

A packaged build pointed at an invalid URL **refuses to start** rather than
showing a blank window.

---

## 8. Known limitations

- **Unsigned demo build.** The first launch on another Mac requires the Finder
  right-click → **Open** approval described above.
- **Online only.** No offline mode, no local caching, no background sync.
- **No auto-update.** `.dmg` builds are manual downloads. `electron-updater`
  and a release feed are the obvious next step.
- **macOS only.** The build config targets `dmg`; Windows and Linux are
  unconfigured.
- **Minimum macOS 11.** Set by the Electron runtime, not a product decision.
- **No E2E automation.** The shell is covered by unit tests, a build verifier,
  and a manual probe. Playwright's Electron driver would close that gap.
- **Single origin.** The shell cannot be pointed at a second environment at
  runtime; changing `MARKETSPHERE_APP_URL` requires a rebuild.

---

## 9. Manual test checklist

- [ ] Sign in on the web, then open the app — already authenticated.
- [ ] A signed-in user can submit an order request and receive notifications.
- [ ] Clicking a supplier phone/email link opens the system browser, not the app.
- [ ] Navigation away from the app origin opens externally and the shell stays put.
- [ ] Camera/microphone/geolocation prompts never appear.
- [ ] `window.marketsphereDesktop` is defined; `window.require` is not.
- [ ] Developer Tools are unavailable in a packaged build.
- [ ] Sign out in the app; the session ends there.
- [ ] Drag the `.dmg` to Applications and launch from Finder.
