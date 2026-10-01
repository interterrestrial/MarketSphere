/**
 * Minimal leveled logger shared by the Express API (and usable from Next.js).
 *
 * Deliberately dependency-free: emits single-line, timestamped messages to
 * stdout/stderr. `LOG_LEVEL` selects verbosity: debug < info < warn < error.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

const ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function configuredLevel(): LogLevel {
  const raw = (process.env["LOG_LEVEL"] ?? "info").toLowerCase();
  if (raw === "debug" || raw === "info" || raw === "warn" || raw === "error") {
    return raw;
  }
  return "info";
}

function emit(level: LogLevel, message: string): void {
  if (ORDER[level] < ORDER[configuredLevel()]) return;
  const line = `${new Date().toISOString()} [${level.toUpperCase()}] ${message}`;
  if (level === "warn" || level === "error") {
    process.stderr.write(line + "\n");
  } else {
    process.stdout.write(line + "\n");
  }
}

export const logger = {
  debug: (message: string) => emit("debug", message),
  info: (message: string) => emit("info", message),
  warn: (message: string) => emit("warn", message),
  error: (message: string) => emit("error", message),
};
