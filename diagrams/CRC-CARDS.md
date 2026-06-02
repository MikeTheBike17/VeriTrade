# VeriTrade Class Responsibility Collaborator (CRC) Cards

## Purpose

These CRC cards describe the logical object-oriented design of VeriTrade. The current
implementation uses procedural JavaScript with Supabase tables, RPC functions, storage,
authentication, and an edge function. The cards therefore represent the domain classes
and service classes that the existing implementation is built around, even where a
literal JavaScript `class` has not yet been introduced.

## Core CRC Cards

### 1. UserAccount

| CRC Area | Details |
| --- | --- |
| **Class** | `UserAccount` |
| **Responsibilities** | Register and maintain a VeriTrade account.<br>Store public account details such as name, username, email address, phone number, role, and workspace access.<br>Provide the account identity used by the Buyer, Seller, User, and Admin workspaces.<br>Expose the correct workspace navigation according to the user's role. |
| **Collaborators** | `AuthenticationService`, `SellerProfile`, `BuyerProfile`, `ActivityHistory`, `UserAnalytics` |

### 2. AuthenticationService

| CRC Area | Details |
| --- | --- |
| **Class** | `AuthenticationService` |
| **Responsibilities** | Create accounts and sign users in with Supabase Auth.<br>Resolve username aliases to email addresses during login.<br>Maintain the active session and protect portal pages from unauthenticated access.<br>Sign users out and redirect them to the public site. |
| **Collaborators** | `UserAccount`, `OtpVerificationService`, Supabase Auth |

### 3. SellerProfile

| CRC Area | Details |
| --- | --- |
| **Class** | `SellerProfile` |
| **Responsibilities** | Collect a seller's full name, email address, phone number, required address inputs, optional social handle, and linked marketplaces during registration.<br>Require verified contact details, identity evidence, complete address inputs, and at least one marketplace before seller registration is submitted.<br>Store the seller's core contact details, linked marketplaces, verification status, seller trust score, purchase confidence score, and registered-seller state.<br>Make registered sellers available for buyer-side matching. |
| **Collaborators** | `UserAccount`, `OtpVerificationService`, `IdentityVerification`, `ProfileSearchService`, `SellerAssessment` |

### 4. BuyerProfile

| CRC Area | Details |
| --- | --- |
| **Class** | `BuyerProfile` |
| **Responsibilities** | Capture and maintain the buyer's profile details, linked buying platforms, behaviour flags, and verification documents.<br>Calculate and store the buyer trust score.<br>Record the buyer verification status.<br>Act as the owner of saved seller assessments and post-purchase updates. |
| **Collaborators** | `UserAccount`, `TrustScoreCalculator`, `SellerAssessment`, `PurchaseFollowUp`, `UserAnalytics` |

### 5. OtpVerificationService

| CRC Area | Details |
| --- | --- |
| **Class** | `OtpVerificationService` |
| **Responsibilities** | Send one-time passwords to email addresses and phone numbers.<br>Validate a six-digit OTP against the contact detail that requested it.<br>Track whether each contact value has been verified.<br>Prevent seller registration or buyer assessment submission when required OTP checks are incomplete. |
| **Collaborators** | `AuthenticationService`, `SellerProfile`, `SellerAssessment`, Supabase Auth |

### 6. IdentityVerification

| CRC Area | Details |
| --- | --- |
| **Class** | `IdentityVerification` |
| **Responsibilities** | Accept a selfie image and an ID document image.<br>Allow image preview and cropping before verification.<br>Request the demo face-match check and normalize the returned result.<br>Store match percentage, ID-selfie score, total score, and verification status when the seller verifies their own profile.<br>Provide the face-recognition score used in buyer-side seller assessments. |
| **Collaborators** | `SellerProfile`, `SellerAssessment`, `TrustScoreCalculator`, Demo Identity Verification Edge Function |

### 7. SellerAssessment

| CRC Area | Details |
| --- | --- |
| **Class** | `SellerAssessment` |
| **Responsibilities** | Record the seller details captured by a buyer before or after a purchase.<br>Link the record to a registered seller when a matching VeriTrade account is found.<br>Store seller type, contact details, social handle, marketplace link, business name, notes, safety score, OTP scores, details score, and face-recognition score.<br>Preserve the assessment for later follow-up and admin review. |
| **Collaborators** | `BuyerProfile`, `SellerProfile`, `OtpVerificationService`, `IdentityVerification`, `TrustScoreCalculator`, `PurchaseFollowUp` |

### 8. TrustScoreCalculator

