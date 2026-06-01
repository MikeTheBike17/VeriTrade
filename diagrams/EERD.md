# VeriTrade Enhanced Entity Relationship Diagram (EERD)

## Scope

This EERD describes the VeriTrade data model implemented by the checked-in Supabase
migrations and the supporting tables referenced by `javascript/app.js`. VeriTrade uses
Supabase Auth as the account source of truth. A user can act as a buyer, a seller, or
both.

## Enhanced Conceptual View

```mermaid
flowchart TD
    UA["USER ACCOUNT<br/>Supabase auth.users"]
    ISA{"ISA<br/>partial and overlapping"}
    BP["BUYER PROFILE<br/>optional buyer subtype"]
    SP["SELLER PROFILE<br/>optional seller subtype"]
    ADMIN["ADMIN ROLE<br/>stored in auth metadata, not a table"]
    PURCHASE["PURCHASE / SELLER ASSESSMENT<br/>includes post-purchase outcome"]
    UNREGISTERED["UNREGISTERED SELLER<br/>stored as inline assessment details"]
    IDV["SELLER IDENTITY VERIFICATION<br/>latest ID and selfie result"]
    ANALYTICS["USER ANALYTICS<br/>latest snapshot"]
    HISTORY["ACTIVITY HISTORY<br/>account event log"]
    CHECK["VERIFICATION CHECK<br/>historical trust check"]

    UA --> ISA
    ISA -->|"0..1"| BP
    ISA -->|"0..1"| SP
    UA -.->|"classified by auth metadata"| ADMIN
    UA -->|"acting as buyer creates 0..*"| PURCHASE
    PURCHASE -->|"optionally links to 0..1 registered seller account"| UA
    PURCHASE -->|"otherwise captures"| UNREGISTERED
    SP -->|"supported by 0..1 latest result"| IDV
    UA -->|"has 0..1"| ANALYTICS
    UA -->|"records 0..*"| HISTORY
    UA -->|"runs 0..*"| CHECK
```

The specialization is **partial** because a new account does not need a buyer or seller
profile immediately. It is **overlapping** because the same account can use both buyer
and seller workspaces.

## Logical Database EERD

```mermaid
erDiagram
    AUTH_USERS {
        uuid id PK
        text email
        text phone
        jsonb app_metadata
        jsonb user_metadata
        timestamptz created_at
    }

    PROFILES {
        uuid id PK, FK
        text username
        text full_name
        text auth_email
        text phone_number
        text workspace_access
        text marketplace_profile_link
        text_array linked_marketplaces
        boolean otp_alerts
    }

    BUYER_PROFILES {
        uuid user_id PK, FK
        text full_name
        text email
        text phone
        text location
        text student_number
        text institution
        text_array buying_platforms
        jsonb platform_links
        text verification_notes
        jsonb behaviour_flags
        jsonb verification_documents
        text buyer_verification_status
        numeric buyer_trust_score
        timestamptz created_at
        timestamptz updated_at
    }

    SELLER_PROFILES {
        uuid user_id PK, FK
        text full_name
        text email
        text phone
        text id_number
        text location
        text student_number
        text institution
        text_array selling_platforms
        jsonb platform_links
        text verification_notes
        jsonb verification_documents
        jsonb agreement_flags
        text seller_verification_status
        numeric seller_trust_score
        boolean is_registered_seller
        numeric purchase_confidence_score
        integer listed_products_count
        integer completed_sales_count
        timestamptz created_at
        timestamptz updated_at
    }

    SELLER_IDENTITY_VERIFICATIONS {
        uuid user_id PK, FK
        integer match_percentage
        numeric id_selfie_score
        numeric total_score
        text verification_status
        timestamptz created_at
        timestamptz updated_at
    }

    PURCHASES {
        uuid id PK
        uuid buyer_user_id FK
        uuid seller_user_id FK
        text listing_id
        text product_name
        text seller_type
        text seller_name
        text seller_email
        text seller_phone
        text seller_social_handle
        text marketplace_profile_link
        text business_name
        text seller_notes
        numeric safety_score
        numeric details_score
        numeric email_otp_score
        numeric phone_otp_score
        numeric face_recognition_score
        text purchase_status
        boolean fraud_reported
        text fraud_reason
        timestamptz created_at
        timestamptz updated_at
    }

    USER_ANALYTICS {
        uuid user_id PK, FK
        integer trust_checks_run
        integer sellers_monitored
        numeric profile_completion
        numeric otp_confirmation_success
        numeric matched_seller_detail_rate
        numeric positive_feedback_trend
        integer history_records
    }

    USER_HISTORY {
        uuid id PK
        uuid user_id FK
        text event_type
        text title
        text description
        text sentiment
        uuid related_check_id FK
        timestamptz created_at
    }

    VERIFICATION_CHECKS {
        uuid id PK
        uuid user_id FK
        uuid seller_profile_id
        text seller_username_input
        text seller_email
        text seller_phone
        text marketplace_profile_link
        boolean otp_confirmed
        numeric matched_detail_rate
        timestamptz created_at
    }

    AUTH_USERS ||--o| PROFILES : "has public profile"
    AUTH_USERS ||--o| BUYER_PROFILES : "may extend as buyer"
    AUTH_USERS ||--o| SELLER_PROFILES : "may extend as seller"
    AUTH_USERS ||--o| SELLER_IDENTITY_VERIFICATIONS : "may own latest result"
    AUTH_USERS ||--o{ PURCHASES : "creates as buyer"
    AUTH_USERS o|--o{ PURCHASES : "may be linked as registered seller"
    AUTH_USERS ||--o| USER_ANALYTICS : "has snapshot"
    AUTH_USERS ||--o{ USER_HISTORY : "has events"
    AUTH_USERS ||--o{ VERIFICATION_CHECKS : "runs checks"
    VERIFICATION_CHECKS o|--o{ USER_HISTORY : "may be referenced by"
```

