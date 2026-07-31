begin;
create extension if not exists pgtap with schema extensions;
select plan(39);

insert into auth.users(id,email) values
 ('b2200000-0000-4000-8000-000000000001','b22-contact-admin@example.test'),
 ('b2200000-0000-4000-8000-000000000002','b22-contact-student@example.test');
update public.user_roles
set role='administrador_proprietario'::public.app_role
where user_id='b2200000-0000-4000-8000-000000000001';

select set_config('request.jwt.claim.sub','',true);
select set_config('request.jwt.claims','{"role":"anon","is_anonymous":true}',true);
set local role anon;

select throws_ok(
  $$select public.submit_contact_message('A','a@example.test','Assunto válido','Mensagem válida para o teste.','b2200000-0000-4000-8000-000000000101')$$,
  '22023','CONTACT_NAME_INVALID','short contact name is rejected'
);
select throws_ok(
  $$select public.submit_contact_message('Pessoa Teste','email inválido','Assunto válido','Mensagem válida para o teste.','b2200000-0000-4000-8000-000000000102')$$,
  '22023','CONTACT_EMAIL_INVALID','invalid contact email is rejected'
);
select throws_ok(
  $$select public.submit_contact_message('Pessoa Teste','pessoa@example.test','X','Mensagem válida para o teste.','b2200000-0000-4000-8000-000000000103')$$,
  '22023','CONTACT_SUBJECT_INVALID','short contact subject is rejected'
);
select throws_ok(
  $$select public.submit_contact_message('Pessoa Teste','pessoa@example.test','Assunto válido','Curta','b2200000-0000-4000-8000-000000000104')$$,
  '22023','CONTACT_MESSAGE_INVALID','short contact message is rejected'
);

select lives_ok($$
  select set_config('test.b22_contact_result', public.submit_contact_message(
    'Pessoa Teste',
    'Pessoa@Example.Test',
    'Dúvida operacional',
    'Mensagem persistida para validar o canal de contato.',
    'b2200000-0000-4000-8000-000000000105'
  )::text, false)
$$,'anonymous contact request is persisted');

reset role;
select set_config('test.b22_contact_id',(current_setting('test.b22_contact_result')::jsonb->>'id'),false);
select set_config('test.b22_contact_reference',(current_setting('test.b22_contact_result')::jsonb->>'reference_code'),false);
select is((select count(*)::integer from public.contact_messages),1,'one contact message is stored');
select matches(current_setting('test.b22_contact_reference'),'^CONTATO-[A-F0-9]{16}$','contact reference follows public format');
select is((select email from public.contact_messages),'pessoa@example.test','contact email is normalized');
select is((select status::text from public.contact_messages),'new','contact starts new');
select is((select count(*)::integer from public.contact_message_events where event_type='submitted'),1,'contact submission is audited');

set local role anon;
select lives_ok($$
  select public.submit_contact_message(
    'Pessoa Teste',
    'Pessoa@Example.Test',
    'Dúvida operacional',
    'Mensagem persistida para validar o canal de contato.',
    'b2200000-0000-4000-8000-000000000105'
  )
$$,'same contact idempotency key can be retried');
reset role;
select is((select count(*)::integer from public.contact_messages),1,'idempotent retry does not duplicate message');
select is((select count(*)::integer from public.contact_message_events),1,'idempotent retry does not duplicate event');
set local role anon;
select throws_ok(
  $$select public.submit_contact_message('Outra Pessoa','outra@example.test','Outro assunto','Outro conteúdo usando a mesma chave idempotente.','b2200000-0000-4000-8000-000000000105')$$,
  '23505','CONTACT_IDEMPOTENCY_CONFLICT','idempotency key cannot be reused with different payload'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"b2200000-0000-4000-8000-000000000002","role":"authenticated","is_anonymous":false}',true);
select throws_ok(
  $$select public.get_contact_messages_admin(null,null,100,0)$$,
  '42501','ADMIN_REQUIRED','student cannot read contact inbox'
);
select throws_ok(
  format('select public.update_contact_message_status(%L::uuid,%L::public.contact_message_status,null)',current_setting('test.b22_contact_id'),'in_progress'),
  '42501','ADMIN_REQUIRED','student cannot change contact status'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"b2200000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":false}',true);
