import { CuentasClient } from "./cuentas-client";
import { WelcomeBanner } from "@/components/welcome-banner";
import { supabaseServer } from "@/lib/supabase/server";

export default async function CuentasPage() {
  const supa = supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  const { data: profile } = user
    ? await supa.from("profiles").select("full_name").eq("id", user.id).single()
    : { data: null };
  const name = profile?.full_name ?? user?.email ?? "";

  return (
    <>
      <WelcomeBanner name={name} />
      <CuentasClient />
    </>
  );
}
