"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import { updateShopSettings } from "@/lib/actions/site";
import { changePassword } from "@/lib/actions/auth";
import { shopSettingsSchema } from "@/lib/validation/schemas";
import type { OpeningHour, ShopSettings } from "@/lib/types";

// Local hour rows carry a stable client id so React keys survive add/remove
// without falling back to the array index.
type HourRow = OpeningHour & { id: number };

export function SettingsManager({
  settings,
  hasEnv,
}: {
  settings: ShopSettings;
  hasEnv: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  // Contact / social / hours form state.
  const [whatsapp, setWhatsapp] = useState(settings.whatsappNumber);
  const [address, setAddress] = useState(() => settings.addressLines.join("\n"));
  const [mapsUrl, setMapsUrl] = useState(settings.mapsUrl);
  const [instagram, setInstagram] = useState(settings.socialLinks.instagram);
  const [facebook, setFacebook] = useState(settings.socialLinks.facebook);
  const [tiktok, setTiktok] = useState(settings.socialLinks.tiktok);
  const hourIdRef = useRef(
    settings.openingHours.length > 0 ? settings.openingHours.length : 1,
  );
  const [hours, setHours] = useState<HourRow[]>(() =>
    (settings.openingHours.length > 0
      ? settings.openingHours
      : [{ label: "", value: "" }]
    ).map((row, i) => ({ id: i, ...row })),
  );

  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [settingsOk, setSettingsOk] = useState(false);

  // Password change form state.
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordOk, setPasswordOk] = useState(false);

  function updateHour(index: number, patch: Partial<OpeningHour>) {
    setHours((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  }

  function addHour() {
    const id = hourIdRef.current++;
    setHours((prev) => [...prev, { id, label: "", value: "" }]);
  }

  function removeHour(index: number) {
    setHours((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSaveSettings(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSettingsError(null);
    setSettingsOk(false);

    const payload: ShopSettings = {
      whatsappNumber: whatsapp,
      // Split the textarea into lines and drop blanks; each kept line must be
      // non-empty per the shared schema.
      addressLines: address
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line !== ""),
      mapsUrl: mapsUrl.trim(),
      socialLinks: {
        instagram: instagram.trim(),
        facebook: facebook.trim(),
        tiktok: tiktok.trim(),
      },
      // Keep only fully-filled hour rows; both fields are required per row.
      openingHours: hours.reduce<OpeningHour[]>((kept, row) => {
        const label = row.label.trim();
        const value = row.value.trim();
        if (label !== "" && value !== "") kept.push({ label, value });
        return kept;
      }, []),
    };

    const parsed = shopSettingsSchema.safeParse(payload);
    if (!parsed.success) {
      setSettingsError(parsed.error.issues[0]?.message ?? "Datos inválidos.");
      return;
    }

    startTransition(async () => {
      const result = await updateShopSettings(parsed.data);
      if (!result.ok) {
        setSettingsError(result.error ?? "Ocurrió un error.");
        return;
      }
      setSettingsOk(true);
      router.refresh();
    });
  }

  function handleChangePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordOk(false);

    if (currentPassword.length === 0) {
      setPasswordError("Ingresa tu contraseña actual.");
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Las contraseñas no coinciden.");
      return;
    }

    startTransition(async () => {
      const result = await changePassword(currentPassword, newPassword);
      if (!result.ok) {
        setPasswordError(result.error ?? "Ocurrió un error.");
        return;
      }
      setPasswordOk(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Contact, social links and opening hours. */}
      <form
        onSubmit={handleSaveSettings}
        className="glass-card flex flex-col gap-5 p-6"
      >
        <div>
          <h2 className="font-display text-lg font-600 text-polar-text">
            Contacto y redes
          </h2>
          <p className="mt-1 text-xs text-polar-dim">
            Estos datos alimentan el pedido por WhatsApp, el pie de página y el
            mapa.
          </p>
        </div>

        {settingsError && (
          <p
            role="alert"
            className="rounded-xl border border-[rgba(226,69,122,0.4)] bg-[rgba(226,69,122,0.08)] px-4 py-3 text-sm text-[#f3a9c1]"
          >
            {settingsError}
          </p>
        )}
        {settingsOk && (
          <p
            role="status"
            className="rounded-xl border border-[rgba(74,222,128,0.35)] bg-[rgba(74,222,128,0.08)] px-4 py-3 text-sm text-[#86e0a8]"
          >
            Configuración guardada.
          </p>
        )}

        <label className="flex flex-col gap-1.5 text-xs text-polar-dim">
          WhatsApp
          <input
            type="text"
            inputMode="numeric"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            placeholder="573001234567"
            className={inputClass}
            disabled={!hasEnv}
          />
          <span className="text-[11px] text-polar-dim">
            Solo dígitos, con código de país (sin + ni espacios).
          </span>
        </label>

        <label className="flex flex-col gap-1.5 text-xs text-polar-dim">
          Dirección
          <textarea
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder={"Calle 123 #45-67\nBarrio, Ciudad"}
            rows={3}
            className={clsx(inputClass, "h-auto py-3 leading-relaxed")}
            disabled={!hasEnv}
          />
          <span className="text-[11px] text-polar-dim">
            Una línea por renglón (máximo 6).
          </span>
        </label>

        <label className="flex flex-col gap-1.5 text-xs text-polar-dim">
          Enlace de Google Maps
          <input
            type="url"
            value={mapsUrl}
            onChange={(e) => setMapsUrl(e.target.value)}
            placeholder="https://maps.google.com/..."
            className={inputClass}
            disabled={!hasEnv}
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-3">
          <label className="flex flex-col gap-1.5 text-xs text-polar-dim">
            Instagram
            <input
              type="text"
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
              placeholder="https://instagram.com/..."
              className={inputClass}
              disabled={!hasEnv}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-xs text-polar-dim">
            Facebook
            <input
              type="text"
              value={facebook}
              onChange={(e) => setFacebook(e.target.value)}
              placeholder="https://facebook.com/..."
              className={inputClass}
              disabled={!hasEnv}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-xs text-polar-dim">
            TikTok
            <input
              type="text"
              value={tiktok}
              onChange={(e) => setTiktok(e.target.value)}
              placeholder="https://tiktok.com/@..."
              className={inputClass}
              disabled={!hasEnv}
            />
          </label>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-polar-dim">Horarios</span>
            <button
              type="button"
              onClick={addHour}
              disabled={!hasEnv}
              className="text-sm text-polar-magenta transition-colors hover:text-polar-purple-light disabled:opacity-50"
            >
              Agregar horario
            </button>
          </div>
          {hours.length === 0 ? (
            <p className="text-xs text-polar-dim">No hay horarios.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {hours.map((row, index) => (
                <div
                  key={row.id}
                  className="grid items-center gap-2 sm:grid-cols-[1fr_1fr_auto]"
                >
                  <input
                    type="text"
                    value={row.label}
                    onChange={(e) =>
                      updateHour(index, { label: e.target.value })
                    }
                    placeholder="Lun a Jue"
                    aria-label={`Etiqueta del horario ${index + 1}`}
                    className={inputClass}
                    disabled={!hasEnv}
                  />
                  <input
                    type="text"
                    value={row.value}
                    onChange={(e) =>
                      updateHour(index, { value: e.target.value })
                    }
                    placeholder="2:00 pm - 10:00 pm"
                    aria-label={`Horario ${index + 1}`}
                    className={inputClass}
                    disabled={!hasEnv}
                  />
                  <button
                    type="button"
                    onClick={() => removeHour(index)}
                    disabled={!hasEnv}
                    className="justify-self-start text-sm text-polar-dim transition-colors hover:text-[#f3a9c1] disabled:opacity-50 sm:justify-self-center"
                  >
                    Quitar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <button
            type="submit"
            disabled={pending || !hasEnv}
            className="btn-brand h-11 text-sm disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Guardando..." : "Guardar configuración"}
          </button>
        </div>
      </form>

      {/* Admin password change. */}
      <form
        onSubmit={handleChangePassword}
        className="glass-card flex flex-col gap-5 p-6"
      >
        <div>
          <h2 className="font-display text-lg font-600 text-polar-text">
            Cambiar contraseña
          </h2>
          <p className="mt-1 text-xs text-polar-dim">
            Actualiza la contraseña de acceso al panel.
          </p>
        </div>

        {passwordError && (
          <p
            role="alert"
            className="rounded-xl border border-[rgba(226,69,122,0.4)] bg-[rgba(226,69,122,0.08)] px-4 py-3 text-sm text-[#f3a9c1]"
          >
            {passwordError}
          </p>
        )}
        {passwordOk && (
          <p
            role="status"
            className="rounded-xl border border-[rgba(74,222,128,0.35)] bg-[rgba(74,222,128,0.08)] px-4 py-3 text-sm text-[#86e0a8]"
          >
            Contraseña actualizada.
          </p>
        )}

        <label className="flex flex-col gap-1.5 text-xs text-polar-dim">
          Contraseña actual
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
            placeholder="Tu contraseña actual"
            className={inputClass}
            disabled={!hasEnv}
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-xs text-polar-dim">
            Nueva contraseña
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              placeholder="Mínimo 8 caracteres"
              className={inputClass}
              disabled={!hasEnv}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-xs text-polar-dim">
            Confirmar contraseña
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              placeholder="Repite la contraseña"
              className={inputClass}
              disabled={!hasEnv}
            />
          </label>
        </div>

        <div>
          <button
            type="submit"
            disabled={pending || !hasEnv}
            className="btn-brand h-11 text-sm disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Guardando..." : "Cambiar contraseña"}
          </button>
        </div>
      </form>
    </div>
  );
}

const inputClass = clsx(
  "h-11 w-full rounded-xl border border-[rgba(167,73,197,0.2)] bg-[rgba(25,3,75,0.35)] px-4 text-sm text-polar-text placeholder:text-polar-dim outline-none transition-colors",
  "focus:border-polar-purple-light focus:ring-2 focus:ring-[rgba(146,40,218,0.25)]",
  "disabled:cursor-not-allowed disabled:opacity-50",
);
