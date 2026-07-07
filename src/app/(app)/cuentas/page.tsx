import { CuentasClient } from "./cuentas-client";
import { WelcomeBanner } from "@/components/welcome-banner";
import { supabaseServer } from "@/lib/supabase/server";

export default async function CuentasPage({ searchParams }: { searchParams: { rep?: string } }) {
  const supa = supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  const { data: profile } = user
    ? await supa.from("profiles").select("full_name, role").eq("id", user.id).single()
    : { data: null };
  const name = profile?.full_name ?? user?.email ?? "";
  const role = (profile as { role?: string } | null)?.role ?? "rep";
  const isManager = ["supervisor", "gerente", "org_admin", "platform_admin"].includes(role);
  const initialAssignee = isManager && typeof searchParams?.rep === "string" ? searchParams.rep : "";

  return (
    <>
      <WelcomeBanner name={name} />
      <CuentasClient showAssignee={isManager} initialAssignee={initialAssignee} meId={user?.id ?? ""} />
    </>
  );
}
