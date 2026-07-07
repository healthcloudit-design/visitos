"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

type Req = { id: string; account_id: string; requested_by: string; reason: string | null; created_at: string };

export function SolicitudesClient({ meId }: { meId: string }) {
  const supa = useMemo(() => supabaseBrowser(), []);
  const router = useRouter();
  const [reqs, setReqs] = useState<Req[]>([]);
  const [accs, setAccs] = useState<Record<string, string>>({});
  const [profs, setProfs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    const [r, a, p] = await Promise.all([
      supa.from("unassign_requests").select("id, account_id, requested_by, reason, created_at").eq("status", "pendiente").order("created_at"),
      supa.from("accounts").select("id, name"),
      supa.from("profiles").select("id, full_name"),
    ]);
    if (r.data) setReqs(r.data as Req[]);
    if (a.data) setAccs(Object.fromEntries((a.data as { id: string; name: string }[]).map((x) => [x.id, x.name])));
    if (p.data) setProfs(Object.fromEntries((p.data as { id: string; full_name: string }[]).map((x) => [x.id, x.full_name])));
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  async function resolve(id: string, status: "aprobada" | "rechazada") {
    setReqs((prev) => prev.filter((r) => r.id !== id));
    const { error } = await supa.from("unassign_requests").update({ status, resolved_by: meId }).eq("id", id);
    setMsg(error ? `Error: ${error.message}` : status === "aprobada" ? "Desvinculada ✓" : "Rechazada");
    setTimeout(() => setMsg(null), 1800);
    if (error) load();
    else router.refresh();
  }

  if (loading) return <p className="text-sm text-gray-500">Cargando solicitudes…</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-brand-700">Solicitudes de desvinculación</h1>
          <p className="text-sm text-gray-500">{reqs.length} pendiente(s)</p>
        </div>
        {msg && <span className="text-xs text-gray-500">{msg}</span>}
      </div>
      {reqs.length === 0 ? (
        <p className="card text-sm text-gray-500">No hay solicitudes pendientes. 🎉</p>
      ) : (
        <div className="space-y-3">
          {reqs.map((r) => (
            <div key={r.id} className="card flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="font-semibold text-gray-800">{accs[r.account_id] ?? "—"}</p>
                <p className="text-sm text-gray-500">Solicitó: {profs[r.requested_by] ?? "—"}{r.reason ? ` · "${r.reason}"` : ""}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button className="btn-primary btn-sm" onClick={() => resolve(r.id, "aprobada")}>Aprobar</button>
                <button className="btn-ghost btn-sm" onClick={() => resolve(r.id, "rechazada")}>Rechazar</button>
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="text-xs text-gray-400">Al aprobar, la cuenta se desasigna del visitador y deja de aparecerle; queda sin asignar para reasignar o archivar.</p>
    </div>
  );
}
