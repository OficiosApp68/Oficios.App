-- ETAPA 1: respaldo logico previo, solo lectura.
-- Ejecutar antes de la migracion y guardar el resultado del SQL Editor.

select
  p.schemaname,
  p.tablename,
  p.policyname,
  p.roles,
  p.cmd,
  p.qual,
  p.with_check
from pg_policies p
where (p.schemaname = 'public' and p.tablename in ('professional_profiles', 'app_admins'))
   or (p.schemaname = 'storage' and p.tablename = 'objects')
order by p.schemaname, p.tablename, p.policyname;

select
  routine_schema,
  routine_name,
  security_type,
  routine_definition
from information_schema.routines
where routine_schema = 'public'
  and routine_name in (
    'approve_professional_profile',
    'create_professional_profile',
    'is_app_admin',
    'list_moderation_professional_profiles',
    'list_public_professional_profiles',
    'notify_profile_moderation_pending',
    'reject_professional_profile',
    'remove_current_professional_profile_photo',
    'rls_auto_enable',
    'update_current_professional_profile'
  )
order by routine_name;

select
  routine_schema,
  routine_name,
  grantee,
  privilege_type
from information_schema.routine_privileges
where routine_schema = 'public'
  and routine_name in (
    'approve_professional_profile',
    'create_professional_profile',
    'is_app_admin',
    'list_moderation_professional_profiles',
    'list_public_professional_profiles',
    'notify_profile_moderation_pending',
    'reject_professional_profile',
    'remove_current_professional_profile_photo',
    'rls_auto_enable',
    'update_current_professional_profile'
  )
order by routine_name, grantee;

select
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
from storage.buckets
where id = 'profile-photos';

select
  count(*) as profile_count,
  count(*) filter (where moderation_status = 'approved' and is_active = true) as public_profile_count
from public.professional_profiles;

