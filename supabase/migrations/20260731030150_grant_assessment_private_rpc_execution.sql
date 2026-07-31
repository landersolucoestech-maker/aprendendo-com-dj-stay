-- FASE B13: allow public invoker wrappers to reach private security-definer operations.
-- The private schema remains outside the PostgREST exposed schemas.

grant execute on function private.create_assessment(jsonb) to authenticated, service_role;
grant execute on function private.update_assessment(uuid, integer, jsonb) to authenticated, service_role;
grant execute on function private.create_assessment_question(uuid, integer, jsonb) to authenticated, service_role;
grant execute on function private.update_assessment_question(uuid, integer, jsonb) to authenticated, service_role;
grant execute on function private.reorder_assessment_questions(uuid, integer, jsonb) to authenticated, service_role;
grant execute on function private.publish_assessment(uuid, integer) to authenticated, service_role;
grant execute on function private.unpublish_assessment(uuid, integer) to authenticated, service_role;
grant execute on function private.archive_assessment(uuid, integer) to authenticated, service_role;
grant execute on function private.delete_assessment(uuid, integer) to authenticated, service_role;
grant execute on function private.archive_assessment_question(uuid, integer) to authenticated, service_role;
grant execute on function private.delete_assessment_question(uuid, integer) to authenticated, service_role;
