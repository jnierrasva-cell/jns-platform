"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error("[global]", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
          background: "#fafafa",
          color: "#18181b",
        }}
      >
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <div
            style={{
              maxWidth: 420,
              width: "100%",
              textAlign: "center",
              background: "#fff",
              border: "1px solid #e4e4e7",
              borderRadius: 16,
              padding: 32,
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: 11,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "#a1a1aa",
              }}
            >
              JNS
            </p>
            <h1 style={{ margin: "8px 0 0", fontSize: 20 }}>
              Something went wrong
            </h1>
            <p style={{ margin: "12px 0 0", fontSize: 14, color: "#71717a" }}>
              The app failed to render. Try again, or refresh the page.
            </p>
            <button
              type="button"
              onClick={retry}
              style={{
                marginTop: 24,
                border: "none",
                borderRadius: 8,
                background: "#0B132B",
                color: "#fff",
                padding: "10px 16px",
                fontSize: 14,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
