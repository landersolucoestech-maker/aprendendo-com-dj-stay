create or replace function private.consume_anonymous_mutation_quota(
  p_scope text,
  p_limit integer,
  p_window interval
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_method text := upper(coalesce(nullif(current_setting('request.method', true), ''), ''));
  v_headers_raw text;
  v_headers jsonb;
  v_ip_text text;
  v_ip inet;
  v_secret bytea;
  v_identity_hash bytea;
  v_now timestamp with time zone := statement_timestamp();
  v_window_started_at timestamp with time zone;
  v_request_count integer;
begin
  if v_method = '' then
    return;
  end if;

  if v_method <> 'POST' then
    raise exception 'RATE_LIMIT_CONTEXT_INVALID' using errcode = '22023';
  end if;

  if p_scope not in ('contact_submission', 'affiliate_click')
     or p_limit not between 1 and 1000
     or p_window < interval '1 minute'
     or p_window > interval '1 day' then
    raise exception 'RATE_LIMIT_CONFIGURATION_INVALID' using errcode = '22023';
  end if;

  v_headers_raw := current_setting('request.headers', true);
  if nullif(v_headers_raw, '') is null then
    raise exception 'RATE_LIMIT_CONTEXT_REQUIRED' using errcode = 'P0001';
  end if;

  begin
    v_headers := v_headers_raw::jsonb;
  exception
    when others then
      raise exception 'RATE_LIMIT_CONTEXT_INVALID' using errcode = '22023';
  end;

  v_ip_text := coalesce(
    nullif(btrim(v_headers ->> 'cf-connecting-ip'), ''),
    nullif(btrim(v_headers ->> 'x-real-ip'), ''),
    nullif(
      btrim(split_part(coalesce(v_headers ->> 'x-forwarded-for', ''), ',', 1)),
      ''
    )
  );

  if v_ip_text is null then
    raise exception 'RATE_LIMIT_CONTEXT_REQUIRED' using errcode = 'P0001';
  end if;

  begin
    v_ip := v_ip_text::inet;
  exception
    when invalid_text_representation then
      raise exception 'RATE_LIMIT_CONTEXT_INVALID' using errcode = '22023';
  end;

  select secret
  into strict v_secret
  from private.anonymous_mutation_rate_limit_secret
  where singleton;

  v_identity_hash := extensions.hmac(
    pg_catalog.convert_to(pg_catalog.host(v_ip), 'UTF8'),
    v_secret,
    'sha256'
  );
  v_window_started_at := pg_catalog.date_bin(
    p_window,
    v_now,
    timestamp with time zone '2000-01-01 00:00:00+00'
  );

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      p_scope || ':' || encode(v_identity_hash, 'hex') || ':' || v_window_started_at::text,
      0
    )
  );

  delete from private.anonymous_mutation_rate_limits target
  using (
    select candidate.ctid
    from private.anonymous_mutation_rate_limits candidate
    where candidate.expires_at <= v_now
    order by candidate.expires_at
    limit 100
  ) expired
  where target.ctid = expired.ctid;

  insert into private.anonymous_mutation_rate_limits as quota (
    scope,
    identity_hash,
    window_started_at,
    request_count,
    updated_at,
    expires_at
  ) values (
    p_scope,
    v_identity_hash,
    v_window_started_at,
    1,
    v_now,
    v_window_started_at + p_window + interval '1 day'
  )
  on conflict (scope, identity_hash, window_started_at)
  do update
  set request_count = quota.request_count + 1,
      updated_at = excluded.updated_at,
      expires_at = excluded.expires_at
  where quota.request_count < p_limit
  returning request_count into v_request_count;

  if not found then
    raise exception 'RATE_LIMITED'
      using errcode = 'P0001',
            detail = 'Anonymous mutation quota exceeded.',
            hint = 'Retry after the active rate-limit window.';
  end if;
end;
$function$;

revoke all on function private.consume_anonymous_mutation_quota(text, integer, interval)
  from public, anon, authenticated, service_role;
