import * as XLSX from "xlsx";
import type { Account } from "./types";
import { fmtBirthday, fmtDate } from "./format";
import { STATUS_LABELS } from "./types";

// ── Normalización ────────────────────────────────────────────────────
export const KNOWN_SPECIALTIES = [
  "DERMATOLOGIA", "PEDIATRIA", "CLINICA MEDICA", "GINECOLOGIA", "CARDIOLOGIA",
  "ALERGIA", "INMUNOLOGIA", "MEDICINA GENERAL", "MEDICINA FAMILIAR", "COSMETOLOGIA",
  "CIRUGIA PLASTICA", "FLEBOLOGIA", "ENDOCRINOLOGIA", "REUMATOLOGIA",
];

export function titleCase(s: string): string {
  return s.toLowerCase().replace(/(^|\s|\.|-)([a-záéíóúüñ])/g, (m) => m.toUpperCase()).trim();
}

export function normKey(s: string): string {
  return s.toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Z0-9]/g, "");
}

/** Separa "DERMATOLOGIA - SOCIEDAD ITALIANA" en { specialty, institution }. */
export function splitSpecialty(raw: string | null | undefined): { specialty: string | null; institution: string | null; noisy: boolean } {
  if (!raw || !raw.trim()) return { specialty: null, institution: null, noisy: false };
  const v = raw.trim();
  if (/^home\b/i.test(v)) return { specialty: null, institution: null, noisy: true }; // ruido de OCR
  const idx = v.indexOf(" - ");
  if (idx > -1) {
    const left = v.slice(0, idx).trim();
    const right = v.slice(idx + 3).trim();
    return { specialty: titleCase(left), institution: right ? titleCase(right) : null, noisy: false };
  }
  const isSpec = KNOWN_SPECIALTIES.some((s) => normKey(v).startsWith(normKey(s)));
  return isSpec
    ? { specialty: titleCase(v), institution: null, noisy: false }
    : { specialty: null, institution: titleCase(v), noisy: false };
}

/** "ARENAL2871, CAPITAL FEDERAL 0000142" → { address, city } */
export function parseAddress(raw: string | null | undefined): { address: string | null; city: string | null } {
  if (!raw || !raw.trim()) return { address: null, city: null };
  let v = raw.trim().replace(/\s+/g, " ");
  const comma = v.lastIndexOf(",");
  let city: string | null = null;
  if (comma > -1) {
    city = v.slice(comma + 1).replace(/\d[\d\s]*$/g, "").trim(); // saca código postal pegado
    v = v.slice(0, comma).trim();
    if (/^caba$/i.test(city) || /capital federal/i.test(city)) city = "Capital Federal";
    else city = titleCase(city);
    if (!city) city = null;
  }
  const address = titleCase(v.replace(/([a-zA-Z])(\d)/g, "$1 $2")); // "ARENAL2871" → "Arenal 2871"
  return { address: address || null, city };
}

// ── Lectura del Excel ────────────────────────────────────────────────
export interface ParsedRow {
  rowNumber: number;
  raw: Record<string, unknown>;
  parsed: {
    name: string;
    specialty: string | null;
    institution: string | null;
    address: string | null;
    city: string | null;
    phone: string | null;
    email: string | null;
    visited: boolean;
    general_notes: string | null;
    import_source: string | null;
    birthday: string | null;
  };
  issues: string[];
  duplicateOf?: string; // id de cuenta existente
}

export const EXPECTED_COLUMNS: { key: string; label: string; aliases: string[] }[] = [
  { key: "name", label: "Nombre", aliases: ["NOMBRE"] },
  { key: "specialty_inst", label: "Especialidad / Institución", aliases: ["ESPECIALIDAD / INSTITUCIÓN", "ESPECIALIDAD", "ESPECIALIDAD/INSTITUCION"] },
  { key: "address", label: "Dirección", aliases: ["DIRECCIÓN", "DIRECCION"] },
  { key: "neighborhood", label: "Barrio", aliases: ["BARRIO"] },
  { key: "phone", label: "Teléfono", aliases: ["TELÉFONO", "TELEFONO", "TEL"] },
  { key: "email", label: "Email", aliases: ["EMAIL", "MAIL", "CORREO"] },
  { key: "birthday", label: "Cumpleaños", aliases: ["CUMPLEAÑOS", "CUMPLEANOS", "CUMPLE"] },
  { key: "visited", label: "Visitado", aliases: ["VISITADO"] },
  { key: "notes", label: "Notas", aliases: ["NOTAS", "NOTA"] },
  { key: "source", label: "Fuente", aliases: ["FUENTE"] },
];

