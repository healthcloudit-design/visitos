import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { hasFeature } from "@/lib/plan";
import { ImportarClient } from "./importar-client";

export default async function ImportarPage() {
  const supa = supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supa.from("profiles").select("role, org:organizations(plan)").eq("id", user.id).single();
  const role = (profile as { role?: string } | null)?.role ?? "rep";
  if (!["supervisor", "gerente", "org_admin", "platform_admin"].includes(role)) redirect("/cuentas");
  const plan = (profile as { org?: { plan?: string } } | null)?.org?.plan ?? "individual";
  if (!hasFeature(plan, "equipo")) redirect("/cuentas");
  return <ImportarClient />;
}
