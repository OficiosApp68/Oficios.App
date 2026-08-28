-- Moderacion simple para OFICIOS APP.
-- Pegar y ejecutar este archivo completo en Supabase SQL Editor.
-- Cambiar el email de administrador si vas a usar otra cuenta para aprobar perfiles.

create table if not exists public.app_admins (
  email text primary key,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.app_admins (email)
values ('oficios.app68@gmail.com')
on conflict (email) do update set is_active = true;

alter table public.professional_profiles
  add column if not exists moderation_status text,
  add column if not exists rejection_reason text,
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid,
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists privacy_accepted_at timestamptz,
  add column if not exists terms_version text;

update public.professional_profiles
set terms_version = '2026-08-28-mvp'
where terms_version is null;

update public.professional_profiles
set moderation_status = 'approved'
where moderation_status is null;

alter table public.professional_profiles
  alter column moderation_status set default 'pending',
  alter column moderation_status set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'professional_profiles_moderation_status_check'
  ) then
    alter table public.professional_profiles
      add constraint professional_profiles_moderation_status_check
      check (moderation_status in ('pending', 'approved', 'rejected'));
  end if;
end $$;

create or replace function public.is_app_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.app_admins
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      and is_active = true
  );
$$;

drop function if exists public.create_professional_profile(text, text, text, text, text);
drop function if exists public.create_professional_profile(text, text, text, text, text, boolean);

create or replace function public.create_professional_profile(
  p_name text,
  p_occupation text,
  p_phone text,
  p_zone text,
  p_description text,
  p_terms_accepted boolean default false
)
returns public.professional_profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  new_profile public.professional_profiles;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesion para crear un perfil.';
  end if;

  if p_terms_accepted is not true then
    raise exception 'Debes aceptar los terminos y la politica de privacidad para crear un perfil.';
  end if;

  if length(trim(coalesce(p_name, ''))) = 0
    or length(trim(coalesce(p_occupation, ''))) = 0
    or length(trim(coalesce(p_phone, ''))) = 0
    or length(trim(coalesce(p_zone, ''))) = 0
    or length(trim(coalesce(p_description, ''))) = 0 then
    raise exception 'Completa todos los datos obligatorios.';
  end if;

  insert into public.professional_profiles (
    user_id,
    name,
    occupation,
    phone,
    zone,
    description,
    is_active,
    moderation_status,
    terms_accepted_at,
    privacy_accepted_at,
    terms_version
  )
  values (
    auth.uid(),
    trim(p_name),
    trim(p_occupation),
    trim(p_phone),
    trim(p_zone),
    trim(p_description),
    true,
    'pending',
    now(),
    now(),
    '2026-08-28-mvp'
  )
  returning * into new_profile;

  return new_profile;
end;
$$;

drop function if exists public.update_current_professional_profile(text, text, text, text, text, text);
drop function if exists public.update_current_professional_profile(text, text, text, text, text, text, boolean);

create or replace function public.update_current_professional_profile(
  p_name text,
  p_occupation text,
  p_phone text,
  p_zone text,
  p_description text,
  p_photo_url text default '',
  p_terms_accepted boolean default false
)
returns public.professional_profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_profile public.professional_profiles;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesion para editar tu perfil.';
  end if;

  if p_terms_accepted is not true then
    raise exception 'Debes aceptar los terminos para guardar cambios.';
  end if;

  if length(trim(coalesce(p_name, ''))) = 0
    or length(trim(coalesce(p_occupation, ''))) = 0
    or length(trim(coalesce(p_phone, ''))) = 0
    or length(trim(coalesce(p_zone, ''))) = 0
    or length(trim(coalesce(p_description, ''))) = 0 then
    raise exception 'Completa todos los datos obligatorios.';
  end if;

  update public.professional_profiles
  set
    name = trim(p_name),
    occupation = trim(p_occupation),
    phone = trim(p_phone),
    zone = trim(p_zone),
    description = trim(p_description),
    photo_url = coalesce(nullif(trim(coalesce(p_photo_url, '')), ''), photo_url),
    is_active = true,
    moderation_status = 'pending',
    rejection_reason = null,
    reviewed_at = null,
    reviewed_by = null,
    terms_accepted_at = coalesce(terms_accepted_at, now()),
    privacy_accepted_at = coalesce(privacy_accepted_at, now()),
    terms_version = coalesce(nullif(terms_version, ''), '2026-08-28-mvp')
  where id = (
    select id
    from public.professional_profiles
    where user_id = auth.uid()
    order by created_at desc
    limit 1
  )
  returning * into updated_profile;

  if updated_profile.id is null then
    raise exception 'No encontramos un perfil para editar.';
  end if;

  return updated_profile;
