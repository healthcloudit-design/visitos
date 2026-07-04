-- VisitOS — Esquema inicial (MVP 1, preparado para MVP 2-5)
create extension if not exists pg_trgm;

-- ── Enums ────────────────────────────────────────────────────────────
create type user_role as enum ('platform_admin','org_admin','supervisor','rep','viewer');
create type management_status as enum ('pendiente','visitado','contactado','interesado',
  'no_interesado','requiere_seguimiento','no_contactar','datos_incompletos');
create type record_status as enum ('activo','archivado');
create type visit_frequency as enum ('semanal','quincenal','mensual','bimestral','trimestral','personalizada');
create type geo_policy as enum ('off','log_only','warn','block','justify','require_approval');
create type geo_result as enum ('dentro_rango','fuera_rango','sin_ubicacion','sin_geocodificar','desactivada');
create type approval_status as enum ('pendiente','aprobada','rechazada');
create type import_row_status as enum ('nueva','duplicada','actualizada','omitida','incompleta','error');
create type notification_status as enum ('pendiente','vista','resuelta','ignorada');
create type notification_type as enum ('cumple_7d','cumple_2d','cumple_1d','cumple_hoy',
  'visita_atrasada','accion_vencida','aprobacion_pendiente','sistema');
create type subscription_plan as enum ('individual','profesional','equipo','empresa');

-- ── Núcleo ───────────────────────────────────────────────────────────
create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  plan subscription_plan not null default 'individual',
  subscription_status text not null default 'trial',
  geo_policy geo_policy not null default 'off',
  geo_default_radius_m int not null default 100,
  settings jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  org_id uuid not null references organizations(id),
  role user_role not null default 'rep',
  full_name text not null,
  phone text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table zones (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id),
  name text not null,
  neighborhoods text[] not null default '{}',
  assigned_user_id uuid references profiles(id),
  created_at timestamptz not null default now()
);

create table accounts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id),
  name text not null,
  specialty text,
  institution text,
  address text,
  neighborhood text,
  neighborhood_source text,
  city text,
  province text,
  country text default 'Argentina',
  postal_code text,
  latitude double precision,
  longitude double precision,
  geocoded_address text,
  geocoded_at timestamptz,
  geocode_provider text,
  geo_radius_m int,
  phone text,
  whatsapp text,
  email text,
  birthday date,
  visited boolean not null default false,
  last_visit_at timestamptz,
  status management_status not null default 'pendiente',
  general_notes text,
  next_action text,
  next_action_date date,
  frequency visit_frequency,
  frequency_days int,
  last_interaction_at timestamptz,
  assigned_user_id uuid references profiles(id),
  zone_id uuid references zones(id),
  record_status record_status not null default 'activo',
  import_source text,
  created_by uuid references profiles(id),
  updated_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index accounts_org_neigh on accounts(org_id, neighborhood);
create index accounts_org_assigned on accounts(org_id, assigned_user_id);
create index accounts_org_status on accounts(org_id, status) where record_status = 'activo';
create index accounts_name_trgm on accounts using gin (name gin_trgm_ops);

create table visits (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id),
  account_id uuid not null references accounts(id),
  user_id uuid not null references profiles(id),
  visited_at timestamptz not null default now(),
  outcome text,
  notes text,
  user_lat double precision,
  user_lng double precision,
  distance_m double precision,
  allowed_radius_m int,
  geo_result geo_result not null default 'desactivada',
  justification text,
  approval_status approval_status,
  approved_by uuid references profiles(id),
  approved_at timestamptz,
  created_at timestamptz not null default now()
);
create index visits_account on visits(account_id, visited_at desc);

create table notes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id),
  account_id uuid not null references accounts(id),
  user_id uuid not null references profiles(id),
  body text not null,
  created_at timestamptz not null default now()
);
create index notes_account on notes(account_id, created_at desc);

create table approval_requests (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id),
  visit_id uuid not null references visits(id),
  requested_by uuid not null references profiles(id),
  status approval_status not null default 'pendiente',
  resolved_by uuid references profiles(id),
  resolved_at timestamptz,
  resolution_note text,
  created_at timestamptz not null default now()
);

create table import_batches (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id),
  user_id uuid references profiles(id),
  file_name text not null,
  storage_path text,
  column_mapping jsonb not null default '{}',
  status text not null default 'preview',
  totals jsonb not null default '{}',
  created_at timestamptz not null default now(),
  confirmed_at timestamptz
);

create table import_rows (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references import_batches(id) on delete cascade,
  org_id uuid not null references organizations(id),
  row_number int not null,
  raw jsonb not null,
  parsed jsonb not null,
  status import_row_status not null,
  matched_account_id uuid references accounts(id),
  field_decisions jsonb,
  issues text[] not null default '{}'
);

create table change_logs (
  id bigint generated always as identity primary key,
  org_id uuid not null references organizations(id),
  account_id uuid references accounts(id),
  user_id uuid,
  action text not null,
  field text,
  old_value text,
  new_value text,
  metadata jsonb,
  created_at timestamptz not null default now()
);
create index change_logs_account on change_logs(account_id, created_at desc);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id),
  user_id uuid not null references profiles(id),
  account_id uuid references accounts(id),
  type notification_type not null,
  title text not null,
  body text,
  status notification_status not null default 'pendiente',
  dedupe_key text unique,
  created_at timestamptz not null default now(),
  seen_at timestamptz
);

create table greeting_logs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id),
  account_id uuid not null references accounts(id),
  user_id uuid not null references profiles(id),
  channel text not null,
  message text,
  sent_at timestamptz not null default now()
);

