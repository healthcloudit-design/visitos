import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/logout-button";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supa = supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supa.from("profiles").select("full_name").eq("id", user.id).single();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2.5">
          <div className="flex items-center gap-5">
            <Link href="/cuentas" className="text-lg font-bold text-brand-700">VisitOS</Link>
            <nav className="flex items-center gap-4 text-sm">
              <Link href="/cuentas" className="text-gray-600 hover:text-brand-700">Cuentas</Link>
              <Link href="/cumpleanos" className="text-gray-600 hover:text-brand-700">Cumpleaños</Link>
              <Link href="/importar" className="hidden text-gray-600 hover:text-brand-700 sm:inline">Importar</Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-gray-500 sm:inline">{profile?.full_name ?? user.email}</span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-4">{children}</main>
    </div>
  );
}
