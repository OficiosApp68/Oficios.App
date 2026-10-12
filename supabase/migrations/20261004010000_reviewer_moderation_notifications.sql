-- Envia avisos de moderacion y confirmaciones de aprobacion para perfiles y cuentas de valoracion.
-- Reutiliza la Edge Function, Brevo y el secreto interno ya configurados.

begin;

create extension if not exists pg_net with schema extensions;

create or replace function public.notify_profile_moderation_pending()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  webhook_secret text;
  current_status text;
  previous_status text;
  recipient_email text;
  publishable_key constant text := 'sb_publishable_Si6xrGEGKjOqQ76jqRr1Gw_y6DBpBtc';
begin
  if tg_table_name = 'professional_profiles' then
    current_status := to_jsonb(new) ->> 'moderation_status';
    previous_status := case when tg_op = 'UPDATE' then to_jsonb(old) ->> 'moderation_status' else null end;
  elsif tg_table_name = 'reviewer_accounts' then
    current_status := to_jsonb(new) ->> 'status';
    previous_status := case when tg_op = 'UPDATE' then to_jsonb(old) ->> 'status' else null end;
  else
    return new;
  end if;

  if current_status = 'pending' and (tg_op <> 'UPDATE' or previous_status <> 'pending') then
    recipient_email := null;
  elsif tg_op = 'UPDATE' and current_status = 'approved' and previous_status <> 'approved' then
    select email
    into recipient_email
    from auth.users
    where id = (to_jsonb(new) ->> 'user_id')::uuid;
  else
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
      'old_record', case when tg_op = 'UPDATE' then to_jsonb(old) else null end,
      'recipient_email', recipient_email
    ),
    timeout_milliseconds := 5000
  );

  return new;
end;
$$;

revoke all on function public.notify_profile_moderation_pending() from public, anon, authenticated;

drop trigger if exists notify_reviewer_moderation_pending on public.reviewer_accounts;
create trigger notify_reviewer_moderation_pending
after insert or update of status
on public.reviewer_accounts
for each row
execute function public.notify_profile_moderation_pending();

-- Notifica perfiles aprobados durante las ultimas 24 horas para no dejar afuera
-- las aprobaciones realizadas inmediatamente antes de instalar esta mejora.
do $$
declare
  approved_profile record;
  webhook_secret text;
  publishable_key constant text := 'sb_publishable_Si6xrGEGKjOqQ76jqRr1Gw_y6DBpBtc';
begin
  select decrypted_secret
  into webhook_secret
  from vault.decrypted_secrets
  where name = 'profile_moderation_webhook_secret'
  order by created_at desc
  limit 1;

  if coalesce(webhook_secret, '') = '' then
    raise warning 'No se encontro el secreto para notificar perfiles aprobados recientemente.';
  else
    for approved_profile in
      select profile.*, auth_user.email as recipient_email
      from public.professional_profiles as profile
      join auth.users as auth_user on auth_user.id = profile.user_id
      where profile.moderation_status = 'approved'
        and profile.reviewed_at >= now() - interval '24 hours'
      order by profile.reviewed_at asc
    loop
      perform net.http_post(
        url := 'https://azusfssqlgiiwoflseor.supabase.co/functions/v1/profile-moderation-notification',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'apikey', publishable_key,
          'Authorization', 'Bearer ' || publishable_key,
          'x-webhook-secret', webhook_secret
        ),
        body := jsonb_build_object(
          'type', 'UPDATE',
          'table', 'professional_profiles',
          'schema', 'public',
          'record', to_jsonb(approved_profile) - 'recipient_email',
          'old_record', jsonb_build_object('moderation_status', 'pending'),
          'recipient_email', approved_profile.recipient_email
        ),
        timeout_milliseconds := 5000
      );
    end loop;
  end if;
end;
$$;

commit;
