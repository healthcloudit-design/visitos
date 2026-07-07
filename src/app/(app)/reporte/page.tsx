import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { ReporteClient } from "./reporte-client";

export default async function ReportePage() {
  const supa = supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supa.from("profiles").select("role, full_name, lab, org_id").eq("id", user.id).single();
  const p = profile as { role?: string; full_name?: string; lab?: string | null; org_id?: string } | null;
  const role = p?.role ?? "rep";
  if (!["supervisor", "gerente", "org_admin", "platform_admin"].includes(role)) redirect("/cuentas");
  const { data: org } = p?.org_id
    ? await supa.from("organizations").select("name").eq("id", p.org_id).single()
    : { data: null };
  return <ReporteClient meName={p?.full_name ?? ""} lab={p?.lab ?? null} orgName={(org as { name?: string } | null)?.name ?? ""} />;
}
