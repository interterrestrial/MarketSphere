/**
 * Restricted preload bridge.
 *
 * This file is the only bridge between the page and the main process, and it
 * is deliberately tiny. The renderer gets a frozen object with a handful of
 * read-only values plus one URL-opening function — never `ipcRenderer`, never
 * `require`, never an arbitrary channel. Anything reachable from this object
 * is reachable by any script that runs in the page, so the surface is kept as
 * small as the application can tolerate.
 *
 * `contextIsolation` is on, so the page sees only what is passed to
 * `exposeInMainWorld` and cannot reach Node, Electron, or this file's scope.
 */

"use strict";

const { contextBridge, shell } = require("electron");
const { isBlockedUrl, sanitizeExternalUrl } = require("./lib/navigation-policy");

/**
 * Open a link in the user's default browser.
 *
 * Validated twice on purpose: once here, and again in the main process. The
 * page must not be able to hand an arbitrary string to the operating system
 * even if it reaches this function.
 */
function openExternal(rawUrl) {
  if (typeof rawUrl !== "string") return false;
  if (isBlockedUrl(rawUrl)) return false;
  const safe = sanitizeExternalUrl(rawUrl);
  if (!safe) return false;
  void shell.openExternal(safe);
  return true;
}

const desktop = Object.freeze({
  /** Lets the UI adapt copy and layout to the host platform. */
  platform: process.platform,
  /** Distinguishes the desktop shell from the browser build. */
  isDesktop: true,
  versions: Object.freeze({
    electron: process.versions.electron ?? null,
    chrome: process.versions.chrome ?? null,
    node: process.versions.node ?? null,
  }),
  openExternal,
});

contextBridge.exposeInMainWorld("marketsphereDesktop", desktop);
