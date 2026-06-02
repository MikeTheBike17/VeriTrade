# VeriTrade Use Case Diagram

## Purpose

This use case diagram shows how people and hosted services interact with VeriTrade.
Buyer, Seller, and Administrator are modeled as specialized registered-user roles. A
single account can use both the Buyer and Seller roles.

## System Use Case Diagram

```mermaid
flowchart LR
    VISITOR["Public Visitor"]
    USER["Registered User"]
    BUYER["Buyer"]
    SELLER["Seller"]
    ADMIN["Administrator"]

    AUTH["Supabase Auth"]
    IDENTITY["Demo Identity Verification<br/>Edge Function"]

    BUYER -.->|"specializes"| USER
    SELLER -.->|"specializes"| USER
    ADMIN -.->|"specializes"| USER

    subgraph VT["VeriTrade System Boundary"]
        direction TB

        UC01(["UC01 View Platform Information"])
        UC02(["UC02 Read Terms and Conditions"])
        UC03(["UC03 Create Account"])
        UC04(["UC04 Log In"])
        UC05(["UC05 Log Out"])
        UC06(["UC06 Review User Workspace"])
        UC07(["UC07 Search Registered Users"])

        UC08(["UC08 Assess Seller Safety"])
        UC09(["UC09 Verify Seller Contact OTPs"])
        UC10(["UC10 Run Demo Identity Match"])
        UC11(["UC11 Match Registered Seller"])
        UC12(["UC12 Check Prior Seller Warnings"])
        UC13(["UC13 Calculate Safety Score"])
        UC14(["UC14 Save Seller Assessment"])
        UC15(["UC15 View Saved Seller Records"])
        UC16(["UC16 Manage Purchase Follow-up"])
        UC17(["UC17 Mark Product Received"])
        UC18(["UC18 Mark Product Not Received"])
        UC19(["UC19 Report Fraud"])

        UC20(["UC20 Register Seller Profile"])
        UC21(["UC21 Select Selling Marketplaces"])

        UC22(["UC22 Open Admin Dashboard"])
        UC23(["UC23 Search and Review Users"])
        UC24(["UC24 Inspect Seller Assessments"])
        UC25(["UC25 Review Follow-through Metrics"])

        UC08 -.->|"includes"| UC09
        UC08 -.->|"includes"| UC10
        UC08 -.->|"includes"| UC11
        UC08 -.->|"includes"| UC12
        UC08 -.->|"includes"| UC13
        UC08 -.->|"includes"| UC14

        UC17 -.->|"extends"| UC16
        UC18 -.->|"extends"| UC16
        UC19 -.->|"extends"| UC16

        UC20 -.->|"includes"| UC09
        UC20 -.->|"includes"| UC10
        UC20 -.->|"includes"| UC21

        UC23 -.->|"extends"| UC22
        UC24 -.->|"extends"| UC23
        UC22 -.->|"includes"| UC25
    end

    VISITOR --> UC01
    VISITOR --> UC02
    VISITOR --> UC03
    VISITOR --> UC04

    USER --> UC02
    USER --> UC05
    USER --> UC06
    USER --> UC07

    BUYER --> UC08
    BUYER --> UC15
    BUYER --> UC16

    SELLER --> UC20

    ADMIN --> UC22

    AUTH --> UC03
    AUTH --> UC04
    AUTH --> UC05
    AUTH --> UC09

    IDENTITY --> UC10
```

## Actor Summary

| Actor | Description | Main use cases |
| --- | --- | --- |
| **Public Visitor** | A person who has not entered an authenticated workspace. | View platform information, read terms, create an account, log in |
| **Registered User** | The common authenticated account role inherited by buyers, sellers, and administrators. | Log out, review the user workspace, search registered users |
| **Buyer** | A registered user assessing sellers and recording purchase outcomes. | Assess seller safety, view saved seller records, manage follow-up |
| **Seller** | A registered user creating a trusted seller presence. | Register seller profile, verify contact OTPs, run demo identity match, select marketplaces |
| **Administrator** | A registered user with an admin role in authentication metadata. | Open admin dashboard, search and review users, inspect assessments, review follow-through |
| **Supabase Auth** | Hosted authentication and email OTP service. | Create account, log in, log out, verify seller contact OTPs |
| **Demo Identity Verification Edge Function** | Hosted demo service that returns a simulated face-match result. | Run demo identity match |

## Use Case Summary

| ID | Use case | Primary actor | Outcome |
| --- | --- | --- | --- |
| `UC01` | View Platform Information | Public Visitor | The visitor learns how VeriTrade supports safer C2C trades. |
| `UC03` | Create Account | Public Visitor | A VeriTrade account is created. Its public profile is synchronized after authenticated portal entry. |
| `UC04` | Log In | Public Visitor | The user enters an authenticated workspace. |
| `UC06` | Review User Workspace | Registered User | The user sees account details, analytics, history, and saved records. |
| `UC07` | Search Registered Users | Registered User | Limited profile matches are returned for a name, username, email, or phone search. |
| `UC08` | Assess Seller Safety | Buyer | A privacy-conscious seller assessment, score breakdown, match result, and risk context are saved. |
| `UC15` | View Saved Seller Records | Buyer | Previously assessed sellers and their post-purchase states are displayed. |
| `UC16` | Manage Purchase Follow-up | Buyer | A seller assessment is updated with a delivered, not-delivered, or fraud-reported outcome. |
| `UC20` | Register Seller Profile | Seller | A seller profile is saved with marketplaces, OTP checks, identity result, and trust status. |
| `UC22` | Open Admin Dashboard | Administrator | Authorized platform-wide account and follow-through reporting is displayed. |

## Relationship Notes

| Relationship | Meaning in VeriTrade |
| --- | --- |
| `Buyer`, `Seller`, and `Administrator` specialize `Registered User` | These actors inherit common authenticated actions. One account can use more than one role. |
| `Create Account` and `Log In` are separate | Sign-up sometimes creates a session immediately. When email confirmation is required, the user verifies the account before entering the workspace. |
| `Assess Seller Safety` includes OTP, identity, matching, warning, scoring, and saving use cases | These steps form the buyer-side seller-assessment workflow. |
| `Register Seller Profile` includes OTP checks, identity matching, and marketplace selection | Seller submission is enabled only after the required registration evidence is ready. |
| `Manage Purchase Follow-up` is extended by the three outcome actions | The buyer chooses one follow-up result for a saved seller assessment. |
| `Open Admin Dashboard` includes follow-through metrics | The dashboard loads operational statistics when an authorized admin opens it. |
| Admin user search and assessment inspection extend the dashboard | An administrator can optionally search for a user and drill into saved seller assessments. |

## Implementation Notes

- Supabase Database is not drawn as a use case actor. Database persistence supports the
  use cases internally but does not pursue a user goal.
- Email OTP requests use Supabase Auth. Phone OTPs currently use browser-generated demo
  codes, so an SMS provider is not shown as an actor.
- Seller and buyer identity checks call the demo edge function with image-presence flags
  and receive a simulated score. The image files themselves are not sent to that
  function.
- The JavaScript contains a dormant buyer-profile handler, but the current Buyer page
  exposes the seller-assessment form rather than a buyer-profile maintenance form. The
  inactive handler is therefore not modeled as a user-facing use case.
- VeriTrade does not currently call marketplace APIs. Marketplace names, handles, and
  profile links are entered manually.
