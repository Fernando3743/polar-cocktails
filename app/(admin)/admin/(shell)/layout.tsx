import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { AdminNav } from "../_components/AdminNav";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Panel — Polar",
};

export default async function AdminShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Defense in depth: middleware already guards /admin/*, but the layout
  // verifies the user again with getUser() (never getSession for authz).
  if (!hasSupabaseEnv()) {
    redirect("/admin/login");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  return (
    <div className="min-h-[calc(100vh-88px)] md:flex">
      <AdminNav email={user.email ?? null} />
      <div className="min-w-0 flex-1 px-5 py-8 md:px-8">{children}</div>
    </div>
  );
}
