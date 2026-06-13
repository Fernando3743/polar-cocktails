import Link from "next/link";

export default function NotFound() {
  return (
    <main className="container-polar flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <h1 className="font-display text-4xl font-bold text-polar-text">
        Página no encontrada
      </h1>
      <p className="text-polar-muted">La página que buscas no existe.</p>
      <Link href="/" className="btn-brand mt-2">
        Volver al inicio
      </Link>
    </main>
  );
}
