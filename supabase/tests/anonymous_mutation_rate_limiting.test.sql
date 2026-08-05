begin;
create extension if not exists pgtap with schema extensions;
select plan(24);

select ok(
  to_regclass('private.anonymous_mutation_rate_limit_secret') is not null,
  'private rate-limit secret table exists'
);

select ok(
  to_regclass('private.anonymous_mutation_rate_limits') is not null,
  'private rate-limit counter table exists'
);

select ok(
  to_regclass('private.anonymous_mutation_rate_limits_expires_at_idx') is not null,
  'expired counter cleanup index exists'
);

select is(
  (
    select count(*)::integer
    from pg_trigger
    where tgname in (
      'contact_messages_anonymous_rate_limit',
      'affiliate_clicks_anonymous_rate_limit'
    )
      and not tgisinternal
  ),
  2,
  'both anonymous mutation tables enforce the shared trigger'
);

select is(
  (
    select count(*)::integer
    from pg_proc function
    join pg_namespace namespace on namespace.oid = function.pronamespace
    where namespace.nspname = 'private'
      and function.proname in (
        'consume_anonymous_mutation_quota',
        'enforce_anonymous_mutation_rate_limit'
      )
      and function.prosecdef
  ),
  2,
  'rate-limit functions execute with the private owner privileges'
);

select ok(
  (
    select bool_and(relation.relrowsecurity)
    from pg_class relation
    join pg_namespace namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'private'
      and relation.relname in (
        'anonymous_mutation_rate_limit_secret',
        'anonymous_mutation_rate_limits'
      )
  ),
  'both private rate-limit tables have RLS enabled'
);

select is(
  (
    select count(*)::integer
    from pg_policies
    where schemaname = 'private'
      and policyname in (
        'anonymous_mutation_rate_limit_secret_deny_unprivileged',
        'anonymous_mutation_rate_limits_deny_unprivileged'
      )
  ),
  2,
  'explicit deny policies protect both private tables'
);

select ok(
  not has_table_privilege(
    'anon',
    'private.anonymous_mutation_rate_limits',
    'SELECT,INSERT,UPDATE,DELETE'
  ),
  'anon has no direct access to rate-limit counters'
);

select ok(
  not has_table_privilege(
    'authenticated',
    'private.anonymous_mutation_rate_limit_secret',
    'SELECT,INSERT,UPDATE,DELETE'
  ),
  'authenticated has no direct access to the HMAC secret'
);

select ok(
  not has_function_privilege(
    'anon',
    'private.consume_anonymous_mutation_quota(text,integer,interval)'::regprocedure,
    'EXECUTE'
  ),
  'anon cannot invoke the quota helper directly'
);

select is(
  (
    select count(*)::integer
    from private.anonymous_mutation_rate_limit_secret
    where singleton
      and octet_length(secret) = 32
  ),
  1,
  'exactly one 32-byte HMAC secret exists'
);

set local role anon;
set local request.method = 'POST';
set local request.headers = '{"x-forwarded-for":"203.0.113.30, 198.51.100.1"}';
set local request.jwt.claims = '{"role":"anon"}';

do $contact_probe$
declare
  v_index integer;
begin
  for v_index in 1..5 loop
    perform public.submit_contact_message(
      'Teste B143',
      'b143-rate-limit@example.com',
      'Quota anônima',
      'Mensagem válida da quota anônima número ' || v_index::text || '.',
      ('00000000-0000-4000-8200-' || lpad(v_index::text, 12, '0'))::uuid
    );
  end loop;

  begin
    perform public.submit_contact_message(
      'Teste B143',
      'b143-rate-limit@example.com',
      'Quota anônima',
      'Esta mensagem precisa ser recusada pela quota.',
      '00000000-0000-4000-8200-000000000006'::uuid
    );
    raise exception 'RATE_LIMIT_PROBE_NOT_BLOCKED';
  exception
    when sqlstate 'P0001' then
      if sqlerrm <> 'RATE_LIMITED' then
        raise;
      end if;
  end;
end
$contact_probe$;

set local request.headers = '{"x-forwarded-for":"203.0.113.31"}';
do $independent_origin_probe$
begin
  perform public.submit_contact_message(
    'Teste B143 origem independente',
    'b143-independent@example.com',
    'Quota anônima',
    'Uma origem diferente mantém sua própria janela.',
    '00000000-0000-4000-8200-000000000007'::uuid
  );
end
$independent_origin_probe$;

