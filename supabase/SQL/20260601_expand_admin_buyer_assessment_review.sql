alter table public.purchases
    add column if not exists seller_social_handle text,
    add column if not exists marketplace_profile_link text,
    add column if not exists business_name text,
    add column if not exists seller_notes text,
    add column if not exists details_score numeric(5, 1),
    add column if not exists email_otp_score numeric(5, 1),
    add column if not exists phone_otp_score numeric(5, 1),
    add column if not exists face_recognition_score numeric(5, 1);

drop function if exists public.get_admin_dashboard_users();

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
    trust_checks_run bigint,
    sellers_monitored bigint,
    total_purchase_records bigint,
    followed_through_purchases bigint,
    follow_through_percent integer,
    average_safety_score numeric,
    seller_assessments jsonb,
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
            count(distinct coalesce(
                purchases.seller_user_id::text,
                nullif(lower(trim(purchases.seller_email)), ''),
                nullif(regexp_replace(coalesce(purchases.seller_phone, ''), '\D', '', 'g'), ''),
                purchases.id::text
            ))::bigint as distinct_sellers_monitored,
            count(*) filter (
                where purchases.purchase_status in ('delivered', 'not_delivered', 'fraud_reported')
            )::bigint as followed_through_purchases,
            round(avg(purchases.safety_score)::numeric, 1) as average_safety_score,
            jsonb_agg(
                jsonb_build_object(
                    'id', purchases.id,
                    'seller_user_id', purchases.seller_user_id,
                    'seller_type', purchases.seller_type,
                    'seller_name', purchases.seller_name,
                    'seller_email', purchases.seller_email,
                    'seller_phone', purchases.seller_phone,
                    'seller_social_handle', purchases.seller_social_handle,
                    'marketplace_profile_link', purchases.marketplace_profile_link,
                    'business_name', purchases.business_name,
                    'seller_notes', purchases.seller_notes,
                    'safety_score', purchases.safety_score,
                    'details_score', purchases.details_score,
                    'email_otp_score', purchases.email_otp_score,
                    'phone_otp_score', purchases.phone_otp_score,
                    'face_recognition_score', purchases.face_recognition_score,
                    'purchase_status', purchases.purchase_status,
                    'fraud_reported', purchases.fraud_reported,
                    'fraud_reason', purchases.fraud_reason,
                    'created_at', purchases.created_at,
                    'updated_at', purchases.updated_at
                )
                order by purchases.created_at desc
            ) as seller_assessments
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
        greatest(
            coalesce(user_analytics.trust_checks_run, 0),
            coalesce(purchase_metrics.total_purchase_records, 0)
        )::bigint as trust_checks_run,
        greatest(
            coalesce(user_analytics.sellers_monitored, 0),
            coalesce(purchase_metrics.distinct_sellers_monitored, 0)
        )::bigint as sellers_monitored,
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
        coalesce(purchase_metrics.seller_assessments, '[]'::jsonb) as seller_assessments,
        users.created_at
    from auth.users as users
    left join public.profiles as profiles
        on profiles.id = users.id
    left join public.buyer_profiles as buyer_profiles
        on buyer_profiles.user_id = users.id
    left join public.seller_profiles as seller_profiles
        on seller_profiles.user_id = users.id
    left join public.user_analytics as user_analytics
        on user_analytics.user_id = users.id
    left join purchase_metrics
        on purchase_metrics.user_id = users.id
    order by users.created_at desc;
end;
$$;

revoke all on function public.get_admin_dashboard_users() from public;
grant execute on function public.get_admin_dashboard_users() to authenticated;

notify pgrst, 'reload schema';
