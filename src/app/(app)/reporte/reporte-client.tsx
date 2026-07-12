"use client";
import { Skeleton } from "@/components/skeleton";
import { useEffect, useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LabelList,
} from "recharts";
import { STATUS_LABELS, type ManagementStatus } from "@/lib/types";
import { supabaseBrowser } from "@/lib/supabase/client";

type Acc = { assigned_user_id: string | null; visited: boolean; status: ManagementStatus; neighborhood: string | null; city: string | null };
type Prof = { id: string; full_name: string; role: string };

const PIE_COLORS = ["#0d3b48", "#1a5d70", "#bea06c", "#a3c0c5", "#8a6f3d", "#124a5a", "#cbb079", "#061f27"];

export function ReporteClient({ meName, lab, orgName }: { meName: string; lab: string | null; orgName: string }) {
  const supa = useMemo(() => supabaseBrowser(), []);
  const [accounts, setAccounts] = useState<Acc[]>([]);
  const [profiles, setProfiles] = useState<Prof[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [a, p] = await Promise.all([
        supa.from("accounts").select("assigned_user_id, visited, status, neighborhood, city").eq("record_status", "activo"),
        supa.from("profiles").select("id, full_name, role"),
      ]);
      if (a.data) setAccounts(a.data as Acc[]);
      if (p.data) setProfiles(p.data as Prof[]);
      setLoading(false);
    })();
  }, [supa]);

  const nameById = useMemo(() => Object.fromEntries(profiles.map((p) => [p.id, p.full_name])) as Record<string, string>, [profiles]);

  const kpi = useMemo(() => {
    const total = accounts.length, vis = accounts.filter((a) => a.visited).length;
    return { total, vis, pend: total - vis, pct: total ? Math.round((vis / total) * 100) : 0 };
  }, [accounts]);

  const porRep = useMemo(() => {
    const m = new Map<string, { visitadas: number; pendientes: number }>();
    for (const a of accounts) {
      const nm = a.assigned_user_id ? (nameById[a.assigned_user_id] ?? "—") : "Sin asignar";
      const r = m.get(nm) ?? { visitadas: 0, pendientes: 0 };
      if (a.visited) r.visitadas++; else r.pendientes++;
      m.set(nm, r);
    }
    return Array.from(m.entries()).map(([name, v]) => ({ name, ...v })).sort((x, y) => (y.visitadas + y.pendientes) - (x.visitadas + x.pendientes));
  }, [accounts, nameById]);

  const porEstado = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of accounts) { const l = STATUS_LABELS[a.status] ?? a.status; m.set(l, (m.get(l) ?? 0) + 1); }
    return Array.from(m.entries()).map(([name, value]) => ({ name, value })).sort((x, y) => y.value - x.value);
  }, [accounts]);

  const porBarrio = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of accounts) { const k = a.neighborhood || a.city || "Sin dato"; m.set(k, (m.get(k) ?? 0) + 1); }
    return Array.from(m.entries()).map(([name, value]) => ({ name, value })).sort((x, y) => y.value - x.value).slice(0, 8);
  }, [accounts]);

  const fecha = new Date().toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" });

  if (loading)
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-48" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}</div>
        <div className="grid gap-4 md:grid-cols-2"><Skeleton className="h-72 w-full rounded-xl" /><Skeleton className="h-72 w-full rounded-xl" /></div>
      </div>
    );

  return (
    <div className="space-y-5">
      <div className="no-print flex items-center justify-between">
        <h1 className="text-xl font-bold text-brand-700">Reporte de equipo</h1>
        <button onClick={() => window.print()} className="btn-primary">Descargar PDF</button>
      </div>

      <div id="reporte" className="space-y-5 rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex items-center justify-between gap-4 border-b border-gray-100 pb-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Praxis Operativa" className="h-10 w-auto" />
          <div className="text-right">
            <div className="flex items-center justify-end gap-2">
              {lab && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/labs/${lab}.png`} alt={orgName} className="h-8 w-8 rounded-full object-cover ring-1 ring-gray-200" />
              )}
              <span className="text-lg font-bold text-gray-800">{orgName}</span>
            </div>
            <p className="text-xs text-gray-500">Generado por {meName} · {fecha}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Kpi label="Cuentas" value={kpi.total} />
          <Kpi label="Visitadas" value={kpi.vis} accent="text-green-600" />
          <Kpi label="Pendientes" value={kpi.pend} accent="text-gold-600" />
          <Kpi label="Avance" value={`${kpi.pct}%`} accent="text-brand-700" />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Panel title="Avance por visitador">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={porRep} margin={{ top: 8, right: 8, left: -16, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="visitadas" name="Visitadas" stackId="a" fill="#1a5d70" />
                  <Bar dataKey="pendientes" name="Pendientes" stackId="a" fill="#bea06c" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <Panel title="Distribución por estado">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={porEstado} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={2}>
                    {porEstado.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </div>

        <Panel title="Cuentas por barrio / localidad (top 8)">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={porBarrio} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
                <Tooltip />
                <Bar dataKey="value" name="Cuentas" fill="#0d3b48" radius={[0, 3, 3, 0]}>
                  <LabelList dataKey="value" position="right" style={{ fontSize: 11, fill: "#555" }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Detalle por visitador">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-gray-500">
              <tr>
                <th className="py-1">Visitador</th>
                <th className="py-1 text-right">Cuentas</th>
                <th className="py-1 text-right">Visitadas</th>
                <th className="py-1 text-right">Pend.</th>
                <th className="py-1 text-right">Avance</th>
              </tr>
            </thead>
            <tbody>
              {porRep.map((r) => {
                const tot = r.visitadas + r.pendientes;
                const pct = tot ? Math.round((r.visitadas / tot) * 100) : 0;
                return (
                  <tr key={r.name} className="border-t border-gray-100">
                    <td className="py-1 font-medium text-gray-800">{r.name}</td>
                    <td className="py-1 text-right">{tot}</td>
                    <td className="py-1 text-right text-green-700">{r.visitadas}</td>
                    <td className="py-1 text-right text-gold-700">{r.pendientes}</td>
                    <td className="py-1 text-right">{pct}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Panel>

        <p className="border-t border-gray-100 pt-3 text-center text-[11px] text-gray-400">
          PRAXIS Visita · Praxis Platform — www.praxisoperativa.com · contacto@praxisoperativa.com
        </p>
      </div>
    </div>
  );
}

function Kpi({ label, value, accent }: { label: string; value: React.ReactNode; accent?: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-center">
      <div className={`text-2xl font-bold ${accent ?? "text-gray-800"}`}>{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}
function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-gray-700">{title}</h3>
      {children}
    </div>
  );
}
