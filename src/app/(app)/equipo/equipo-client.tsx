"use client";
import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

type Acc = { id: string; assigned_user_id: string | null; visited: boolean };
type Prof = { id: string; full_name: string; role: string; manager_id: string | null };

const ROLE_LABEL: Record<string, string> = {
  platform_admin: "Plataforma", org_admin: "Admin", gerente: "Gerente",
  supervisor: "Supervisor", rep: "Visitador", viewer: "Lectura",
};

export function EquipoClient({ role }: { role: string }) {
  const supa = useMemo(() => supabaseBrowser(), []);
  const [accounts, setAccounts] = useState<Acc[]>([]);
  const [profiles, setProfiles] = useState<Prof[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [a, p] = await Promise.all([
        supa.from("accounts").select("id, assigned_user_id, visited").eq("record_status", "activo"),
        supa.from("profiles").select("id, full_name, role, manager_id"),
      ]);
      if (a.data) setAccounts(a.data as Acc[]);
      if (p.data) setProfiles(p.data as Prof[]);
      setLoading(false);
    })();
  }, [supa]);

  const byId = useMemo(() => Object.fromEntries(profiles.map((p) => [p.id, p])) as Record<string, Prof>, [profiles]);

  const rows = useMemo(() => {
    const m = new Map<string, { total: number; visitadas: number }>();
    for (const a of accounts) {
      const k = a.assigned_user_id ?? "sin";
      const r = m.get(k) ?? { total: 0, visitadas: 0 };
      r.total++; if (a.visited) r.visitadas++;
      m.set(k, r);
    }
    return Array.from(m.entries()).map(([id, r]) => ({
      id,
      name: id === "sin" ? "Sin asignar" : (byId[id]?.full_name ?? "—"),
      manager: id === "sin" ? "" : (byId[byId[id]?.manager_id ?? ""]?.full_name ?? ""),
      total: r.total, visitadas: r.visitadas, pendientes: r.total - r.visitadas,
      pct: r.total ? Math.round((r.visitadas / r.total) * 100) : 0,
    })).sort((x, y) => y.total - x.total);
  }, [accounts, byId]);

  const tot = useMemo(() => {
    const total = accounts.length;
    const visitadas = accounts.filter((a) => a.visited).length;
    return {
      total, visitadas, pendientes: total - visitadas,
      pct: total ? Math.round((visitadas / total) * 100) : 0,
      reps: rows.filter((r) => r.id !== "sin").length,
    };
  }, [accounts, rows]);

  if (loading) return <p className="text-sm text-gray-500">Cargando equipo…</p>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-brand-700">Equipo</h1>
        <p className="text-sm text-gray-500">{ROLE_LABEL[role] ?? role} · {tot.reps} visitador(es) a cargo</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="Cuentas" value={tot.total} />
        <Kpi label="Visitadas" value={tot.visitadas} accent="text-green-600" />
        <Kpi label="Pendientes" value={tot.pendientes} accent="text-gold-600" />
        <Kpi label="Avance" value={`${tot.pct}%`} accent="text-brand-700" />
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs text-gray-500">
            <tr>
              <th className="px-4 py-2">Visitador</th>
              <th className="px-4 py-2">Supervisor</th>
              <th className="px-4 py-2 text-right">Cuentas</th>
              <th className="px-4 py-2 text-right">Visitadas</th>
              <th className="px-4 py-2 text-right">Pend.</th>
              <th className="w-40 px-4 py-2">Avance</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-gray-100">
                <td className="px-4 py-2 font-medium text-gray-800">{r.name}</td>
                <td className="px-4 py-2 text-gray-500">{r.manager || "—"}</td>
                <td className="px-4 py-2 text-right">{r.total}</td>
                <td className="px-4 py-2 text-right text-green-700">{r.visitadas}</td>
                <td className="px-4 py-2 text-right text-gold-700">{r.pendientes}</td>
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2">
                    <div className="h-2 flex-1 rounded-full bg-gray-100">
                      <div className="h-2 rounded-full bg-brand-600" style={{ width: `${r.pct}%` }} />
                    </div>
                    <span className="w-9 text-right text-xs text-gray-600">{r.pct}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-400">Los números respetan tus permisos: ves solo a los visitadores de tu equipo.</p>
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
