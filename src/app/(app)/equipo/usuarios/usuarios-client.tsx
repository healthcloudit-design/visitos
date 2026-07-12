"use client";
import { Skeleton } from "@/components/skeleton";
import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

type Prof = { id: string; full_name: string; role: string; manager_id: string | null; active: boolean };
type Org = { id: string; name: string };
const ROLES: [string, string][] = [
  ["rep", "Visitador"], ["supervisor", "Supervisor"], ["gerente", "Gerente"],
  ["org_admin", "Admin"], ["viewer", "Lectura"],
];

export function UsuariosClient({ isPlatform = false }: { isPlatform?: boolean }) {
  const supa = useMemo(() => supabaseBrowser(), []);
  const [profiles, setProfiles] = useState<Prof[]>([]);
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  const [fName, setFName] = useState("");
  const [fEmail, setFEmail] = useState("");
  const [fRole, setFRole] = useState("rep");
  const [fManager, setFManager] = useState("");
  const [fOrg, setFOrg] = useState("");
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null);
  const [formErr, setFormErr] = useState<string | null>(null);

  async function load() {
    const { data } = await supa.from("profiles").select("id, full_name, role, manager_id, active").order("full_name");
    if (data) setProfiles(data as Prof[]);
    if (isPlatform) {
      const { data: o } = await supa.from("organizations").select("id, name").order("name");
      if (o) { setOrgs(o as Org[]); setFOrg((prev) => prev || (o[0] as Org)?.id || ""); }
    }
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

  async function createUser() {
    setFormErr(null); setCreated(null);
    if (!fName.trim() || !fEmail.trim()) { setFormErr("Completá nombre y email."); return; }
    setCreating(true);
    const body: Record<string, unknown> = {
      full_name: fName.trim(), email: fEmail.trim(), role: fRole, manager_id: fManager || null,
    };
    if (isPlatform && fOrg) body.org_id = fOrg;
    const { data, error } = await supa.functions.invoke("admin-create-user", { body });
    setCreating(false);
    if (error) { setFormErr(error.message); return; }
    if (!data?.ok) { setFormErr(data?.error ?? "No se pudo crear."); return; }
    setCreated({ email: data.email, password: data.password });
    setFName(""); setFEmail(""); setFRole("rep"); setFManager("");
    load();
  }

  if (loading)
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
      </div>
    );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-brand-700">Usuarios</h1>
          <p className="text-sm text-gray-500">{profiles.length} en tu organización</p>
        </div>
        {msg && <span className="text-xs text-gray-500">{msg}</span>}
      </div>

      <div className="card">
        <h2 className="mb-3 font-semibold">Nuevo usuario</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          <input className="input" placeholder="Nombre y apellido" value={fName} onChange={(e) => setFName(e.target.value)} />
          <input className="input" type="email" placeholder="Email" value={fEmail} onChange={(e) => setFEmail(e.target.value)} />
          <select className="input" value={fRole} onChange={(e) => setFRole(e.target.value)}>
            {ROLES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <select className="input" value={fManager} onChange={(e) => setFManager(e.target.value)}>
            <option value="">Supervisor (opcional)</option>
            {managers.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
          </select>
          {isPlatform && (
            <select className="input" value={fOrg} onChange={(e) => setFOrg(e.target.value)}>
              {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          )}
        </div>
        <div className="mt-3 flex items-center gap-3">
          <button className="btn-primary" onClick={createUser} disabled={creating}>
            {creating ? "Creando…" : "Crear usuario"}
          </button>
          {formErr && <span className="text-sm text-red-600">{formErr}</span>}
        </div>
        {created && (
          <div className="mt-3 rounded-lg border border-green-200 bg-green-50 p-3 text-sm">
            <p className="font-medium text-green-800">Usuario creado ✓</p>
            <p className="mt-1 text-green-700">Email: <b>{created.email}</b></p>
            <p className="text-green-700">Contraseña temporal: <b className="font-mono">{created.password}</b></p>
            <p className="mt-1 text-xs text-green-600">Pasásela al usuario; que la cambie al primer ingreso.</p>
          </div>
        )}
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
                  {p.role === "platform_admin" ? (
                    <span className="text-xs font-medium text-gray-500">Plataforma</span>
                  ) : (
                    <select className="input py-1" value={p.role} onChange={(e) => update(p.id, { role: e.target.value })}>
                      {ROLES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  )}
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
      <p className="text-xs text-gray-400">El alta crea el login al instante con una contraseña temporal. Rol, supervisor y estado se cambian en el momento.</p>
    </div>
  );
}
