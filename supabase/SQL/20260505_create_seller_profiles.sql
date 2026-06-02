create table if not exists public.seller_profiles (
    user_id uuid primary key references auth.users (id) on delete cascade,
    full_name text not null,
    email text not null,
    phone text not null,
    id_number text,
    location text,
    student_number text,
    institution text,
    selling_platforms text[] not null default '{}',
    platform_links jsonb,
    verification_notes text,
    verification_documents jsonb,
    agreement_flags jsonb,
    seller_verification_status text not null,
    seller_trust_score numeric(5, 1) not null check (seller_trust_score between 0 and 100),
    is_registered_seller boolean not null default false,
    purchase_confidence_score numeric(5, 1) not null check (purchase_confidence_score between 0 and 100),
    listed_products_count integer not null default 0 check (listed_products_count >= 0),
    completed_sales_count integer not null default 0 check (completed_sales_count >= 0),
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists seller_profiles_registered_idx
on public.seller_profiles (is_registered_seller);

create or replace function public.set_seller_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = timezone('utc', now());
    return new;
end;
$$;

drop trigger if exists seller_profiles_set_updated_at
on public.seller_profiles;

create trigger seller_profiles_set_updated_at
before update on public.seller_profiles
for each row
execute function public.set_seller_profiles_updated_at();

alter table public.seller_profiles enable row level security;

drop policy if exists "Users can view their own seller profile"
on public.seller_profiles;

create policy "Users can view their own seller profile"
on public.seller_profiles
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Authenticated users can view registered sellers"
on public.seller_profiles;

create policy "Authenticated users can view registered sellers"
on public.seller_profiles
for select
to authenticated
using (is_registered_seller = true);

drop policy if exists "Users can insert their own seller profile"
on public.seller_profiles;

create policy "Users can insert their own seller profile"
on public.seller_profiles
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own seller profile"
on public.seller_profiles;

create policy "Users can update their own seller profile"
on public.seller_profiles
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

notify pgrst, 'reload schema';
