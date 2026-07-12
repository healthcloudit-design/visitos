"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import {
  readWorkbook, guessMapping, parseRows, dedupeKey,
  EXPECTED_COLUMNS, type ParsedRow
} from "@/lib/excel";

type Step = "archivo" | "mapeo" | "previa" | "listo";

export function ImportarClient() {
  const supa = useMemo(() => supabaseBrowser(), []);
  const router = useRouter();
  const [step, setStep] = useState<Step>("archivo");
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, unknown>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ nuevos: number; duplicados: number; incompletos: number } | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const buf = await file.arrayBuffer();
    const { headers, rows } = readWorkbook(buf);
    setHeaders(headers);
    setRawRows(rows);
    setMapping(guessMapping(headers));
    setStep("mapeo");
  }

  async function toPreview() {
    const parsed = parseRows(rawRows, mapping, fileName);
    // dedupe contra cuentas existentes
    const { data: existing } = await supa.from("accounts").select("id,name,address");
    const keys = new Map<string, string>();
    (existing ?? []).forEach((a: { id: string; name: string; address: string | null }) =>
      keys.set(dedupeKey(a.name, a.address), a.id));
    // dedupe interno del archivo
    const seen = new Set<string>();
    for (const r of parsed) {
      const k = dedupeKey(r.parsed.name, r.parsed.address);
      if (keys.has(k)) r.duplicateOf = keys.get(k);
      else if (seen.has(k)) r.duplicateOf = "archivo";
      seen.add(k);
    }
    setRows(parsed);
    setStep("previa");
  }

  const stats = useMemo(() => ({
    total: rows.length,
    nuevos: rows.filter((r) => !r.duplicateOf).length,
    duplicados: rows.filter((r) => r.duplicateOf).length,
    incompletos: rows.filter((r) => r.issues.some((i) => ["ruido_ocr", "sin_especialidad", "sin_direccion"].includes(i))).length,
    sinEmail: rows.filter((r) => r.issues.includes("sin_email")).length,
    sinTel: rows.filter((r) => r.issues.includes("sin_telefono")).length
  }), [rows]);

  async function confirm() {
    setImporting(true);
    const { data: { user } } = await supa.auth.getUser();
    const { data: profile } = await supa.from("profiles").select("org_id").eq("id", user!.id).single();
    const orgId = profile!.org_id as string;

    const { data: batch } = await supa.from("import_batches").insert({
      org_id: orgId, user_id: user!.id, file_name: fileName,
      column_mapping: mapping, status: "confirmado",
      totals: stats, confirmed_at: new Date().toISOString()
    }).select("id").single();

    const toInsert = rows.filter((r) => !r.duplicateOf).map((r) => ({
      org_id: orgId,
      name: r.parsed.name,
      specialty: r.parsed.specialty,
      institution: r.parsed.institution,
      address: r.parsed.address,
      city: r.parsed.city,
      phone: r.parsed.phone,
      email: r.parsed.email,
      birthday: r.parsed.birthday,
      visited: r.parsed.visited,
      general_notes: r.parsed.general_notes,
      import_source: r.parsed.import_source ?? fileName,
      status: r.issues.some((i) => ["ruido_ocr", "sin_especialidad", "sin_direccion"].includes(i))
        ? "datos_incompletos" : "pendiente",
      created_by: user!.id
    }));

    for (let i = 0; i < toInsert.length; i += 50) {
      const { error } = await supa.from("accounts").insert(toInsert.slice(i, i + 50));
      if (error) { alert("Error al importar: " + error.message); setImporting(false); return; }
    }
    void batch;
    setResult({ nuevos: toInsert.length, duplicados: stats.duplicados, incompletos: stats.incompletos });
    setImporting(false);
    setStep("listo");
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <h1 className="text-xl font-bold">Importar Excel</h1>

      {step === "archivo" && (
        <div className="card">
          <p className="mb-3 text-sm text-gray-600">
            Subí una planilla <b>.xlsx</b>. Columnas esperadas: NOMBRE, ESPECIALIDAD / INSTITUCIÓN, DIRECCIÓN,
            TELÉFONO, EMAIL, CUMPLEAÑOS, VISITADO, NOTAS, FUENTE. Después podés ajustar el mapeo.
          </p>
          <input type="file" accept=".xlsx,.xls" onChange={onFile}
            className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-brand-600 file:px-4 file:py-2 file:text-white" />
        </div>
      )}

      {step === "mapeo" && (
        <div className="card space-y-3">
          <p className="text-sm text-gray-600"><b>{fileName}</b> — {rawRows.length} filas. Confirmá qué columna corresponde a cada campo:</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {EXPECTED_COLUMNS.map((c) => (
              <div key={c.key}>
                <label className="lbl">{c.label}</label>
                <select className="input" value={mapping[c.key] ?? ""}
                  onChange={(e) => setMapping((m) => ({ ...m, [c.key]: e.target.value }))}>
                  <option value="">(no importar)</option>
                  {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button className="btn-primary" onClick={toPreview}>Ver vista previa</button>
            <button className="btn-ghost" onClick={() => setStep("archivo")}>Cancelar</button>
          </div>
        </div>
      )}

      {step === "previa" && (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-6">
            {[
              ["Leídos", stats.total], ["Nuevos", stats.nuevos], ["Duplicados", stats.duplicados],
              ["Incompletos", stats.incompletos], ["Sin email", stats.sinEmail], ["Sin teléfono", stats.sinTel]
            ].map(([l, v]) => (
              <div key={l as string} className="card !p-3 text-center">
                <p className="text-xl font-bold">{v}</p><p className="text-xs text-gray-500">{l}</p>
              </div>
            ))}
          </div>
          <div className="max-h-96 overflow-auto rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-gray-50 text-left uppercase text-gray-500">
                <tr>
                  <th className="px-2 py-2">Fila</th><th className="px-2 py-2">Nombre</th>
                  <th className="px-2 py-2">Especialidad</th><th className="px-2 py-2">Institución</th>
                  <th className="px-2 py-2">Dirección</th><th className="px-2 py-2">Localidad</th>
                  <th className="px-2 py-2">Email</th><th className="px-2 py-2">Resultado</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.rowNumber} className={`border-t border-gray-100 ${r.duplicateOf ? "bg-amber-50" : ""}`}>
                    <td className="px-2 py-1.5 text-gray-400">{r.rowNumber}</td>
                    <td className="px-2 py-1.5 font-medium">{r.parsed.name}</td>
                    <td className="px-2 py-1.5">{r.parsed.specialty ?? "—"}</td>
                    <td className="px-2 py-1.5">{r.parsed.institution ?? "—"}</td>
                    <td className="px-2 py-1.5">{r.parsed.address ?? "—"}</td>
                    <td className="px-2 py-1.5">{r.parsed.city ?? "—"}</td>
                    <td className="max-w-[140px] truncate px-2 py-1.5">{r.parsed.email ?? "—"}</td>
                    <td className="px-2 py-1.5">
                      {r.duplicateOf
                        ? <span className="badge bg-amber-100 text-amber-800">duplicado (se omite)</span>
                        : r.issues.some((i) => ["ruido_ocr", "sin_especialidad", "sin_direccion"].includes(i))
                          ? <span className="badge bg-orange-100 text-orange-800">incompleto (se importa)</span>
                          : <span className="badge bg-green-100 text-green-800">nuevo</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex gap-2">
            <button className="btn-primary" onClick={confirm} disabled={importing || stats.nuevos === 0}>
              {importing ? "Importando…" : `Confirmar importación (${stats.nuevos} nuevas)`}
            </button>
            <button className="btn-ghost" onClick={() => setStep("mapeo")} disabled={importing}>Volver</button>
            <button className="btn-ghost" onClick={() => { setStep("archivo"); setRows([]); }} disabled={importing}>Cancelar</button>
          </div>
        </>
      )}

      {step === "listo" && result && (
        <div className="card text-center">
          <p className="text-2xl">✅</p>
          <p className="mt-1 font-semibold">Importación completada</p>
          <p className="mt-1 text-sm text-gray-600">
            {result.nuevos} cuentas nuevas · {result.duplicados} duplicados omitidos · {result.incompletos} marcadas “Datos incompletos”
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <Link href="/cuentas" className="btn-primary" onClick={() => router.refresh()}>Ver cuentas</Link>
            <button className="btn-ghost" onClick={() => { setStep("archivo"); setRows([]); setResult(null); }}>Importar otro</button>
          </div>
        </div>
      )}
    </div>
  );
}
