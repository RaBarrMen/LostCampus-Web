-- =====================================================================
-- LostCampus · 001 Esquema de la base de datos
-- Ejecutar en Supabase > SQL Editor (en orden: 001, 002, 003, seed)
-- =====================================================================

-- gen_random_uuid() viene incluido en PostgreSQL 13+ (Supabase)

-- ---------- Tipos ----------
do $$ begin
  create type public.item_tipo as enum ('perdido', 'encontrado');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.item_estado as enum ('activo', 'en_proceso', 'devuelto', 'cerrado', 'oculto');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.claim_estado as enum ('pendiente', 'aprobado', 'rechazado', 'entregado', 'cancelado');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.user_rol as enum ('alumno', 'resguardo', 'admin');
exception when duplicate_object then null; end $$;

-- ---------- Tablas ----------

-- Dominios de correo permitidos para registrarse
create table if not exists public.allowed_domains (
  domain text primary key check (domain = lower(domain))
);

create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  nombre      text not null default '' check (char_length(nombre) <= 80),
  carrera     text check (char_length(carrera) <= 80),
  rol         public.user_rol not null default 'alumno',
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.categories (
  id      smallint generated always as identity primary key,
  nombre  text not null unique,
  icono   text not null
);

create table if not exists public.items (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null references public.profiles (id) on delete cascade,
  tipo                   public.item_tipo not null,
  titulo                 text not null check (char_length(titulo) between 3 and 80),
  descripcion            text not null default '' check (char_length(descripcion) <= 500),
  category_id            smallint not null references public.categories (id),
  color                  text not null check (char_length(color) <= 20),
  zona                   text not null check (char_length(zona) <= 40),
  lat                    double precision check (lat between -90 and 90),
  lng                    double precision check (lng between -180 and 180),
  fecha                  date not null,
  estado                 public.item_estado not null default 'activo',
  image_path             text check (char_length(image_path) <= 200),
  en_resguardo           boolean not null default false,
  pregunta_verificacion  text check (char_length(pregunta_verificacion) <= 150),
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  constraint pregunta_si_encontrado check (tipo = 'perdido' or pregunta_verificacion is not null)
);

create index if not exists items_feed_idx on public.items (estado, tipo, created_at desc);
create index if not exists items_category_idx on public.items (category_id, fecha);
create index if not exists items_user_idx on public.items (user_id);

create table if not exists public.matches (
  id             uuid primary key default gen_random_uuid(),
  lost_item_id   uuid not null references public.items (id) on delete cascade,
  found_item_id  uuid not null references public.items (id) on delete cascade,
  score          smallint not null check (score between 0 and 100),
  estado         text not null default 'sugerido' check (estado in ('sugerido', 'descartado', 'confirmado')),
  created_at     timestamptz not null default now(),
  unique (lost_item_id, found_item_id)
);

create index if not exists matches_found_idx on public.matches (found_item_id);

create table if not exists public.claims (
  id            uuid primary key default gen_random_uuid(),
  item_id       uuid not null references public.items (id) on delete cascade,
  claimant_id   uuid not null references public.profiles (id) on delete cascade,
  respuesta     text not null check (char_length(respuesta) between 2 and 300),
  estado        public.claim_estado not null default 'pendiente',
  qr_jti_hash   text,
  delivered_at  timestamptz,
  delivered_by  uuid references public.profiles (id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Un usuario solo puede tener un reclamo abierto por objeto
create unique index if not exists claims_one_open_idx
  on public.claims (item_id, claimant_id) where estado in ('pendiente', 'aprobado');
create index if not exists claims_claimant_idx on public.claims (claimant_id);

create table if not exists public.messages (
  id          uuid primary key default gen_random_uuid(),
  claim_id    uuid not null references public.claims (id) on delete cascade,
  sender_id   uuid not null references public.profiles (id) on delete cascade,
  contenido   text not null check (char_length(contenido) between 1 and 1000),
  created_at  timestamptz not null default now()
);

create index if not exists messages_claim_idx on public.messages (claim_id, created_at);

create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  tipo        text not null check (tipo in ('match', 'claim', 'claim_update', 'message', 'delivery', 'system')),
  titulo      text not null check (char_length(titulo) <= 120),
  cuerpo      text not null default '' check (char_length(cuerpo) <= 300),
  link        text check (link is null or (link ~ '^/[A-Za-z0-9/_-]*$' and link not like '//%')),
  leida       boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);

-- ---------- Funciones y triggers ----------

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists profiles_updated on public.profiles;
create trigger profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();
drop trigger if exists items_updated on public.items;
create trigger items_updated before update on public.items
  for each row execute function public.set_updated_at();
drop trigger if exists claims_updated on public.claims;
create trigger claims_updated before update on public.claims
  for each row execute function public.set_updated_at();

-- Al registrarse: valida el dominio del correo y crea el perfil
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  dominio text := lower(split_part(new.email, '@', 2));
begin
  if not exists (select 1 from public.allowed_domains where domain = dominio) then
    raise exception 'Solo se permiten correos institucionales';
  end if;
  insert into public.profiles (id, nombre)
  values (new.id, coalesce(left(new.raw_user_meta_data ->> 'nombre', 80), ''));
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Un usuario no puede cambiarse el rol a sí mismo (solo service role o SQL Editor)
create or replace function public.protect_profile_role()
returns trigger language plpgsql as $$
begin
  if new.rol is distinct from old.rol and current_user = 'authenticated' then
    raise exception 'No puedes cambiar tu rol';
  end if;
  return new;
end $$;

drop trigger if exists profiles_protect_role on public.profiles;
create trigger profiles_protect_role before update on public.profiles
  for each row execute function public.protect_profile_role();

-- Un usuario no puede cambiar el dueño de un reporte ni marcarlo como devuelto
-- directamente: eso solo lo hace el claims-service al validar el QR.
create or replace function public.protect_item_fields()
returns trigger language plpgsql as $$
begin
  if current_user = 'authenticated' then
    if new.user_id is distinct from old.user_id or new.tipo is distinct from old.tipo then
      raise exception 'Campo no editable';
    end if;
    if new.estado is distinct from old.estado and new.estado not in ('activo', 'cerrado') then
      raise exception 'Estado no permitido';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists items_protect on public.items;
create trigger items_protect before update on public.items
  for each row execute function public.protect_item_fields();

-- Helpers usados por las políticas RLS
create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and rol in ('admin', 'resguardo')
  );
$$;

create or replace function public.is_claim_participant(cid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.claims c
    join public.items i on i.id = c.item_id
    where c.id = cid and ((select auth.uid()) in (c.claimant_id, i.user_id))
  );
$$;

create or replace function public.claim_is_open(cid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.claims where id = cid and estado in ('pendiente', 'aprobado'));
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