## Entity Status

| Entity | Status | Source |
| --- | --- | --- |
| `auth.users` | Supabase-managed entity | Supabase Auth and foreign keys |
| `public.seller_profiles` | Confirmed table | `20260505_create_seller_profiles.sql` |
| `public.buyer_profiles` | Confirmed table | `20260520_create_buyer_profiles.sql` |
| `public.seller_identity_verifications` | Confirmed table | `20260504_seller_identity_verifications.sql` |
| `public.purchases` | Confirmed table | `20260505_create_purchases.sql` and later alterations |
| `public.profiles` | Application-referenced supporting table | Client upserts, search RPC, and admin RPC |
| `public.user_analytics` | Application-referenced supporting table | Client upserts and admin RPC |
| `public.user_history` | Application-referenced supporting table | Client inserts and workspace reads |
| `public.verification_checks` | Application-referenced supporting table | Workspace analytics reads |

The creation migrations for the application-referenced supporting tables are not present
in this repository. Their displayed attributes are limited to the columns used by the
current JavaScript and SQL.

## Cardinality Summary

| Relationship | Cardinality | Meaning |
| --- | --- | --- |
| Account to public profile | `1 : 0..1` | Each account may have one searchable public profile. |
| Account to buyer profile | `1 : 0..1` | Buyer information is an optional account specialization. |
| Account to seller profile | `1 : 0..1` | Seller information is an optional account specialization. |
| Account to identity result | `1 : 0..1` | `user_id` is the verification table primary key, so only the latest seller identity result is retained. |
| Buyer account to purchase | `1 : 0..*` | An account acting as a buyer can save many seller assessments and follow-up records. |
| Registered seller account to purchase | `0..1 : 0..*` | A purchase optionally links to a registered seller. Unregistered seller details remain inline in `purchases`. |
| Account to analytics snapshot | `1 : 0..1` | The workspace maintains one latest analytics summary per account. |
| Account to history entry | `1 : 0..*` | An account can accumulate many activity events. |
| Account to verification check | `1 : 0..*` | An account can run multiple trust checks. |

## Enhanced Model Notes

- `BUYER_PROFILES` and `SELLER_PROFILES` are optional, overlapping subtypes of
  `AUTH_USERS`.
- `PURCHASES` acts as both a seller-assessment record and a post-purchase follow-up
  record. Its seller link is optional because VeriTrade supports assessments of
  unregistered sellers.
- `selling_platforms`, `buying_platforms`, `platform_links`, `behaviour_flags`,
  `verification_documents`, and `agreement_flags` are multivalued or composite
  attributes stored as arrays or JSON.
- Admin access is a role derived from authentication metadata. It is not a separate
  database entity.
- Follow-through percentage, average safety score, sellers monitored, and prior seller
  risk warnings are derived values calculated from stored purchase and analytics data.
- The seller registration form currently requires street, city, province, and postal
  code inputs, but the current persistence payload does not save those individual
  values. They are therefore not shown as stored `SELLER_PROFILES` attributes.

