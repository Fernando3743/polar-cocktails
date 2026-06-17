"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

interface RunOptions {
  /** Success message to surface via `ok` when the action resolves ok. */
  okMessage?: string;
  /** Side effect to run on success, before the router refresh. */
  onOk?: () => void;
}

/**
 * Shared wrapper for the useTransition + try/error pattern used across the admin
 * managers: clears prior error/ok, runs the action inside a transition, records
 * an error on failure, an optional success message on success, then refreshes
 * server data. `setError`/`setOk` are exposed for client-side validation paths.
 */
export function useActionRunner() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  function run(action: () => Promise<ActionResult>, options?: RunOptions) {
    setError(null);
    setOk(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(result.error ?? "Ocurrió un error.");
        return;
      }
      if (options?.okMessage) setOk(options.okMessage);
      options?.onOk?.();
      router.refresh();
    });
  }

  return { pending, error, ok, setError, setOk, run };
}
