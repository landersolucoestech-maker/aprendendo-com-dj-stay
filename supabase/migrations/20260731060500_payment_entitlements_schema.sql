-- FASE B19: o novo estado precisa ser confirmado antes de ser usado em constraints posteriores.

alter type public.digital_product_access_status
  add value if not exists 'suspended' after 'active';
