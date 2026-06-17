import type { ReactNode } from "react";

interface FieldProps {
  label: string;
  /** When set, wires the label to the control via htmlFor. */
  id?: string;
  error?: string;
  children: ReactNode;
}

/**
 * Form field wrapper: label + control slot + optional error text. Shared by the
 * checkout and admin product forms. Pass `id` to associate the label with an
 * input that carries the same id.
 */
export function Field({ label, id, error, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-600 text-polar-text">
        {label}
      </label>
      {children}
      {error && (
        <p className="text-xs text-[#f3a9c1]" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