set local request.headers = '{}';
do $missing_context_probe$
begin
  begin
    perform public.submit_contact_message(
      'Teste B143 sem origem',
      'b143-missing-context@example.com',
      'Quota anônima',
      'Esta mensagem precisa falhar sem origem confiável.',
      '00000000-0000-4000-8200-000000000008'::uuid
    );
    raise exception 'MISSING_CONTEXT_PROBE_NOT_BLOCKED';
  exception
    when sqlstate 'P0001' then
      if sqlerrm <> 'RATE_LIMIT_CONTEXT_REQUIRED' then
        raise;
      end if;
  end;
end
$missing_context_probe$;

reset role;
set local request.method = 'POST';
set local request.headers = '{"x-forwarded-for":"203.0.113.32"}';
set local request.jwt.claims = '{"role":"anon"}';

do $affiliate_probe$
begin
  perform private.consume_anonymous_mutation_quota(
    'affiliate_click',
    2,
    interval '10 minutes'
  );
  perform private.consume_anonymous_mutation_quota(
    'affiliate_click',
    2,
    interval '10 minutes'
  );

  begin
    perform private.consume_anonymous_mutation_quota(
      'affiliate_click',
      2,
      interval '10 minutes'
    );
    raise exception 'AFFILIATE_RATE_LIMIT_PROBE_NOT_BLOCKED';
  exception
    when sqlstate 'P0001' then
      if sqlerrm <> 'RATE_LIMITED' then
        raise;
      end if;
  end;
end
$affiliate_probe$;

set local request.headers = '{"cf-connecting-ip":"203.0.113.34","x-real-ip":"203.0.113.44","x-forwarded-for":"198.51.100.250"}';
select private.consume_anonymous_mutation_quota(
  'affiliate_click',
  1,
  interval '10 minutes'
);

set local request.headers = '{"cf-connecting-ip":"203.0.113.34","x-real-ip":"203.0.113.45","x-forwarded-for":"198.51.100.251"}';
do $cf_precedence_probe$
begin
  begin
    perform private.consume_anonymous_mutation_quota(
      'affiliate_click',
      1,
      interval '10 minutes'
    );
    raise exception 'CF_ORIGIN_PRECEDENCE_NOT_ENFORCED';
  exception
    when sqlstate 'P0001' then
      if sqlerrm <> 'RATE_LIMITED' then
        raise;
      end if;
  end;
end
$cf_precedence_probe$;

set local request.headers = '{"cf-connecting-ip":"203.0.113.35","x-real-ip":"203.0.113.45","x-forwarded-for":"198.51.100.251"}';
select private.consume_anonymous_mutation_quota(
  'affiliate_click',
  1,
  interval '10 minutes'
);

set local request.headers = '{"x-real-ip":"203.0.113.36","x-forwarded-for":"198.51.100.252"}';
select private.consume_anonymous_mutation_quota(
  'affiliate_click',
  1,
  interval '10 minutes'
);

set local request.headers = '{"x-real-ip":"203.0.113.36","x-forwarded-for":"198.51.100.253"}';
do $real_ip_precedence_probe$
begin
  begin
    perform private.consume_anonymous_mutation_quota(
      'affiliate_click',
      1,
      interval '10 minutes'
    );
    raise exception 'REAL_IP_ORIGIN_PRECEDENCE_NOT_ENFORCED';
  exception
    when sqlstate 'P0001' then
      if sqlerrm <> 'RATE_LIMITED' then
        raise;
      end if;
  end;
end
$real_ip_precedence_probe$;

set local request.headers = '{"x-forwarded-for":"203.0.113.37, 198.51.100.1"}';
select private.consume_anonymous_mutation_quota(
  'affiliate_click',
  1,
  interval '10 minutes'
);

set local request.method = 'POST';
set local request.headers = '{"x-forwarded-for":"203.0.113.33"}';
set local request.jwt.claims = '{"role":"service_role"}';
do $service_context_probe$
begin
  perform public.submit_contact_message(
    'Teste B143 serviço',
    'b143-service-context@example.com',
    'Quota anônima',
    'O contexto de serviço não consome quota anônima.',
    '00000000-0000-4000-8200-000000000009'::uuid
  );
end
$service_context_probe$;

select is(
  (
    select count(*)::integer
    from private.anonymous_mutation_rate_limits
    where scope = 'contact_submission'
  ),
  2,
  'contact submissions use one fixed-window counter per origin'
);

select is(
  (
    select max(request_count)
    from private.anonymous_mutation_rate_limits
    where scope = 'contact_submission'
  ),
  5,
  'contact submission quota blocks the sixth request in fifteen minutes'
);

