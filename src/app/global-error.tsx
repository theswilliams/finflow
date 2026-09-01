"use client";

import { useEffect } from "react";
import { captureError } from "@/lib/observe";

// Catches errors thrown while rendering the root layout. Must ship its own
// <html>/<body>. Intentionally dependency-free so it can't fail the same way.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    captureError(error, { where: "global-error", extra: { digest: error.digest } });
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          background: "#0f0f10",
          color: "#e8e8e8",
          margin: 0,
          padding: "2rem",
        }}
      >
        <div style={{ maxWidth: 380, textAlign: "center" }}>
          <p style={{ fontSize: 15, fontWeight: 600 }}>Something went wrong</p>
          <p style={{ fontSize: 13, color: "#9a9a9a", marginTop: 6 }}>
            FinFlow hit an unexpected error. Your data is safe.
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: 20,
              padding: "8px 16px",
              borderRadius: 8,
              border: "1px solid #333",
              background: "#e8e8e8",
              color: "#111",
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
