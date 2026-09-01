"use client";

import { useEffect } from "react";
import { captureError } from "@/lib/observe";

// Catches errors that never reach a React error boundary: rejected promises,
// event-handler throws, and errors in third-party scripts.
export function ErrorReporter() {
  useEffect(() => {
    const onError = (e: ErrorEvent) => {
      captureError(e.error ?? e.message, { where: "window.onerror", extra: { filename: e.filename, line: e.lineno } });
    };
    const onRejection = (e: PromiseRejectionEvent) => {
      captureError(e.reason, { where: "unhandledrejection" });
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}
