"use client";
import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

type Prof = { id: string; full_name: string; role: string; manager_id: string | null; active: boolean };
const ROLES: [string, string][] = [
  ["rep", "Visitador"], ["supervisor", "Supervisor"], ["gerente", "Gerente"],
  ["org_admin", "Admin"], ["viewer", "Lectura"],
];

export function UsuariosClient() {
  const supa = useMemo(() => supabaseBrowser(), []);
  const [profiles, setProfiles] = useState<Prof[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    const { data } = await supa.from("profiles").select("id, full_name, role, manager_id, active").order("full_name");
    if (data) setProfiles(data as Prof[]);
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const managers = useMemo(
    () => profiles.filter((p) => ["supervisor", "gerente", "org_admin"].includes(p.role)),
    [profiles]
  );

  async function update(id: string, patch: Partial<Prof>) {
    setProfiles((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    const { error } = await supa.from("profiles").update(patch).eq("id", id);
    setMsg(error ? `Error: ${error.message}` : "Guardado ✓");
    setTimeout(() => setMsg(null), 1600);
    if (error) load();
  }

  if (loading) return <p className="text-sm text-gray-500">Cargando usuarios…</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-brand-700">Usuarios</h1>
          <p className="text-sm text-gray-500">{profiles.length} en tu organización</p>
        </div>
        {msg && <span className="text-xs text-gray-500">{msg}</span>}
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs text-gray-500">
            <tr>
              <th className="px-4 py-2">Nombre</th>
              <th className="px-4 py-2">Rol</th>
              <th className="px-4 py-2">Supervisor</th>
              <th className="px-4 py-2 text-center">Activo</th>
            </tr>
          </thead>
          <tbody>
            {profiles.map((p) => (
              <tr key={p.id} className="border-t border-gray-100">
                <td className="px-4 py-2 font-medium text-gray-800">{p.full_name}</td>
                <td className="px-4 py-2">
                  <select className="input py-1" value={p.role} onChange={(e) => update(p.id, { role: e.target.value })}>
                    {ROLES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </td>
                <td className="px-4 py-2">
                  <select className="input py-1" value={p.manager_id ?? ""} onChange={(e) => update(p.id, { manager_id: e.target.value || null })}>
                    <option value="">—</option>
                    {managers.filter((m) => m.id !== p.id).map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
                  </select>
                </td>
                <td className="px-4 py-2 text-center">
                  <input type="checkbox" checked={p.active} onChange={(e) => update(p.id, { active: e.target.checked })} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-400">
        Cambiás rol, supervisor y estado en el momento. El alta de un nuevo login todavía se hace desde el panel de Praxis (requiere provisión de administrador).
      </p>
    </div>
  );
}