| CRC Area | Details |
| --- | --- |
| **Class** | `TrustScoreCalculator` |
| **Responsibilities** | Score the completeness and consistency of buyer or seller evidence.<br>Compare entered seller details with matching registered profiles.<br>Include OTP confirmation, profile matches, and identity-verification evidence in the numeric assessment result.<br>Clamp scores to the range from 0 to 100.<br>Convert a score into a low-risk, medium-risk, or high-risk category with a readable explanation.<br>Surface prior risk warnings alongside a newly saved seller assessment. |
| **Collaborators** | `BuyerProfile`, `SellerProfile`, `SellerAssessment`, `OtpVerificationService`, `IdentityVerification`, `RiskWarningService` |

### 9. PurchaseFollowUp

| CRC Area | Details |
| --- | --- |
| **Class** | `PurchaseFollowUp` |
| **Responsibilities** | Maintain the outcome of a saved seller assessment.<br>Mark a purchase as delivered, not delivered, or fraud reported.<br>Capture a fraud reason when required.<br>Identify which records were followed through to a final outcome.<br>Feed follow-through metrics and future seller warnings. |
| **Collaborators** | `SellerAssessment`, `RiskWarningService`, `ActivityHistory`, `UserAnalytics`, `AdminDashboard` |

### 10. RiskWarningService

| CRC Area | Details |
| --- | --- |
| **Class** | `RiskWarningService` |
| **Responsibilities** | Search previous purchase outcomes for seller risk indicators.<br>Match warnings by normalized seller email address or phone number.<br>Flag sellers with fraud reports or not-delivered outcomes.<br>Provide warning evidence to new trust assessments. |
| **Collaborators** | `SellerAssessment`, `PurchaseFollowUp`, `TrustScoreCalculator` |

### 11. ProfileSearchService

| CRC Area | Details |
| --- | --- |
| **Class** | `ProfileSearchService` |
| **Responsibilities** | Search VeriTrade profiles by name, username, email address, or phone number.<br>Normalize text and phone search values.<br>Prioritize exact username, email, and name matches.<br>Return a limited set of privacy-conscious profile details for the user workspace.<br>Find matching registered sellers during buyer assessments. |
| **Collaborators** | `UserAccount`, `SellerProfile`, `SellerAssessment` |

### 12. ActivityHistory

| CRC Area | Details |
| --- | --- |
| **Class** | `ActivityHistory` |
| **Responsibilities** | Record important account events such as verification checks, seller assessments, and purchase outcomes.<br>Store a title, description, event type, sentiment, and optional related check.<br>Return recent events for the user workspace. |
| **Collaborators** | `UserAccount`, `SellerAssessment`, `PurchaseFollowUp`, `UserAnalytics` |

### 13. UserAnalytics

| CRC Area | Details |
| --- | --- |
| **Class** | `UserAnalytics` |
| **Responsibilities** | Build an analytics snapshot from profiles, verification checks, purchases, and history records.<br>Track trust checks run, sellers monitored, profile completion, OTP success rate, matched seller detail rate, feedback trend, and history count.<br>Store the latest snapshot for the user and admin dashboards. |
| **Collaborators** | `UserAccount`, `SellerProfile`, `BuyerProfile`, `SellerAssessment`, `ActivityHistory`, `AdminDashboard` |

### 14. AdminDashboard

| CRC Area | Details |
| --- | --- |
| **Class** | `AdminDashboard` |
| **Responsibilities** | Restrict dashboard access to admin users.<br>Load registered-user records with buyer, seller, purchase, and analytics data.<br>Display verification status, trust scores, purchase follow-through, safety-score averages, and saved seller assessments.<br>Search and inspect individual user records.<br>Summarize system-wide operational statistics. |
| **Collaborators** | `UserAccount`, `BuyerProfile`, `SellerProfile`, `SellerAssessment`, `PurchaseFollowUp`, `UserAnalytics` |

## External Collaborators

| Collaborator | Role in VeriTrade |
| --- | --- |
| **Supabase Auth** | Account registration, login, logout, session handling, and OTP delivery and verification. |
| **Supabase Database** | Persistence for profiles, assessments, identity-verification records, history records, and analytics snapshots. |
| **Supabase Storage** | Upload storage for verification documents where the workflow stores an uploaded file. |
| **Demo Identity Verification Edge Function** | Simulates the ID-photo and selfie comparison result used by the verification workflow. |

## Implementation Traceability

| Design area | Current implementation |
| --- | --- |
| Client-side workflows | `javascript/app.js` |
| Public and portal interfaces | `index.html`, `auth.html`, `user.html`, `seller.html`, `buyer.html`, `admin.html` |
| Seller profiles | `public.seller_profiles` |
| Buyer profiles | `public.buyer_profiles` |
| Seller identity results | `public.seller_identity_verifications` |
| Seller assessments and purchase follow-up | `public.purchases` |
| User search | `public.search_profiles(...)` |
| Prior seller warning check | `public.has_seller_risk_warning(...)` |
| Admin reporting | `public.get_admin_dashboard_users()` |
| Demo identity service | `supabase/functions/demo-identity-verification/index.ts` |
