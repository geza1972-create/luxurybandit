"use client";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html>
      <body style={{ display: "flex", minHeight: "100dvh", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1rem", padding: "2rem", textAlign: "center", fontFamily: "sans-serif" }}>
        <p style={{ fontSize: "0.875rem", color: "#888" }}>Something went wrong.</p>
        <button type="button" onClick={reset}
          style={{ borderRadius: "9999px", background: "#000", color: "#fff", padding: "0.5rem 1.25rem", fontSize: "0.875rem", fontWeight: 900, border: "none", cursor: "pointer" }}>
          Try again
        </button>
      </body>
    </html>
  );
}
