"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { Account } from "@/lib/types";
import { daysToBirthday, fmtBirthday, waHref, mailHref, greetingText } from "@/lib/format";
import { StatusBadge } from "@/components/status-badge";

export default function CumpleanosPage() {
  const supa = useMemo(() => supabaseBrowser(), []);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [a, g] = await Promise.all([
        supa.from("accounts").select("*").eq("record_status", "activo"),
        supa.from("greeting_logs").select("account_id").gte("sent_at", new Date(Date.now() - 30 * 86400000).toISOString())
      ]);
      setAccounts((a.data ?? []) as Account[]);
      setSentIds(new Set((g.data ?? []).map((x: { account_id: string }) => x.account_id)));
      setLoading(false);
    })();
  }, [supa]);

  const withBday = accounts
    .filter((a) => a.birthday)
    .map((a) => ({ a, d: daysToBirthday(a.birthday)! }))
    .sort((x, y) => x.d - y.d);

  const sections: { title: string; items: { a: Account; d: number }[] }[] = [
    { title: "Cumplen hoy 🎂", items: withBday.filter((x) => x.d === 0) },
    { title: "Cumplen mañana", items: withBday.filter((x) => x.d === 1) },
    { title: "En 2 días", items: withBday.filter((x) => x.d === 2) },
    { title: "Próximos 7 días", items: withBday.filter((x) => x.d >= 3 && x.d <= 7) },
    { title: "Este mes", items: withBday.filter((x) => x.d > 7 && x.d <= 31) }
  ];
  const without = accounts.filter((a) => !a.birthday);

  async function copyGreeting(a: Account) {
    await navigator.clipboard.writeText(greetingText(a));
    setCopied(a.id);
    setTimeout(() => setCopied(null), 1500);
  }

  async function markSent(a: Account, channel: string) {
    const { data: { user } } = await supa.auth.getUser();
    if (!user) return;
    await supa.from("greeting_logs").insert({
      org_id: a.org_id, account_id: a.id, user_id: user.id, channel, message: greetingText(a)
    });
    setSentIds((prev) => new Set(prev).add(a.id));
  }

  if (loading) return <p className="py-10 text-center text-gray-400">Cargando…</p>;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <h1 className="text-xl font-bold">Próximos cumpleaños</h1>
      {sections.map((s) =>
        s.items.length > 0 && (
          <section key={s.title}>
            <h2 className="mb-2 text-sm font-semibold uppercase text-gray-500">{s.title}</h2>
            <div className="space-y-2">
              {s.items.map(({ a, d }) => {
                const wa = waHref(a, greetingText(a));
                const mail = mailHref(a, "¡Feliz cumpleaños!", greetingText(a));
                const sent = sentIds.has(a.id);
                return (
                  <div key={a.id} className={`card ${d === 0 ? "border-brand-500 !bg-brand-50" : ""}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <Link href={`/cuentas/${a.id}`} className="font-semibold text-brand-700">{a.name}</Link>
                        <p className="text-sm text-gray-500">
                          {fmtBirthday(a.birthday)} · {d === 0 ? "¡hoy!" : d === 1 ? "mañana" : `en ${d} días`}
                          {(a.neighborhood || a.city) && ` · ${a.neighborhood ?? a.city}`}
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          <StatusBadge status={a.status} />
                          {sent && <span className="badge bg-green-100 text-green-800">Saludo enviado ✓</span>}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button className="btn-ghost btn-sm" onClick={() => copyGreeting(a)}>
                        {copied === a.id ? "¡Copiado!" : "Copiar saludo"}
                      </button>
                      {wa && <a className="btn-ghost btn-sm" href={wa} target="_blank" onClick={() => markSent(a, "whatsapp")}>WhatsApp</a>}
                      {mail && <a className="btn-ghost btn-sm" href={mail} onClick={() => markSent(a, "email")}>Email</a>}
                      {!sent && <button className="btn-ghost btn-sm" onClick={() => markSent(a, "manual")}>Marcar enviado</button>}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )
      )}
      {withBday.length === 0 && (
        <p className="rounded-lg bg-gray-100 p-4 text-sm text-gray-500">
          Todavía no hay cumpleaños cargados. Editá una cuenta y completá el campo Cumpleaños (DD/MM).
        </p>
      )}
      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase text-gray-500">Sin cumpleaños cargado ({without.length})</h2>
        <p className="text-sm text-gray-500">
          <Link href="/cuentas" className="text-brand-700 underline">Ver en cuentas</Link> usando el filtro “Sin cumpleaños” para ir completándolos.
        </p>
      </section>
    </div>
  );
}
