"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/client";

type Acc = { assigned_user_id: string | null; visited: boolean };
type Prof = { id: string; full_name: string; role: string; manager_id: string | null };

const ROLE_LABEL: Record<string, string> = {
  platform_admin: "Plataforma", org_admin: "Admin", gerente: "Gerente",
  supervisor: "Supervisor", rep: "Visitador", viewer: "Lectura",
};

export function EquipoClient({ meId, meName }: { meId: string; meName: string }) {
  const supa = useMemo(() => supabaseBrowser(), []);
  const [accounts, setAccounts] = useState<Acc[]>([]);
  const [profiles, setProfiles] = useState<Prof[]>([]);
  const [loading, setLoading] = useState(true);
  const [path, setPath] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    (async () => {
      const [a, p] = await Promise.all([
        supa.from("accounts").select("assigned_user_id, visited").eq("record_status", "activo"),
        supa.from("profiles").select("id, full_name, role, manager_id"),
      ]);
      if (a.data) setAccounts(a.data as Acc[]);
      if (p.data) setProfiles(p.data as Prof[]);
      setLoading(false);
    })();
  }, [supa]);

  const byId = useMemo(() => Object.fromEntries(profiles.map((p) => [p.id, p])) as Record<string, Prof>, [profiles]);
  const childrenOf = useMemo(() => {
    const m: Record<string, Prof[]> = {};
    for (const p of profiles) if (p.manager_id) (m[p.manager_id] ??= []).push(p);
    return m;
  }, [profiles]);
  const acctByUser = useMemo(() => {
    const m = new Map<string, { total: number; vis: number }>();
    for (const a of accounts) {
      const k = a.assigned_user_id ?? "sin";
      const r = m.get(k) ?? { total: 0, vis: 0 };
      r.total++; if (a.visited) r.vis++;
      m.set(k, r);
    }
    return m;
  }, [accounts]);

  function subtreeIds(id: string): string[] {
    const out = [id]; const stack = [id];
    while (stack.length) {
      const c = stack.pop() as string;
      for (const ch of childrenOf[c] ?? []) { out.push(ch.id); stack.push(ch.id); }
    }
    return out;
  }
  function agg(id: string) {
    let total = 0, vis = 0, reps = 0;
    for (const i of subtreeIds(id)) {
      const r = acctByUser.get(i);
      if (r) { total += r.total; vis += r.vis; }
      if (byId[i]?.role === "rep") reps++;
    }
    return { total, vis, pend: total - vis, pct: total ? Math.round((vis / total) * 100) : 0, reps };
  }

  if (loading) return <p className="text-sm text-gray-500">Cargando equipo…</p>;

  const focusId = path.length ? path[path.length - 1].id : meId;
  let children = childrenOf[focusId] ?? [];
  if (!path.length && children.length === 0) children = profiles.filter((p) => !p.manager_id && p.id !== meId);
  children = [...children].sort((a, b) => agg(b.id).total - agg(a.id).total);
  const focus = agg(focusId);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-1 text-sm">
        <button onClick={() => setPath([])} className={path.length ? "font-medium text-brand-700 hover:underline" : "font-medium text-gray-800"}>Equipo</button>
        {path.map((n, i) => (
          <span key={n.id} className="flex items-center gap-1">
            <span className="text-gray-300">›</span>
            <button onClick={() => setPath(path.slice(0, i + 1))} className={i === path.length - 1 ? "text-gray-800" : "text-brand-700 hover:underline"}>{n.name}</button>
          </span>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="Cuentas" value={focus.total} />
        <Kpi label="Visitadas" value={focus.vis} accent="text-green-600" />
        <Kpi label="Pendientes" value={focus.pend} accent="text-gold-600" />
        <Kpi label="Avance" value={`${focus.pct}%`} accent="text-brand-700" />
      </div>

      {children.length === 0 ? (
        <p className="card text-sm text-gray-500">No hay reportes para mostrar.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {children.map((c) => {
            const g = agg(c.id);
            const hasTeam = (childrenOf[c.id]?.length ?? 0) > 0;
            const body = (
              <>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-gray-800">{c.full_name}</p>
                    <p className="text-xs text-gray-500">
                      {ROLE_LABEL[c.role] ?? c.role}{hasTeam ? ` · ${g.reps} visitador(es)` : ""}
                    </p>
                  </div>
                  <span className="text-lg text-gray-300">{hasTeam ? "›" : "→"}</span>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <div className="h-2 flex-1 rounded-full bg-gray-100"><div className="h-2 rounded-full bg-brand-600" style={{ width: `${g.pct}%` }} /></div>
                  <span className="w-9 text-right text-xs text-gray-600">{g.pct}%</span>
                </div>
                <div className="mt-2 flex justify-between text-xs text-gray-500">
                  <span>{g.total} cuentas</span>
                  <span className="text-green-700">{g.vis} visitadas</span>
                  <span className="text-gold-700">{g.pend} pend.</span>
                </div>
              </>
            );
            return hasTeam ? (
              <button key={c.id} onClick={() => setPath([...path, { id: c.id, name: c.full_name }])} className="card text-left transition hover:border-brand-300 hover:shadow">{body}</button>
            ) : (
              <Link key={c.id} href={`/cuentas?rep=${c.id}`} className="card block transition hover:border-brand-300 hover:shadow">{body}</Link>
            );
          })}
        </div>
      )}
      <p className="text-xs text-gray-400">Tocá un supervisor para ver su equipo, o un visitador para ver sus médicos. Ves solo tu rama.</p>
    </div>
  );
}

function Kpi({ label, value, accent }: { label: string; value: React.ReactNode; accent?: string }) {
  return (
    <div className="card text-center">
      <div className={`text-2xl font-bold ${accent ?? "text-gray-800"}`}>{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}
