create table if not exists public.buyer_profiles (
    user_id uuid primary key references auth.users (id) on delete cascade,
    full_name text not null,
    email text not null,
    phone text not null,
    location text not null,
    student_number text,
    institution text,
    buying_platforms text[] not null default '{}',
    platform_links jsonb,
    verification_notes text,
    behaviour_flags jsonb,
    verification_documents jsonb,
    buyer_verification_status text not null,
    buyer_trust_score numeric(5, 1) not null check (buyer_trust_score between 0 and 100),
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists buyer_profiles_verification_idx
on public.buyer_profiles (buyer_verification_status);

create or replace function public.set_buyer_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = timezone('utc', now());
    return new;
end;
$$;

drop trigger if exists buyer_profiles_set_updated_at
on public.buyer_profiles;

create trigger buyer_profiles_set_updated_at
before update on public.buyer_profiles
for each row
execute function public.set_buyer_profiles_updated_at();

alter table public.buyer_profiles enable row level security;

drop policy if exists "Users can view their own buyer profile"
on public.buyer_profiles;

create policy "Users can view their own buyer profile"
on public.buyer_profiles
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own buyer profile"
on public.buyer_profiles;

create policy "Users can insert their own buyer profile"
on public.buyer_profiles
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own buyer profile"
on public.buyer_profiles;

create policy "Users can update their own buyer profile"
on public.buyer_profiles
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

notify pgrst, 'reload schema';
