-- FASE B12: release/prerequisite-aware reads, progress, media and course publication.

create or replace function private.module_prerequisites_completed(p_user_id uuid,p_module_id uuid)
returns boolean language sql stable security definer set search_path=''
as $$
  select not exists (
    select 1 from public.module_prerequisites mp
    where mp.module_id=p_module_id
      and exists (
        select 1 from public.aulas a
        where a.modulo_id=mp.prerequisite_module_id and a.obrigatoria and a.status='published' and a.deleted_at is null
          and not exists(select 1 from public.progresso_aulas p where p.user_id=p_user_id and p.aula_id=a.id and p.completada)
      )
  )
$$;

create or replace function private.lesson_prerequisites_completed(p_user_id uuid,p_lesson_id uuid)
returns boolean language sql stable security definer set search_path=''
as $$
  select not exists (
    select 1 from public.lesson_prerequisites lp
    where lp.lesson_id=p_lesson_id
      and not exists(select 1 from public.progresso_aulas p where p.user_id=p_user_id and p.aula_id=lp.prerequisite_lesson_id and p.completada)
  )
$$;

create or replace function private.module_available_to_user(p_user_id uuid,p_module_id uuid)
returns boolean language sql stable security definer set search_path=''
as $$
  select exists (
    select 1 from public.modulos m
    join public.enrollments e on e.course_id=m.course_id and e.user_id=p_user_id
    where m.id=p_module_id and m.status='published' and m.deleted_at is null
      and private.has_active_course_access(p_user_id,m.course_id)
      and (
        m.preview_enabled
        or (
          (m.release_mode='immediate')
          or (m.release_mode='scheduled' and m.release_at<=statement_timestamp())
          or (m.release_mode='drip' and statement_timestamp()>=e.starts_at+make_interval(days=>m.drip_delay_days))
          or (m.release_mode='after_prerequisites' and private.module_prerequisites_completed(p_user_id,m.id))
        )
      )
      and (m.release_mode='after_prerequisites' or private.module_prerequisites_completed(p_user_id,m.id))
  )
$$;

create or replace function private.lesson_available_to_user(p_user_id uuid,p_lesson_id uuid)
returns boolean language sql stable security definer set search_path=''
as $$
  select exists (
    select 1 from public.aulas a
    join public.modulos m on m.id=a.modulo_id
    join public.enrollments e on e.course_id=m.course_id and e.user_id=p_user_id
    where a.id=p_lesson_id and a.status='published' and a.deleted_at is null
      and private.module_available_to_user(p_user_id,m.id)
      and (a.availability_starts_at is null or a.availability_starts_at<=statement_timestamp())
      and (a.availability_ends_at is null or a.availability_ends_at>statement_timestamp())
      and (
        a.preview_enabled
        or (
          (a.release_mode='immediate')
          or (a.release_mode='scheduled' and a.release_at<=statement_timestamp())
          or (a.release_mode='drip' and statement_timestamp()>=e.starts_at+make_interval(days=>a.drip_delay_days))
          or (a.release_mode='after_prerequisites' and private.lesson_prerequisites_completed(p_user_id,a.id))
        )
      )
      and (a.release_mode='after_prerequisites' or private.lesson_prerequisites_completed(p_user_id,a.id))
  )
$$;

revoke all on function private.module_prerequisites_completed(uuid,uuid) from public,anon;
revoke all on function private.lesson_prerequisites_completed(uuid,uuid) from public,anon;
revoke all on function private.module_available_to_user(uuid,uuid) from public,anon;
revoke all on function private.lesson_available_to_user(uuid,uuid) from public,anon;
grant execute on function private.module_prerequisites_completed(uuid,uuid),private.lesson_prerequisites_completed(uuid,uuid),private.module_available_to_user(uuid,uuid),private.lesson_available_to_user(uuid,uuid) to authenticated,service_role;

drop policy if exists modulos_select on public.modulos;
drop policy if exists aulas_select on public.aulas;
create policy modulos_select on public.modulos for select to authenticated using (
  (select private.current_user_role())='administrador_proprietario'
  or ((select private.current_user_role())='aluno' and private.module_available_to_user((select auth.uid()),id))
);
create policy aulas_select on public.aulas for select to authenticated using (
  (select private.current_user_role())='administrador_proprietario'
  or ((select private.current_user_role())='aluno' and private.lesson_available_to_user((select auth.uid()),id))
);

