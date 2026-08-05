create table private.anonymous_mutation_rate_limit_secret (
  singleton boolean primary key default true check (singleton),
  secret bytea not null check (octet_length(secret) = 32),
  created_at timestamp with time zone not null default statement_timestamp()
);

alter table private.anonymous_mutation_rate_limit_secret enable row level security;
revoke all on table private.anonymous_mutation_rate_limit_secret from public, anon, authenticated, service_role;

insert into private.anonymous_mutation_rate_limit_secret (singleton, secret)
values (true, extensions.gen_random_bytes(32));

create table private.anonymous_mutation_rate_limits (
  scope text not null check (scope in ('contact_submission', 'affiliate_click')),
  identity_hash bytea not null check (octet_length(identity_hash) = 32),
  window_started_at timestamp with time zone not null,
  request_count integer not null check (request_count > 0),
  updated_at timestamp with time zone not null default statement_timestamp(),
  expires_at timestamp with time zone not null,
  primary key (scope, identity_hash, window_started_at),
  check (expires_at > window_started_at)
);

alter table private.anonymous_mutation_rate_limits enable row level security;
revoke all on table private.anonymous_mutation_rate_limits from public, anon, authenticated, service_role;

create index anonymous_mutation_rate_limits_expires_at_idx
  on private.anonymous_mutation_rate_limits (expires_at);

create function private.consume_anonymous_mutation_quota(
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

  v_ip_text := nullif(
    btrim(split_part(coalesce(v_headers ->> 'x-forwarded-for', ''), ',', 1)),
    ''
  );
  v_ip_text := coalesce(
    v_ip_text,
    nullif(btrim(v_headers ->> 'cf-connecting-ip'), ''),
    nullif(btrim(v_headers ->> 'x-real-ip'), '')
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

create function private.enforce_anonymous_mutation_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if coalesce(auth.jwt() ->> 'role', '') = 'service_role' then
    return new;
  end if;

  case tg_table_name
    when 'contact_messages' then
      perform private.consume_anonymous_mutation_quota(
        'contact_submission',
        5,
        interval '15 minutes'
      );
    when 'affiliate_clicks' then
      perform private.consume_anonymous_mutation_quota(
        'affiliate_click',
        120,
        interval '10 minutes'
      );
    else
      raise exception 'RATE_LIMIT_TRIGGER_SCOPE_INVALID' using errcode = 'P0001';
  end case;

  return new;
end;
$function$;

revoke all on function private.enforce_anonymous_mutation_rate_limit()
  from public, anon, authenticated, service_role;

create trigger contact_messages_anonymous_rate_limit
before insert on public.contact_messages
for each row execute function private.enforce_anonymous_mutation_rate_limit();

create trigger affiliate_clicks_anonymous_rate_limit
before insert on public.affiliate_clicks
for each row execute function private.enforce_anonymous_mutation_rate_limit();
