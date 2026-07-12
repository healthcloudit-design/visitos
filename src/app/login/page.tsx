"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

const COMPANY = {
  web: "www.praxisoperativa.com",
  webUrl: "https://www.praxisoperativa.com",
  tel: "11 5616-9164",
  telHref: "tel:+541156169164",
  email: "contacto@praxisoperativa.com",
  linkedin: "https://www.linkedin.com/company/praxisoperativa/",
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    const supa = supabaseBrowser();
    const { error } = await supa.auth.signInWithPassword({ email, password });
    if (error) {
      setError("Email o contraseña incorrectos.");
      setLoading(false);
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-brand-700 to-brand-900 p-4">
      <div className="w-full max-w-sm">
        <div className="rounded-2xl border border-white/10 bg-white p-7 shadow-xl">
          <div className="mb-6 flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="PRAXIS Visita" className="h-20 w-auto" />
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="lbl">Email</label>
              <input className="input" type="email" required value={email}
                onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            </div>
            <div>
              <label className="lbl">Contraseña</label>
              <input className="input" type="password" required value={password}
                onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              className="flex w-full items-center justify-center rounded-lg border-b-2 border-gold-500 bg-brand-700 px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-600 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? "Ingresando…" : "Ingresar"}
            </button>
          </form>
        </div>

        <div className="mt-6 flex flex-col items-center gap-3 text-center">
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-white/80">
            <a href={COMPANY.webUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 hover:text-gold-400">
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
              {COMPANY.web}
            </a>
            <a href={COMPANY.telHref} className="inline-flex items-center gap-1.5 hover:text-gold-400">
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
              {COMPANY.tel}
            </a>
            <a href={`mailto:${COMPANY.email}`} className="inline-flex items-center gap-1.5 hover:text-gold-400">
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
              {COMPANY.email}
            </a>
            <a href={COMPANY.linkedin} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 hover:text-gold-400">
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.07 2.07 0 1 1 0-4.14 2.07 2.07 0 0 1 0 4.14zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0z"/></svg>
              LinkedIn
            </a>
          </div>
          <p className="text-[11px] text-white/50">© {new Date().getFullYear()} PRAXIS Visita · una solución de Praxis Platform</p>
        </div>
      </div>
    </main>
  );
}
