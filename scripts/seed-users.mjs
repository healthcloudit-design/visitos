// Crea los usuarios del piloto y sus perfiles.
// Uso:  SUPABASE_SERVICE_ROLE_KEY=... NEXT_PUBLIC_SUPABASE_URL=... node scripts/seed-users.mjs
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY"); process.exit(1); }

const ORG_ID = "a0000000-0000-4000-8000-000000000001";
const USERS = [
  { email: "isaac.e.malinarich@gmail.com", password: process.env.SEED_PASSWORD_1 ?? "VisitOS.2026!", full_name: "Isaac Malinarich", role: "org_admin" },
  { email: process.env.SEED_EMAIL_2 ?? "visitadora@visitos.app", password: process.env.SEED_PASSWORD_2 ?? "VisitOS.2026!", full_name: process.env.SEED_NAME_2 ?? "Visitadora Piloto", role: "org_admin" }
];

const supa = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

for (const u of USERS) {
  const { data, error } = await supa.auth.admin.createUser({
    email: u.email, password: u.password, email_confirm: true
  });
  if (error) { console.error(`✗ ${u.email}: ${error.message}`); continue; }
  const { error: pErr } = await supa.from("profiles").upsert({
    id: data.user.id, org_id: ORG_ID, role: u.role, full_name: u.full_name
  });
  console.log(pErr ? `✗ perfil ${u.email}: ${pErr.message}` : `✓ ${u.email} (${u.role})`);
}
console.log("Listo. Cambiá las contraseñas al primer ingreso.");