create table ai_interactions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id),
  user_id uuid not null references profiles(id),
  prompt text not null,
  response text,
  tools_used jsonb,
  tokens int,
  created_at timestamptz not null default now()
);

create table ai_recommendations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id),
  user_id uuid not null references profiles(id),
  interaction_id uuid references ai_interactions(id),
  kind text not null,
  payload jsonb not null,
  status text not null default 'propuesta',
  created_at timestamptz not null default now()
);

-- ── Funciones auxiliares ─────────────────────────────────────────────
create or replace function auth_org_id() returns uuid
language sql stable security definer set search_path = public as
$$ select org_id from profiles where id = auth.uid() $$;

create or replace function auth_role() returns user_role
language sql stable security definer set search_path = public as
$$ select role from profiles where id = auth.uid() $$;

-- updated_at + updated_by
create or replace function tg_touch() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  if auth.uid() is not null then new.updated_by := auth.uid(); end if;
  return new;
end $$;
create trigger accounts_touch before update on accounts for each row execute function tg_touch();

-- Al marcar Visitado = Sí: fija fecha de última visita
create or replace function tg_visited_flip() returns trigger
language plpgsql as $$
begin
  if new.visited and not old.visited then
    new.last_visit_at := now();
    new.status := case when new.status = 'pendiente' then 'visitado'::management_status else new.status end;
  end if;
  return new;
end $$;
create trigger accounts_visited_flip before update of visited on accounts
for each row execute function tg_visited_flip();

-- Al marcar Visitado = Sí: crea registro en visits (historial)
create or replace function tg_visited_log() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.visited and not old.visited and auth.uid() is not null then
    insert into visits (org_id, account_id, user_id, geo_result)
    values (new.org_id, new.id, auth.uid(), 'desactivada');
  end if;
  return new;
end $$;
create trigger accounts_visited_log after update of visited on accounts
for each row execute function tg_visited_log();

-- Auditoría de cambios campo por campo
create or replace function tg_audit_account() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  f text;
  oldj jsonb := to_jsonb(old);
  newj jsonb := to_jsonb(new);
  audited text[] := array['name','specialty','institution','address','neighborhood','city',
    'province','phone','whatsapp','email','birthday','visited','last_visit_at','status',
    'general_notes','next_action','next_action_date','frequency','assigned_user_id','record_status'];
begin
  foreach f in array audited loop
    if oldj->>f is distinct from newj->>f then
      insert into change_logs (org_id, account_id, user_id, action, field, old_value, new_value)
      values (new.org_id, new.id, auth.uid(), 'update', f, oldj->>f, newj->>f);
    end if;
  end loop;
  return new;
end $$;
create trigger accounts_audit after update on accounts for each row execute function tg_audit_account();

create or replace function tg_audit_account_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into change_logs (org_id, account_id, user_id, action, new_value)
  values (new.org_id, new.id, auth.uid(), 'create', new.name);
  return new;
end $$;
create trigger accounts_audit_insert after insert on accounts for each row execute function tg_audit_account_insert();

-- ── RLS ──────────────────────────────────────────────────────────────
alter table organizations enable row level security;
alter table profiles enable row level security;
alter table zones enable row level security;
alter table accounts enable row level security;
alter table visits enable row level security;
alter table notes enable row level security;
alter table approval_requests enable row level security;
alter table import_batches enable row level security;
alter table import_rows enable row level security;
alter table change_logs enable row level security;
alter table notifications enable row level security;
alter table greeting_logs enable row level security;
alter table ai_interactions enable row level security;
alter table ai_recommendations enable row level security;

create policy org_select on organizations for select using (id = auth_org_id());
create policy org_update on organizations for update
  using (id = auth_org_id() and auth_role() = 'org_admin');

create policy profiles_select on profiles for select using (org_id = auth_org_id());
create policy profiles_update_own on profiles for update using (id = auth.uid());

-- Aislamiento por organización (MVP 1: miembros con acceso completo;
-- el refinamiento por rol llega en MVP 3 sobre estas mismas políticas)
create policy zones_all on zones for all
  using (org_id = auth_org_id()) with check (org_id = auth_org_id());
create policy accounts_all on accounts for all
  using (org_id = auth_org_id()) with check (org_id = auth_org_id());
create policy visits_all on visits for all
  using (org_id = auth_org_id()) with check (org_id = auth_org_id());
create policy notes_all on notes for all
  using (org_id = auth_org_id()) with check (org_id = auth_org_id());
create policy approvals_all on approval_requests for all
  using (org_id = auth_org_id()) with check (org_id = auth_org_id());
create policy batches_all on import_batches for all
  using (org_id = auth_org_id()) with check (org_id = auth_org_id());
create policy import_rows_all on import_rows for all
  using (org_id = auth_org_id()) with check (org_id = auth_org_id());
create policy change_logs_select on change_logs for select using (org_id = auth_org_id());
create policy notifications_all on notifications for all
  using (org_id = auth_org_id()) with check (org_id = auth_org_id());
create policy greetings_all on greeting_logs for all
  using (org_id = auth_org_id()) with check (org_id = auth_org_id());
create policy ai_inter_all on ai_interactions for all
  using (org_id = auth_org_id() and user_id = auth.uid())
  with check (org_id = auth_org_id() and user_id = auth.uid());
create policy ai_reco_all on ai_recommendations for all
  using (org_id = auth_org_id()) with check (org_id = auth_org_id());

-- ── Organización piloto ──────────────────────────────────────────────
insert into organizations (id, name, plan)
values ('a0000000-0000-4000-8000-000000000001', 'VisitOS Piloto', 'individual');
