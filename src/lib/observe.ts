// ---------------------------------------------------------------------------
//  Single chokepoint for error reporting.
//
//  Today it emits a structured line that Vercel captures in function / build
//  logs (and that a log drain can forward). To send errors to Sentry instead,
//  run `npx @sentry/wizard@latest -i nextjs` and call `Sentry.captureException`
//  from the marked spot below — every call site already routes through here.
// ---------------------------------------------------------------------------

type Level = "error" | "warning";

export interface ErrorContext {
  where?: string;
  level?: Level;
  extra?: Record<string, unknown>;
}

export function captureError(error: unknown, context: ErrorContext = {}): void {
  const { where = "unknown", level = "error", extra } = context;
  const err = error instanceof Error ? error : new Error(String(error));

  const payload = {
    kind: "app-error",
    level,
    where,
    message: err.message,
    stack: err.stack,
    ...(extra ? { extra } : {}),
    ts: new Date().toISOString(),
    ...(typeof window !== "undefined" ? { url: window.location.href } : {}),
  };

  // --- Sentry hook: `if (globalThis.Sentry) globalThis.Sentry.captureException(err, { extra });` ---

  if (level === "warning") console.warn(JSON.stringify(payload));
  else console.error(JSON.stringify(payload));
}
