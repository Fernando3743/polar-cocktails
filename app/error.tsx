"use client";

import { useEffect } from "react";

export default function Error({
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
    <main className="container-polar flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <h1 className="font-display text-4xl font-bold text-polar-text">
        Algo salió mal
      </h1>
      <p className="text-polar-muted">
        Ocurrió un error inesperado. Vuelve a intentarlo en un momento.
      </p>
      <button type="button" onClick={reset} className="btn-brand mt-2">
        Reintentar
      </button>
    </main>
  );
}
