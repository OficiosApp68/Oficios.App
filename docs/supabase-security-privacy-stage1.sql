-- ETAPA 1: seguridad y privacidad tecnica.
-- No elimina perfiles ni fotografias existentes.
-- Ejecutar primero supabase-security-privacy-stage1-preflight.sql.

begin;

create or replace function public.list_public_professional_profiles(
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
set search_path = public
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

drop policy if exists "Public can read active professional profiles" on public.professional_profiles;
drop policy if exists "Public can read approved professional profiles" on public.professional_profiles;
drop policy if exists "Authenticated users can read active professional profiles" on public.professional_profiles;
drop policy if exists "Authenticated users can read approved or own professional profiles" on public.professional_profiles;
drop policy if exists "Authenticated users can read own professional profiles" on public.professional_profiles;

create policy "Authenticated users can read own professional profiles"
on public.professional_profiles
for select
to authenticated
using (user_id = auth.uid() or public.is_app_admin());

revoke select on public.professional_profiles from anon;
grant select on public.professional_profiles to authenticated;

revoke all on function public.list_public_professional_profiles(uuid) from public, anon, authenticated;
grant execute on function public.list_public_professional_profiles(uuid) to anon, authenticated;

revoke all on function public.is_app_admin() from public, anon, authenticated;
revoke all on function public.create_professional_profile(text, text, text, text, text, boolean) from public, anon, authenticated;
revoke all on function public.update_current_professional_profile(text, text, text, text, text, text, boolean) from public, anon, authenticated;
revoke all on function public.remove_current_professional_profile_photo() from public, anon, authenticated;
revoke all on function public.list_moderation_professional_profiles(text) from public, anon, authenticated;
revoke all on function public.approve_professional_profile(uuid) from public, anon, authenticated;
revoke all on function public.reject_professional_profile(uuid) from public, anon, authenticated;

grant execute on function public.is_app_admin() to authenticated;
grant execute on function public.create_professional_profile(text, text, text, text, text, boolean) to authenticated;
grant execute on function public.update_current_professional_profile(text, text, text, text, text, text, boolean) to authenticated;
grant execute on function public.remove_current_professional_profile_photo() to authenticated;
grant execute on function public.list_moderation_professional_profiles(text) to authenticated;
grant execute on function public.approve_professional_profile(uuid) to authenticated;
grant execute on function public.reject_professional_profile(uuid) to authenticated;

do $$
begin
  if to_regprocedure('public.notify_profile_moderation_pending()') is not null then
    execute 'revoke all on function public.notify_profile_moderation_pending() from public, anon, authenticated';
  end if;

  if to_regprocedure('public.rls_auto_enable()') is not null then
    execute 'revoke all on function public.rls_auto_enable() from public, anon, authenticated';
  end if;
end;
$$;

update storage.buckets
set
  file_size_limit = 5242880,
  allowed_mime_types = array['image/webp']::text[]
where id = 'profile-photos';

commit;