export function guessMapping(headers: string[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const col of EXPECTED_COLUMNS) {
    const hit = headers.find((h) => col.aliases.some((a) => normKey(a) === normKey(h)));
    if (hit) map[col.key] = hit;
  }
  return map;
}

export function readWorkbook(buf: ArrayBuffer): { headers: string[]; rows: Record<string, unknown>[] } {
  const wb = XLSX.read(buf, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
  const headers = rows.length ? Object.keys(rows[0]) : [];
  return { headers, rows };
}

function parseBirthday(v: unknown): string | null {
  if (!v) return null;
  const s = String(v).trim();
  let m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})$/);
  if (m) return `1904-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return null;
}

export function parseRows(
  rows: Record<string, unknown>[],
  mapping: Record<string, string>,
  fileName: string
): ParsedRow[] {
  const get = (r: Record<string, unknown>, key: string) => {
    const col = mapping[key];
    const v = col ? r[col] : undefined;
    return v === undefined || v === null ? "" : String(v).trim();
  };
  return rows
    .map((raw, i) => {
      const name = titleCase(get(raw, "name"));
      const { specialty, institution, noisy } = splitSpecialty(get(raw, "specialty_inst"));
      const { address, city } = parseAddress(get(raw, "address"));
      const phone = get(raw, "phone") || null;
      const email = get(raw, "email").toLowerCase() || null;
      const issues: string[] = [];
      if (!name) issues.push("sin_nombre");
      if (noisy) issues.push("ruido_ocr");
      if (!specialty && !institution) issues.push("sin_especialidad");
      if (!address) issues.push("sin_direccion");
      if (!phone) issues.push("sin_telefono");
      if (!email) issues.push("sin_email");
      return {
        rowNumber: i + 2,
        raw,
        parsed: {
          name, specialty, institution, address, city, phone, email,
          visited: /^s[ií]$/i.test(get(raw, "visited")),
          general_notes: get(raw, "notes") || null,
          import_source: get(raw, "source") || fileName,
          birthday: parseBirthday(get(raw, "birthday")),
        },
        issues,
      };
    })
    .filter((r) => r.parsed.name);
}

/** Clave de deduplicación: nombre + dirección normalizados. */
export function dedupeKey(name: string, address: string | null): string {
  return normKey(name) + "|" + normKey(address ?? "");
}

// ── Exportación ──────────────────────────────────────────────────────
export function exportAccounts(accounts: Account[], fileName = "praxis_visita_cuentas.xlsx") {
  const data = accounts.map((a) => ({
    NOMBRE: a.name,
    ESPECIALIDAD: a.specialty ?? "",
    INSTITUCIÓN: a.institution ?? "",
    DIRECCIÓN: a.address ?? "",
    BARRIO: a.neighborhood ?? "",
    LOCALIDAD: a.city ?? "",
    TELÉFONO: a.phone ?? "",
    WHATSAPP: a.whatsapp ?? "",
    EMAIL: a.email ?? "",
    CUMPLEAÑOS: fmtBirthday(a.birthday),
    VISITADO: a.visited ? "Sí" : "No",
    "ÚLTIMA VISITA": a.last_visit_at ? new Date(a.last_visit_at).toLocaleDateString("es-AR") : "",
    "ESTADO DE GESTIÓN": STATUS_LABELS[a.status],
    "PRÓXIMA ACCIÓN": a.next_action ?? "",
    "FECHA PRÓX. ACCIÓN": fmtDate(a.next_action_date),
    NOTAS: a.general_notes ?? "",
    "ESTADO DEL REGISTRO": a.record_status,
    FUENTE: a.import_source ?? "",
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  ws["!cols"] = Object.keys(data[0] ?? { A: 1 }).map((k) => ({ wch: Math.max(k.length + 2, 14) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Cuentas");
  XLSX.writeFile(wb, fileName);
}
