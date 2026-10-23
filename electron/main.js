/**
 * MarketSphere desktop shell — main process.
 *
 * This is a window onto the deployed web application, not a second copy of it.
 * The renderer therefore has no database credentials, no server code, and no
 * Node access: it loads the same HTTPS origin a browser would, and the
 * session cookie behaves identically.
 *
 * Hardening applied here (see docs/Desktop-App.md for the reasoning):
 *   - contextIsolation on, nodeIntegration off, sandbox on
 *   - navigation confined to the application origin
 *   - popups denied; external links handed to the system browser
 *   - non-web schemes refused outright
 *   - camera/microphone/geolocation denied, notifications kept (in-app alerts)
 *   - webviews refused, remote module never enabled
 */

"use strict";

const { app, BrowserWindow, Menu, dialog, shell } = require("electron");
const {
  DEFAULT_APP_URL,
  DEV_APP_URL,
  appOrigin,
  isAppUrl,
  isBlockedUrl,
  sanitizeExternalUrl,
} = require("./lib/navigation-policy");

const isDev = !app.isPackaged || process.env.MARKETSPHERE_DEV === "1";

/**
 * The origin the shell is allowed to display. In a packaged build this must be
 * the deployed web application; pointing a release at localhost would ship a
 * useless app, so the build fails loudly instead.
 */
function resolveAppUrl() {
  const fromEnv = process.env.MARKETSPHERE_APP_URL;
  const candidate = fromEnv || (isDev ? DEV_APP_URL : DEFAULT_APP_URL);
  if (!isDev && !appOrigin(candidate)) {
    throw new Error(
      `[electron] MARKETSPHERE_APP_URL is not a valid URL: "${candidate}". ` +
        "Refusing to start the desktop app without a usable application origin."
    );
  }
  return candidate;
}

let mainWindow = null;

/**
 * The bundled preload, falling back to the source file.
 *
 * The bundled build inlines the policy module, which a sandboxed preload
 * cannot require itself. The fallback keeps `electron .` working before the
 * first bundle has been produced.
 */
function resolvePreload() {
  try {
    return require.resolve("./dist/preload.js");
  } catch {
    return require.resolve("./preload.js");
  }
}

function createWindow() {
  const target = resolveAppUrl();

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 960,
    minHeight: 640,
    show: false,
    title: "MarketSphere",
    backgroundColor: "#f6f7f9",
    titleBarStyle: "hiddenInset",
    webPreferences: {
      // The three settings that matter. Context isolation keeps the preload's
      // world separate from the page; disabling node integration removes the
      // page's access to require/electron entirely; the sandbox restricts what
      // the preload itself can reach.
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      experimentalFeatures: false,
      webviewTag: false,
      spellcheck: false,
      // Points at the bundled preload (electron/dist/preload.js): a sandboxed
      // preload cannot require relative modules, so tools/build-preload.mjs
      // inlines them. Fall back to the source file so `electron .` still works
      // before the first bundle has been produced.
      preload: resolvePreload(),
    },
  });

  // Paint only once the first frame is ready, so users never see a white flash.
  mainWindow.once("ready-to-show", () => mainWindow?.show());

  const origin = appOrigin(target);

  // Any attempt to navigate the shell away from the application is blocked;
  // external destinations open in the user's real browser instead.
  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (isAppUrl(url, origin)) return;
    event.preventDefault();
    openExternally(url);
  });

  // Same-origin redirects (e.g. login -> dashboard) are allowed; everything
  // else is refused rather than followed.
  mainWindow.webContents.on("will-redirect", (event, url) => {
    if (!isAppUrl(url, origin)) {
      event.preventDefault();
      openExternally(url);
    }
  });

  // No popups. External targets go to the system browser.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    openExternally(url);
    return { action: "deny" };
  });

  // The renderer has no use for a webview, and allowing one would hand it a
  // way to load arbitrary local content.
  mainWindow.webContents.on("will-attach-webview", (event) => {
    event.preventDefault();
  });

  // Least privilege: deny anything the marketplace does not use. Notifications
  // stay available because the order workflow depends on in-app alerts.
  const allowedPermissions = new Set(["notifications"]);
  mainWindow.webContents.session.setPermissionRequestHandler((_wc, permission, callback) => {
    callback(allowedPermissions.has(permission));
  });
  mainWindow.webContents.session.setPermissionCheckHandler((_wc, permission) =>
    allowedPermissions.has(permission)
  );

  // TLS problems stay fatal. Ignoring them would make every certificate
  // warning invisible to the user, which is exactly the wrong trade for an app
  // that carries marketplace sessions.
  mainWindow.webContents.session.setCertificateVerifyProc((request, callback) => {
    // Electron's callback takes Chromium's numeric net error code: 0 accepts
    // the certificate and -2 rejects it. Passing a boolean causes a native
    // argument-conversion exception in packaged builds.
    callback(request.errorCode === 0 ? 0 : -2);
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  mainWindow.loadURL(target);
}

/** Hand a URL to the operating system, after validating it. */
function openExternally(url) {
  const safe = sanitizeExternalUrl(url);
  if (!safe) return;
  void shell.openExternal(safe);
}

function buildMenu() {
  const template = [
    ...(process.platform === "darwin" ? [{ role: "appMenu" }] : []),
    {
      label: "File",
      submenu: [
        {
          label: "Reload",
          accelerator: "CmdOrCtrl+R",
          // A reload is a development affordance; a release app refreshes via
          // the window controls instead.
          enabled: isDev,
          click: () => mainWindow?.reload(),
        },
        { type: "separator" },
        process.platform === "darwin" ? { role: "close" } : { role: "quit" },
      ],
    },
    { role: "editMenu" },
    {
      label: "View",
      submenu: [
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
        // Developer tools would let anyone signed in inspect the session and
        // the API surface, so they stay off outside development.
        ...(isDev ? [{ role: "toggleDevTools" }] : []),
      ],
    },
    { role: "windowMenu" },
    {
      role: "help",
      submenu: [
        {
          label: "MarketSphere on the Web",
          click: () => openExternally(resolveAppUrl()),
        },
        {
          label: "About MarketSphere",
          click: () => {
            void dialog.showMessageBox({
              type: "about",
              title: "MarketSphere",
              message: `MarketSphere ${app.getVersion()}`,
              detail: `B2B marketplace for home textiles. Desktop shell for ${resolveAppUrl()}.`,
            });
          },
        },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// A second instance would fight over the same session cookie state; focus the
// existing window instead.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });

  app.whenReady().then(() => {
    buildMenu();
    createWindow();

    app.on("activate", () => {
      // macOS keeps the app running with no windows; clicking the dock icon
      // should reopen the marketplace rather than do nothing.
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });

  // Backstop applied to every renderer, including any the app might create in
  // future: a non-web scheme must never reach a window, whatever opened it.
  app.on("web-contents-created", (_event, contents) => {
    contents.on("will-navigate", (event, url) => {
      if (isBlockedUrl(url)) event.preventDefault();
    });
  });
}
