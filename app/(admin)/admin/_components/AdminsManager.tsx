"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import {
  createAdmin,
  deleteAdmin,
  resetAdminPassword,
  type AdminListItem,
} from "@/lib/actions/admins";
import { createAdminSchema } from "@/lib/validation/schemas";

export function AdminsManager({
  initial,
  selfId,
  hasEnv,
}: {
  initial: AdminListItem[];
  selfId: string;
  hasEnv: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [resettingId, setResettingId] = useState<string | null>(null);

  // New-admin form state.
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");

  function run(
    action: () => Promise<{ ok: boolean; error?: string }>,
    okMessage: string,
    onOk?: () => void,
  ) {
    setError(null);
    setOk(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(result.error ?? "Ocurrió un error.");
        return;
      }
      setOk(okMessage);
      onOk?.();
      router.refresh();
    });
  }

  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsed = createAdminSchema.safeParse({
      email: newEmail,
      password: newPassword,
    });
    if (!parsed.success) {
      setOk(null);
      setError(parsed.error.issues[0]?.message ?? "Datos inválidos.");
      return;
    }
    run(() => createAdmin(parsed.data), "Administrador creado.", () => {
      setNewEmail("");
      setNewPassword("");
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-[rgba(226,69,122,0.4)] bg-[rgba(226,69,122,0.08)] px-4 py-3 text-sm text-[#f3a9c1]"
        >
          {error}
        </p>
      )}
      {ok && (
        <p
          role="status"
          className="rounded-xl border border-[rgba(63,181,138,0.4)] bg-[rgba(63,181,138,0.08)] px-4 py-3 text-sm text-[#8fe0bf]"
        >
          {ok}
        </p>
      )}

      <div className="glass-card overflow-hidden">
        {initial.length === 0 ? (
          <p className="px-5 py-8 text-sm text-polar-muted">
            No hay administradores todavía.
          </p>
        ) : (
          <ul className="divide-y divide-[rgba(167,73,197,0.08)]">
            {initial.map((adminItem) => {
              const isSuper = adminItem.role === "super";
              const isSelf = adminItem.id === selfId;
              const canManage = hasEnv && !isSuper && !isSelf;
              return (
                <li
                  key={adminItem.id}
                  className="flex flex-col gap-3 px-5 py-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-600 text-polar-text">
                          {adminItem.email}
                        </p>
                        <span
                          className={clsx(
                            "rounded-full px-2 py-0.5 text-[10px] font-600 uppercase tracking-wide",
                            isSuper
                              ? "border border-[rgba(167,73,197,0.5)] bg-[rgba(146,40,218,0.15)] text-polar-purple-light"
                              : "border border-[rgba(126,119,144,0.4)] bg-[rgba(126,119,144,0.12)] text-polar-dim",
                          )}
                        >
                          {isSuper ? "Propietario" : "Administrador"}
                        </span>
                        {isSelf && (
                          <span className="rounded-full border border-[rgba(126,119,144,0.4)] bg-[rgba(126,119,144,0.12)] px-2 py-0.5 text-[10px] font-600 uppercase tracking-wide text-polar-dim">
                            Tú
                          </span>
                        )}
                      </div>
                    </div>
                    {canManage && (
                      <div className="flex shrink-0 items-center gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setError(null);
                            setOk(null);
                            setResettingId(
                              resettingId === adminItem.id ? null : adminItem.id,
                            );
                          }}
                          className="text-sm text-polar-magenta transition-colors hover:text-polar-purple-light"
                        >
                          Contraseña
                        </button>
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => {
                            if (
                              window.confirm(
                                `¿Eliminar al administrador "${adminItem.email}"?`,
                              )
                            ) {
                              run(
                                () => deleteAdmin(adminItem.id),
                                "Administrador eliminado.",
                              );
                            }
                          }}
                          className="text-sm text-polar-dim transition-colors hover:text-[#f3a9c1] disabled:opacity-50"
                        >
                          Eliminar
                        </button>
                      </div>
                    )}
                  </div>
                  {resettingId === adminItem.id && (
                    <ResetPasswordRow
                      pending={pending}
                      onCancel={() => setResettingId(null)}
                      onError={(message) => {
                        setOk(null);
                        setError(message);
                      }}
                      onSubmit={(pwd) =>
                        run(
                          () => resetAdminPassword(adminItem.id, pwd),
                          "Contraseña actualizada.",
                          () => setResettingId(null),
                        )
                      }
                    />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {hasEnv && (
        <form
          onSubmit={handleCreate}
          className="glass-card flex flex-col gap-4 p-6"
        >
          <h2 className="font-display text-lg font-600 text-polar-text">
            Nuevo administrador
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <input
              type="email"
              autoComplete="off"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="correo@ejemplo.com"
              aria-label="Correo del administrador"
              className={inputClass}
            />
            <input
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Contraseña (mín. 8)"
              aria-label="Contraseña del administrador"
              className={inputClass}
            />
          </div>
          <div>
            <button
              type="submit"
              disabled={pending}
              className="btn-brand h-11 text-sm disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? "Guardando..." : "Crear administrador"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function ResetPasswordRow({
  pending,
  onCancel,
  onSubmit,
  onError,
}: {
  pending: boolean;
  onCancel: () => void;
  onSubmit: (password: string) => void;
  onError: (message: string) => void;
}) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  function handleSave() {
    if (password.length < 8) {
      onError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (password !== confirm) {
      onError("Las contraseñas no coinciden.");
      return;
    }
    onSubmit(password);
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl bg-[rgba(255,255,255,0.02)] p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Nueva contraseña (mín. 8)"
          aria-label="Nueva contraseña"
          className={inputClass}
        />
        <input
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Confirmar contraseña"
          aria-label="Confirmar contraseña"
          className={inputClass}
        />
      </div>
      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="text-sm text-polar-muted transition-colors hover:text-polar-text"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={pending}
          className="btn-brand h-10 text-sm disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "..." : "Actualizar contraseña"}
        </button>
      </div>
    </div>
  );
}

const inputClass = clsx(
  "h-11 w-full rounded-xl border border-[rgba(167,73,197,0.2)] bg-[rgba(25,3,75,0.35)] px-4 text-sm text-polar-text placeholder:text-polar-dim outline-none transition-colors",
  "focus:border-polar-purple-light focus:ring-2 focus:ring-[rgba(146,40,218,0.25)]",
);
