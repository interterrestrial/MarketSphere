import type { Config } from "tailwindcss";

/**
 * Tailwind theme wired to the Design.md tokens (light business-tool theme).
 * Utilities: bg-background, bg-surface, text-muted, border-subtle,
 * text-primary, text-on-primary, font-heading, font-mono, …
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "var(--color-bg)",
        surface: "var(--color-surface)",
        muted: "var(--color-text-muted)",
        subtle: "var(--color-border)",
        primary: "var(--color-primary)",
        "primary-strong": "var(--color-primary-strong)",
        "on-primary": "var(--color-on-primary)",
        body: "var(--color-text)",
        secondary: "var(--color-text-secondary)",
        success: "var(--color-success)",
        warning: "var(--color-warning)",
        danger: "var(--color-danger)",
        info: "var(--color-info)",
        "success-soft": "var(--color-success-soft)",
        "warning-soft": "var(--color-warning-soft)",
        "danger-soft": "var(--color-danger-soft)",
        "info-soft": "var(--color-info-soft)",
        "neutral-soft": "var(--color-neutral-soft)",
      },
      fontFamily: {
        heading: ["var(--font-heading)"],
        sans: ["var(--font-body)"],
        mono: ["var(--font-mono)"],
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
      },
      boxShadow: {
        panel: "var(--shadow-panel)",
      },
    },
  },
  plugins: [],
};

export default config;
