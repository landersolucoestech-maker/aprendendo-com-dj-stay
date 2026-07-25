begin;

do $$ begin
  create type public.ticket_status as enum ('open','in_progress','waiting_customer','resolved','closed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.ticket_priority as enum ('low','normal','high','urgent');
exception when duplicate_object then null; end $$;

create sequence if not exists public.ticket_number_seq start with 1000;

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_number text not null unique default ('ATD-' || lpad(nextval('public.ticket_number_seq')::text,8,'0')),
  user_id uuid not null references public.profiles(id) on delete restrict,
  course_id uuid references public.courses(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  subject text not null,
  category text not null default 'general' check (category in ('general','access','course','payment','refund','technical','certificate')),
  priority public.ticket_priority not null default 'normal',
  status public.ticket_status not null default 'open',
  assigned_to uuid references public.profiles(id) on delete set null,
  first_response_at timestamptz,
  resolved_at timestamptz,
  closed_at timestamptz,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete restrict,
  body text not null,
  is_internal boolean not null default false,
  created_at timestamptz not null default now(),
  edited_at timestamptz
);

create table if not exists public.support_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.support_messages(id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  mime_type text,
  file_size_bytes bigint check (file_size_bytes is null or file_size_bytes >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  action_url text,
  data jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  table_name text not null,
  record_id text,
  old_data jsonb,
  new_data jsonb,
  request_id text,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);

create or replace function private.can_access_ticket(target_ticket_id uuid)
returns boolean
language sql stable security definer
set search_path = pg_catalog, public, private
as $$
  select exists (
    select 1 from public.support_tickets t
    where t.id = target_ticket_id
      and (
        t.user_id = (select auth.uid())
        or t.assigned_to = (select auth.uid())
        or private.has_any_role(array['support'::public.app_role,'admin'::public.app_role,'owner'::public.app_role])
        or (t.course_id is not null and private.can_manage_course(t.course_id))
      )
  );
$$;

revoke all on function private.can_access_ticket(uuid) from public,anon;
grant execute on function private.can_access_ticket(uuid) to authenticated,service_role;

create or replace function public.create_support_ticket(
  target_subject text,
  target_message text,
  target_category text default 'general',
  target_priority public.ticket_priority default 'normal',
  target_course_id uuid default null,
  target_order_id uuid default null
)
returns public.support_tickets
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare created_ticket public.support_tickets;
begin
  if (select auth.uid()) is null then raise exception 'Authentication required'; end if;
  if length(trim(target_subject)) < 3 then raise exception 'Subject is required'; end if;
  if length(trim(target_message)) < 3 then raise exception 'Message is required'; end if;

  if target_order_id is not null and not exists (
    select 1 from public.orders where id = target_order_id and user_id = (select auth.uid())
  ) then raise exception 'Order not found'; end if;

  if target_course_id is not null and not exists (
    select 1 from public.enrollments where course_id = target_course_id and user_id = (select auth.uid())
  ) then raise exception 'Course enrollment not found'; end if;

  insert into public.support_tickets(user_id,course_id,order_id,subject,category,priority)
  values ((select auth.uid()),target_course_id,target_order_id,trim(target_subject),target_category,target_priority)
  returning * into created_ticket;

  insert into public.support_messages(ticket_id,sender_id,body)
  values (created_ticket.id,(select auth.uid()),trim(target_message));

  return created_ticket;
end;
$$;

create or replace function public.reply_support_ticket(target_ticket_id uuid,target_message text,target_internal boolean default false)
returns public.support_messages
language plpgsql security definer
set search_path = pg_catalog, public, private
as $$
declare created_message public.support_messages; ticket_record public.support_tickets; is_staff boolean;
begin
  if not private.can_access_ticket(target_ticket_id) then raise exception 'Ticket not found'; end if;
  if length(trim(target_message)) < 1 then raise exception 'Message is required'; end if;
  is_staff := private.has_any_role(array['support'::public.app_role,'admin'::public.app_role,'owner'::public.app_role]);
  if target_internal and not is_staff then raise exception 'Internal messages are restricted'; end if;
  select * into ticket_record from public.support_tickets where id = target_ticket_id for update;

  insert into public.support_messages(ticket_id,sender_id,body,is_internal)
  values (target_ticket_id,(select auth.uid()),trim(target_message),target_internal)
  returning * into created_message;

  update public.support_tickets set
    last_message_at = now(),
    first_response_at = case when is_staff then coalesce(first_response_at,now()) else first_response_at end,
    status = case
      when is_staff and status in ('open','waiting_customer') then 'waiting_customer'::public.ticket_status
      when not is_staff and status = 'waiting_customer' then 'open'::public.ticket_status
      else status
    end,
    updated_at = now()
  where id = target_ticket_id;

  insert into public.notifications(user_id,type,title,body,action_url,data)
  select
    case when is_staff then ticket_record.user_id else coalesce(ticket_record.assigned_to,ticket_record.user_id) end,
    'support_reply','Nova resposta no atendimento',ticket_record.subject,
    '/suporte/' || target_ticket_id::text,
    jsonb_build_object('ticket_id',target_ticket_id,'ticket_number',ticket_record.ticket_number)
  where case when is_staff then ticket_record.user_id else coalesce(ticket_record.assigned_to,ticket_record.user_id) end <> (select auth.uid());

  return created_message;
end;
$$;

create or replace function public.update_ticket_status(target_ticket_id uuid,target_status public.ticket_status,target_assignee uuid default null)
returns public.support_tickets
language plpgsql security definer
set search_path = pg_catalog, public, private
as $$
declare updated_ticket public.support_tickets;
begin
  if not private.has_any_role(array['support'::public.app_role,'admin'::public.app_role,'owner'::public.app_role])
     and not exists (select 1 from public.support_tickets t where t.id = target_ticket_id and t.course_id is not null and private.can_manage_course(t.course_id))
  then raise exception 'Insufficient permissions'; end if;

  update public.support_tickets set
    status = target_status,
    assigned_to = coalesce(target_assignee,assigned_to),
    resolved_at = case when target_status = 'resolved' then now() else resolved_at end,
    closed_at = case when target_status = 'closed' then now() else closed_at end,
    updated_at = now()
  where id = target_ticket_id returning * into updated_ticket;
  if updated_ticket.id is null then raise exception 'Ticket not found'; end if;
  return updated_ticket;
end;
$$;

create or replace function public.get_instructor_dashboard(target_from timestamptz default (now()-interval '30 days'),target_to timestamptz default now())
returns jsonb
language plpgsql stable security definer
set search_path = pg_catalog, public, private
as $$
declare result jsonb;
begin
  if not private.has_any_role(array['instructor'::public.app_role,'admin'::public.app_role,'owner'::public.app_role]) then
    raise exception 'Insufficient permissions';
  end if;

  with managed_courses as (
    select c.id from public.courses c where private.can_manage_course(c.id)
  ), sales as (
    select count(distinct o.id) sales_count,
      coalesce(sum(oi.total_amount_cents) filter (where o.status in ('paid','partially_refunded')),0) gross_revenue_cents,
      coalesce(avg(oi.total_amount_cents) filter (where o.status in ('paid','partially_refunded')),0)::integer average_ticket_cents
    from public.order_items oi join public.orders o on o.id = oi.order_id
    where oi.course_id in (select id from managed_courses) and o.created_at >= target_from and o.created_at < target_to
  ), students as (
    select count(distinct e.user_id) total_students,
      count(distinct e.user_id) filter (where e.enrolled_at >= target_from and e.enrolled_at < target_to) new_students,
      coalesce(avg(e.progress_percent),0) average_progress,
      count(*) filter (where e.status = 'completed') completed_enrollments
    from public.enrollments e where e.course_id in (select id from managed_courses)
  ), content as (
    select count(*) courses_count,count(*) filter (where status='published') published_courses
    from public.courses where id in (select id from managed_courses)
  ), support as (
    select count(*) filter (where status in ('open','in_progress','waiting_customer')) open_tickets,
      count(*) filter (where priority='urgent' and status not in ('resolved','closed')) urgent_tickets
    from public.support_tickets where course_id in (select id from managed_courses)
  ), carts as (
    select count(distinct ca.id) abandoned_carts
    from public.carts ca join public.cart_items ci on ci.cart_id=ca.id join public.offers ofr on ofr.id=ci.offer_id join public.products p on p.id=ofr.product_id
    where p.course_id in (select id from managed_courses) and ca.status in ('abandoned','expired') and ca.updated_at >= target_from and ca.updated_at < target_to
  )
  select jsonb_build_object(
    'period',jsonb_build_object('from',target_from,'to',target_to),
    'courses_count',content.courses_count,
    'published_courses',content.published_courses,
    'total_students',students.total_students,
    'new_students',students.new_students,
    'average_progress',round(students.average_progress,2),
    'completed_enrollments',students.completed_enrollments,
    'sales_count',sales.sales_count,
    'gross_revenue_cents',sales.gross_revenue_cents,
    'average_ticket_cents',sales.average_ticket_cents,
    'open_tickets',support.open_tickets,
    'urgent_tickets',support.urgent_tickets,
    'abandoned_carts',carts.abandoned_carts
  ) into result from sales,students,content,support,carts;
  return result;
end;
$$;

create or replace function private.audit_row_change()
returns trigger
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare record_id text;
begin
  record_id := coalesce(case when tg_op <> 'DELETE' then to_jsonb(new)->>'id' end,case when tg_op <> 'INSERT' then to_jsonb(old)->>'id' end);
  insert into public.audit_logs(actor_id,action,table_name,record_id,old_data,new_data)
  values ((select auth.uid()),lower(tg_op),tg_table_name,record_id,
    case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end);
  return coalesce(new,old);
end;
$$;

do $$ declare table_name text;
begin
  foreach table_name in array array['courses','course_modules','lessons','lesson_assets','products','offers','orders','payments','refunds','enrollments','support_tickets'] loop
    execute format('drop trigger if exists %I_audit on public.%I',table_name,table_name);
    execute format('create trigger %I_audit after insert or update or delete on public.%I for each row execute function private.audit_row_change()',table_name,table_name);
  end loop;
end $$;

drop trigger if exists support_tickets_set_updated_at on public.support_tickets;
create trigger support_tickets_set_updated_at before update on public.support_tickets for each row execute function private.set_updated_at();

revoke all on function private.audit_row_change() from public,anon,authenticated;
revoke all on function public.create_support_ticket(text,text,text,public.ticket_priority,uuid,uuid) from public,anon;
revoke all on function public.reply_support_ticket(uuid,text,boolean) from public,anon;
revoke all on function public.update_ticket_status(uuid,public.ticket_status,uuid) from public,anon;
revoke all on function public.get_instructor_dashboard(timestamptz,timestamptz) from public,anon;
grant execute on function public.create_support_ticket(text,text,text,public.ticket_priority,uuid,uuid) to authenticated;
grant execute on function public.reply_support_ticket(uuid,text,boolean) to authenticated;
grant execute on function public.update_ticket_status(uuid,public.ticket_status,uuid) to authenticated;
grant execute on function public.get_instructor_dashboard(timestamptz,timestamptz) to authenticated;

alter table public.support_tickets enable row level security;
alter table public.support_messages enable row level security;
alter table public.support_attachments enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;

create policy support_tickets_select on public.support_tickets for select to authenticated using (private.can_access_ticket(id));
create policy support_messages_select on public.support_messages for select to authenticated
using (private.can_access_ticket(ticket_id) and (not is_internal or private.has_any_role(array['support'::public.app_role,'admin'::public.app_role,'owner'::public.app_role]) or exists (
  select 1 from public.support_tickets t where t.id=ticket_id and t.course_id is not null and private.can_manage_course(t.course_id)
)));
create policy support_attachments_select on public.support_attachments for select to authenticated
using (exists (select 1 from public.support_messages m where m.id=message_id and private.can_access_ticket(m.ticket_id)));
create policy notifications_own_select on public.notifications for select to authenticated using (user_id=(select auth.uid()));
create policy notifications_own_update on public.notifications for update to authenticated
using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
create policy audit_logs_admin_select on public.audit_logs for select to authenticated
using (private.has_any_role(array['admin'::public.app_role,'owner'::public.app_role]));

insert into storage.buckets(id,name,public,file_size_limit)
values ('support-attachments','support-attachments',false,26214400)
on conflict(id) do update set file_size_limit=excluded.file_size_limit;

create policy support_attachments_storage_read on storage.objects for select to authenticated
using (bucket_id='support-attachments' and exists (
  select 1 from public.support_attachments a join public.support_messages m on m.id=a.message_id
  where a.storage_path=name and private.can_access_ticket(m.ticket_id)
));
create policy support_attachments_storage_insert on storage.objects for insert to authenticated
with check (bucket_id='support-attachments' and (storage.foldername(name))[1] ~* '^[0-9a-f-]{36}$' and private.can_access_ticket(((storage.foldername(name))[1])::uuid));

create index if not exists support_tickets_user_status_idx on public.support_tickets(user_id,status,updated_at desc);
create index if not exists support_tickets_assigned_status_idx on public.support_tickets(assigned_to,status,priority,updated_at desc);
create index if not exists support_tickets_course_idx on public.support_tickets(course_id,status);
create index if not exists support_messages_ticket_created_idx on public.support_messages(ticket_id,created_at);
create index if not exists notifications_user_unread_idx on public.notifications(user_id,created_at desc) where read_at is null;
create index if not exists audit_logs_table_record_idx on public.audit_logs(table_name,record_id,created_at desc);

grant select on public.support_tickets,public.support_messages,public.support_attachments,public.notifications,public.audit_logs to authenticated;
grant update on public.notifications to authenticated;

commit;