end;
$$;

create or replace function public.list_moderation_professional_profiles(p_status text default 'pending')
returns setof public.professional_profiles
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_app_admin() then
    raise exception 'No tenes permisos para revisar perfiles.';
  end if;

  return query
    select *
    from public.professional_profiles
    where moderation_status = coalesce(nullif(p_status, ''), 'pending')
    order by created_at desc;
end;
$$;

create or replace function public.approve_professional_profile(p_profile_id uuid)
returns public.professional_profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_profile public.professional_profiles;
begin
  if not public.is_app_admin() then
    raise exception 'No tenes permisos para aprobar perfiles.';
  end if;

  update public.professional_profiles
  set
    moderation_status = 'approved',
    is_active = true,
    rejection_reason = null,
    reviewed_at = now(),
    reviewed_by = auth.uid()
  where id = p_profile_id
  returning * into updated_profile;

  return updated_profile;
end;
$$;

create or replace function public.reject_professional_profile(p_profile_id uuid)
returns public.professional_profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_profile public.professional_profiles;
begin
  if not public.is_app_admin() then
    raise exception 'No tenes permisos para rechazar perfiles.';
  end if;

  update public.professional_profiles
  set
    moderation_status = 'rejected',
    is_active = false,
    reviewed_at = now(),
    reviewed_by = auth.uid()
  where id = p_profile_id
  returning * into updated_profile;

  return updated_profile;
end;
$$;

alter table public.professional_profiles enable row level security;
alter table public.app_admins enable row level security;

drop policy if exists "Public can read active professional profiles" on public.professional_profiles;
drop policy if exists "Public can read approved professional profiles" on public.professional_profiles;
drop policy if exists "Authenticated users can read active professional profiles" on public.professional_profiles;
drop policy if exists "Authenticated users can read approved or own professional profiles" on public.professional_profiles;
drop policy if exists "Authenticated users can read own professional profiles" on public.professional_profiles;
drop policy if exists "Authenticated users can update own professional profiles" on public.professional_profiles;
drop policy if exists "Authenticated users can create professional profiles" on public.professional_profiles;
drop policy if exists "Public can create test professional profiles" on public.professional_profiles;

create policy "Public can read approved professional profiles"
on public.professional_profiles
for select
to anon
using (is_active = true and moderation_status = 'approved');

create policy "Authenticated users can read approved or own professional profiles"
on public.professional_profiles
for select
to authenticated
using (
  (is_active = true and moderation_status = 'approved')
  or user_id = auth.uid()
  or public.is_app_admin()
);

grant usage on schema public to anon, authenticated;
grant select on public.professional_profiles to anon, authenticated;
grant execute on function public.is_app_admin() to authenticated;
grant execute on function public.create_professional_profile(text, text, text, text, text, boolean) to authenticated;
grant execute on function public.update_current_professional_profile(text, text, text, text, text, text, boolean) to authenticated;
grant execute on function public.list_moderation_professional_profiles(text) to authenticated;
grant execute on function public.approve_professional_profile(uuid) to authenticated;
grant execute on function public.reject_professional_profile(uuid) to authenticated;
