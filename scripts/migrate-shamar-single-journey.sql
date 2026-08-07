-- Simplifica o SHAMAR para uma única jornada pessoal sem apagar histórico.
-- Idempotente: pode ser reaplicado com segurança.

begin;

update public.shamar_tribo_configs as config
set turma = regexp_replace(config.turma, '^SHAMAR[[:space:]]+(Individual|Dupla|Tribo)', 'SHAMAR', 'i')
where exists (
  select 1
  from public.shamar_seasons as season
  where season.tribo_config_id = config.id
    and season.status = 'active'
)
and config.turma ~* '^SHAMAR[[:space:]]+(Individual|Dupla|Tribo)';

update public.shamar_invites
set status = 'cancelled',
    updated_at = now()
where status = 'pending'
  and mode in ('dupla', 'tribo');

update public.shamar_partnerships
set status = 'ended'
where status in ('pending', 'active');

commit;
