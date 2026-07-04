"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { AccountForm, type AccountPayload } from "@/components/account-form";

export default function NuevaCuentaPage() {
  const supa = useMemo(() => supabaseBrowser(), []);
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [dupes, setDupes] = useState<{ id: string; name: string; address: string | null }[]>([]);

  async function checkDupes(name: string) {
    if (name.trim().length < 4) { setDupes([]); return; }
    const { data } = await supa.from("accounts")
      .select("id,name,address")
      .ilike("name", `%${name.trim().split(/\s+/)[0]}%`)
      .limit(5);
    setDupes((data ?? []) as typeof dupes);
  }

  async function save(payload: AccountPayload) {
    setSaving(true);
    const { data: { user } } = await supa.auth.getUser();
    const { data: profile } = await supa.from("profiles").select("org_id").eq("id", user!.id).single();
    const { data, error } = await supa.from("accounts")
      .insert({ ...payload, org_id: profile!.org_id, import_source: "alta manual", created_by: user!.id })
      .select("id").single();
    setSaving(false);
    if (error) { alert("No se pudo crear: " + error.message); return; }
    router.push(`/cuentas/${data!.id}`);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <Link href="/cuentas" className="text-sm text-gray-400 hover:text-gray-600">← Cuentas</Link>
        <h1 className="text-xl font-bold">Nueva cuenta</h1>
      </div>
      {dupes.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <p className="font-medium">Posibles duplicados:</p>
          <ul className="mt-1 list-inside list-disc">
            {dupes.map((d) => (
              <li key={d.id}>
                <Link className="underline" href={`/cuentas/${d.id}`}>{d.name}</Link>
                {d.address ? ` — ${d.address}` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="card" onBlur={(e) => {
        const t = e.target as HTMLInputElement;
        if (t.tagName === "INPUT" && t.closest("div")?.querySelector("label")?.textContent?.startsWith("Nombre")) checkDupes(t.value);
      }}>
        <AccountForm initial={{}} onSave={save} saving={saving} submitLabel="Crear cuenta" />
      </div>
    </div>
  );
}
