export default function Loading() {
  return (
    <main className="container-polar flex min-h-[60vh] flex-col items-center justify-center gap-4">
      <span
        className="h-10 w-10 animate-spin rounded-full border-2 border-polar-purple-light/25 border-t-polar-purple"
        aria-hidden="true"
      />
      <p className="text-sm text-polar-muted">Cargando…</p>
    </main>
  );
}
