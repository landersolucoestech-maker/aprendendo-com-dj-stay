-- FASE B13: freeze result disclosure policy at attempt creation time.

alter table public.assessment_attempts
  add column show_correct_answers boolean not null default false;