select is(jsonb_array_length(public.get_contact_messages_admin(null,null,100,0)->'messages'),1,'admin inbox lists persisted message');
select is((public.get_contact_messages_admin(null,null,100,0)->'summary'->>'new')::integer,1,'admin summary counts new request');
select lives_ok(
  format('select public.update_contact_message_status(%L::uuid,%L::public.contact_message_status,null)',current_setting('test.b22_contact_id'),'in_progress'),
  'admin starts contact treatment'
);
select is((public.get_contact_messages_admin(null,null,100,0)->'messages'->0->>'status'),'in_progress','contact moves to in progress');
select is((public.get_contact_messages_admin(null,null,100,0)->'messages'->0->>'event_count')::integer,2,'progress transition is audited');
select throws_ok(
  format('select public.update_contact_message_status(%L::uuid,%L::public.contact_message_status,null)',current_setting('test.b22_contact_id'),'resolved'),
  '22023','CONTACT_RESOLUTION_NOTE_REQUIRED','resolution requires treatment note'
);
select lives_ok(
  format('select public.update_contact_message_status(%L::uuid,%L::public.contact_message_status,%L)',current_setting('test.b22_contact_id'),'resolved','Solicitação analisada e tratamento registrado.'),
  'admin resolves contact with note'
);
select is((public.get_contact_messages_admin(null,null,100,0)->'messages'->0->>'status'),'resolved','contact becomes resolved');
select ok((public.get_contact_messages_admin(null,null,100,0)->'messages'->0->>'handled_at') is not null,'resolved contact stores handled timestamp');
select is((public.get_contact_messages_admin(null,null,100,0)->'messages'->0->>'resolution_note'),'Solicitação analisada e tratamento registrado.','resolution note is preserved');
select is((public.get_contact_messages_admin(null,null,100,0)->'messages'->0->>'event_count')::integer,3,'resolution appends audit event');
select lives_ok(
  format('select public.update_contact_message_status(%L::uuid,%L::public.contact_message_status,%L)',current_setting('test.b22_contact_id'),'resolved','Repetição idempotente'),
  'repeated resolution is idempotent'
);
select is((public.get_contact_messages_admin(null,null,100,0)->'messages'->0->>'event_count')::integer,3,'idempotent status update does not duplicate event');
select lives_ok(
  format('select public.update_contact_message_status(%L::uuid,%L::public.contact_message_status,null)',current_setting('test.b22_contact_id'),'new'),
  'admin can reopen resolved contact'
);
select is((public.get_contact_messages_admin(null,null,100,0)->'messages'->0->>'status'),'new','reopened contact returns to new');
select ok((public.get_contact_messages_admin(null,null,100,0)->'messages'->0->>'handled_at') is null,'reopened contact clears handled timestamp');
select is((public.get_contact_messages_admin(null,null,100,0)->'messages'->0->>'event_count')::integer,4,'reopening appends audit event');
select throws_ok(
  format('select public.update_contact_message_status(%L::uuid,%L::public.contact_message_status,null)',current_setting('test.b22_contact_id'),'spam'),
  '22023','CONTACT_RESOLUTION_NOTE_REQUIRED','spam classification requires note'
);
select lives_ok(
  format('select public.update_contact_message_status(%L::uuid,%L::public.contact_message_status,%L)',current_setting('test.b22_contact_id'),'spam','Conteúdo classificado como spam pelo administrador.'),
  'admin marks contact as spam with note'
);
select is((public.get_contact_messages_admin(null,null,100,0)->'messages'->0->>'status'),'spam','contact becomes spam');
select is((public.get_contact_messages_admin(null,null,100,0)->'messages'->0->>'event_count')::integer,5,'spam classification appends audit event');
select is((public.get_contact_messages_admin(null,null,100,0)->'summary'->>'spam')::integer,1,'admin summary counts spam request');
select is(jsonb_array_length(public.get_contact_messages_admin(null,'CONTATO-',100,0)->'messages'),1,'admin search finds protocol');

select * from finish();
rollback;
