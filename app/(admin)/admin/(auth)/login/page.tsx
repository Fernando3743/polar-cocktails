"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { PolarLogo } from "@/components/icons";
import { Alert } from "@/components/ui/Alert";

export default function AdminLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const hasEnv = hasSupabaseEnv();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!hasEnv) {
      setError(
        "La base de datos no está configurada. Define las variables de entorno de Supabase.",
      );
      return;
    }

    setSubmitting(true);
    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        setError("Correo o contraseña incorrectos.");
        setSubmitting(false);
        return;
      }

      // Full navigation so middleware/layout pick up the refreshed session.
      router.replace("/admin");
      router.refresh();
    } catch {
      setError("No pudimos iniciar sesión. Inténtalo de nuevo.");
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-5 py-12">
      <div className="glass-card w-full max-w-[400px] p-8">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <PolarLogo className="h-14 w-14 text-polar-text" />
          <div>
            <h1 className="font-display text-2xl font-700 text-polar-text">
              Panel de administración
            </h1>
            <p className="mt-1 text-sm text-polar-muted">
              Inicia sesión para gestionar el catálogo y los pedidos.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="email"
              className="text-sm font-600 text-polar-text"
            >
              Correo
            </label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="correo@ejemplo.com"
              className="input-polar"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="password"
              className="text-sm font-600 text-polar-text"
            >
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="input-polar"
            />
          </div>

          {error && <Alert tone="error">{error}</Alert>}

          <button
            type="submit"
            disabled={submitting}
            className="btn-brand h-12 w-full text-base disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Entrando..." : "Iniciar sesión"}
          </button>
        </form>

        <Link
          href="/"
          className="mt-6 block text-center text-xs text-polar-dim transition-colors hover:text-polar-text"
        >
          Volver a la tienda
        </Link>
      </div>
    </div>
  );
}
