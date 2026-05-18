create or replace function public.is_admin_user()
returns boolean
language sql
stable
as $$
    select lower(
        coalesce(
            auth.jwt() -> 'app_metadata' ->> 'role',
            auth.jwt() ->> 'user_role',
            auth.jwt() ->> 'role',
            auth.jwt() -> 'user_metadata' ->> 'role',
            ''
        )
    ) in ('admin', 'administrator', 'super_admin', 'superadmin');
$$;

revoke all on function public.is_admin_user() from public;
grant execute on function public.is_admin_user() to authenticated;

create or replace function public.get_admin_dashboard_users()
returns table (
    user_id uuid,
    full_name text,
    email text,
    phone_number text,
    verification_state text,
    verification_label text,
    buyer_verification_status text,
    seller_verification_status text,
    buyer_trust_score numeric,
    seller_trust_score numeric,
    purchase_confidence_score numeric,
    total_purchase_records bigint,
    followed_through_purchases bigint,
    follow_through_percent integer,
    average_safety_score numeric,
    created_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
    if not public.is_admin_user() then
        raise exception 'Admin access required';
    end if;

    return query
    with purchase_metrics as (
        select
            purchases.buyer_user_id as user_id,
            count(*)::bigint as total_purchase_records,
            count(*) filter (
                where purchases.purchase_status in ('delivered', 'not_delivered', 'fraud_reported')
            )::bigint as followed_through_purchases,
            round(avg(purchases.safety_score)::numeric, 1) as average_safety_score
        from public.purchases as purchases
        group by purchases.buyer_user_id
    )
    select
        users.id as user_id,
        coalesce(
            nullif(trim(profiles.full_name), ''),
            nullif(trim(buyer_profiles.full_name), ''),
            nullif(trim(seller_profiles.full_name), ''),
            nullif(split_part(coalesce(users.email, ''), '@', 1), '')
        )::text as full_name,
        coalesce(
            nullif(trim(profiles.auth_email), ''),
            nullif(trim(buyer_profiles.email), ''),
            nullif(trim(seller_profiles.email), ''),
            nullif(trim(users.email), '')
        )::text as email,
        coalesce(
            nullif(trim(profiles.phone_number), ''),
            nullif(trim(buyer_profiles.phone), ''),
            nullif(trim(seller_profiles.phone), ''),
            nullif(trim(users.phone), '')
        )::text as phone_number,
        case
            when lower(coalesce(seller_profiles.seller_verification_status, '')) = 'verified' then 'verified'
            when lower(coalesce(buyer_profiles.buyer_verification_status, '')) = 'verified' then 'verified'
            when lower(coalesce(seller_profiles.seller_verification_status, '')) in ('needs review', 'pending', 'pending verification', 'review') then 'pending'
            when lower(coalesce(buyer_profiles.buyer_verification_status, '')) in ('pending verification', 'profile submitted', 'pending', 'needs review') then 'pending'
            else 'rejected'
        end::text as verification_state,
        case
            when lower(coalesce(seller_profiles.seller_verification_status, '')) = 'verified' then 'Verified'
            when lower(coalesce(buyer_profiles.buyer_verification_status, '')) = 'verified' then 'Verified'
            when lower(coalesce(seller_profiles.seller_verification_status, '')) in ('needs review', 'pending', 'pending verification', 'review') then 'Pending Verification'
            when lower(coalesce(buyer_profiles.buyer_verification_status, '')) in ('pending verification', 'profile submitted', 'pending', 'needs review') then 'Pending Verification'
            else 'Rejected / Unverified'
        end::text as verification_label,
        buyer_profiles.buyer_verification_status,
        seller_profiles.seller_verification_status,
        buyer_profiles.buyer_trust_score,
        seller_profiles.seller_trust_score,
        seller_profiles.purchase_confidence_score,
        coalesce(purchase_metrics.total_purchase_records, 0)::bigint as total_purchase_records,
        coalesce(purchase_metrics.followed_through_purchases, 0)::bigint as followed_through_purchases,
        case
            when coalesce(purchase_metrics.total_purchase_records, 0) > 0 then
                round(
                    (
                        coalesce(purchase_metrics.followed_through_purchases, 0)::numeric /
                        purchase_metrics.total_purchase_records::numeric
                    ) * 100
                )::integer
            else 0
        end as follow_through_percent,
        purchase_metrics.average_safety_score,
        users.created_at
    from auth.users as users
    left join public.profiles as profiles
        on profiles.id = users.id
    left join public.buyer_profiles as buyer_profiles
        on buyer_profiles.user_id = users.id
    left join public.seller_profiles as seller_profiles
        on seller_profiles.user_id = users.id
    left join purchase_metrics
        on purchase_metrics.user_id = users.id
    order by users.created_at desc;
end;
$$;

revoke all on function public.get_admin_dashboard_users() from public;
grant execute on function public.get_admin_dashboard_users() to authenticated;

notify pgrst, 'reload schema';
