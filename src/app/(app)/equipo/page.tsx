import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { hasFeature } from "@/lib/plan";
import { EquipoClient } from "./equipo-client";

export default async function EquipoPage() {
  const supa = supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supa.from("profiles").select("role, full_name, org:organizations(plan)").eq("id", user.id).single();
  const role = (profile as { role?: string } | null)?.role ?? "rep";
  if (!["supervisor", "gerente", "org_admin", "platform_admin"].includes(role)) redirect("/cuentas");
  const plan = (profile as { org?: { plan?: string } } | null)?.org?.plan ?? "individual";
  if (!hasFeature(plan, "equipo")) redirect("/cuentas");
  return <EquipoClient meId={user.id} meName={profile?.full_name ?? ""} />;
}
