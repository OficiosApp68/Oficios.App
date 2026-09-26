-- Ejecutar una sola vez despues de desplegar la Edge Function
-- `profile-moderation-notification` y guardar el mismo secreto en:
--   1. Edge Function Secrets: PROFILE_WEBHOOK_SECRET
--   2. Supabase Vault: profile_moderation_webhook_secret
-- Nunca guardar el valor real del secreto en este archivo.

create extension if not exists pg_net with schema extensions;

-- Crear el secreto desde SQL Editor reemplazando el marcador solo durante la ejecucion:
-- select vault.create_secret(
--   'REEMPLAZAR_CON_SECRETO_INTERNO',
--   'profile_moderation_webhook_secret'
-- );

create or replace function public.notify_profile_moderation_pending()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  webhook_secret text;
  publishable_key constant text := 'sb_publishable_Si6xrGEGKjOqQ76jqRr1Gw_y6DBpBtc';
begin
  if new.moderation_status <> 'pending' then
    return new;
  end if;

  if tg_op = 'UPDATE' and old.moderation_status = 'pending' then
    return new;
  end if;

  select decrypted_secret
  into webhook_secret
  from vault.decrypted_secrets
  where name = 'profile_moderation_webhook_secret'
  order by created_at desc
  limit 1;

  if coalesce(webhook_secret, '') = '' then
    raise warning 'No se encontro el secreto para notificaciones de moderacion.';
    return new;
  end if;

  perform net.http_post(
    url := 'https://azusfssqlgiiwoflseor.supabase.co/functions/v1/profile-moderation-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', publishable_key,
      'Authorization', 'Bearer ' || publishable_key,
      'x-webhook-secret', webhook_secret
    ),
    body := jsonb_build_object(
      'type', tg_op,
      'table', tg_table_name,
      'schema', tg_table_schema,
      'record', to_jsonb(new),
      'old_record', case when tg_op = 'UPDATE' then to_jsonb(old) else null end
    ),
    timeout_milliseconds := 5000
  );

  return new;
end;
$$;

revoke all on function public.notify_profile_moderation_pending() from public, anon, authenticated;

drop trigger if exists notify_profile_moderation_pending on public.professional_profiles;
create trigger notify_profile_moderation_pending
after insert or update of moderation_status
on public.professional_profiles
for each row
execute function public.notify_profile_moderation_pending();
