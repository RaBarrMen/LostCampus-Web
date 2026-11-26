-- =====================================================================
-- LostCampus · 002 Seguridad a nivel de fila (RLS)
-- Todas las tablas tienen RLS activado. Lo que no está permitido
-- explícitamente aquí, está prohibido para los usuarios.
-- =====================================================================

alter table public.allowed_domains enable row level security;
alter table public.profiles       enable row level security;
alter table public.categories     enable row level security;
alter table public.items          enable row level security;
alter table public.matches        enable row level security;
alter table public.claims         enable row level security;
alter table public.messages       enable row level security;
alter table public.notifications  enable row level security;

-- allowed_domains: sin políticas (solo service role / SQL Editor)

-- ---------- profiles ----------
drop policy if exists "perfiles visibles para usuarios" on public.profiles;
create policy "perfiles visibles para usuarios" on public.profiles
  for select to authenticated using (true);

drop policy if exists "editar mi perfil" on public.profiles;
create policy "editar mi perfil" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- ---------- categories ----------
drop policy if exists "categorias publicas" on public.categories;
create policy "categorias publicas" on public.categories
  for select to anon, authenticated using (true);

-- ---------- items ----------
drop policy if exists "ver reportes" on public.items;
create policy "ver reportes" on public.items
  for select to authenticated
  using (estado <> 'oculto' or user_id = (select auth.uid()) or (select public.is_staff()));

drop policy if exists "crear mis reportes" on public.items;
create policy "crear mis reportes" on public.items
  for insert to authenticated
  with check (user_id = (select auth.uid()) and estado = 'activo');

drop policy if exists "editar mis reportes" on public.items;
create policy "editar mis reportes" on public.items
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "borrar mis reportes" on public.items;
create policy "borrar mis reportes" on public.items
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- ---------- matches ----------
drop policy if exists "ver mis coincidencias" on public.matches;
create policy "ver mis coincidencias" on public.matches
  for select to authenticated
  using (exists (
    select 1 from public.items i
    where i.id in (lost_item_id, found_item_id) and i.user_id = (select auth.uid())
  ));

-- ---------- claims ----------
drop policy if exists "ver reclamos donde participo" on public.claims;
create policy "ver reclamos donde participo" on public.claims
  for select to authenticated
  using (
    claimant_id = (select auth.uid())
    or exists (select 1 from public.items i where i.id = item_id and i.user_id = (select auth.uid()))
    or (select public.is_staff())
  );

drop policy if exists "crear mi reclamo" on public.claims;
create policy "crear mi reclamo" on public.claims
  for insert to authenticated
  with check (
    claimant_id = (select auth.uid())
    and estado = 'pendiente'
    and qr_jti_hash is null
    and exists (
      select 1 from public.items i
      where i.id = item_id and i.tipo = 'encontrado' and i.estado = 'activo'
        and i.user_id <> (select auth.uid())
    )
  );
-- Sin política de UPDATE/DELETE: los cambios de estado los hace el claims-service.

-- ---------- messages ----------
drop policy if exists "leer mensajes de mis reclamos" on public.messages;
create policy "leer mensajes de mis reclamos" on public.messages
  for select to authenticated
  using ((select public.is_claim_participant(claim_id)));

drop policy if exists "enviar mensajes en mis reclamos" on public.messages;
create policy "enviar mensajes en mis reclamos" on public.messages
  for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and (select public.is_claim_participant(claim_id))
    and (select public.claim_is_open(claim_id))
  );

-- ---------- notifications ----------
drop policy if exists "ver mis notificaciones" on public.notifications;
create policy "ver mis notificaciones" on public.notifications
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "marcar mis notificaciones" on public.notifications;
create policy "marcar mis notificaciones" on public.notifications
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Solo se puede cambiar la columna "leida" desde el cliente
revoke update on public.notifications from authenticated;
grant update (leida) on public.notifications to authenticated;

-- El cliente anónimo no necesita acceso a las tablas
revoke all on public.items, public.profiles, public.matches, public.claims,
  public.messages, public.notifications, public.allowed_domains from anon;

-- ---------- Realtime ----------
-- Chat y notificaciones en vivo (Realtime respeta las políticas RLS)
do $$ begin
  alter publication supabase_realtime add table public.messages;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null; end $$;
