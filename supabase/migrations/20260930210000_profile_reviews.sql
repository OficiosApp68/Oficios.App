-- Valoraciones verificadas y moderadas para OFICIOS APP (borrador reemplazado).
-- Ejecutar solo despues de guardar el resultado del preflight.
-- No elimina ni modifica perfiles, usuarios o fotografias existentes.

begin;

create temporary table profile_reviews_migration_snapshot on commit drop as
select
  (select count(*) from public.professional_profiles) as profile_count,
  (select count(*) from auth.users) as auth_user_count,
  (select count(*) from storage.objects where bucket_id = 'profile-photos') as profile_photo_count;

create table public.reviewer_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  terms_accepted_at timestamptz not null default now(),
  privacy_accepted_at timestamptz not null default now(),
  terms_version text not null default '2026-10-03',
  privacy_version text not null default '2026-10-03',
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id),
  constraint reviewer_accounts_name_length check (char_length(display_name) between 2 and 80)
);

create index reviewer_accounts_status_idx
on public.reviewer_accounts (status, created_at);

alter table public.reviewer_accounts enable row level security;
revoke all on table public.reviewer_accounts from public, anon, authenticated;

create table public.profile_reviews (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.professional_profiles(id) on delete cascade,
  reviewer_user_id uuid not null references auth.users(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id),
  constraint profile_reviews_one_per_account unique (profile_id, reviewer_user_id)
);

create index profile_reviews_public_idx
on public.profile_reviews (profile_id, status, created_at desc);

alter table public.profile_reviews enable row level security;
revoke all on table public.profile_reviews from public, anon, authenticated;

drop function if exists public.list_public_profile_reviews(uuid);
create function public.register_reviewer_account(
  p_display_name text,
  p_terms_accepted boolean
)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  current_user_id uuid := auth.uid();
  normalized_name text := trim(coalesce(p_display_name, ''));
  resulting_status text;
begin
  if current_user_id is null then
    raise exception 'Necesitas iniciar sesion.';
  end if;

  if not exists (
    select 1 from auth.users
    where id = current_user_id and email_confirmed_at is not null
  ) then
    raise exception 'Primero confirma tu correo electronico.';
  end if;

  if not coalesce(p_terms_accepted, false) then
    raise exception 'Debes aceptar los Terminos y la Politica de Privacidad.';
  end if;

  if char_length(normalized_name) < 2 or char_length(normalized_name) > 80 then
    raise exception 'El nombre debe tener entre 2 y 80 caracteres.';
  end if;

  insert into public.reviewer_accounts (
    user_id, display_name, status, terms_accepted_at, privacy_accepted_at,
    terms_version, privacy_version
  ) values (
    current_user_id, normalized_name, 'pending', now(), now(), '2026-10-03', '2026-10-03'
  )
  on conflict (user_id) do update
  set
    display_name = excluded.display_name,
    status = case when reviewer_accounts.status = 'approved' then 'approved' else 'pending' end,
    terms_accepted_at = excluded.terms_accepted_at,
    privacy_accepted_at = excluded.privacy_accepted_at,
    terms_version = excluded.terms_version,
    privacy_version = excluded.privacy_version,
    reviewed_at = case when reviewer_accounts.status = 'approved' then reviewer_accounts.reviewed_at else null end,
    reviewed_by = case when reviewer_accounts.status = 'approved' then reviewer_accounts.reviewed_by else null end
  returning status into resulting_status;

  return resulting_status;
end;
$$;

