-- Rollback funcional de ETAPA 1.
-- Usar junto con la restauracion de los archivos locales anteriores.
-- No elimina perfiles ni fotografias.

begin;

drop policy if exists "Authenticated users can read own professional profiles" on public.professional_profiles;

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

grant select on public.professional_profiles to anon, authenticated;

drop function if exists public.list_public_professional_profiles(uuid);

update storage.buckets
set
  file_size_limit = null,
  allowed_mime_types = null
where id = 'profile-photos';

commit;

