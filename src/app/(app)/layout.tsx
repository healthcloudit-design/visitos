import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/logout-button";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supa = supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supa.from("profiles").select("full_name, lab, role").eq("id", user.id).single();

  const role = profile?.role ?? "rep";
  const isManager = ["supervisor", "gerente", "org_admin", "platform_admin"].includes(role);
  const isAdmin = ["org_admin", "platform_admin"].includes(role);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2.5">
          <div className="flex items-center gap-5">
            <Link href="/cuentas" className="text-lg font-bold text-brand-700">
              Visit<span className="text-gold-500">OS</span>
            </Link>
            <nav className="flex items-center gap-4 text-sm">
              <Link href="/cuentas" className="text-gray-600 hover:text-brand-700">Cuentas</Link>
              <Link href="/cumpleanos" className="text-gray-600 hover:text-brand-700">Cumpleaños</Link>
              {isManager && (
                <Link href="/equipo" className="font-medium text-gray-700 hover:text-brand-700">Equipo</Link>
              )}
              {isManager && (
                <Link href="/importar" className="hidden text-gray-600 hover:text-brand-700 sm:inline">Importar</Link>
              )}
              {isAdmin && (
                <Link href="/equipo/usuarios" className="hidden text-gray-600 hover:text-brand-700 sm:inline">Usuarios</Link>
              )}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            {profile?.lab && (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/labs/${profile.lab}.png`}
                  alt={`Laboratorio ${profile.lab}`}
                  title={`Laboratorio: ${profile.lab}`}
                  className="h-10 w-10 rounded-full object-cover ring-1 ring-gray-200"
                />
                <span className="hidden h-7 w-px bg-gray-200 sm:inline-block" />
              </>
            )}
            <span className="hidden text-right text-sm text-gray-500 sm:inline">{profile?.full_name ?? user.email}</span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-4">{children}</main>
    </div>
  );
}
