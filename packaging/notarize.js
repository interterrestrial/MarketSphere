/**
 * macOS notarization hook for electron-builder.
 *
 * Runs after signing. Without Apple credentials there is nothing to submit, so
 * the step is skipped loudly rather than failing the build — an unsigned local
 * .dmg is still useful for testing, while a release build should never ship
 * unsigned by accident. Set CI=true (or provide the variables) to make a
 * missing credential an error instead.
 *
 * Required for notarization:
 *   APPLE_ID            Apple account email
 *   APPLE_APP_SPECIFIC_PASSWORD   app-specific password (not the account one)
 *   APPLE_TEAM_ID        10-character developer team id
 */
const { notarize } = require("@electron/notarize");

module.exports = async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context;
  if (electronPlatformName !== "darwin") return;

  const appName = context.packager.appInfo.productFilename;
  const appPath = `${appOutDir}/${appName}.app`;

  const appleId = process.env.APPLE_ID;
  const appleIdPassword = process.env.APPLE_APP_SPECIFIC_PASSWORD;
  const teamId = process.env.APPLE_TEAM_ID;

  if (!appleId || !appleIdPassword || !teamId) {
    const message =
      "Skipping notarization: APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD and APPLE_TEAM_ID are not all set.";
    if (process.env.CI) throw new Error(message);
    console.warn(`[notarize] ${message} The build is unsigned and NOT distributable.`);
    return;
  }

  console.log(`[notarize] Submitting ${appPath} to Apple…`);
  await notarize({ tool: "notarytool", appPath, appleId, appleIdPassword, teamId });
  console.log("[notarize] Accepted and stapled.");
};
