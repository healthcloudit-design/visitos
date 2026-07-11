import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { UsuariosClient } from "./usuarios-client";

export default async function UsuariosPage() {
  const supa = supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supa.from("profiles").select("role").eq("id", user.id).single();
  const role = (profile as { role?: string } | null)?.role ?? "rep";
  if (!["org_admin", "platform_admin"].includes(role)) redirect("/cuentas");
  return <UsuariosClient isPlatform={role === "platform_admin"} />;
}
