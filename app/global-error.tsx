"use client"

import Link from "next/link";

export default function GlobalError() {
  return (
    <html lang="en">
      <body style={{
        margin: 0,
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#0c0a09",
        color: "#e7e5e4",
        fontFamily: "monospace"
      }}>
        <div style={{ textAlign: "center", padding: "2rem" }}>
          <h2 style={{ fontSize: "1.25rem", color: "#f87171", marginBottom: "1rem" }}>
            [System Error: Exception Unhandled]
          </h2>
          <p style={{ fontSize: "0.875rem", color: "#a8a29e", marginBottom: "1.5rem" }}>
            An unexpected error occurred in the LaunchGrid application runtime.
          </p>
          <Link
            href="/"
            style={{
              display: "inline-block",
              padding: "0.5rem 1rem",
              backgroundColor: "#1c1917",
              color: "#e7e5e4",
              border: "1px solid #44403c",
              borderRadius: "0.25rem",
              textDecoration: "none",
              fontSize: "0.875rem",
              fontFamily: "monospace"
            }}
          >
            Restart Session
          </Link>
        </div>
      </body>
    </html>
  );
}
