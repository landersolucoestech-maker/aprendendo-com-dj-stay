-- Wrappers públicos SECURITY INVOKER precisam resolver funções privadas específicas.
-- USAGE no schema não concede EXECUTE em funções nem acesso a tabelas.

grant usage on schema private to anon, authenticated;
