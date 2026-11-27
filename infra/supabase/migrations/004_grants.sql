-- Permisos de LostCampus (proyectos nuevos de Supabase no los dan por defecto)
grant usage on schema public to anon, authenticated, service_role;

-- Los servicios (service_role) acceden a todo
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

-- Usuarios con sesión: acceso a las tablas, limitado por las políticas RLS
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant execute on function public.is_staff(), public.is_claim_participant(uuid), public.claim_is_open(uuid) to authenticated;

-- Notificaciones: el usuario solo puede cambiar la columna "leida"
revoke update on public.notifications from authenticated;
grant update (leida) on public.notifications to authenticated;

-- Sin sesión: solo las categorías
grant select on public.categories to anon;

-- Nadie fuera de los servicios ve los dominios permitidos
revoke all on public.allowed_domains from anon, authenticated;
