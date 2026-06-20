"use client";

import { useEffect } from "react";

/**
 * Last-resort error boundary (task #6, TASKS.md) — catches errors thrown by
 * app/layout.tsx itself, which app/error.tsx cannot (a segment's error.tsx
 * never catches errors from that same segment's layout — only from its
 * page/children). This is a real path here, not just defensive boilerplate:
 * layout.tsx imports "@/lib/env", which throws on startup if required env
 * vars are missing/invalid, so a bad deploy config lands here.
 *
 * Must render its own <html>/<body> — the real root layout isn't mounted
 * when this is shown, so there's no font-variable/ThemeProvider context to
 * rely on. Kept intentionally plain/inline-styled for that reason.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Fatal error in apps/web root layout:", error);
  }, [error]);

  return (
    <html lang="th">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#eef2f6",
          fontFamily: "system-ui, sans-serif",
          padding: "1.5rem",
        }}
      >
        <div style={{ textAlign: "center", maxWidth: 360 }}>
          <p style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.5rem" }}>
            แอปเริ่มต้นไม่สำเร็จ
          </p>
          <p style={{ fontSize: "0.875rem", color: "#555", marginBottom: "1.25rem" }}>
            กรุณาติดต่อผู้ดูแลระบบ หรือลองโหลดหน้านี้ใหม่
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              border: "2px solid #16202b",
              borderRadius: 8,
              padding: "0.5rem 1.25rem",
              background: "#ffd21e",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            ลองใหม่
          </button>
        </div>
      </body>
    </html>
  );
}
