"use client";
import { useState } from "react";
import { STATUS_LABELS, FREQ_LABELS, type Account, type ManagementStatus, type VisitFrequency } from "@/lib/types";
import { fmtBirthday } from "@/lib/format";

export type AccountPayload = Partial<Omit<Account, "id" | "org_id" | "created_at" | "updated_at">>;

/** Acepta "DD/MM" o "DD/MM/AAAA". Devuelve ISO, null (vacío) o "invalid". */
export function parseBirthdayInput(s: string): string | null | "invalid" {
  const v = s.trim();
  if (!v || v === "—") return null;
  let m = v.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  m = v.match(/^(\d{1,2})[\/\-.](\d{1,2})$/);
  if (m) return `1904-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return "invalid";
}

export function AccountForm({
  initial, onSave, saving, submitLabel = "Guardar cambios"
}: {
  initial: Partial<Account>;
  onSave: (payload: AccountPayload) => Promise<void>;
  saving: boolean;
  submitLabel?: string;
}) {
  const [f, setF] = useState({
    name: initial.name ?? "",
    specialty: initial.specialty ?? "",
    institution: initial.institution ?? "",
    address: initial.address ?? "",
    neighborhood: initial.neighborhood ?? "",
    city: initial.city ?? "",
    province: initial.province ?? "",
    phone: initial.phone ?? "",
    whatsapp: initial.whatsapp ?? "",
    email: initial.email ?? "",
    birthdayText: initial.birthday ? fmtBirthday(initial.birthday) : "",
    visited: initial.visited ?? false,
    status: (initial.status ?? "pendiente") as ManagementStatus,
    general_notes: initial.general_notes ?? "",
    next_action: initial.next_action ?? "",
    next_action_date: initial.next_action_date ?? "",
    frequency: (initial.frequency ?? "") as VisitFrequency | ""
  });
  const [err, setErr] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setF((p) => ({ ...p, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!f.name.trim()) { setErr("El nombre es obligatorio."); return; }
    const birthday = parseBirthdayInput(f.birthdayText);
    if (birthday === "invalid") { setErr("Cumpleaños inválido. Usá DD/MM o DD/MM/AAAA."); return; }
    await onSave({
      name: f.name.trim(),
      specialty: f.specialty.trim() || null,
      institution: f.institution.trim() || null,
      address: f.address.trim() || null,
      neighborhood: f.neighborhood.trim() || null,
      city: f.city.trim() || null,
      province: f.province.trim() || null,
      phone: f.phone.trim() || null,
      whatsapp: f.whatsapp.trim() || null,
      email: f.email.trim().toLowerCase() || null,
      birthday,
      visited: f.visited,
      status: f.status,
      general_notes: f.general_notes.trim() || null,
      next_action: f.next_action.trim() || null,
      next_action_date: f.next_action_date || null,
      frequency: f.frequency || null
    });
  }

  return (
    <form onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label className="lbl">Nombre *</label>
        <input className="input" value={f.name} onChange={set("name")} />
      </div>
      <div><label className="lbl">Especialidad</label>
        <input className="input" value={f.specialty} onChange={set("specialty")} /></div>
      <div><label className="lbl">Institución</label>
        <input className="input" value={f.institution} onChange={set("institution")} /></div>
      <div className="sm:col-span-2"><label className="lbl">Dirección</label>
        <input className="input" value={f.address} onChange={set("address")} /></div>
      <div><label className="lbl">Barrio</label>
        <input className="input" value={f.neighborhood} onChange={set("neighborhood")} placeholder="Sin determinar" /></div>
      <div><label className="lbl">Localidad</label>
        <input className="input" value={f.city} onChange={set("city")} /></div>
      <div><label className="lbl">Provincia</label>
        <input className="input" value={f.province} onChange={set("province")} /></div>
      <div><label className="lbl">Cumpleaños (DD/MM o DD/MM/AAAA)</label>
        <input className="input" value={f.birthdayText} onChange={set("birthdayText")} placeholder="15/03" /></div>
      <div><label className="lbl">Teléfono</label>
        <input className="input" value={f.phone} onChange={set("phone")} /></div>
      <div><label className="lbl">WhatsApp</label>
        <input className="input" value={f.whatsapp} onChange={set("whatsapp")} /></div>
      <div className="sm:col-span-2"><label className="lbl">Email</label>
        <input className="input" type="email" value={f.email} onChange={set("email")} /></div>
      <div>
        <label className="lbl">Visitado</label>
        <select className="input" value={f.visited ? "si" : "no"}
          onChange={(e) => setF((p) => ({ ...p, visited: e.target.value === "si" }))}>
          <option value="no">No</option>
          <option value="si">Sí</option>
        </select>
      </div>
      <div>
        <label className="lbl">Estado de gestión</label>
        <select className="input" value={f.status} onChange={set("status")}>
          {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>
      <div><label className="lbl">Próxima acción</label>
        <input className="input" value={f.next_action} onChange={set("next_action")} placeholder="Llamar para coordinar reunión" /></div>
      <div><label className="lbl">Fecha próxima acción</label>
        <input className="input" type="date" value={f.next_action_date} onChange={set("next_action_date")} /></div>
      <div>
        <label className="lbl">Frecuencia de visita</label>
        <select className="input" value={f.frequency} onChange={set("frequency")}>
          <option value="">Sin definir</option>
          {Object.entries(FREQ_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>
      <div className="sm:col-span-2"><label className="lbl">Notas generales</label>
        <textarea className="input" rows={3} value={f.general_notes} onChange={set("general_notes")} /></div>
      {err && <p className="text-sm text-red-600 sm:col-span-2">{err}</p>}
      <div className="sm:col-span-2">
        <button className="btn-primary w-full sm:w-auto" disabled={saving}>
          {saving ? "Guardando…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