select is(
  (
    select count(*)::integer
    from public.contact_messages
    where email in (
      'b143-rate-limit@example.com',
      'b143-independent@example.com',
      'b143-service-context@example.com'
    )
  ),
  7,
  'only accepted contact messages are persisted'
);

select ok(
  not exists (
    select 1
    from public.contact_messages
    where email = 'b143-missing-context@example.com'
  ),
  'HTTP mutations without a trustworthy origin fail closed'
);

select is(
  (
    select max(request_count)
    from private.anonymous_mutation_rate_limits
    where scope = 'affiliate_click'
  ),
  2,
  'affiliate quota helper blocks requests beyond the configured limit'
);

select ok(
  not exists (
    select 1
    from private.anonymous_mutation_rate_limits quota
    cross join private.anonymous_mutation_rate_limit_secret secret
    where quota.scope = 'contact_submission'
      and quota.identity_hash = extensions.hmac(
        pg_catalog.convert_to('203.0.113.33', 'UTF8'),
        secret.secret,
        'sha256'
      )
  ),
  'service-role request context does not consume anonymous quota'
);

select ok(
  exists (
    select 1
    from private.anonymous_mutation_rate_limits quota
    cross join private.anonymous_mutation_rate_limit_secret secret
    where quota.scope = 'affiliate_click'
      and quota.identity_hash = extensions.hmac(
        pg_catalog.convert_to('203.0.113.34', 'UTF8'),
        secret.secret,
        'sha256'
      )
  )
  and not exists (
    select 1
    from private.anonymous_mutation_rate_limits quota
    cross join private.anonymous_mutation_rate_limit_secret secret
    where quota.scope = 'affiliate_click'
      and quota.identity_hash = extensions.hmac(
        pg_catalog.convert_to('198.51.100.250', 'UTF8'),
        secret.secret,
        'sha256'
      )
  ),
  'cf-connecting-ip takes precedence over spoofable forwarded values'
);

select ok(
  exists (
    select 1
    from private.anonymous_mutation_rate_limits quota
    cross join private.anonymous_mutation_rate_limit_secret secret
    where quota.scope = 'affiliate_click'
      and quota.identity_hash = extensions.hmac(
        pg_catalog.convert_to('203.0.113.35', 'UTF8'),
        secret.secret,
        'sha256'
      )
  ),
  'a different cf-connecting-ip receives an independent counter'
);

select ok(
  exists (
    select 1
    from private.anonymous_mutation_rate_limits quota
    cross join private.anonymous_mutation_rate_limit_secret secret
    where quota.scope = 'affiliate_click'
      and quota.identity_hash = extensions.hmac(
        pg_catalog.convert_to('203.0.113.36', 'UTF8'),
        secret.secret,
        'sha256'
      )
  )
  and not exists (
    select 1
    from private.anonymous_mutation_rate_limits quota
    cross join private.anonymous_mutation_rate_limit_secret secret
    where quota.scope = 'affiliate_click'
      and quota.identity_hash = extensions.hmac(
        pg_catalog.convert_to('198.51.100.252', 'UTF8'),
        secret.secret,
        'sha256'
      )
  ),
  'x-real-ip takes precedence when the edge-specific header is absent'
);

select ok(
  exists (
    select 1
    from private.anonymous_mutation_rate_limits quota
    cross join private.anonymous_mutation_rate_limit_secret secret
    where quota.scope = 'affiliate_click'
      and quota.identity_hash = extensions.hmac(
        pg_catalog.convert_to('203.0.113.37', 'UTF8'),
        secret.secret,
        'sha256'
      )
  ),
  'the first x-forwarded-for address is used only as the final fallback'
);

select ok(
  (
    select bool_and(octet_length(identity_hash) = 32)
    from private.anonymous_mutation_rate_limits
  ),
  'all persisted origin identifiers are 32-byte HMAC values'
);

select ok(
  (
    select bool_and(
      identity_hash <> pg_catalog.convert_to('203.0.113.30', 'UTF8')
      and identity_hash <> pg_catalog.convert_to('203.0.113.32', 'UTF8')
    )
    from private.anonymous_mutation_rate_limits
  ),
  'raw IP addresses are never persisted in the quota state'
);

select ok(
  (
    select bool_and(expires_at > updated_at)
    from private.anonymous_mutation_rate_limits
  ),
  'quota counters carry a bounded future expiration'
);

select * from finish();
rollback;
