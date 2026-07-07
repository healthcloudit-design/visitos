import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { SolicitudesClient } from "./solicitudes-client";

export default async function SolicitudesPage() {
  const supa = supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supa.from("profiles").select("role").eq("id", user.id).single();
  const role = (profile as { role?: string } | null)?.role ?? "rep";
  if (!["supervisor", "gerente", "org_admin", "platform_admin"].includes(role)) redirect("/cuentas");
  return <SolicitudesClient meId={user.id} />;
}
