alter table public.purchases
    add column if not exists safety_score numeric(5, 1);

alter table public.purchases
    alter column product_name drop not null;

notify pgrst, 'reload schema';
