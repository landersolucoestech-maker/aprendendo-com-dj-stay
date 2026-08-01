begin;

create extension if not exists pgtap with schema extensions;

select plan(2);

select is(
  current_setting('TimeZone'),
  'UTC',
  'Banco deve operar em UTC.'
);

select is(
  (
    select count(*)::bigint
    from information_schema.columns
    where table_schema in ('public', 'private')
      and data_type = 'timestamp without time zone'
  ),
  0::bigint,
  'Schemas operacionais não podem persistir timestamp sem timezone.'
);

select * from finish();

rollback;
