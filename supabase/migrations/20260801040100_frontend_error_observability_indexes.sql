-- FASE B31: índice de cobertura exigido pelo advisor para o responsável pelo tratamento.

create index frontend_error_events_handled_by_idx
  on public.frontend_error_events (handled_by_user_id);
