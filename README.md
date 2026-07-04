# VisitOS — MVP 1

CRM territorial para visitadores médicos. Next.js 14 + Supabase. Interfaz en español.

## Requisitos

Node 18+ y un proyecto Supabase con la migración `supabase/migrations/0001_init.sql` aplicada.

## Correr localmente

```bash
cd app
npm install
copy .env.example .env.local     # completar con URL y anon key del proyecto
npm run dev                      # http://localhost:3000
```

## Crear los usuarios del piloto (una sola vez)

```bash
set NEXT_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
set SUPABASE_SERVICE_ROLE_KEY=eyJ...        # Dashboard → Settings → API (secreta)
set SEED_EMAIL_2=email-de-tu-hermana@gmail.com
set SEED_NAME_2=Nombre Apellido
npm run seed:users
```

Crea dos usuarios `org_admin` con contraseña `VisitOS.2026!` (cambiarla al primer ingreso).

## Deploy en Vercel

1. Subir el repo a GitHub (la carpeta `app` como raíz del proyecto, o configurar Root Directory = `app`).
2. En [vercel.com](https://vercel.com) → New Project → importar el repo.
3. Variables de entorno: `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` (la service key NO va en Vercel).
4. Deploy. La URL resultante se puede abrir directo desde el celular.

Alternativa sin GitHub: `npm i -g vercel && vercel` dentro de `app/`.

## Estructura

```
app/
├── middleware.ts                 protección de rutas (redirige a /login)
├── supabase/migrations/          esquema completo (multi-tenant + RLS + auditoría)
├── scripts/seed-users.mjs        alta de usuarios del piloto
└── src/
    ├── app/login                 ingreso
    ├── app/(app)/cuentas         listado (tabla/tarjetas), ficha, alta manual
    ├── app/(app)/cumpleanos      panel de próximos cumpleaños y saludos
    ├── app/(app)/importar        wizard de importación de Excel
    ├── components/               formulario de cuenta, badges, logout
    └── lib/                      excel (parseo/dedupe/export), formato, supabase
```

## Notas de seguridad

El aislamiento multi-tenant y la auditoría viven en la base (RLS + triggers), no en el frontend.
La `SUPABASE_SERVICE_ROLE_KEY` sólo se usa en el seed local; nunca en Vercel ni en el cliente.

## Roadmap

Ver `../docs/04-roadmap.md`. Siguiente: dashboard, barrio automático por geocodificación, mapa, notificaciones de cumpleaños (MVP 2).
