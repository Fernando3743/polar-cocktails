import type { ReactNode } from "react";
import { Alert } from "./Alert";

interface DemoModeNoticeProps {
  /** Spanish copy describing what is unavailable without Supabase. */
  children: ReactNode;
}

/**
 * Warning banner shown when Supabase is not configured ("Base de datos no
 * configurada..." / "Configura Supabase..."). The specific copy varies per
 * screen, so it is passed as children; the styling is shared via Alert.
 */
export function DemoModeNotice({ children }: DemoModeNoticeProps) {
  return <Alert tone="warning">{children}</Alert>;
}
