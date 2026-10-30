-- Simulador del Cosmos · tablas y reglas de seguridad (RLS). Ejecutar en Supabase → SQL Editor.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  rol text not null check (rol in ('docente','estudiante')),
  alias text not null
);
create table if not exists public.progreso (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  estado jsonb not null,
  pr integer not null default 0,
  actualizado timestamptz not null default now()
);
alter table public.profiles enable row level security;
alter table public.progreso enable row level security;

create or replace function public.es_docente() returns boolean
language sql security definer set search_path = public stable
as $$ select exists (select 1 from public.profiles where id = auth.uid() and rol = 'docente') $$;

create policy "perfil propio o docente" on public.profiles for select to authenticated
  using (id = auth.uid() or public.es_docente());
create policy "leer progreso propio o docente" on public.progreso for select to authenticated
  using (user_id = auth.uid() or public.es_docente());
create policy "crear progreso propio" on public.progreso for insert to authenticated
  with check (user_id = auth.uid());
create policy "actualizar progreso propio" on public.progreso for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select on public.profiles to authenticated;
grant select, insert, update on public.progreso to authenticated;

-- Después de crear los dos usuarios en Authentication → Users, asigna sus roles
-- (cambia los correos). Los usuarios NO pueden modificar su rol: no hay política de escritura en profiles.
-- insert into public.profiles (id, rol, alias) select id, 'docente', 'Docente' from auth.users where email = 'CORREO_DOCENTE';
-- insert into public.profiles (id, rol, alias) select id, 'estudiante', 'Estudiante' from auth.users where email = 'CORREO_ESTUDIANTE';
