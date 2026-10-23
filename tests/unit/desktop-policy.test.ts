import { describe, expect, it } from "vitest";
import policy from "../../electron/lib/navigation-policy";

const { DEFAULT_APP_URL, DEV_APP_URL, appOrigin, isAppUrl, isBlockedUrl, sanitizeExternalUrl } =
  policy;

/**
 * The desktop shell is a window onto the web app, so these rules are the whole
 * security model: which URLs may render, which go to the system browser, and
 * which are refused outright. They are unit-tested here rather than only being
 * exercised by hand, because a regression in any one of them is a navigation
 * or credential-theft hole.
 */
describe("application origin", () => {
  it("defaults to the deployed web app and the local dev server", () => {
    expect(appOrigin(DEFAULT_APP_URL)).toBe("https://market-sphere-one.vercel.app");
    expect(appOrigin(DEV_APP_URL)).toBe("http://localhost:3000");
  });

  it("normalises the configured value to a bare origin", () => {
    expect(appOrigin("https://app.example.com/some/path?x=1")).toBe("https://app.example.com");
    expect(appOrigin("https://app.example.com:8443/")).toBe("https://app.example.com:8443");
  });

  it("returns null for values that are not URLs", () => {
    for (const value of ["", "not a url", "://missing-scheme", undefined, null, 42]) {
      expect(appOrigin(value as string)).toBeNull();
    }
  });
});

describe("isAppUrl", () => {
  const origin = "https://market-sphere-one.vercel.app";

  it("accepts the application itself", () => {
    expect(isAppUrl(origin, origin)).toBe(true);
    expect(isAppUrl(`${origin}/`, origin)).toBe(true);
    expect(isAppUrl(`${origin}/buyer/requests?page=2`, origin)).toBe(true);
    expect(isAppUrl(`${origin}#section`, origin)).toBe(true);
  });

  it("rejects a look-alike host that merely starts with the app origin", () => {
    // A prefix comparison would let all of these through.
    expect(isAppUrl("https://market-sphere-one.vercel.app.evil.example", origin)).toBe(false);
    expect(isAppUrl("https://evil-market-sphere-one.vercel.app", origin)).toBe(false);
    expect(isAppUrl("https://market-sphere-oneXvercelYapp", origin)).toBe(false);
  });

  it("rejects a different scheme, port or host", () => {
    expect(isAppUrl("http://market-sphere-one.vercel.app", origin)).toBe(false);
    expect(isAppUrl("https://market-sphere-one.vercel.app:8443", origin)).toBe(false);
    expect(isAppUrl("https://localhost:3000", origin)).toBe(false);
  });

  it("rejects unparseable and non-web schemes", () => {
    expect(isAppUrl("javascript:alert(1)", origin)).toBe(false);
    expect(isAppUrl("data:text/html,<script>alert(1)</script>", origin)).toBe(false);
    expect(isAppUrl("file:///etc/passwd", origin)).toBe(false);
    expect(isAppUrl("", origin)).toBe(false);
  });
});

describe("sanitizeExternalUrl", () => {
  it("passes ordinary web links through", () => {
    expect(sanitizeExternalUrl("https://example.com/docs")).toBe("https://example.com/docs");
    expect(sanitizeExternalUrl("http://example.com")).toBe("http://example.com/");
  });

  it("refuses every non-web scheme", () => {
    const hostile = [
      "javascript:alert(document.cookie)",
      "data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==",
      "file:///etc/passwd",
      "file:///Users/me/.ssh/id_rsa",
      "blob:https://example.com/1234",
      "about:blank",
      "vbscript:msgbox(1)",
    ];
    for (const url of hostile) {
      expect(sanitizeExternalUrl(url), `${url} must be refused`).toBeNull();
    }
  });

  it("refuses values that are not URLs at all", () => {
    for (const value of ["", "example.com", "not a url", "http://"]) {
      expect(sanitizeExternalUrl(value)).toBeNull();
    }
  });

  it("strips embedded credentials so a phishing link cannot be forwarded", () => {
    expect(sanitizeExternalUrl("https://user:secret@evil.example/login")).toBe(
      "https://evil.example/login"
    );
    expect(sanitizeExternalUrl("https://admin@evil.example/")).toBe("https://evil.example/");
  });

  it("keeps the path and query of a legitimate link intact", () => {
    expect(sanitizeExternalUrl("https://example.com/a/b?utm=1&x=2")).toBe(
      "https://example.com/a/b?utm=1&x=2"
    );
  });
});

describe("isBlockedUrl", () => {
  it("allows web URLs and blocks everything else", () => {
    expect(isBlockedUrl("https://example.com")).toBe(false);
    expect(isBlockedUrl("http://localhost:3000")).toBe(false);

    for (const url of [
      "javascript:alert(1)",
      "data:text/html,<h1>x</h1>",
      "file:///etc/passwd",
      "chrome://settings",
      "devtools://devtools/bundled/inspector.html",
      "not a url",
      "",
    ]) {
      expect(isBlockedUrl(url), `${url} must be blocked`).toBe(true);
    }
  });
});
