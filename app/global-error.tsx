"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "16px",
          padding: "24px",
          textAlign: "center",
          background: "#040512",
          color: "#eeedef",
          fontFamily:
            "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
        }}
      >
        <h1 style={{ fontSize: "2rem", fontWeight: 700, margin: 0 }}>
          Algo salió mal
        </h1>
        <p style={{ color: "#9a93ab", margin: 0 }}>
          Ocurrió un error inesperado. Vuelve a intentarlo en un momento.
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            marginTop: "8px",
            height: "44px",
            padding: "0 22px",
            borderRadius: "9999px",
            border: "none",
            background: "linear-gradient(105deg, #9128da 0%, #7c1fc4 100%)",
            color: "#ffffff",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Reintentar
        </button>
      </body>
    </html>
  );
}
