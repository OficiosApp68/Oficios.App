-- VALORACIONES: rollback funcional sin borrar perfiles, usuarios, fotos ni valoraciones.
-- Las tablas reviewer_accounts y profile_reviews se conservan para evitar perdida de datos.
-- Tambien se deben restaurar los archivos web de la version anterior.

begin;

revoke all on function public.register_reviewer_account(text, boolean) from public, anon, authenticated;
revoke all on function public.get_current_reviewer_account() from public, anon, authenticated;
revoke all on function public.list_moderation_reviewer_accounts(text) from public, anon, authenticated;
revoke all on function public.approve_reviewer_account(uuid) from public, anon, authenticated;
revoke all on function public.reject_reviewer_account(uuid) from public, anon, authenticated;
revoke all on function public.submit_profile_review(uuid, smallint) from public, anon, authenticated;
revoke all on function public.list_moderation_profile_reviews(text) from public, anon, authenticated;
revoke all on function public.approve_profile_review(uuid) from public, anon, authenticated;
revoke all on function public.reject_profile_review(uuid) from public, anon, authenticated;

drop function if exists public.register_reviewer_account(text, boolean);
drop function if exists public.get_current_reviewer_account();
drop function if exists public.list_moderation_reviewer_accounts(text);
drop function if exists public.approve_reviewer_account(uuid);
drop function if exists public.reject_reviewer_account(uuid);
drop function if exists public.submit_profile_review(uuid, smallint);
drop function if exists public.list_moderation_profile_reviews(text);
drop function if exists public.approve_profile_review(uuid);
drop function if exists public.reject_profile_review(uuid);

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
  photo_url text
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
    profile.photo_url
  from public.professional_profiles as profile
  where profile.is_active = true
    and profile.moderation_status = 'approved'
    and (p_profile_id is null or profile.id = p_profile_id)
  order by profile.created_at desc;
$$;

revoke all on function public.list_public_professional_profiles(uuid) from public, anon, authenticated;
grant execute on function public.list_public_professional_profiles(uuid) to anon, authenticated;

commit;