drop policy if exists progresso_aulas_select on public.progresso_aulas;
drop policy if exists progresso_aulas_insert on public.progresso_aulas;
drop policy if exists progresso_aulas_update on public.progresso_aulas;
drop policy if exists progresso_aulas_delete on public.progresso_aulas;
create policy progresso_aulas_select on public.progresso_aulas for select to authenticated using ((select private.current_user_role())='administrador_proprietario' or ((select private.current_user_role())='aluno' and user_id=(select auth.uid()) and private.lesson_available_to_user((select auth.uid()),aula_id)));
create policy progresso_aulas_insert on public.progresso_aulas for insert to authenticated with check ((select private.current_user_role())='administrador_proprietario' or ((select private.current_user_role())='aluno' and user_id=(select auth.uid()) and private.lesson_available_to_user((select auth.uid()),aula_id)));
create policy progresso_aulas_update on public.progresso_aulas for update to authenticated using ((select private.current_user_role())='administrador_proprietario' or ((select private.current_user_role())='aluno' and user_id=(select auth.uid()) and private.lesson_available_to_user((select auth.uid()),aula_id))) with check ((select private.current_user_role())='administrador_proprietario' or ((select private.current_user_role())='aluno' and user_id=(select auth.uid()) and private.lesson_available_to_user((select auth.uid()),aula_id)));
create policy progresso_aulas_delete on public.progresso_aulas for delete to authenticated using ((select private.current_user_role())='administrador_proprietario' or ((select private.current_user_role())='aluno' and user_id=(select auth.uid()) and private.lesson_available_to_user((select auth.uid()),aula_id)));

drop policy if exists lesson_media_select on public.lesson_media;
create policy lesson_media_select on public.lesson_media for select to authenticated using (
  (select private.current_user_role())='administrador_proprietario'
  or (is_active and (select private.current_user_role())='aluno' and private.lesson_available_to_user((select auth.uid()),lesson_id))
);

drop policy if exists assets_select on public.assets;
create policy assets_select on public.assets for select to authenticated using (
  (select private.current_user_role())='administrador_proprietario'
  or owner_user_id=(select auth.uid())
  or ((select private.current_user_role())='aluno' and lesson_id is not null and state='published' and deleted_at is null
    and private.lesson_available_to_user((select auth.uid()),lesson_id)
    and exists(select 1 from public.asset_access_grants g where g.asset_id=assets.id and g.user_id=(select auth.uid()) and (g.expires_at is null or g.expires_at>statement_timestamp())))
);

create or replace function private.assert_course_publishable(p_course_id uuid)
returns void language plpgsql stable security definer set search_path=''
as $$
declare v_course public.courses;
begin
  select * into v_course from public.courses where id=p_course_id;
  if not found then raise exception 'COURSE_NOT_FOUND' using errcode='P0002'; end if;
  if v_course.deleted_at is not null then raise exception 'COURSE_DELETED' using errcode='22023'; end if;
  if v_course.status='archived' then raise exception 'ARCHIVED_COURSE_CANNOT_PUBLISH' using errcode='22023'; end if;
  if v_course.short_description is null or v_course.description is null or v_course.category is null then raise exception 'COURSE_DESCRIPTIONS_AND_CATEGORY_REQUIRED' using errcode='22023'; end if;
  if cardinality(v_course.objectives)=0 then raise exception 'COURSE_OBJECTIVES_REQUIRED' using errcode='22023'; end if;
  if v_course.cover_asset_id is null or v_course.thumbnail_asset_id is null then raise exception 'COURSE_IMAGES_REQUIRED' using errcode='22023'; end if;
  perform private.assert_course_asset(v_course.cover_asset_id,'cover'); perform private.assert_course_asset(v_course.thumbnail_asset_id,'thumbnail');
  if v_course.release_mode='scheduled' and v_course.release_at<=statement_timestamp() then raise exception 'SCHEDULED_RELEASE_MUST_BE_FUTURE' using errcode='22023'; end if;
  if not exists(select 1 from public.modulos where course_id=p_course_id and status='published' and deleted_at is null) then raise exception 'PUBLISHED_MODULE_REQUIRED' using errcode='22023'; end if;
  if exists(select 1 from public.modulos m where m.course_id=p_course_id and m.status='published' and m.deleted_at is null and not exists(select 1 from public.aulas a where a.modulo_id=m.id and a.status='published' and a.deleted_at is null)) then raise exception 'PUBLISHED_LESSON_REQUIRED_FOR_EACH_MODULE' using errcode='22023'; end if;
end;
$$;

-- Enforce curriculum availability before issuing a playback token while retaining B10 token semantics.
create or replace function private.issue_lesson_playback_token(p_lesson_id uuid,p_fingerprint_hash text)
returns table(granted boolean,reason text,token text,expires_at timestamptz,provider public.lesson_media_provider,watermark_text text)
language plpgsql security definer set search_path=''
as $$
declare
  v_user_id uuid:=(select auth.uid()); v_session_id uuid; v_role public.app_role:=(select private.current_user_role());
  v_media public.lesson_media; v_enrollment public.enrollments; v_raw_token text; v_token public.playback_tokens; v_watermark text;
