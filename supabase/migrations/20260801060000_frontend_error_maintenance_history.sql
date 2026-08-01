-- FASE B36: histórico administrativo paginado das manutenções de incidentes.

create function private.get_frontend_error_maintenance_history(
  p_limit integer default 50,
  p_offset integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_limit integer := greatest(1, least(coalesce(p_limit, 50), 200));
  v_offset integer := greatest(coalesce(p_offset, 0), 0);
begin
  if auth.uid() is null
    or private.current_user_role() <> 'administrador_proprietario'::public.app_role
  then
    raise exception 'ADMIN_REQUIRED' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'total', (select count(*) from public.frontend_error_maintenance_events),
    'limit', v_limit,
    'offset', v_offset,
    'events', (
      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'id', maintenance_record.id,
            'actor_user_id', maintenance_record.actor_user_id,
            'action', maintenance_record.action,
            'retention_days', maintenance_record.retention_days,
            'cutoff_at', maintenance_record.cutoff_at,
            'affected_rows', maintenance_record.affected_rows,
            'metadata', maintenance_record.metadata,
            'created_at', maintenance_record.created_at
          ) order by maintenance_record.created_at desc, maintenance_record.id desc
        ),
        '[]'::jsonb
      )
      from (
        select *
        from public.frontend_error_maintenance_events
        order by created_at desc, id desc
        limit v_limit offset v_offset
      ) maintenance_record
    )
  );
end;
$$;

create function public.get_frontend_error_maintenance_history(
  p_limit integer default 50,
  p_offset integer default 0
)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.get_frontend_error_maintenance_history(p_limit, p_offset)
$$;

revoke all on function private.get_frontend_error_maintenance_history(integer, integer)
from public, anon, authenticated;
grant execute on function private.get_frontend_error_maintenance_history(integer, integer)
to authenticated;

revoke all on function public.get_frontend_error_maintenance_history(integer, integer)
from public, anon;
grant execute on function public.get_frontend_error_maintenance_history(integer, integer)
to authenticated;
