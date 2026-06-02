create table if not exists public.purchases (
    id uuid primary key default gen_random_uuid(),
    buyer_user_id uuid not null references auth.users (id) on delete cascade,
    seller_user_id uuid references auth.users (id) on delete set null,
    listing_id text,
    product_name text not null,
    seller_type text not null check (seller_type in ('Registered Seller', 'Unregistered Seller')),
    seller_name text not null,
    seller_email text not null,
    seller_phone text not null,
    purchase_status text not null default 'pending' check (
        purchase_status in ('pending', 'paid', 'delivered', 'not_delivered', 'fraud_reported', 'cancelled')
    ),
    fraud_reported boolean not null default false,
    fraud_reason text,
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now())
);

alter table public.purchases
    add column if not exists seller_user_id uuid references auth.users (id) on delete set null,
    add column if not exists listing_id text,
    add column if not exists product_name text,
    add column if not exists seller_type text,
    add column if not exists seller_name text,
    add column if not exists seller_email text,
    add column if not exists seller_phone text,
    add column if not exists purchase_status text default 'pending',
    add column if not exists fraud_reported boolean default false,
    add column if not exists fraud_reason text,
    add column if not exists created_at timestamptz default timezone('utc', now()),
    add column if not exists updated_at timestamptz default timezone('utc', now());

alter table public.purchases
    alter column purchase_status set default 'pending',
    alter column fraud_reported set default false,
    alter column created_at set default timezone('utc', now()),
    alter column updated_at set default timezone('utc', now());

update public.purchases
set purchase_status = 'pending'
where purchase_status is null;

update public.purchases
set fraud_reported = false
where fraud_reported is null;

create index if not exists purchases_buyer_user_idx
on public.purchases (buyer_user_id);

create index if not exists purchases_seller_user_idx
on public.purchases (seller_user_id);

create index if not exists purchases_status_idx
on public.purchases (purchase_status);

create index if not exists purchases_seller_email_idx
on public.purchases (seller_email);

create index if not exists purchases_seller_phone_idx
on public.purchases (seller_phone);

create or replace function public.set_purchases_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = timezone('utc', now());
    return new;
end;
$$;

drop trigger if exists purchases_set_updated_at
on public.purchases;

create trigger purchases_set_updated_at
before update on public.purchases
for each row
execute function public.set_purchases_updated_at();

alter table public.purchases enable row level security;

drop policy if exists "Users can view their own purchases"
on public.purchases;

create policy "Users can view their own purchases"
on public.purchases
for select
to authenticated
using (auth.uid() = buyer_user_id);

drop policy if exists "Users can insert their own purchases"
on public.purchases;

create policy "Users can insert their own purchases"
on public.purchases
for insert
to authenticated
with check (auth.uid() = buyer_user_id);

drop policy if exists "Users can update their own purchases"
on public.purchases;

create policy "Users can update their own purchases"
on public.purchases
for update
to authenticated
using (auth.uid() = buyer_user_id)
with check (auth.uid() = buyer_user_id);

create or replace function public.has_seller_risk_warning(p_email text default null, p_phone text default null)
returns boolean
language sql
security definer
set search_path = public
as $$
    select exists (
        select 1
        from public.purchases
        where (
            fraud_reported = true
            or purchase_status = 'not_delivered'
            or purchase_status = 'fraud_reported'
        )
        and (
            (
                nullif(lower(trim(coalesce(p_email, ''))), '') is not null
                and lower(trim(coalesce(seller_email, ''))) = lower(trim(p_email))
            )
            or (
                nullif(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), '') is not null
                and regexp_replace(coalesce(seller_phone, ''), '\D', '', 'g') = regexp_replace(p_phone, '\D', '', 'g')
            )
        )
    );
$$;

revoke all on function public.has_seller_risk_warning(text, text) from public;
grant execute on function public.has_seller_risk_warning(text, text) to authenticated;

notify pgrst, 'reload schema';