begin
  begin v_session_id:=nullif((select auth.jwt()->>'session_id'),'')::uuid; exception when invalid_text_representation then v_session_id:=null; end;
  if v_user_id is null or v_session_id is null then perform private.log_playback_event(null,v_user_id,null,'denied','AUTH_SESSION_REQUIRED'); return query select false,'AUTH_SESSION_REQUIRED',null::text,null::timestamptz,null::public.lesson_media_provider,null::text; return; end if;
  if p_fingerprint_hash is null or p_fingerprint_hash!~'^[a-f0-9]{64}$' then perform private.log_playback_event(null,v_user_id,null,'denied','INVALID_FINGERPRINT'); return query select false,'INVALID_FINGERPRINT',null::text,null::timestamptz,null::public.lesson_media_provider,null::text; return; end if;
  select * into v_media from public.lesson_media where lesson_id=p_lesson_id and is_active limit 1;
  if not found then perform private.log_playback_event(null,v_user_id,null,'denied','MEDIA_NOT_AVAILABLE',jsonb_build_object('lesson_id',p_lesson_id)); return query select false,'MEDIA_NOT_AVAILABLE',null::text,null::timestamptz,null::public.lesson_media_provider,null::text; return; end if;
  if v_role='aluno' then
    if not private.lesson_available_to_user(v_user_id,p_lesson_id) then perform private.log_playback_event(null,v_user_id,v_media.id,'denied','LESSON_NOT_AVAILABLE',jsonb_build_object('lesson_id',p_lesson_id)); return query select false,'LESSON_NOT_AVAILABLE',null::text,null::timestamptz,null::public.lesson_media_provider,null::text; return; end if;
    select * into v_enrollment from public.enrollments where user_id=v_user_id and course_id=private.lesson_course_id(p_lesson_id) and status='active' and starts_at<=statement_timestamp() and (expires_at is null or expires_at>statement_timestamp()) limit 1;
  elsif v_role<>'administrador_proprietario' then perform private.log_playback_event(null,v_user_id,v_media.id,'denied','ROLE_NOT_ALLOWED'); return query select false,'ROLE_NOT_ALLOWED',null::text,null::timestamptz,null::public.lesson_media_provider,null::text; return; end if;
  if v_media.provider='private_asset' and not exists(select 1 from public.assets join storage.objects on storage.objects.bucket_id=assets.bucket_id and storage.objects.name=assets.object_path where assets.id=v_media.asset_id and assets.state='published' and assets.deleted_at is null) then perform private.log_playback_event(null,v_user_id,v_media.id,'denied','PRIVATE_MEDIA_OBJECT_UNAVAILABLE'); return query select false,'PRIVATE_MEDIA_OBJECT_UNAVAILABLE',null::text,null::timestamptz,null::public.lesson_media_provider,null::text; return; end if;
  with revoked as (update public.playback_tokens set revoked_at=statement_timestamp() where user_id=v_user_id and auth_session_id=v_session_id and lesson_media_id=v_media.id and revoked_at is null and expires_at>statement_timestamp() returning id,user_id,lesson_media_id) insert into public.playback_events(playback_token_id,user_id,lesson_media_id,event_type,reason,details) select id,user_id,lesson_media_id,'revoked','TOKEN_RENEWED','{}' from revoked;
  v_raw_token:=encode(extensions.gen_random_bytes(24),'hex');
  v_watermark:=case when v_media.watermark_enabled then 'ID '||upper(substr(encode(extensions.digest(v_user_id::text||':'||v_session_id::text,'sha256'),'hex'),1,10)) else null end;
  insert into public.playback_tokens(token_hash,user_id,auth_session_id,lesson_media_id,enrollment_id,fingerprint_hash,watermark_text,expires_at) values(encode(extensions.digest(v_raw_token,'sha256'),'hex'),v_user_id,v_session_id,v_media.id,v_enrollment.id,p_fingerprint_hash,v_watermark,statement_timestamp()+interval '5 minutes') returning * into v_token;
  perform private.log_playback_event(v_token.id,v_user_id,v_media.id,'issued',null,jsonb_build_object('expires_at',v_token.expires_at,'provider',v_media.provider));
  return query select true,null::text,v_raw_token,v_token.expires_at,v_media.provider,v_watermark;
end;
$$;

revoke all on function private.issue_lesson_playback_token(uuid,text) from public,anon,authenticated;
grant execute on function private.issue_lesson_playback_token(uuid,text) to authenticated;
