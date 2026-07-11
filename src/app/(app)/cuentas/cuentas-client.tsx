"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/client";
import { STATUS_LABELS, type Account, type ManagementStatus } from "@/lib/types";
import { fmtBirthday, fmtDate, daysToBirthday, telHref, waHref, mailHref, mapsHref } from "@/lib/format";
import { exportAccounts } from "@/lib/excel";
import { StatusBadge } from "@/components/status-badge";

type SortKey = "name" | "specialty" | "institution" | "zone" | "birthday" | "last_visit";
type MissingFilter = "" | "sin_email" | "sin_telefono" | "sin_cumple" | "sin_barrio";

export function CuentasClient({ showAssignee = false, initialAssignee = "", meId = "" }: { showAssignee?: boolean; initialAssignee?: string; meId?: string }) {
  const supa = useMemo(() => supabaseBrowser(), []);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [reps, setReps] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [fZone, setFZone] = useState("");
  const [fVisited, setFVisited] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [fSpecialty, setFSpecialty] = useState("");
  const [fMissing, setFMissing] = useState<MissingFilter>("");
  const [fAssignee, setFAssignee] = useState(initialAssignee);
  const [sort, setSort] = useState<SortKey>("name");

  async function load() {
    const { data, error } = await supa
      .from("accounts")
      .select("*")
      .eq("record_status", "activo")
      .order("name");
    if (!error && data) setAccounts(data as Account[]);
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  useEffect(() => {
    if (!showAssignee) return;
    supa.from("profiles").select("id, full_name, role").then(({ data }) => {
      if (data) {
        const rows = data as { id: string; full_name: string; role: string }[];
        setNames(Object.fromEntries(rows.map((p) => [p.id, p.full_name])));
        setReps(rows.filter((p) => p.role === "rep").map((p) => ({ id: p.id, name: p.full_name })));
      }
    });
  }, [supa, showAssignee]);

  const assigneeName = (a: Account) => names[(a as { assigned_user_id?: string }).assigned_user_id ?? ""] ?? "Sin asignar";
  const assignees = useMemo(() => {
    const set = new Map<string, string>();
    for (const a of accounts) {
      const id = (a as { assigned_user_id?: string }).assigned_user_id ?? "";
      if (id) set.set(id, names[id] ?? "—");
    }
    return Array.from(set.entries()).sort((x, y) => x[1].localeCompare(y[1]));
  }, [accounts, names]);

  async function requestUnassign(a: Account) {
    const reason = window.prompt(`Solicitar desvinculación de "${a.name}".\nMotivo (opcional):`, "");
    if (reason === null) return;
    const { error } = await supa.from("unassign_requests").insert({
      org_id: a.org_id, account_id: a.id, requested_by: meId, reason: reason || null,
    });
    if (error) { alert("No se pudo enviar la solicitud: " + error.message); return; }
    setAccounts((prev) => prev.map((x) => (x.id === a.id ? ({ ...x, unassign_requested_at: new Date().toISOString() } as Account) : x)));
  }

  async function reassign(a: Account, userId: string) {
    const val = userId || null;
    setAccounts((prev) => prev.map((x) => (x.id === a.id ? ({ ...x, assigned_user_id: val } as Account) : x)));
    const { error } = await supa.from("accounts").update({ assigned_user_id: val }).eq("id", a.id);
    if (error) { alert("No se pudo reasignar: " + error.message); load(); }
  }

  async function toggleVisited(a: Account) {
    const next = !a.visited;
    setAccounts((prev) => prev.map((x) => (x.id === a.id ? { ...x, visited: next } : x)));
    const { error } = await supa.from("accounts").update({ visited: next }).eq("id", a.id);
    if (error) setAccounts((prev) => prev.map((x) => (x.id === a.id ? { ...x, visited: a.visited } : x)));
    else load(); // refresca last_visit_at/status calculados por triggers
  }

  const zone = (a: Account) => a.neighborhood || a.city || "";

  const zones = useMemo(
    () => Array.from(new Set(accounts.map(zone).filter(Boolean))).sort(),
    [accounts]
  );
  const specialties = useMemo(
    () => Array.from(new Set(accounts.map((a) => a.specialty).filter(Boolean) as string[])).sort(),
    [accounts]
  );

  const filtered = useMemo(() => {
    const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    const nq = norm(q);
    let list = accounts.filter((a) => {
      if (nq) {
        const hay = norm([a.name, a.specialty, a.institution, a.address, a.neighborhood, a.city, a.email, a.phone].filter(Boolean).join(" "));
        if (!hay.includes(nq)) return false;
      }
      if (fZone && zone(a) !== fZone) return false;
      if (fVisited === "si" && !a.visited) return false;
      if (fVisited === "no" && a.visited) return false;
      if (fStatus && a.status !== fStatus) return false;
      if (fSpecialty && a.specialty !== fSpecialty) return false;
      if (fMissing === "sin_email" && a.email) return false;
      if (fMissing === "sin_telefono" && (a.phone || a.whatsapp)) return false;
      if (fMissing === "sin_cumple" && a.birthday) return false;
      if (fMissing === "sin_barrio" && (a.neighborhood || a.city)) return false;
      if (fAssignee && ((a as { assigned_user_id?: string }).assigned_user_id ?? "") !== fAssignee) return false;
      return true;
    });
    const cmp: Record<SortKey, (a: Account, b: Account) => number> = {
      name: (a, b) => a.name.localeCompare(b.name),
      specialty: (a, b) => (a.specialty ?? "￿").localeCompare(b.specialty ?? "￿"),
      institution: (a, b) => (a.institution ?? "￿").localeCompare(b.institution ?? "￿"),
      zone: (a, b) => (zone(a) || "￿").localeCompare(zone(b) || "￿"),
      birthday: (a, b) => (daysToBirthday(a.birthday) ?? 999) - (daysToBirthday(b.birthday) ?? 999),
      last_visit: (a, b) => (b.last_visit_at ?? "").localeCompare(a.last_visit_at ?? "")
    };
    return [...list].sort(cmp[sort]);
  }, [accounts, q, fZone, fVisited, fStatus, fSpecialty, fMissing, fAssignee, sort]);

  const visitedCount = accounts.filter((a) => a.visited).length;
  const pct = accounts.length ? Math.round((visitedCount / accounts.length) * 100) : 0;

  if (loading) return <p className="py-10 text-center text-gray-400">Cargando cuentas…</p>;

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="card !p-3 text-center"><p className="text-2xl font-bold">{accounts.length}</p><p className="text-xs text-gray-500">Cuentas</p></div>
        <div className="card !p-3 text-center"><p className="text-2xl font-bold text-green-600">{visitedCount}</p><p className="text-xs text-gray-500">Visitadas</p></div>
        <div className="card !p-3 text-center"><p className="text-2xl font-bold text-amber-600">{accounts.length - visitedCount}</p><p className="text-xs text-gray-500">Pendientes</p></div>
        <div className="card !p-3 text-center"><p className="text-2xl font-bold text-brand-600">{pct}%</p><p className="text-xs text-gray-500">Avance</p></div>
      </div>

      {/* Acciones + búsqueda */}
      <div className="flex flex-wrap items-center gap-2">
        <input className="input min-w-0 flex-1 sm:max-w-xs" placeholder="Buscar por nombre, dirección, email…"
          value={q} onChange={(e) => setQ(e.target.value)} />
        <Link href="/cuentas/nueva" className="btn-primary">+ Nueva</Link>
        <button className="btn-ghost" onClick={() => exportAccounts(filtered)}>Exportar ({filtered.length})</button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        <select className="input !w-auto" value={fZone} onChange={(e) => setFZone(e.target.value)}>
          <option value="">Barrio/Localidad: todos</option>
          {zones.map((z) => <option key={z} value={z}>{z}</option>)}
        </select>
        <select className="input !w-auto" value={fVisited} onChange={(e) => setFVisited(e.target.value)}>
          <option value="">Visitado: todos</option>
          <option value="si">Sí</option>
          <option value="no">No</option>
        </select>
        <select className="input !w-auto" value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
          <option value="">Estado: todos</option>
          {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select className="input !w-auto" value={fSpecialty} onChange={(e) => setFSpecialty(e.target.value)}>
          <option value="">Especialidad: todas</option>
          {specialties.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="input !w-auto" value={fMissing} onChange={(e) => setFMissing(e.target.value as MissingFilter)}>
          <option value="">Datos faltantes…</option>
          <option value="sin_email">Sin email</option>
          <option value="sin_telefono">Sin teléfono</option>
          <option value="sin_cumple">Sin cumpleaños</option>
          <option value="sin_barrio">Sin barrio/localidad</option>
        </select>
        {showAssignee && (
          <select className="input !w-auto" value={fAssignee} onChange={(e) => setFAssignee(e.target.value)}>
            <option value="">Asignado a: todos</option>
            {assignees.map(([id, nm]) => <option key={id} value={id}>{nm}</option>)}
          </select>
        )}
        <select className="input !w-auto" value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
          <option value="name">Orden: nombre</option>
          <option value="specialty">Orden: especialidad</option>
          <option value="institution">Orden: institución</option>
          <option value="zone">Orden: barrio/localidad</option>
          <option value="birthday">Orden: próximo cumpleaños</option>
          <option value="last_visit">Orden: última visita</option>
        </select>
      </div>

      {/* Tabla desktop */}
      <div className="hidden overflow-x-auto rounded-xl border border-gray-200 bg-white md:block">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-3 py-2">Visitado</th>
              <th className="px-3 py-2">Nombre</th>
              <th className="px-3 py-2">Especialidad</th>
              <th className="px-3 py-2">Institución</th>
              <th className="px-3 py-2">Dirección</th>
              <th className="px-3 py-2">Barrio/Loc.</th>
              <th className="px-3 py-2">Teléfono</th>
              <th className="px-3 py-2">Email</th>
              {showAssignee && <th className="px-3 py-2">Asignado a</th>}
              <th className="px-3 py-2">Cumple</th>
              <th className="px-3 py-2">Últ. visita</th>
              <th className="px-3 py-2">Estado</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((a) => (
              <tr key={a.id} className={`border-t border-gray-100 hover:bg-gray-50 ${a.visited ? "bg-green-50" : ""}`}>
                <td className="px-3 py-2">
                  <button onClick={() => toggleVisited(a)}
                    className={`badge ${a.visited ? "bg-green-600 text-white" : "border border-gray-300 bg-white text-gray-500"}`}>
                    {a.visited ? "Sí" : "No"}
                  </button>
                </td>
                <td className="px-3 py-2 font-medium">
                  <Link className="text-brand-700 hover:underline" href={`/cuentas/${a.id}`}>{a.name}</Link>
                  {(a as { unassign_requested_at?: string }).unassign_requested_at && <span className="ml-2 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">desvinculación</span>}
                </td>
                <td className="px-3 py-2">{a.specialty ?? "—"}</td>
                <td className="px-3 py-2">{a.institution ?? "—"}</td>
                <td className="px-3 py-2">{a.address ?? "—"}</td>
                <td className="px-3 py-2">{zone(a) || "—"}</td>
                <td className="px-3 py-2">{a.phone ?? "—"}</td>
                <td className="max-w-[180px] truncate px-3 py-2">{a.email ?? "—"}</td>
                {showAssignee && (
                  <td className="px-3 py-2">
                    <select className="input py-1 text-xs" value={(a as { assigned_user_id?: string }).assigned_user_id ?? ""} onChange={(e) => reassign(a, e.target.value)}>
                      <option value="">Sin asignar</option>
                      {reps.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                  </td>
                )}
                <td className="px-3 py-2">{fmtBirthday(a.birthday)}</td>
                <td className="px-3 py-2">{a.last_visit_at ? fmtDate(a.last_visit_at.split("T")[0]) : "—"}</td>
                <td className="px-3 py-2"><StatusBadge status={a.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="p-6 text-center text-gray-400">Sin resultados con estos filtros.</p>}
      </div>

      {/* Tarjetas mobile */}
      <div className="space-y-3 md:hidden">
        {filtered.map((a) => {
          const tel = telHref(a), wa = waHref(a), mail = mailHref(a), maps = mapsHref(a);
          return (
            <div key={a.id} className={`card ${a.visited ? "!bg-green-50 border-green-200" : ""}`}>
              <div className="flex items-start justify-between gap-2">
                <Link href={`/cuentas/${a.id}`} className="font-semibold text-brand-700">{a.name}</Link>
                <button onClick={() => toggleVisited(a)}
                  className={`badge shrink-0 ${a.visited ? "bg-green-600 text-white" : "border border-gray-300 text-gray-500"}`}>
                  {a.visited ? "Visitado" : "Pendiente"}
                </button>
              </div>
              <p className="mt-0.5 text-sm text-gray-600">
                {[a.specialty, a.institution].filter(Boolean).join(" · ") || "Sin especialidad"}
              </p>
              <p className="text-sm text-gray-500">{[a.address, zone(a)].filter(Boolean).join(" · ")}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                {showAssignee && (
                  <select className="input !w-auto py-0.5 text-xs" value={(a as { assigned_user_id?: string }).assigned_user_id ?? ""} onChange={(e) => reassign(a, e.target.value)}>
                    <option value="">Sin asignar</option>
                    {reps.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                )}
                <span>Cumple: {fmtBirthday(a.birthday)}</span>
                <StatusBadge status={a.status} />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {tel && <a className="btn-ghost btn-sm" href={tel}>Llamar</a>}
                {wa && <a className="btn-ghost btn-sm" href={wa} target="_blank">WhatsApp</a>}
                {mail && <a className="btn-ghost btn-sm" href={mail}>Email</a>}
                {maps && <a className="btn-ghost btn-sm" href={maps} target="_blank">Mapa</a>}
                <Link className="btn-ghost btn-sm" href={`/cuentas/${a.id}`}>Editar</Link>
                {(a as { assigned_user_id?: string }).assigned_user_id === meId && !(a as { unassign_requested_at?: string }).unassign_requested_at && (
                  <button className="btn-ghost btn-sm text-amber-700" onClick={() => requestUnassign(a)}>Solicitar desvinculación</button>
                )}
                {(a as { unassign_requested_at?: string }).unassign_requested_at && (
                  <span className="btn-sm rounded-lg bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700">Desvinculación solicitada</span>
                )}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && <p className="p-6 text-center text-gray-400">Sin resultados con estos filtros.</p>}
      </div>
    </div>
  );
}