create function public.get_current_reviewer_account()
returns table (
  display_name text,
  status text,
  created_at timestamptz,
  reviewed_at timestamptz
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    account.display_name,
    account.status,
    account.created_at,
    account.reviewed_at
  from public.reviewer_accounts as account
  where account.user_id = auth.uid();
$$;

create function public.list_moderation_reviewer_accounts(p_status text default 'pending')
returns table (
  user_id uuid,
  display_name text,
  status text,
  created_at timestamptz,
  reviewed_at timestamptz
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
begin
  if not public.is_app_admin() then
    raise exception 'No autorizado.';
  end if;

  return query
  select
    account.user_id,
    account.display_name,
    account.status,
    account.created_at,
    account.reviewed_at
  from public.reviewer_accounts as account
  where account.status = coalesce(nullif(trim(p_status), ''), 'pending')
  order by account.created_at asc;
end;
$$;

create function public.approve_reviewer_account(p_user_id uuid)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if not public.is_app_admin() then
    raise exception 'No autorizado.';
  end if;

  update public.reviewer_accounts
  set status = 'approved', reviewed_at = now(), reviewed_by = auth.uid()
  where user_id = p_user_id and status = 'pending';

  if not found then
    raise exception 'La cuenta pendiente no existe.';
  end if;

  return 'approved';
end;
$$;

create function public.reject_reviewer_account(p_user_id uuid)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if not public.is_app_admin() then
    raise exception 'No autorizado.';
  end if;

  update public.reviewer_accounts
  set status = 'rejected', reviewed_at = now(), reviewed_by = auth.uid()
  where user_id = p_user_id and status = 'pending';

  if not found then
    raise exception 'La cuenta pendiente no existe.';
  end if;

  return 'rejected';
end;
$$;

create function public.submit_profile_review(p_profile_id uuid, p_rating smallint)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  current_user_id uuid := auth.uid();
  inserted_status text;
begin
  if current_user_id is null then
    raise exception 'Necesitas iniciar sesion.';
  end if;

  if p_rating < 1 or p_rating > 5 then
    raise exception 'La calificacion debe ser de 1 a 5 estrellas.';
  end if;

  if not exists (
    select 1 from public.reviewer_accounts
    where user_id = current_user_id and status = 'approved'
  ) then
    raise exception 'Tu cuenta de evaluador todavia no esta aprobada.';
  end if;

  if not exists (
    select 1 from public.professional_profiles
    where id = p_profile_id
      and is_active = true
      and moderation_status = 'approved'
      and user_id <> current_user_id
  ) then
    raise exception 'El perfil no esta disponible para valorar.';
  end if;

  insert into public.profile_reviews (profile_id, reviewer_user_id, rating, status)
  values (p_profile_id, current_user_id, p_rating, 'pending')
  on conflict (profile_id, reviewer_user_id) do update
  set rating = excluded.rating,
      status = 'pending',
      created_at = now(),
      reviewed_at = null,
      reviewed_by = null
  where profile_reviews.status = 'rejected'
  returning status into inserted_status;

  if inserted_status is null then
    raise exception 'Ya enviaste una valoracion para este perfil.';
  end if;

  return inserted_status;
end;
$$;

drop function if exists public.list_public_professional_profiles(uuid);
create function public.list_public_professional_profiles(
  p_profile_id uuid default null
)
returns table (
  id uuid,
  name text,
  occupation text,
  phone text,
  zone text,
  description text,
  photo_url text,
  rating numeric,
  review_count bigint
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    profile.id,
    profile.name,
    profile.occupation,
    profile.phone,
    profile.zone,
    profile.description,
    profile.photo_url,
    review_summary.rating,
    coalesce(review_summary.review_count, 0)::bigint
  from public.professional_profiles as profile
  left join lateral (
    select
      round(avg(review.rating)::numeric, 1) as rating,
      count(*)::bigint as review_count
    from public.profile_reviews as review
    where review.profile_id = profile.id
      and review.status = 'approved'
  ) as review_summary on true
  where profile.is_active = true
    and profile.moderation_status = 'approved'
    and (p_profile_id is null or profile.id = p_profile_id)
  order by profile.created_at desc;
$$;

drop function if exists public.list_moderation_profile_reviews(text);
create function public.list_moderation_profile_reviews(p_status text default 'pending')
returns table (
  id uuid,
  profile_id uuid,
  profile_name text,
  profile_occupation text,
  reviewer_name text,
  rating smallint,
  status text,
  created_at timestamptz,
  reviewed_at timestamptz
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
begin
  if not public.is_app_admin() then
    raise exception 'No autorizado.';
  end if;

  return query
  select
    review.id,
    review.profile_id,
    profile.name,
    profile.occupation,
    account.display_name,
    review.rating,
    review.status,
    review.created_at,
    review.reviewed_at
  from public.profile_reviews as review
  join public.professional_profiles as profile on profile.id = review.profile_id
  join public.reviewer_accounts as account on account.user_id = review.reviewer_user_id
  where review.status = coalesce(nullif(trim(p_status), ''), 'pending')
  order by review.created_at asc;
end;
$$;

drop function if exists public.approve_profile_review(uuid);
create function public.approve_profile_review(p_review_id uuid)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if not public.is_app_admin() then
    raise exception 'No autorizado.';
  end if;

  update public.profile_reviews
  set
    status = 'approved',
    reviewed_at = now(),
    reviewed_by = auth.uid()
  where id = p_review_id
    and status = 'pending';

  if not found then
    raise exception 'La valoracion pendiente no existe.';
  end if;

  return 'approved';
end;
$$;

drop function if exists public.reject_profile_review(uuid);
create function public.reject_profile_review(p_review_id uuid)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if not public.is_app_admin() then
    raise exception 'No autorizado.';
  end if;

  update public.profile_reviews
  set
    status = 'rejected',
    reviewed_at = now(),
    reviewed_by = auth.uid()
  where id = p_review_id
    and status = 'pending';

  if not found then
    raise exception 'La valoracion pendiente no existe.';
  end if;

  return 'rejected';
end;
$$;

revoke all on function public.register_reviewer_account(text, boolean) from public, anon, authenticated;
revoke all on function public.get_current_reviewer_account() from public, anon, authenticated;
revoke all on function public.list_moderation_reviewer_accounts(text) from public, anon, authenticated;
revoke all on function public.approve_reviewer_account(uuid) from public, anon, authenticated;
revoke all on function public.reject_reviewer_account(uuid) from public, anon, authenticated;
revoke all on function public.submit_profile_review(uuid, smallint) from public, anon, authenticated;
revoke all on function public.list_public_professional_profiles(uuid) from public, anon, authenticated;
revoke all on function public.list_moderation_profile_reviews(text) from public, anon, authenticated;
revoke all on function public.approve_profile_review(uuid) from public, anon, authenticated;
revoke all on function public.reject_profile_review(uuid) from public, anon, authenticated;

grant execute on function public.register_reviewer_account(text, boolean) to authenticated;
grant execute on function public.get_current_reviewer_account() to authenticated;
grant execute on function public.list_moderation_reviewer_accounts(text) to authenticated;
grant execute on function public.approve_reviewer_account(uuid) to authenticated;
grant execute on function public.reject_reviewer_account(uuid) to authenticated;
grant execute on function public.submit_profile_review(uuid, smallint) to authenticated;
grant execute on function public.list_public_professional_profiles(uuid) to anon, authenticated;
grant execute on function public.list_moderation_profile_reviews(text) to authenticated;
grant execute on function public.approve_profile_review(uuid) to authenticated;
grant execute on function public.reject_profile_review(uuid) to authenticated;

do $$
declare
  snapshot record;
  current_profile_count bigint;
  current_auth_user_count bigint;
  current_profile_photo_count bigint;
begin
  select * into snapshot from profile_reviews_migration_snapshot;
  select count(*) into current_profile_count from public.professional_profiles;
  select count(*) into current_auth_user_count from auth.users;
  select count(*) into current_profile_photo_count from storage.objects where bucket_id = 'profile-photos';

  if current_profile_count <> snapshot.profile_count
    or current_auth_user_count <> snapshot.auth_user_count
    or current_profile_photo_count <> snapshot.profile_photo_count then
    raise exception 'Safety check failed: existing profile, user or photo counts changed.';
  end if;
end;
$$;

commit;
