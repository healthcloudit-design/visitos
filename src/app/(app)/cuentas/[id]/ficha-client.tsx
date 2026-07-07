"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/client";
import { FIELD_LABELS, type Account, type ChangeLog, type Note } from "@/lib/types";
import { fmtDateTime, telHref, waHref, mailHref, mapsHref } from "@/lib/format";
import { AccountForm, type AccountPayload } from "@/components/account-form";
import { StatusBadge } from "@/components/status-badge";

interface Visit { id: string; visited_at: string; geo_result: string; notes: string | null; }
interface Delivery { id: string; product: string; quantity: number; delivered_at: string; user_id: string; }

export function FichaClient({ id }: { id: string }) {
  const supa = useMemo(() => supabaseBrowser(), []);
  const [account, setAccount] = useState<Account | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [logs, setLogs] = useState<ChangeLog[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [newNote, setNewNote] = useState("");
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [newProduct, setNewProduct] = useState("");
  const [newQty, setNewQty] = useState("1");
  const [saving, setSaving] = useState(false);
  const [savedOk, setSavedOk] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    const [a, n, l, v, d, pr] = await Promise.all([
      supa.from("accounts").select("*").eq("id", id).single(),
      supa.from("notes").select("*").eq("account_id", id).order("created_at", { ascending: false }),
      supa.from("change_logs").select("*").eq("account_id", id).order("created_at", { ascending: false }).limit(100),
      supa.from("visits").select("id,visited_at,geo_result,notes").eq("account_id", id).order("visited_at", { ascending: false }),
      supa.from("deliveries").select("id,product,quantity,delivered_at,user_id").eq("account_id", id).order("delivered_at", { ascending: false }),
      supa.from("profiles").select("id, full_name"),
    ]);
    if (a.data) setAccount(a.data as Account);
    setNotes((n.data ?? []) as Note[]);
    setLogs((l.data ?? []) as ChangeLog[]);
    setVisits((v.data ?? []) as Visit[]);
    setDeliveries((d.data ?? []) as Delivery[]);
    if (pr.data) setNames(Object.fromEntries((pr.data as { id: string; full_name: string }[]).map((x) => [x.id, x.full_name])));
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id]);

  async function save(payload: AccountPayload) {
    setSaving(true); setSavedOk(false);
    const { error } = await supa.from("accounts").update(payload).eq("id", id);
    setSaving(false);
    if (!error) { setSavedOk(true); load(); setTimeout(() => setSavedOk(false), 2500); }
    else alert("No se pudo guardar: " + error.message);
  }

  async function addNote() {
    if (!newNote.trim() || !account) return;
    const { data: { user } } = await supa.auth.getUser();
    if (!user) return;
    const { error } = await supa.from("notes").insert({
      org_id: account.org_id, account_id: id, user_id: user.id, body: newNote.trim()
    });
    if (!error) { setNewNote(""); load(); }
  }

  async function addDelivery() {
    if (!newProduct.trim() || !account) return;
    const { data: { user } } = await supa.auth.getUser();
    if (!user) return;
    const qty = Math.max(1, parseInt(newQty || "1", 10) || 1);
    const { error } = await supa.from("deliveries").insert({
      org_id: account.org_id, account_id: id, user_id: user.id, product: newProduct.trim(), quantity: qty,
    });
    if (error) { alert("No se pudo registrar: " + error.message); return; }
    setNewProduct(""); setNewQty("1"); load();
  }

  async function deleteDelivery(did: string) {
    const { error } = await supa.from("deliveries").delete().eq("id", did);
    if (!error) load();
  }

  if (loading) return <p className="py-10 text-center text-gray-400">Cargando…</p>;
  if (!account) return <p className="py-10 text-center text-gray-400">Cuenta no encontrada.</p>;

  const tel = telHref(account), wa = waHref(account), mail = mailHref(account), maps = mapsHref(account);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <Link href="/cuentas" className="text-sm text-gray-400 hover:text-gray-600">← Cuentas</Link>
          <h1 className="text-xl font-bold">{account.name}</h1>
          <div className="mt-1 flex items-center gap-2">
            <StatusBadge status={account.status} />
            {account.visited && <span className="badge bg-green-600 text-white">Visitado</span>}
            {account.last_visit_at && <span className="text-xs text-gray-500">Última visita: {fmtDateTime(account.last_visit_at)}</span>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {tel && <a className="btn-ghost btn-sm" href={tel}>Llamar</a>}
          {wa && <a className="btn-ghost btn-sm" href={wa} target="_blank">WhatsApp</a>}
          {mail && <a className="btn-ghost btn-sm" href={mail}>Email</a>}
          {maps && <a className="btn-ghost btn-sm" href={maps} target="_blank">Mapa</a>}
        </div>
      </div>

      <div className="card">
        <h2 className="mb-3 font-semibold">Datos de la cuenta</h2>
        {savedOk && <p className="mb-2 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">Cambios guardados.</p>}
        <AccountForm initial={account} onSave={save} saving={saving} />
      </div>

      <div className="card">
        <h2 className="mb-3 font-semibold">Productos / muestras entregados</h2>
        <div className="mb-3 flex flex-wrap gap-2">
          <input className="input min-w-0 flex-1" placeholder="Producto o muestra (ej: Effaclar Duo)"
            value={newProduct} onChange={(e) => setNewProduct(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addDelivery()} />
          <input className="input w-20" type="number" min="1" step="1" value={newQty}
            onChange={(e) => setNewQty(e.target.value)} />
          <button className="btn-primary shrink-0" onClick={addDelivery}>Registrar</button>
        </div>
        <ul className="space-y-1 text-sm">
          {deliveries.map((d) => (
            <li key={d.id} className="flex items-center justify-between border-b border-gray-100 py-1.5 last:border-0">
              <span><b>{d.quantity}×</b> {d.product}</span>
              <span className="flex items-center gap-2 text-xs text-gray-400">
                {names[d.user_id] ?? ""} · {fmtDateTime(d.delivered_at)}
                <button className="text-red-400 hover:text-red-600" onClick={() => deleteDelivery(d.id)} title="Eliminar">✕</button>
              </span>
            </li>
          ))}
          {deliveries.length === 0 && <p className="text-sm text-gray-400">Todavía no registraste entregas en este consultorio.</p>}
        </ul>
      </div>

      <div className="card">
        <h2 className="mb-3 font-semibold">Notas y seguimiento</h2>
        <div className="mb-3 flex gap-2">
          <input className="input" placeholder="Agregar nota… (ej: Volver a contactar el viernes)"
            value={newNote} onChange={(e) => setNewNote(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addNote()} />
          <button className="btn-primary shrink-0" onClick={addNote}>Agregar</button>
        </div>
        <ul className="space-y-2">
          {notes.map((n) => (
            <li key={n.id} className="rounded-lg bg-gray-50 px-3 py-2 text-sm">
              <p>{n.body}</p>
              <p className="mt-0.5 text-xs text-gray-400">{fmtDateTime(n.created_at)}</p>
            </li>
          ))}
          {notes.length === 0 && <p className="text-sm text-gray-400">Sin notas todavía.</p>}
        </ul>
      </div>

      <div className="card">
        <h2 className="mb-3 font-semibold">Visitas registradas</h2>
        <ul className="space-y-1 text-sm">
          {visits.map((v) => (
            <li key={v.id} className="flex justify-between border-b border-gray-100 py-1.5 last:border-0">
              <span>{fmtDateTime(v.visited_at)}</span>
              <span className="text-gray-400">{v.geo_result === "desactivada" ? "sin geovalidación" : v.geo_result}</span>
            </li>
          ))}
          {visits.length === 0 && <p className="text-sm text-gray-400">Sin visitas registradas.</p>}
        </ul>
      </div>

      <div className="card">
        <h2 className="mb-3 font-semibold">Historial de cambios</h2>
        <ul className="space-y-1 text-sm">
          {logs.map((l) => (
            <li key={l.id} className="border-b border-gray-100 py-1.5 last:border-0">
              {l.action === "create" ? (
                <span>Cuenta creada</span>
              ) : (
                <span>
                  <b>{FIELD_LABELS[l.field ?? ""] ?? l.field}</b>:{" "}
                  <span className="text-gray-400 line-through">{l.old_value || "vacío"}</span>{" → "}
                  <span>{l.new_value || "vacío"}</span>
                </span>
              )}
              <span className="ml-2 text-xs text-gray-400">{fmtDateTime(l.created_at)}</span>
            </li>
          ))}
          {logs.length === 0 && <p className="text-sm text-gray-400">Sin cambios registrados.</p>}
        </ul>
      </div>
    </div>
  );
}
