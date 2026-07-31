create index payment_orders_license_id_idx
  on public.payment_orders (license_id)
  where license_id is not null;
