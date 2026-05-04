create table if not exists public.seller_identity_verifications (
    user_id uuid primary key references auth.users (id) on delete cascade,
    match_percentage integer not null check (match_percentage between 0 and 100),
    id_selfie_score numeric(5, 1) not null,
    total_score numeric(5, 1) not null,
    verification_status text not null check (verification_status in ('verified', 'review')),
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now())
);

create or replace function public.set_seller_identity_verifications_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = timezone('utc', now());
    return new;
end;
$$;

drop trigger if exists seller_identity_verifications_set_updated_at
on public.seller_identity_verifications;

create trigger seller_identity_verifications_set_updated_at
before update on public.seller_identity_verifications
for each row
execute function public.set_seller_identity_verifications_updated_at();

alter table public.seller_identity_verifications enable row level security;

create policy "Users can view their own seller identity verification"
on public.seller_identity_verifications
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert their own seller identity verification"
on public.seller_identity_verifications
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their own seller identity verification"
on public.seller_identity_verifications
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
