const SUPABASE_URL = "https://ppbeiefwfqwmtatfgsve.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_lb1Eiw4hXEfTMDYh3nMp0w_WolruYMh";
const DEFAULT_WORKSPACE_ACCESS = "Buyer and Seller";
const EMPTY_LABEL = "-";
const SELLER_STORAGE_BUCKET = "seller-verification-records";
const BUYER_STORAGE_BUCKET = "buyer-verification-records";
const USER_REDIRECT_PAGE = "user.html";
const USER_SLUG_PARAM = "slug";
const LOGIN_ALIAS_STORAGE_KEY = "veritrade_login_aliases";
const OTP_AUTH_STORAGE_KEY = "veritrade_otp_auth";
const OTP_LENGTH = 6;
const SELLER_DEMO_VERIFICATION_FUNCTION = "demo-identity-verification";

const hasSupabaseConfig = Boolean(
    window.supabase &&
    SUPABASE_URL &&
    !SUPABASE_URL.includes("YOUR_PROJECT_REF") &&
    !SUPABASE_URL.includes("YOUR_SUPABASE_URL")
);

const supabaseClient = hasSupabaseConfig
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
          auth: {
              persistSession: true,
              autoRefreshToken: true,
              detectSessionInUrl: true
          }
      })
    : null;

let supabaseOtpClient = null;

function createMemoryStorage() {
    const storageMap = new Map();

    return {
        getItem(key) {
            return storageMap.has(key) ? storageMap.get(key) : null;
        },
        setItem(key, value) {
            storageMap.set(key, value);
        },
        removeItem(key) {
            storageMap.delete(key);
        }
    };
}

function getSupabaseOtpClient() {
    if (!hasSupabaseConfig || !window.supabase) {
        return null;
    }

    if (supabaseOtpClient) {
        return supabaseOtpClient;
    }

    supabaseOtpClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
        auth: {
            storageKey: OTP_AUTH_STORAGE_KEY,
            storage: createMemoryStorage(),
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false
        }
    });

    return supabaseOtpClient;
}

function formatDate(dateString) {
    if (!dateString) {
        return EMPTY_LABEL;
    }

    return new Date(dateString).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}

function formatPurchaseStatusLabel(status) {
    if (status === "delivered") {
        return "Product received";
    }

    if (status === "fraud_reported") {
        return "Fraud reported";
    }

    if (status === "pending") {
        return "Pending follow-up";
    }

    return status ? String(status).replaceAll("_", " ") : EMPTY_LABEL;
}

function initFooterYears() {
    const footerYearNodes = document.querySelectorAll("[data-current-year]");

    if (!footerYearNodes.length) {
        return;
    }

    const currentYear = new Date().getFullYear();
    footerYearNodes.forEach((node) => {
        node.textContent = currentYear;
    });
}

function formatSafetyScore(value) {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? `${numericValue.toFixed(1)} / 100` : EMPTY_LABEL;
}

function getOptionalSellerContextMarkup(record) {
    return `
        ${record?.business_name ? `<p>Business name: ${escapeHtml(record.business_name)}</p>` : ""}
        ${record?.seller_social_handle ? `<p>Social handle: ${escapeHtml(record.seller_social_handle)}</p>` : ""}
        ${record?.marketplace_profile_link ? `<p>Marketplace profile: ${escapeHtml(record.marketplace_profile_link)}</p>` : ""}
        ${record?.seller_notes ? `<p>Seller notes: ${escapeHtml(record.seller_notes)}</p>` : ""}
    `;
}

function formatPercent(value) {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? `${clampPercent(numericValue)}%` : EMPTY_LABEL;
}

function showAlert(message) {
    alert(message);
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function setTextContent(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = value;
    }
}

function setStatValue(id, value) {
    const element = document.getElementById(id);
    if (!element) {
        return;
    }

    const isEmpty = value === EMPTY_LABEL;
    element.textContent = value;
    element.classList.toggle("is-empty", isEmpty);
}

function clampPercent(value) {
    return Math.max(0, Math.min(100, Math.round(value)));
}

function delay(ms) {
    return new Promise((resolve) => {
        window.setTimeout(resolve, ms);
    });
}

function setMetric(prefix, value) {
    const valueElement = document.getElementById(`${prefix}-value`);
    const fillElement = document.getElementById(`${prefix}-fill`);

    if (!valueElement || !fillElement) {
        return;
    }

    if (typeof value === "number" && Number.isFinite(value)) {
        const safeValue = clampPercent(value);
        valueElement.textContent = `${safeValue}%`;
        fillElement.style.width = `${safeValue}%`;
    } else {
        valueElement.textContent = EMPTY_LABEL;
        fillElement.style.width = "0%";
    }
}

function setStatusMessage(id, message, type = "") {
    const element = document.getElementById(id);
    if (!element) {
        return;
    }

    element.textContent = message || "";
    element.className = "status-banner";

    if (type) {
        element.classList.add(type);
    }
}

function normalizePhone(value) {
    return String(value || "").replace(/\D/g, "");
}

function normalizeText(value) {
    return String(value || "").trim().toLowerCase();
}

function normalizeUrl(value) {
    return String(value || "").trim().toLowerCase();
}

function normalizeRoleValue(value) {
    return String(value || "")
        .trim()
        .toLowerCase()
        .replace(/[\s-]+/g, "_");
}

function isAdminRoleValue(value) {
    const normalizedValue = normalizeRoleValue(value);

    if (!normalizedValue) {
        return false;
    }

    return (
        normalizedValue === "admin" ||
        normalizedValue === "administrator" ||
        normalizedValue === "super_admin" ||
        normalizedValue === "superadmin" ||
        normalizedValue.includes("admin")
    );
}

function getUserRoleCandidates(profile, user) {
    return [
        profile?.role,
        profile?.user_role,
        profile?.account_role,
        profile?.workspace_access,
        user?.app_metadata?.role,
        user?.app_metadata?.user_role,
        user?.app_metadata?.account_role,
        user?.user_metadata?.role,
        user?.user_metadata?.user_role,
        user?.user_metadata?.account_role
    ].filter((value) => value !== null && value !== undefined && String(value).trim());
}

function isAdminUser(profile, user) {
    return getUserRoleCandidates(profile, user).some((value) => isAdminRoleValue(value));
}

function updateAdminNavVisibility(profile, user) {
    const showAdminNav = isAdminUser(profile, user);

    document.querySelectorAll("[data-admin-only]").forEach((element) => {
        element.hidden = !showAdminNav;
    });
}

function readLoginAliasMap() {
    try {
        const rawValue = window.localStorage.getItem(LOGIN_ALIAS_STORAGE_KEY);
        if (!rawValue) {
            return {};
        }

        const parsedValue = JSON.parse(rawValue);
        return parsedValue && typeof parsedValue === "object" ? parsedValue : {};
    } catch (error) {
        return {};
    }
}

function writeLoginAliasMap(loginAliasMap) {
    try {
        window.localStorage.setItem(LOGIN_ALIAS_STORAGE_KEY, JSON.stringify(loginAliasMap));
    } catch (error) {
    }
}

function cacheLoginAlias(username, email) {
    const normalizedUsername = normalizeText(username);
    const normalizedEmail = normalizeText(email);

    if (!normalizedUsername || !normalizedEmail) {
        return;
    }

    const loginAliasMap = readLoginAliasMap();
    loginAliasMap[normalizedUsername] = normalizedEmail;
    writeLoginAliasMap(loginAliasMap);
}

function getCachedLoginEmail(loginValue) {
    if (!loginValue || loginValue.includes("@")) {
        return null;
    }

    const loginAliasMap = readLoginAliasMap();
    return loginAliasMap[normalizeText(loginValue)] || null;
}

function getUserSlug(profileOrUser) {
    const rawUsername =
        profileOrUser?.username ||
        profileOrUser?.user_metadata?.username ||
        profileOrUser?.email?.split("@")[0] ||
        "";

    return String(rawUsername)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

function getUserPageUrl(profileOrUser) {
    const slug = getUserSlug(profileOrUser);

    if (!slug) {
        return USER_REDIRECT_PAGE;
    }

    return `${USER_REDIRECT_PAGE}?${USER_SLUG_PARAM}=${encodeURIComponent(slug)}`;
}

function getAbsoluteUserPageUrl(profileOrUser) {
    return new URL(getUserPageUrl(profileOrUser), window.location.href).toString();
}

function syncCurrentUserPageSlug(profileOrUser) {
    const currentPath = window.location.pathname.split("/").pop();

    if (currentPath !== USER_REDIRECT_PAGE) {
        return;
    }

    const slug = getUserSlug(profileOrUser);
    if (!slug) {
        return;
    }

    const url = new URL(window.location.href);
    if (url.searchParams.get(USER_SLUG_PARAM) === slug) {
        return;
    }

    url.searchParams.set(USER_SLUG_PARAM, slug);
    window.history.replaceState({}, "", url);
}

function parseMarketplaceList(value) {
    if (!value) {
        return [];
    }

    const values = value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

    return [...new Set(values)];
}

function getProfileCompletion(profile, sellerProfile = null) {
    const checkpoints = [
        Boolean(profile?.full_name),
        Boolean(profile?.auth_email),
        Boolean(profile?.phone_number),
        Array.isArray(profile?.linked_marketplaces) && profile.linked_marketplaces.length > 0,
        profile?.otp_alerts === true,
        Boolean(sellerProfile?.seller_verification_status)
    ];

    const completed = checkpoints.filter(Boolean).length;
    return clampPercent((completed / checkpoints.length) * 100);
}

function getDistinctSellerCount(checksList) {
    const sellerKeys = new Set();

    checksList.forEach((check) => {
        const key =
            (check.seller_profile_id && `seller:${check.seller_profile_id}`) ||
            (check.seller_user_id && `seller:${check.seller_user_id}`) ||
            (normalizeText(check.seller_username_input) && `username:${normalizeText(check.seller_username_input)}`) ||
            (normalizeText(check.seller_email) && `email:${normalizeText(check.seller_email)}`) ||
            (normalizePhone(check.seller_phone) && `phone:${normalizePhone(check.seller_phone)}`) ||
            (normalizeUrl(check.marketplace_profile_link) && `marketplace:${normalizeUrl(check.marketplace_profile_link)}`);

        if (key) {
            sellerKeys.add(key);
        }
    });

    return sellerKeys.size;
}

function getOtpSuccessRate(checksList, profile = null) {
    if (!checksList.length) {
        return profile?.otp_alerts === true ? 100 : null;
    }

    const successfulChecks = checksList.filter(
        (check) =>
            check.otp_confirmed ||
            (Number(check.email_otp_score) >= 20 && Number(check.phone_otp_score) >= 20)
    ).length;
    return clampPercent((successfulChecks / checksList.length) * 100);
}

function getAverageMatchRate(checksList) {
    const numericRates = checksList
        .map((check) => Number(check.matched_detail_rate))
        .filter((value) => Number.isFinite(value));

    if (!numericRates.length) {
        return null;
    }

    const total = numericRates.reduce((sum, value) => sum + value, 0);
    return clampPercent(total / numericRates.length);
}

function getPositiveFeedbackTrend(historyList) {
    const feedbackItems = historyList.filter((item) => item.event_type === "feedback" && item.sentiment);

    if (!feedbackItems.length) {
        return null;
    }

    const positiveItems = feedbackItems.filter((item) => item.sentiment === "positive").length;
    return clampPercent((positiveItems / feedbackItems.length) * 100);
}

function getRiskCategory(score) {
    if (score >= 70) {
        return "Low";
    }

    if (score >= 40) {
        return "Medium";
    }

    return "High";
}

function getRiskMessage({ riskCategory, isRegisteredUser, otpConfirmed, matchedDetailRate }) {
    const matchText =
        typeof matchedDetailRate === "number" ? `${matchedDetailRate}% detail alignment` : "limited matching data";

    if (riskCategory === "Low") {
        return `This seller shows stronger verification signals with ${matchText}.${otpConfirmed ? " OTP confirmation helped strengthen the result." : ""}${isRegisteredUser ? " A registered VeriTrade profile was also found." : ""}`;
    }

    if (riskCategory === "Medium") {
        return `Some seller information lines up, but there are still gaps. Current signal strength is based on ${matchText}.${otpConfirmed ? " OTP confirmation added support." : ""}`;
    }

    return `This result shows weaker verification evidence so far. Only ${matchText} was found.${isRegisteredUser ? " A registered profile exists, but the shared details were still limited." : " No strong registered seller match was found."}`;
}

function populateAccountNav(profile) {
    const userPageUrl = getUserPageUrl(profile);

    document
        .querySelectorAll(`a[href="${USER_REDIRECT_PAGE}"], a[href^="${USER_REDIRECT_PAGE}?${USER_SLUG_PARAM}="]`)
        .forEach((link) => {
            link.setAttribute("href", userPageUrl);
        });

    document.querySelectorAll('.nav-links a[href^="user.html"]').forEach((link) => {
        link.textContent = profile?.username || "Account";
    });
}

function renderHistoryList(historyList) {
    const historyContainer = document.getElementById("history-list");
    if (!historyContainer) {
        return;
    }

    if (!historyList.length) {
        historyContainer.innerHTML = `
            <article class="history-item empty-state">
                <h4>${EMPTY_LABEL}</h4>
                <p>Your account history will appear here after you start using VeriTrade.</p>
            </article>
        `;
        return;
    }

    historyContainer.innerHTML = historyList
        .map(
            (item) => `
                <article class="history-item">
                    <p class="history-date">${escapeHtml(formatDate(item.created_at))}</p>
                    <h4>${escapeHtml(item.title || "History entry")}</h4>
                    <p>${escapeHtml(item.description || EMPTY_LABEL)}</p>
                </article>
            `
        )
        .join("");
}

function getCheckedValues(name) {
    return Array.from(document.querySelectorAll(`input[name="${name}"]:checked`)).map((input) => input.value);
}

function getSellerDocumentCount(sellerProfile) {
    const documents = sellerProfile?.verification_documents;

    if (!documents || typeof documents !== "object") {
        return 0;
    }

    return Object.values(documents).filter(Boolean).length;
}

function getSellerPlatformLabel(sellerProfile) {
    const platforms = Array.isArray(sellerProfile?.selling_platforms) ? sellerProfile.selling_platforms : [];
    return platforms.length ? platforms.join(", ") : EMPTY_LABEL;
}

function getSellerRegistrationBadge(sellerProfile) {
    return sellerProfile?.is_registered_seller ? "Registered Seller" : EMPTY_LABEL;
}

function isPurchaseFlaggedForFutureChecks(purchase) {
    return Boolean(
        purchase?.fraud_reported ||
            purchase?.purchase_status === "not_delivered" ||
            purchase?.purchase_status === "fraud_reported"
    );
}

function getSellerTrustScoreLabel(sellerProfile) {
    const trustScore = Number(sellerProfile?.seller_trust_score);
    return Number.isFinite(trustScore) && trustScore > 0 ? `${trustScore}%` : EMPTY_LABEL;
}

function getPurchaseConfidenceLabel(sellerProfile) {
    const confidenceScore = Number(sellerProfile?.purchase_confidence_score);
    return Number.isFinite(confidenceScore) && confidenceScore > 0 ? `${confidenceScore}%` : EMPTY_LABEL;
}

function renderSellerStatusSummary(sellerProfile, fallbackUser) {
    setTextContent(
        "seller-status-name",
        sellerProfile?.full_name || fallbackUser?.user_metadata?.full_name || EMPTY_LABEL
    );
    setTextContent("seller-status-registered", getSellerRegistrationBadge(sellerProfile));
    setTextContent(
        "seller-status-verification",
        sellerProfile?.seller_verification_status || EMPTY_LABEL
    );
    setTextContent("seller-status-trust", getSellerTrustScoreLabel(sellerProfile));
    setTextContent("seller-status-confidence", getPurchaseConfidenceLabel(sellerProfile));
    setTextContent(
        "seller-status-documents",
        getSellerDocumentCount(sellerProfile) ? `${getSellerDocumentCount(sellerProfile)} submitted` : EMPTY_LABEL
    );
    setTextContent("seller-status-platforms", getSellerPlatformLabel(sellerProfile));
}

function ensureUserBuyerAnalyticsCard() {
    const dashboardGrid = document.querySelector(".dashboard-grid");

    if (!dashboardGrid) {
        return null;
    }

    let buyerCard = document.getElementById("buyer-analytics-card");
    if (buyerCard) {
        return buyerCard;
    }

    buyerCard = document.createElement("article");
    buyerCard.className = "detail-card";
    buyerCard.id = "buyer-analytics-card";
    buyerCard.innerHTML = `
        <span class="card-kicker">Buyer analytics</span>
        <h3>Buyer scoring and activity</h3>
        <ul class="detail-list">
            <li><span>Buyer trust score</span><strong id="buyer-analytics-score">${EMPTY_LABEL}</strong></li>
            <li><span>Buyer verification status</span><strong id="buyer-analytics-status">${EMPTY_LABEL}</strong></li>
            <li><span>Purchase requests sent</span><strong id="buyer-analytics-requests">${EMPTY_LABEL}</strong></li>
            <li><span>Accepted purchases</span><strong id="buyer-analytics-accepted">${EMPTY_LABEL}</strong></li>
            <li><span>Cancelled purchases</span><strong id="buyer-analytics-cancelled">${EMPTY_LABEL}</strong></li>
            <li><span>Completed purchases</span><strong id="buyer-analytics-completed">${EMPTY_LABEL}</strong></li>
        </ul>
    `;

    dashboardGrid.appendChild(buyerCard);
    return buyerCard;
}

function ensureUserPurchaseAnalyticsCard() {
    const dashboardGrid = document.querySelector(".dashboard-grid");

    if (!dashboardGrid) {
        return null;
    }

    let purchaseCard = document.getElementById("purchase-analytics-card");
    if (purchaseCard) {
        return purchaseCard;
    }

    purchaseCard = document.createElement("article");
    purchaseCard.className = "detail-card";
    purchaseCard.id = "purchase-analytics-card";
    purchaseCard.innerHTML = `
        <span class="card-kicker">Purchase analytics</span>
        <h3>Purchase outcomes</h3>
        <ul class="detail-list">
            <li><span>Total purchases</span><strong id="purchase-analytics-total">${EMPTY_LABEL}</strong></li>
            <li><span>Delivered purchases</span><strong id="purchase-analytics-delivered">${EMPTY_LABEL}</strong></li>
            <li><span>Not delivered purchases</span><strong id="purchase-analytics-not-delivered">${EMPTY_LABEL}</strong></li>
            <li><span>Fraud reports submitted</span><strong id="purchase-analytics-fraud">${EMPTY_LABEL}</strong></li>
            <li><span>Registered seller purchases</span><strong id="purchase-analytics-registered">${EMPTY_LABEL}</strong></li>
            <li><span>Unregistered seller purchases</span><strong id="purchase-analytics-unregistered">${EMPTY_LABEL}</strong></li>
        </ul>
    `;

    dashboardGrid.appendChild(purchaseCard);
    return purchaseCard;
}

function getBuyerBehaviourComplete(buyerProfile) {
    if (!buyerProfile?.behaviour_flags || typeof buyerProfile.behaviour_flags !== "object") {
        return false;
    }

    const values = Object.values(buyerProfile.behaviour_flags);
    return values.length > 0 && values.every(Boolean);
}

function renderUserBuyerAnalytics(buyerProfile, purchases) {
    ensureUserBuyerAnalyticsCard();
    ensureUserPurchaseAnalyticsCard();

    const totalPurchases = purchases.length;
    const acceptedPurchases = purchases.filter((purchase) =>
        ["paid", "delivered", "not_delivered", "fraud_reported"].includes(purchase.purchase_status)
    ).length;
    const cancelledPurchases = purchases.filter((purchase) => purchase.purchase_status === "cancelled").length;
    const completedPurchases = purchases.filter((purchase) => purchase.purchase_status === "delivered").length;
    const deliveredPurchases = completedPurchases;
    const notDeliveredPurchases = purchases.filter((purchase) => purchase.purchase_status === "not_delivered").length;
    const fraudReports = purchases.filter((purchase) => purchase.fraud_reported).length;
    const registeredSellerPurchases = purchases.filter((purchase) => purchase.seller_type === "Registered Seller").length;
    const unregisteredSellerPurchases = purchases.filter((purchase) => purchase.seller_type === "Unregistered Seller").length;
    const trustScore = Number(buyerProfile?.buyer_trust_score);

    setTextContent("buyer-analytics-score", Number.isFinite(trustScore) ? `${trustScore}%` : EMPTY_LABEL);
    setTextContent("buyer-analytics-status", buyerProfile?.buyer_verification_status || EMPTY_LABEL);
    setTextContent("buyer-analytics-requests", totalPurchases ? String(totalPurchases) : EMPTY_LABEL);
    setTextContent("buyer-analytics-accepted", acceptedPurchases ? String(acceptedPurchases) : EMPTY_LABEL);
    setTextContent("buyer-analytics-cancelled", cancelledPurchases ? String(cancelledPurchases) : EMPTY_LABEL);
    setTextContent("buyer-analytics-completed", completedPurchases ? String(completedPurchases) : EMPTY_LABEL);

    setTextContent("purchase-analytics-total", totalPurchases ? String(totalPurchases) : EMPTY_LABEL);
    setTextContent("purchase-analytics-delivered", deliveredPurchases ? String(deliveredPurchases) : EMPTY_LABEL);
    setTextContent(
        "purchase-analytics-not-delivered",
        notDeliveredPurchases ? String(notDeliveredPurchases) : EMPTY_LABEL
    );
    setTextContent("purchase-analytics-fraud", fraudReports ? String(fraudReports) : EMPTY_LABEL);
    setTextContent(
        "purchase-analytics-registered",
        registeredSellerPurchases ? String(registeredSellerPurchases) : EMPTY_LABEL
    );
    setTextContent(
        "purchase-analytics-unregistered",
        unregisteredSellerPurchases ? String(unregisteredSellerPurchases) : EMPTY_LABEL
    );
}

function renderUserPurchaseAnalytics(purchases) {
    ensureUserPurchaseAnalyticsCard();

    const totalPurchases = purchases.length;
    const deliveredPurchases = purchases.filter((purchase) => purchase.purchase_status === "delivered").length;
    const notDeliveredPurchases = purchases.filter((purchase) => purchase.purchase_status === "not_delivered").length;
    const fraudReports = purchases.filter((purchase) => purchase.fraud_reported).length;
    const registeredSellerPurchases = purchases.filter((purchase) => purchase.seller_type === "Registered Seller").length;
    const unregisteredSellerPurchases = purchases.filter(
        (purchase) => purchase.seller_type === "Unregistered Seller"
    ).length;

    setTextContent("purchase-analytics-total", totalPurchases ? String(totalPurchases) : EMPTY_LABEL);
    setTextContent("purchase-analytics-delivered", deliveredPurchases ? String(deliveredPurchases) : EMPTY_LABEL);
    setTextContent(
        "purchase-analytics-not-delivered",
        notDeliveredPurchases ? String(notDeliveredPurchases) : EMPTY_LABEL
    );
    setTextContent("purchase-analytics-fraud", fraudReports ? String(fraudReports) : EMPTY_LABEL);
    setTextContent(
        "purchase-analytics-registered",
        registeredSellerPurchases ? String(registeredSellerPurchases) : EMPTY_LABEL
    );
    setTextContent(
        "purchase-analytics-unregistered",
        unregisteredSellerPurchases ? String(unregisteredSellerPurchases) : EMPTY_LABEL
    );
}

function renderPurchaseList(purchases) {
    const purchaseList = document.getElementById("purchase-list");

    if (!purchaseList) {
        return;
    }

    if (!purchases.length) {
        purchaseList.innerHTML = `
            <article class="history-item empty-state">
                <h4>${EMPTY_LABEL}</h4>
                <p>No saved seller records right now. New records from the Buyer page will appear here with their safety scores and post-purchase actions.</p>
            </article>
        `;
        return;
    }

    const riskKeys = new Set(
        purchases
            .filter((purchase) => isPurchaseFlaggedForFutureChecks(purchase))
            .flatMap((purchase) => [normalizeText(purchase.seller_email), normalizePhone(purchase.seller_phone)])
            .filter(Boolean)
    );

    purchaseList.innerHTML = purchases
        .map((purchase) => {
            const warningTriggered =
                !isPurchaseFlaggedForFutureChecks(purchase) &&
                (
                    riskKeys.has(normalizeText(purchase.seller_email)) ||
                    riskKeys.has(normalizePhone(purchase.seller_phone))
                );
            const title = purchase.seller_name || purchase.product_name || "Seller record";

            return `
                <article class="history-item" data-purchase-id="${escapeHtml(purchase.id)}">
                    <p class="history-date">${escapeHtml(formatDate(purchase.created_at))}</p>
                    <h4>${escapeHtml(title)}</h4>
                    <p>Seller name: ${escapeHtml(purchase.seller_name || EMPTY_LABEL)}</p>
                    <p>Seller email: ${escapeHtml(purchase.seller_email || EMPTY_LABEL)}</p>
                    <p>Seller phone: ${escapeHtml(purchase.seller_phone || EMPTY_LABEL)}</p>
                    ${getOptionalSellerContextMarkup(purchase)}
                    <p>Safety score: ${escapeHtml(formatSafetyScore(purchase.safety_score))}</p>
                    <p>Current status: ${escapeHtml(formatPurchaseStatusLabel(purchase.purchase_status))}</p>
                    ${
                        purchase.fraud_reported
                            ? '<p><strong class="result-pill high-pill">Fraud Reported</strong></p>'
                            : ""
                    }
                    ${
                        warningTriggered
                            ? '<p><strong class="result-pill medium-pill">Warning: This seller has previous non-delivery or fraud reports.</strong></p>'
                            : ""
                    }
                    <p class="purchase-action-row">
                        <button type="button" class="card-btn buyer-btn" data-purchase-action="delivered" data-purchase-id="${escapeHtml(purchase.id)}">Product Received</button>
                        <button type="button" class="card-btn seller-btn" data-purchase-action="not-delivered" data-purchase-id="${escapeHtml(purchase.id)}">Product Not Received</button>
                        <button type="button" class="card-btn risk-btn" data-purchase-action="fraud-reported" data-purchase-id="${escapeHtml(purchase.id)}">Fraud Reported</button>
                    </p>
                </article>
            `;
        })
        .join("");
}

function renderBuyerResult(check) {
    const resultCard = document.getElementById("buyer-result-card");
    const statusElement = document.getElementById("buyer-result-status");

    if (!resultCard || !statusElement) {
        return;
    }

    resultCard.classList.remove("is-low", "is-medium", "is-high");
    statusElement.className = "result-pill neutral-pill";

    if (!check) {
        setTextContent("buyer-result-heading", EMPTY_LABEL);
        setTextContent(
            "buyer-result-message",
            "Submit your buyer profile to calculate a trust score and store your verification status."
        );
        setTextContent("buyer-result-score", EMPTY_LABEL);
        setTextContent("buyer-result-status", EMPTY_LABEL);
        setTextContent("buyer-result-platforms", EMPTY_LABEL);
        setTextContent("buyer-result-behaviour", EMPTY_LABEL);
        setTextContent("buyer-result-documents", EMPTY_LABEL);
        return;
    }

    const trustScore = Number(check.buyer_trust_score);
    const verificationStatus = check.buyer_verification_status || EMPTY_LABEL;
    const platformCount = Array.isArray(check.buying_platforms) ? check.buying_platforms.length : 0;
    const documentCount =
        check.verification_documents && typeof check.verification_documents === "object"
            ? Object.values(check.verification_documents).filter(Boolean).length
            : 0;
    const allBehavioursAccepted =
        check.behaviour_flags &&
        Object.values(check.behaviour_flags).length &&
        Object.values(check.behaviour_flags).every(Boolean);

    if (trustScore >= 80) {
        resultCard.classList.add("is-low");
        statusElement.className = "result-pill low-pill";
    } else if (trustScore >= 50) {
        resultCard.classList.add("is-medium");
        statusElement.className = "result-pill medium-pill";
    } else {
        resultCard.classList.add("is-high");
        statusElement.className = "result-pill high-pill";
    }

    setTextContent("buyer-result-heading", "Buyer profile submitted");
    setTextContent(
        "buyer-result-message",
        Number.isFinite(trustScore)
            ? `Your Buyer Trust Score is ${trustScore}%.`
            : "Your buyer profile has been stored."
    );
    setTextContent("buyer-result-score", Number.isFinite(trustScore) ? `${trustScore}%` : EMPTY_LABEL);
    setTextContent("buyer-result-status", verificationStatus);
    setTextContent("buyer-result-platforms", platformCount ? `${platformCount} selected` : EMPTY_LABEL);
    setTextContent("buyer-result-behaviour", allBehavioursAccepted ? "Completed" : "Partial");
    setTextContent("buyer-result-documents", documentCount ? `${documentCount} uploaded` : EMPTY_LABEL);
}

function getDisplayProfile(profile, user) {
    return {
        ...profile,
        full_name: profile?.full_name || user.user_metadata?.full_name || EMPTY_LABEL,
        username: profile?.username || user.user_metadata?.username || user.email?.split("@")[0] || EMPTY_LABEL,
        auth_email: profile?.auth_email || user.email || EMPTY_LABEL
    };
}

function getLoginErrorMessage(error) {
    const normalizedMessage = `${error?.code || ""} ${error?.message || ""}`.toLowerCase();

    if (
        normalizedMessage.includes("email not confirmed") ||
        normalizedMessage.includes("email_not_confirmed") ||
        normalizedMessage.includes("confirm your email")
    ) {
        return "Please confirm your email address before logging in.";
    }

    if (
        normalizedMessage.includes("invalid login credentials") ||
        normalizedMessage.includes("invalid_credentials") ||
        normalizedMessage.includes("invalid credentials")
    ) {
        return "Incorrect username/email or password.";
    }

    return error?.message || "We could not log you in right now.";
}

async function resolveLoginEmail(loginValue) {
    if (loginValue.includes("@")) {
        return loginValue.toLowerCase();
    }

    if (!supabaseClient) {
        return getCachedLoginEmail(loginValue);
    }

    const { data, error } = await supabaseClient.rpc("get_login_email", {
        p_login: loginValue.toLowerCase()
    });

    if (error) {
        return getCachedLoginEmail(loginValue);
    }

    return data || getCachedLoginEmail(loginValue);
}

async function isUsernameTaken(username) {
    if (!supabaseClient) {
        return false;
    }

    const { data, error } = await supabaseClient.rpc("get_login_email", {
        p_login: username.toLowerCase()
    });

    if (error) {
        return false;
    }

    return Boolean(data);
}

async function syncProfileFromUser(user) {
    if (!supabaseClient || !user) {
        return null;
    }

    const existingProfile = await fetchCurrentProfile(user.id);
    const username = user.user_metadata?.username || user.email?.split("@")[0] || "";
    const fullName = user.user_metadata?.full_name || "";
    const profilePayload = {
        id: user.id,
        username: username.toLowerCase(),
        full_name: fullName,
        auth_email: user.email ? user.email.toLowerCase() : "",
        workspace_access: existingProfile?.workspace_access || DEFAULT_WORKSPACE_ACCESS
    };

    cacheLoginAlias(profilePayload.username, profilePayload.auth_email);

    const { data, error } = await supabaseClient
        .from("profiles")
        .upsert(profilePayload, {
            onConflict: "id"
        })
        .select("*")
        .maybeSingle();

    if (error) {
        return null;
    }

    await supabaseClient.from("user_analytics").upsert(
        {
            user_id: user.id
        },
        {
            onConflict: "user_id"
        }
    );

    return data || profilePayload;
}

async function fetchCurrentProfile(userId) {
    if (!supabaseClient || !userId) {
        return null;
    }

    const { data } = await supabaseClient.from("profiles").select("*").eq("id", userId).maybeSingle();
    return data || null;
}

async function fetchSellerProfile(userId) {
    if (!supabaseClient || !userId) {
        return null;
    }

    const { data } = await supabaseClient.from("seller_profiles").select("*").eq("user_id", userId).maybeSingle();
    return data || null;
}

async function fetchBuyerProfile(userId) {
    if (!supabaseClient || !userId) {
        return null;
    }

    const { data } = await supabaseClient.from("buyer_profiles").select("*").eq("user_id", userId).maybeSingle();
    return data || null;
}

async function fetchPurchases(userId) {
    if (!supabaseClient || !userId) {
        return [];
    }

    const { data } = await supabaseClient
        .from("purchases")
        .select("*")
        .eq("buyer_user_id", userId)
        .order("created_at", { ascending: false });

    return Array.isArray(data) ? data : [];
}

async function persistSellerIdentityVerification(userId, verificationResult) {
    if (!supabaseClient || !userId || !verificationResult) {
        return;
    }

    try {
        await supabaseClient.from("seller_identity_verifications").upsert(
            {
                user_id: userId,
                match_percentage: verificationResult.match_percentage,
                id_selfie_score: verificationResult.id_selfie_score,
                total_score: verificationResult.total_score,
                verification_status: verificationResult.status
            },
            {
                onConflict: "user_id"
            }
        );
    } catch (error) {
    }
}

async function searchSystemUsers(searchTerm) {
    if (!supabaseClient || !searchTerm) {
        return [];
    }

    const trimmedSearchTerm = searchTerm.trim();
    if (!trimmedSearchTerm) {
        return [];
    }

    const { data: rpcData, error: rpcError } = await supabaseClient.rpc("search_profiles", {
        p_search: trimmedSearchTerm
    });

    if (!rpcError && Array.isArray(rpcData)) {
        return rpcData;
    }

    const searchPattern = `%${trimmedSearchTerm}%`;
    const normalizedPhoneSearch = normalizePhone(trimmedSearchTerm);
    const profileColumns = "id, username, full_name, auth_email, phone_number";
    const queries = [
        supabaseClient.from("profiles").select(profileColumns).ilike("full_name", searchPattern).limit(8),
        supabaseClient.from("profiles").select(profileColumns).ilike("username", searchPattern).limit(8),
        supabaseClient.from("profiles").select(profileColumns).ilike("auth_email", searchPattern).limit(8)
    ];

    if (normalizedPhoneSearch) {
        queries.push(
            supabaseClient.from("profiles").select(profileColumns).ilike("phone_number", `%${normalizedPhoneSearch}%`).limit(8)
        );
    }

    const responses = await Promise.all(queries);
    const successfulResponses = responses.filter((response) => !response.error && Array.isArray(response.data));

    if (!successfulResponses.length) {
        throw rpcError || responses.find((response) => response.error)?.error || new Error("Profile search failed.");
    }

    const profilesById = new Map();
    successfulResponses.forEach((response) => {
        response.data.forEach((profile) => {
            profilesById.set(profile.id, profile);
        });
    });

    return [...profilesById.values()].slice(0, 8);
}

async function fetchAdminDashboardUsers() {
    if (!supabaseClient) {
        return [];
    }

    const { data, error } = await supabaseClient.rpc("get_admin_dashboard_users");

    if (error) {
        throw error;
    }

    return Array.isArray(data) ? data : [];
}

function simulateVerification() {
    const matchPercentage = Math.floor(Math.random() * (98 - 60 + 1)) + 60;
    const idSelfieScore = Number(((matchPercentage / 100) * 40).toFixed(1));
    const totalScore = Number(idSelfieScore.toFixed(1));
    const status = matchPercentage >= 75 ? "verified" : "review";

    return {
        match_percentage: matchPercentage,
        id_selfie_score: idSelfieScore,
        total_score: totalScore,
        status
    };
}

function normalizeDemoVerificationResult(result) {
    if (!result || typeof result !== "object") {
        return null;
    }

    const matchPercentage = Number(result.match_percentage);
    const idSelfieScore = Number(result.id_selfie_score);
    const totalScore = Number(result.total_score);
    const status = result.status === "verified" ? "verified" : result.status === "review" ? "review" : null;

    if (
        !Number.isFinite(matchPercentage) ||
        !Number.isFinite(idSelfieScore) ||
        !Number.isFinite(totalScore) ||
        !status
    ) {
        return null;
    }

    return {
        match_percentage: Math.round(matchPercentage),
        id_selfie_score: Number(idSelfieScore.toFixed(1)),
        total_score: Number(totalScore.toFixed(1)),
        status
    };
}

async function requestDemoIdentityVerification(session, payload) {
    if (supabaseClient) {
        try {
            const { data, error } = await supabaseClient.functions.invoke(SELLER_DEMO_VERIFICATION_FUNCTION, {
                body: {
                    user_id: session?.user?.id || null,
                    has_id_photo: Boolean(payload?.idPhotoFile),
                    has_selfie_photo: Boolean(payload?.selfieFile)
                }
            });

            const normalizedResult = normalizeDemoVerificationResult(data);
            if (!error && normalizedResult) {
                return normalizedResult;
            }
        } catch (error) {
        }
    }

    return simulateVerification();
}

async function uploadSellerVerificationFile(userId, category, file) {
    if (!supabaseClient || !userId || !file) {
        return null;
    }

    const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const filePath = `${userId}/${category}/${Date.now()}-${safeFileName}`;
    const { error } = await supabaseClient.storage
        .from(SELLER_STORAGE_BUCKET)
        .upload(filePath, file, { upsert: true });

    if (error) {
        throw error;
    }

    return {
        path: filePath,
        original_name: file.name,
        mime_type: file.type || "application/octet-stream",
        size: file.size,
        uploaded_at: new Date().toISOString()
    };
}

async function uploadBuyerVerificationFile(userId, category, file) {
    if (!supabaseClient || !userId || !file) {
        return null;
    }

    const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const filePath = `${userId}/${category}/${Date.now()}-${safeFileName}`;
    const { error } = await supabaseClient.storage
        .from(BUYER_STORAGE_BUCKET)
        .upload(filePath, file, { upsert: true });

    if (error) {
        throw error;
    }

    return {
        path: filePath,
        original_name: file.name,
        mime_type: file.type || "application/octet-stream",
        size: file.size,
        uploaded_at: new Date().toISOString()
    };
}

async function getCurrentSession() {
    if (!supabaseClient) {
        return null;
    }

    const {
        data: { session }
    } = await supabaseClient.auth.getSession();

    return session;
}

async function createHistoryEntry({
    userId,
    eventType,
    title,
    description,
    sentiment = null,
    relatedCheckId = null
}) {
    if (!supabaseClient || !userId || !title || !description) {
        return;
    }

    await supabaseClient.from("user_history").insert({
        user_id: userId,
        event_type: eventType,
        title,
        description,
        sentiment,
        related_check_id: relatedCheckId
    });
}

async function upsertAnalyticsSnapshot(userId, snapshot) {
    if (!supabaseClient || !userId || !snapshot) {
        return;
    }

    await supabaseClient.from("user_analytics").upsert(
        {
            user_id: userId,
            trust_checks_run: snapshot.trustChecksRun,
            sellers_monitored: snapshot.sellersMonitored,
            profile_completion: snapshot.profileCompletion,
            otp_confirmation_success: snapshot.otpConfirmationSuccess,
            matched_seller_detail_rate: snapshot.matchedSellerDetailRate,
            positive_feedback_trend: snapshot.positiveFeedbackTrend,
            history_records: snapshot.historyRecords
        },
        {
            onConflict: "user_id"
        }
    );
}

async function collectUserSnapshot(userId, profileOverride = null) {
    const [profile, sellerProfile, checksResponse, purchases, historyResponse] = await Promise.all([
        profileOverride ? Promise.resolve(profileOverride) : fetchCurrentProfile(userId),
        fetchSellerProfile(userId),
        supabaseClient.from("verification_checks").select("*").eq("user_id", userId),
        fetchPurchases(userId),
        supabaseClient
            .from("user_history")
            .select("*")
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
    ]);

    const checksList = Array.isArray(checksResponse.data) ? checksResponse.data : [];
    const allHistory = Array.isArray(historyResponse.data) ? historyResponse.data : [];
    const historyList = allHistory.slice(0, 10);
    const resolvedProfile =
        profile ||
        ({
            full_name: EMPTY_LABEL,
            username: EMPTY_LABEL,
            auth_email: EMPTY_LABEL,
            workspace_access: DEFAULT_WORKSPACE_ACCESS,
            linked_marketplaces: []
        });

    const snapshot = {
        trustChecksRun: checksList.length + purchases.length,
        sellersMonitored: getDistinctSellerCount([...checksList, ...purchases]),
        profileCompletion: getProfileCompletion(resolvedProfile, sellerProfile),
        otpConfirmationSuccess: getOtpSuccessRate([...checksList, ...purchases], resolvedProfile),
        matchedSellerDetailRate: getAverageMatchRate(checksList),
        positiveFeedbackTrend: getPositiveFeedbackTrend(allHistory),
        historyRecords: allHistory.length
    };

    return {
        profile: resolvedProfile,
        sellerProfile,
        checksList,
        purchases,
        historyList,
        snapshot
    };
}

function getBaseProfileFromUser(user) {
    return {
        full_name: user.user_metadata?.full_name || EMPTY_LABEL,
        username: user.user_metadata?.username || user.email?.split("@")[0] || EMPTY_LABEL,
        auth_email: user.email || EMPTY_LABEL,
        workspace_access: DEFAULT_WORKSPACE_ACCESS,
        linked_marketplaces: []
    };
}

function hasBuyerPlatformReference(platformLinks, contactReference, extraDetails) {
    const linkValues =
        platformLinks && typeof platformLinks === "object" ? Object.values(platformLinks).filter(Boolean) : [];

    return linkValues.length > 0 || Boolean(contactReference) || Boolean(extraDetails);
}

function calculateBuyerTrustScore(payload) {
    let score = 0;

    if (payload.full_name) {
        score += 10;
    }

    if (payload.email) {
        score += 10;
    }

    if (payload.phone) {
        score += 15;
    }

    if (payload.location) {
        score += 10;
    }

    if (payload.student_number || payload.institution) {
        score += 10;
    }

    if (payload.buying_platforms.length > 0) {
        score += 10;
    }

    if (hasBuyerPlatformReference(payload.platform_links, payload.contact_reference, payload.extra_buyer_details)) {
        score += 10;
    }

    if (getBuyerBehaviourComplete(payload)) {
        score += 15;
    }

    if (Object.values(payload.verification_documents || {}).filter(Boolean).length > 0) {
        score += 10;
    }

    return clampPercent(score);
}

function getBuyerVerificationStatus(payload, buyerTrustScore) {
    const requiredFieldsComplete = [payload.full_name, payload.email, payload.phone, payload.location].every(Boolean);

    if (requiredFieldsComplete && getBuyerBehaviourComplete(payload)) {
        return buyerTrustScore >= 70 ? "Pending Verification" : "Profile Submitted";
    }

    return "Incomplete";
}

async function findRegisteredSellerByContact(sellerEmail, sellerPhone) {
    if (!supabaseClient) {
        return null;
    }

    const candidateProfileIds = new Set();

    if (sellerEmail) {
        const { data } = await supabaseClient
            .from("profiles")
            .select("id")
            .eq("auth_email", sellerEmail)
            .maybeSingle();

        if (data?.id) {
            candidateProfileIds.add(data.id);
        }
    }

    if (sellerPhone) {
        const { data } = await supabaseClient
            .from("profiles")
            .select("id")
            .eq("phone_number", sellerPhone)
            .maybeSingle();

        if (data?.id) {
            candidateProfileIds.add(data.id);
        }
    }

    for (const profileId of candidateProfileIds) {
        const [profileResponse, sellerResponse] = await Promise.all([
            supabaseClient.from("profiles").select("id, full_name, auth_email, phone_number").eq("id", profileId).maybeSingle(),
            supabaseClient
                .from("seller_profiles")
                .select("user_id, full_name, is_registered_seller, seller_trust_score, purchase_confidence_score")
                .eq("user_id", profileId)
                .eq("is_registered_seller", true)
                .maybeSingle()
        ]);

        if (profileResponse.data && sellerResponse.data) {
            return {
                user_id: profileResponse.data.id,
                full_name:
                    sellerResponse.data.full_name ||
                    profileResponse.data.full_name ||
                    EMPTY_LABEL,
                email: profileResponse.data.auth_email || EMPTY_LABEL,
                phone: profileResponse.data.phone_number || EMPTY_LABEL,
                is_registered_seller: sellerResponse.data.is_registered_seller,
                seller_trust_score: sellerResponse.data.seller_trust_score,
                purchase_confidence_score: sellerResponse.data.purchase_confidence_score
            };
        }
    }

    return null;
}

async function hasSellerRiskWarning(sellerEmail, sellerPhone) {
    if (!supabaseClient) {
        return false;
    }

    const normalizedEmail = normalizeText(sellerEmail);
    const normalizedPhone = normalizePhone(sellerPhone);

    const { data: rpcData, error: rpcError } = await supabaseClient.rpc("has_seller_risk_warning", {
        p_email: normalizedEmail || null,
        p_phone: normalizedPhone || null
    });

    if (!rpcError && typeof rpcData === "boolean") {
        return rpcData;
    }

    const { data } = await supabaseClient
        .from("purchases")
        .select("seller_email, seller_phone, purchase_status, fraud_reported")
        .or("fraud_reported.eq.true,purchase_status.eq.not_delivered,purchase_status.eq.fraud_reported");

    const purchases = Array.isArray(data) ? data : [];

    return purchases.some(
        (purchase) =>
            (normalizedEmail && normalizeText(purchase.seller_email) === normalizedEmail) ||
            (normalizedPhone && normalizePhone(purchase.seller_phone) === normalizedPhone)
    );
}

function isMissingPurchaseAssessmentColumnError(error) {
    const optionalAssessmentColumns = [
        "seller_social_handle",
        "marketplace_profile_link",
        "business_name",
        "seller_notes",
        "details_score",
        "email_otp_score",
        "phone_otp_score",
        "face_recognition_score"
    ];
    const errorText = normalizeText([error?.code, error?.message, error?.details, error?.hint].filter(Boolean).join(" "));

    return (
        errorText.includes("pgrst204") ||
        (errorText.includes("column") && optionalAssessmentColumns.some((column) => errorText.includes(column)))
    );
}

function getCorePurchasePayload(purchasePayload) {
    return {
        buyer_user_id: purchasePayload.buyer_user_id,
        seller_user_id: purchasePayload.seller_user_id,
        seller_type: purchasePayload.seller_type,
        seller_name: purchasePayload.seller_name,
        seller_email: purchasePayload.seller_email,
        seller_phone: purchasePayload.seller_phone,
        safety_score: purchasePayload.safety_score,
        purchase_status: purchasePayload.purchase_status,
        fraud_reported: purchasePayload.fraud_reported,
        fraud_reason: purchasePayload.fraud_reason
    };
}

async function insertBuyerSellerAssessment(purchasePayload) {
    const firstAttempt = await supabaseClient
        .from("purchases")
        .insert(purchasePayload)
        .select("*")
        .single();

    if (!firstAttempt.error || !isMissingPurchaseAssessmentColumnError(firstAttempt.error)) {
        return firstAttempt;
    }

    return supabaseClient
        .from("purchases")
        .insert(getCorePurchasePayload(purchasePayload))
        .select("*")
        .single();
}

function bindPurchaseActions(userId) {
    const purchaseList = document.getElementById("purchase-list");

    if (!purchaseList || purchaseList.dataset.bound === "true") {
        return;
    }

    purchaseList.dataset.bound = "true";

    purchaseList.addEventListener("click", async (event) => {
        const button = event.target.closest("[data-purchase-action]");

        if (!button) {
            return;
        }

        const purchaseId = button.getAttribute("data-purchase-id");
        const action = button.getAttribute("data-purchase-action");

        if (!purchaseId || !action) {
            return;
        }

        let updates = {};

        if (action === "delivered") {
            updates = {
                purchase_status: "delivered",
                fraud_reported: false,
                fraud_reason: null
            };
        } else if (action === "not-delivered") {
            updates = {
                purchase_status: "not_delivered",
                fraud_reported: false,
                fraud_reason: null
            };
        } else if (action === "fraud-reported") {
            updates = {
                purchase_status: "fraud_reported",
                fraud_reported: true,
                fraud_reason: null
            };
        } else {
            return;
        }

        const { data, error } = await supabaseClient
            .from("purchases")
            .update(updates)
            .eq("id", purchaseId)
            .eq("buyer_user_id", userId)
            .select("*")
            .maybeSingle();

        if (error || !data) {
            return;
        }

        await createHistoryEntry({
            userId,
            eventType: "verification",
            title: "Purchase status updated",
            description: `Seller record for ${data.seller_name || data.product_name || "this seller"} was updated to ${formatPurchaseStatusLabel(data.purchase_status).toLowerCase()}.`
        });

        const { purchases, snapshot } = await collectUserSnapshot(userId);

        await upsertAnalyticsSnapshot(userId, snapshot);
        renderPurchaseList(purchases);
        renderUserPurchaseAnalytics(purchases);
    });
}

function bindSignOutLinks() {
    document.querySelectorAll("[data-signout-link]").forEach((link) => {
        link.addEventListener("click", async (event) => {
            event.preventDefault();

            if (supabaseClient) {
                await supabaseClient.auth.signOut();
            }

            window.location.href = "index.html";
        });
    });
}

function initAuthUi() {
    const loginToggle = document.getElementById("login-toggle");
    const signupToggle = document.getElementById("signup-toggle");
    const loginForm = document.getElementById("login-form");
    const signupForm = document.getElementById("signup-form");
    const switchToSignup = document.getElementById("switch-to-signup");
    const switchToLogin = document.getElementById("switch-to-login");

    if (!loginToggle || !signupToggle || !loginForm || !signupForm) {
        return null;
    }

    function clearFormErrors() {
        document.querySelectorAll(".error-message").forEach((message) => {
            message.textContent = "";
        });

        document.querySelectorAll(".auth-form .status-banner").forEach((message) => {
            message.textContent = "";
            message.className = "status-banner";
        });

        document.querySelectorAll("input").forEach((input) => {
            input.classList.remove("error");
        });
    }

    function showErrorMessage(elementId, message) {
        const errorElement = document.getElementById(elementId);
        if (errorElement) {
            errorElement.textContent = message;
        }
    }

    function showStatusMessage(elementId, message, type = "") {
        const statusElement = document.getElementById(elementId);
        if (!statusElement) {
            return;
        }

        statusElement.textContent = message || "";
        statusElement.className = "status-banner";

        if (type) {
            statusElement.classList.add(type);
        }
    }

    function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    function updateAuthMode(mode, shouldUpdateUrl = true) {
        const showingLogin = mode === "login";

        loginForm.classList.toggle("active", showingLogin);
        signupForm.classList.toggle("active", !showingLogin);
        loginForm.hidden = !showingLogin;
        signupForm.hidden = showingLogin;
        loginToggle.classList.toggle("active", showingLogin);
        signupToggle.classList.toggle("active", !showingLogin);
        loginToggle.setAttribute("aria-pressed", String(showingLogin));
        signupToggle.setAttribute("aria-pressed", String(!showingLogin));

        if (shouldUpdateUrl) {
            const url = new URL(window.location.href);
            url.searchParams.set("mode", showingLogin ? "login" : "signup");
            window.history.replaceState({}, "", url);
        }

        clearFormErrors();
    }

    function showLoginForm(shouldUpdateUrl = true) {
        updateAuthMode("login", shouldUpdateUrl);
    }

    function showSignupForm(shouldUpdateUrl = true) {
        updateAuthMode("signup", shouldUpdateUrl);
    }

    function validateLoginForm() {
        clearFormErrors();
        let isValid = true;

        const loginUser = document.getElementById("login-user");
        const password = document.getElementById("login-password");

        if (!loginUser.value.trim()) {
            showErrorMessage("login-user-error", "Username or email is required");
            loginUser.classList.add("error");
            isValid = false;
        }

        if (!password.value) {
            showErrorMessage("login-password-error", "Password is required");
            password.classList.add("error");
            isValid = false;
        } else if (password.value.length < 6) {
            showErrorMessage("login-password-error", "Password must be at least 6 characters");
            password.classList.add("error");
            isValid = false;
        }

        return isValid;
    }

    function validateSignupForm() {
        clearFormErrors();
        let isValid = true;

        const name = document.getElementById("signup-name");
        const email = document.getElementById("signup-email");
        const username = document.getElementById("signup-username");
        const password = document.getElementById("signup-password");
        const confirmPassword = document.getElementById("signup-confirm-password");

        if (!name.value.trim()) {
            showErrorMessage("signup-name-error", "Full name is required");
            name.classList.add("error");
            isValid = false;
        }

        if (!email.value.trim()) {
            showErrorMessage("signup-email-error", "Email is required");
            email.classList.add("error");
            isValid = false;
        } else if (!isValidEmail(email.value)) {
            showErrorMessage("signup-email-error", "Please enter a valid email address");
            email.classList.add("error");
            isValid = false;
        }

        if (!username.value.trim()) {
            showErrorMessage("signup-username-error", "Username is required");
            username.classList.add("error");
            isValid = false;
        } else if (username.value.trim().length < 3) {
            showErrorMessage("signup-username-error", "Username must be at least 3 characters");
            username.classList.add("error");
            isValid = false;
        } else if (!/^[a-zA-Z0-9_]*$/.test(username.value)) {
            showErrorMessage(
                "signup-username-error",
                "Username can only contain letters, numbers, and underscores"
            );
            username.classList.add("error");
            isValid = false;
        }

        if (!password.value) {
            showErrorMessage("signup-password-error", "Password is required");
            password.classList.add("error");
            isValid = false;
        } else if (password.value.length < 6) {
            showErrorMessage("signup-password-error", "Password must be at least 6 characters");
            password.classList.add("error");
            isValid = false;
        } else if (!/[A-Z]/.test(password.value)) {
            showErrorMessage("signup-password-error", "Password must contain at least one uppercase letter");
            password.classList.add("error");
            isValid = false;
        } else if (!/[0-9]/.test(password.value)) {
            showErrorMessage("signup-password-error", "Password must contain at least one number");
            password.classList.add("error");
            isValid = false;
        }

        if (!confirmPassword.value) {
            showErrorMessage("signup-confirm-password-error", "Please confirm your password");
            confirmPassword.classList.add("error");
            isValid = false;
        } else if (confirmPassword.value !== password.value) {
            showErrorMessage("signup-confirm-password-error", "Passwords do not match");
            confirmPassword.classList.add("error");
            isValid = false;
        }

        return isValid;
    }

    loginToggle.addEventListener("click", (event) => {
        event.preventDefault();
        showLoginForm();
    });

    signupToggle.addEventListener("click", (event) => {
        event.preventDefault();
        showSignupForm();
    });

    switchToSignup?.addEventListener("click", (event) => {
        event.preventDefault();
        showSignupForm();
    });

    switchToLogin?.addEventListener("click", (event) => {
        event.preventDefault();
        showLoginForm();
    });

    const authMode = new URLSearchParams(window.location.search).get("mode");
    if (authMode === "signup") {
        showSignupForm(false);
    } else {
        showLoginForm(false);
    }

    const signupEmailInput = document.getElementById("signup-email");
    signupEmailInput?.addEventListener("blur", () => {
        if (signupEmailInput.value && !isValidEmail(signupEmailInput.value)) {
            showErrorMessage("signup-email-error", "Please enter a valid email address");
            signupEmailInput.classList.add("error");
        }
    });

    document.querySelectorAll("input").forEach((input) => {
        input.addEventListener("input", () => {
            if (!input.classList.contains("error")) {
                return;
            }

            input.classList.remove("error");
            const errorElement = document.getElementById(`${input.id}-error`);
            if (errorElement) {
                errorElement.textContent = "";
            }
        });
    });

    return {
        loginForm,
        signupForm,
        validateLoginForm,
        validateSignupForm,
        showErrorMessage,
        showStatusMessage,
        showLoginForm,
        showSignupForm
    };
}

async function initAuthPage() {
    const authUi = initAuthUi();
    if (!authUi) {
        return;
    }

    if (!supabaseClient) {
        authUi.loginForm.addEventListener("submit", (event) => {
            event.preventDefault();
            showAlert("Add your Supabase project URL in javascript/app.js before using authentication.");
        });

        authUi.signupForm.addEventListener("submit", (event) => {
            event.preventDefault();
            showAlert("Add your Supabase project URL in javascript/app.js before using authentication.");
        });
        return;
    }

    function hasAuthCallbackParams() {
        const searchParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));

        return (
            hashParams.has("access_token") ||
            hashParams.has("refresh_token") ||
            searchParams.has("code") ||
            (searchParams.has("token_hash") && searchParams.has("type"))
        );
    }

    let isRedirectingToWorkspace = false;

    async function redirectAuthenticatedUser(userOrProfile) {
        if (!userOrProfile || isRedirectingToWorkspace) {
            return;
        }

        isRedirectingToWorkspace = true;

        const redirectProfile =
            (userOrProfile.id ? await syncProfileFromUser(userOrProfile) : userOrProfile) ||
            (userOrProfile.id ? await fetchCurrentProfile(userOrProfile.id) : null) ||
            (userOrProfile.id ? getBaseProfileFromUser(userOrProfile) : userOrProfile);

        window.location.replace(getUserPageUrl(redirectProfile));
    }

    let existingSession = null;
    try {
        existingSession = await getCurrentSession();
    } catch (error) {
        existingSession = null;
    }

    if (existingSession?.user && hasAuthCallbackParams()) {
        await redirectAuthenticatedUser(existingSession.user);
        return;
    }

    supabaseClient.auth.onAuthStateChange(async (event, nextSession) => {
        if (event !== "SIGNED_IN" || !nextSession?.user) {
            return;
        }

        await redirectAuthenticatedUser(nextSession.user);
    });

    authUi.loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        if (!authUi.validateLoginForm()) {
            return;
        }

        const loginValue = document.getElementById("login-user").value.trim();
        const password = document.getElementById("login-password").value;
        const resolvedEmail = await resolveLoginEmail(loginValue);

        if (!resolvedEmail) {
            const loginMessage = loginValue.includes("@")
                ? "Incorrect email or password."
                : "We could not match that username yet. Try your email address, or confirm your account email first.";
            authUi.showErrorMessage("login-password-error", loginMessage);
            return;
        }

        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: resolvedEmail,
            password
        });

        if (error) {
            authUi.showErrorMessage("login-password-error", getLoginErrorMessage(error));
            return;
        }

        authUi.loginForm.reset();
        await redirectAuthenticatedUser(data.user);
    });

    authUi.signupForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        if (!authUi.validateSignupForm()) {
            return;
        }

        const fullName = document.getElementById("signup-name").value.trim();
        const email = document.getElementById("signup-email").value.trim().toLowerCase();
        const username = document.getElementById("signup-username").value.trim().toLowerCase();
        const password = document.getElementById("signup-password").value;

        if (await isUsernameTaken(username)) {
            authUi.showErrorMessage("signup-username-error", "That username is already in use.");
            return;
        }

        const { data, error } = await supabaseClient.auth.signUp({
            email,
            password,
            options: {
                emailRedirectTo: getAbsoluteUserPageUrl({
                    email,
                    username,
                    user_metadata: {
                        username
                    }
                }),
                data: {
                    full_name: fullName,
                    username
                }
            }
        });

        if (error) {
            const lowercaseMessage = error.message.toLowerCase();
            const message =
                lowercaseMessage.includes("duplicate") ||
                lowercaseMessage.includes("unique") ||
                lowercaseMessage.includes("already")
                    ? "That username or email is already in use."
                    : error.message;

            authUi.showErrorMessage("signup-username-error", message);
            return;
        }

        cacheLoginAlias(username, email);

        if (data.session && data.user) {
            authUi.signupForm.reset();
            await redirectAuthenticatedUser(data.user);
            return;
        }

        authUi.signupForm.reset();
        authUi.showSignupForm(false);
        authUi.showStatusMessage(
            "signup-status",
            "Check your email to verify your account. After verification, you'll go straight to your workspace.",
            "success"
        );
    });
}

async function ensurePortalSession() {
    if (!supabaseClient) {
        return null;
    }

    const session = await getCurrentSession();
    if (!session) {
        window.location.href = "auth.html?mode=login";
        return null;
    }

    bindSignOutLinks();

    supabaseClient.auth.onAuthStateChange((event, nextSession) => {
        if (event === "SIGNED_OUT" || !nextSession) {
            window.location.href = "auth.html?mode=login";
        }
    });

    const syncedProfile = await syncProfileFromUser(session.user);
    const profile = syncedProfile || (await fetchCurrentProfile(session.user.id)) || getBaseProfileFromUser(session.user);

    updateAdminNavVisibility(profile, session.user);
    populateAccountNav(profile);
    syncCurrentUserPageSlug(profile);

    return {
        session,
        profile
    };
}

function initPortalNav() {
    const toggleButton = document.querySelector(".portal-nav-toggle");
    const navMenu = document.querySelector(".portal-nav-menu");

    if (!toggleButton || !navMenu) {
        return;
    }

    function closeMenu() {
        navMenu.classList.remove("is-open");
        toggleButton.setAttribute("aria-expanded", "false");
    }

    function toggleMenu() {
        const isOpen = navMenu.classList.toggle("is-open");
        toggleButton.setAttribute("aria-expanded", isOpen ? "true" : "false");
    }

    toggleButton.addEventListener("click", toggleMenu);

    navMenu.querySelectorAll("a").forEach((link) => {
        link.addEventListener("click", closeMenu);
    });

    window.addEventListener("resize", () => {
        if (window.innerWidth > 768) {
            closeMenu();
        }
    });
}

function initUserSearch() {
    const searchInput = document.getElementById("user-search-input");
    const resultsContainer = document.getElementById("user-search-results");
    const statusElement = document.getElementById("user-search-status");
    const modal = document.getElementById("user-search-modal");
    const closeButton = document.getElementById("user-search-modal-close");

    if (!searchInput || !resultsContainer || !statusElement || !modal || !closeButton) {
        return;
    }

    let searchTimeoutId = null;
    let activeRequestId = 0;

    function renderEmptyState(message) {
        resultsContainer.innerHTML = `
            <article class="history-item empty-state">
                <h4>${EMPTY_LABEL}</h4>
                <p>${escapeHtml(message)}</p>
            </article>
        `;
    }

    function closeModal() {
        modal.hidden = true;
    }

    function openModal(userProfile) {
        setTextContent("user-search-modal-name", userProfile?.full_name || EMPTY_LABEL);
        setTextContent("user-search-modal-email", userProfile?.auth_email || EMPTY_LABEL);
        setTextContent("user-search-modal-phone", userProfile?.phone_number || EMPTY_LABEL);
        modal.hidden = false;
    }

    function renderResults(users) {
        if (!users.length) {
            renderEmptyState("No users matched that name, email, or phone number.");
            return;
        }

        resultsContainer.innerHTML = users
            .map(
                (userProfile, index) => `
                    <button
                        type="button"
                        class="user-search-result-btn"
                        data-user-search-index="${index}"
                    >
                        <h4>${escapeHtml(userProfile.full_name || EMPTY_LABEL)}</h4>
                        <p>${escapeHtml(userProfile.auth_email || EMPTY_LABEL)}</p>
                        <p>${escapeHtml(userProfile.phone_number || EMPTY_LABEL)}</p>
                    </button>
                `
            )
            .join("");

        resultsContainer.querySelectorAll("[data-user-search-index]").forEach((button) => {
            button.addEventListener("click", () => {
                const index = Number(button.getAttribute("data-user-search-index"));
                openModal(users[index]);
            });
        });
    }

    async function runSearch() {
        const searchTerm = searchInput.value.trim();
        const requestId = ++activeRequestId;

        if (!searchTerm) {
            statusElement.textContent = "";
            renderEmptyState("Search results will appear here after you enter a user name, email, or phone number.");
            return;
        }

        statusElement.textContent = "Searching users...";
        const users = await searchSystemUsers(searchTerm);

        if (requestId !== activeRequestId) {
            return;
        }

        statusElement.textContent = users.length
            ? `${users.length} user${users.length === 1 ? "" : "s"} found.`
            : "No matching users found.";
        renderResults(users);
    }

    searchInput.addEventListener("input", () => {
        if (searchTimeoutId) {
            window.clearTimeout(searchTimeoutId);
        }

        searchTimeoutId = window.setTimeout(() => {
            runSearch().catch(() => {
                statusElement.textContent = "We could not search users right now.";
                renderEmptyState("Try your search again in a moment.");
            });
        }, 250);
    });

    closeButton.addEventListener("click", closeModal);
    modal.addEventListener("click", (event) => {
        if (event.target === modal) {
            closeModal();
        }
    });
}

function getAdminUserVerificationState(userRecord) {
    const normalizedValue = normalizeText(userRecord?.verification_state).replace(/\s+/g, "_");
    return ["verified", "pending", "rejected"].includes(normalizedValue) ? normalizedValue : "rejected";
}

function getAdminUserVerificationLabel(userRecord) {
    const label = String(userRecord?.verification_label || "").trim();
    return label || "Rejected / Unverified";
}

function getAdminCountValue(value) {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? Math.max(0, Math.round(numericValue)) : 0;
}

function hasAdminBuyerActivity(userRecord) {
    return (
        getAdminCountValue(userRecord?.total_purchase_records) > 0 ||
        Boolean(String(userRecord?.buyer_verification_status || "").trim())
    );
}

function getAdminStatusBadgeMarkup(userRecord) {
    return `<span class="admin-status-badge is-${getAdminUserVerificationState(userRecord)}">${escapeHtml(getAdminUserVerificationLabel(userRecord))}</span>`;
}

function filterAdminUsers(users, searchTerm) {
    const trimmedSearchTerm = String(searchTerm || "").trim();

    if (!trimmedSearchTerm) {
        return users;
    }

    const normalizedSearchTerm = normalizeText(trimmedSearchTerm);
    const normalizedPhoneSearch = normalizePhone(trimmedSearchTerm);

    return users.filter((userRecord) => {
        const nameValue = normalizeText(userRecord?.full_name);
        const emailValue = normalizeText(userRecord?.email);
        const phoneValue = normalizePhone(userRecord?.phone_number);

        return (
            nameValue.includes(normalizedSearchTerm) ||
            emailValue.includes(normalizedSearchTerm) ||
            (normalizedPhoneSearch && phoneValue.includes(normalizedPhoneSearch))
        );
    });
}

function renderAdminChart(users, emptyMessage = "No buyer follow-through records matched the current view.") {
    const chartContainer = document.getElementById("admin-follow-through-chart");

    if (!chartContainer) {
        return;
    }

    const buyerUsers = users.filter((userRecord) => hasAdminBuyerActivity(userRecord));

    if (!buyerUsers.length) {
        chartContainer.innerHTML = `
            <article class="history-item empty-state">
                <h4>${EMPTY_LABEL}</h4>
                <p>${escapeHtml(emptyMessage)}</p>
            </article>
        `;
        return;
    }

    chartContainer.innerHTML = buyerUsers
        .map((userRecord) => {
            const totalPurchaseRecords = getAdminCountValue(userRecord?.total_purchase_records);
            const followedThroughPurchases = getAdminCountValue(userRecord?.followed_through_purchases);
            const followThroughPercent = getAdminCountValue(userRecord?.follow_through_percent);
            const displayName = userRecord?.full_name || userRecord?.email || userRecord?.phone_number || "Unnamed user";

            return `
                <article class="admin-chart-row">
                    <div class="admin-chart-copy">
                        <div>
                            <h4>${escapeHtml(displayName)}</h4>
                            <p>${followedThroughPurchases} of ${totalPurchaseRecords} purchase record${totalPurchaseRecords === 1 ? "" : "s"} followed through</p>
                        </div>
                        <strong>${followThroughPercent}%</strong>
                    </div>
                    <div class="metric-bar admin-chart-bar">
                        <span class="metric-fill" style="width: ${followThroughPercent}%"></span>
                    </div>
                </article>
            `;
        })
        .join("");
}

function renderAdminTable(users, emptyMessage = "No users matched the current search.") {
    const tableBody = document.getElementById("admin-user-table-body");

    if (!tableBody) {
        return;
    }

    if (!users.length) {
        tableBody.innerHTML = `
            <tr class="admin-empty-row">
                <td colspan="7">${escapeHtml(emptyMessage)}</td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = users
        .map(
            (userRecord, index) => `
                <tr>
                    <td data-label="Full Name">${escapeHtml(userRecord?.full_name || EMPTY_LABEL)}</td>
                    <td data-label="Email">${escapeHtml(userRecord?.email || EMPTY_LABEL)}</td>
                    <td data-label="Phone Number">${escapeHtml(userRecord?.phone_number || EMPTY_LABEL)}</td>
                    <td data-label="Verification Status">${getAdminStatusBadgeMarkup(userRecord)}</td>
                    <td data-label="Follow-through">
                        <div class="admin-follow-through-cell">
                            <strong>${escapeHtml(formatPercent(userRecord?.follow_through_percent))}</strong>
                            <span>${getAdminCountValue(userRecord?.followed_through_purchases)} / ${getAdminCountValue(userRecord?.total_purchase_records)}</span>
                        </div>
                    </td>
                    <td data-label="Date Created">${escapeHtml(formatDate(userRecord?.created_at))}</td>
                    <td data-label="Actions">
                        <button type="button" class="inline-action-btn" data-admin-user-index="${index}">View</button>
                    </td>
                </tr>
            `
        )
        .join("");
}

function getAdminSellerAssessments(userRecord) {
    if (Array.isArray(userRecord?.seller_assessments)) {
        return userRecord.seller_assessments;
    }

    if (typeof userRecord?.seller_assessments === "string") {
        try {
            const parsedAssessments = JSON.parse(userRecord.seller_assessments);
            return Array.isArray(parsedAssessments) ? parsedAssessments : [];
        } catch (error) {
            return [];
        }
    }

    return [];
}

function renderAdminSellerAssessments(userRecord) {
    const assessmentList = document.getElementById("admin-modal-seller-assessments");

    if (!assessmentList) {
        return;
    }

    const assessments = getAdminSellerAssessments(userRecord);

    if (!assessments.length) {
        assessmentList.innerHTML = `
            <article class="history-item empty-state">
                <h4>${EMPTY_LABEL}</h4>
                <p>This user has no saved seller assessments yet.</p>
            </article>
        `;
        return;
    }

    assessmentList.innerHTML = assessments
        .map(
            (assessment) => `
                <article class="history-item">
                    <p class="history-date">${escapeHtml(formatDate(assessment.created_at))}</p>
                    <h4>${escapeHtml(assessment.seller_name || "Seller assessment")}</h4>
                    <p>Seller type: ${escapeHtml(assessment.seller_type || EMPTY_LABEL)}</p>
                    <p>Seller email: ${escapeHtml(assessment.seller_email || EMPTY_LABEL)}</p>
                    <p>Seller phone: ${escapeHtml(assessment.seller_phone || EMPTY_LABEL)}</p>
                    ${getOptionalSellerContextMarkup(assessment)}
                    <p>Safety score: ${escapeHtml(formatSafetyScore(assessment.safety_score))}</p>
                    <p>Current status: ${escapeHtml(formatPurchaseStatusLabel(assessment.purchase_status))}</p>
                    ${assessment.fraud_reported ? '<p><strong class="result-pill high-pill">Fraud Reported</strong></p>' : ""}
                </article>
            `
        )
        .join("");
}

function populateAdminUserModal(userRecord) {
    setTextContent("admin-modal-name", userRecord?.full_name || EMPTY_LABEL);
    setTextContent("admin-modal-email", userRecord?.email || EMPTY_LABEL);
    setTextContent("admin-modal-phone", userRecord?.phone_number || EMPTY_LABEL);
    setTextContent("admin-modal-verification", getAdminUserVerificationLabel(userRecord));
    setTextContent("admin-modal-buyer-status", userRecord?.buyer_verification_status || EMPTY_LABEL);
    setTextContent("admin-modal-seller-status", userRecord?.seller_verification_status || EMPTY_LABEL);
    setTextContent("admin-modal-buyer-trust", formatPercent(userRecord?.buyer_trust_score));
    setTextContent("admin-modal-seller-trust", formatPercent(userRecord?.seller_trust_score));
    setTextContent("admin-modal-purchase-confidence", formatPercent(userRecord?.purchase_confidence_score));
    setTextContent("admin-modal-trust-checks", String(getAdminCountValue(userRecord?.trust_checks_run)));
    setTextContent("admin-modal-sellers-monitored", String(getAdminCountValue(userRecord?.sellers_monitored)));
    setTextContent("admin-modal-average-safety", formatSafetyScore(userRecord?.average_safety_score));
    setTextContent("admin-modal-total-purchases", String(getAdminCountValue(userRecord?.total_purchase_records)));
    setTextContent(
        "admin-modal-followed-through",
        String(getAdminCountValue(userRecord?.followed_through_purchases))
    );
    setTextContent("admin-modal-follow-through-rate", formatPercent(userRecord?.follow_through_percent));
    setTextContent("admin-modal-created-at", formatDate(userRecord?.created_at));
    renderAdminSellerAssessments(userRecord);
}

function renderAdminSummary(allUsers) {
    const totalUsers = allUsers.length;
    const totalBuyers = allUsers.filter((userRecord) => hasAdminBuyerActivity(userRecord)).length;
    const verifiedUsers = allUsers.filter((userRecord) => getAdminUserVerificationState(userRecord) === "verified").length;
    const usersWithPurchases = allUsers.filter((userRecord) => getAdminCountValue(userRecord?.total_purchase_records) > 0);
    const averageFollowThrough = usersWithPurchases.length
        ? clampPercent(
              usersWithPurchases.reduce((sum, userRecord) => sum + Number(userRecord?.follow_through_percent || 0), 0) /
                  usersWithPurchases.length
          )
        : 0;

    setStatValue("admin-stat-total-users", String(totalUsers));
    setStatValue("admin-stat-total-buyers", String(totalBuyers));
    setStatValue("admin-stat-verified-users", String(verifiedUsers));
    setStatValue("admin-stat-average-follow-through", `${averageFollowThrough}%`);
}

async function initAdminPage(session, profile) {
    const dashboardShell = document.getElementById("admin-dashboard-shell");
    const accessDeniedCard = document.getElementById("admin-access-denied");
    const accessMessage = document.getElementById("admin-access-message");
    const pageStatus = document.getElementById("admin-page-status");
    const tableStatus = document.getElementById("admin-table-status");
    const searchInput = document.getElementById("admin-user-search");
    const tableBody = document.getElementById("admin-user-table-body");
    const modal = document.getElementById("admin-user-modal");
    const closeButton = document.getElementById("admin-user-modal-close");
    const closeActionButton = document.getElementById("admin-user-modal-close-action");

    if (
        !dashboardShell ||
        !accessDeniedCard ||
        !accessMessage ||
        !pageStatus ||
        !tableStatus ||
        !searchInput ||
        !tableBody ||
        !modal ||
        !closeButton ||
        !closeActionButton
    ) {
        return;
    }

    if (!isAdminUser(profile, session.user)) {
        dashboardShell.hidden = true;
        accessDeniedCard.hidden = false;
        accessMessage.textContent = "Only users with an admin role can access this page.";
        return;
    }

    accessDeniedCard.hidden = true;
    dashboardShell.hidden = false;
    setStatusMessage("admin-page-status", "Loading admin dashboard...", "");

    let allUsers = [];
    let filteredUsers = [];

    function closeModal() {
        modal.hidden = true;
    }

    function openModal(userRecord) {
        populateAdminUserModal(userRecord);
        modal.hidden = false;
    }

    function applyAdminFilters() {
        filteredUsers = filterAdminUsers(allUsers, searchInput.value);

        if (!allUsers.length) {
            renderAdminTable([], "No users have been created in Supabase yet.");
            renderAdminChart([], "User follow-through data will appear here once records are available.");
            tableStatus.textContent = "No users have been created in Supabase yet.";
            return;
        }

        renderAdminTable(filteredUsers);
        renderAdminChart(filteredUsers);

        tableStatus.textContent = filteredUsers.length
            ? `Showing ${filteredUsers.length} of ${allUsers.length} user${allUsers.length === 1 ? "" : "s"}.`
            : "No users matched that name, email, or phone number.";
    }

    tableBody.addEventListener("click", (event) => {
        const button = event.target.closest("[data-admin-user-index]");

        if (!button) {
            return;
        }

        const userIndex = Number(button.getAttribute("data-admin-user-index"));
        const userRecord = filteredUsers[userIndex];

        if (userRecord) {
            openModal(userRecord);
        }
    });

    closeButton.addEventListener("click", closeModal);
    closeActionButton.addEventListener("click", closeModal);
    modal.addEventListener("click", (event) => {
        if (event.target === modal) {
            closeModal();
        }
    });

    searchInput.addEventListener("input", applyAdminFilters);

    try {
        allUsers = await fetchAdminDashboardUsers();
        renderAdminSummary(allUsers);
        applyAdminFilters();

        setStatusMessage(
            "admin-page-status",
            allUsers.length
                ? `Admin dashboard loaded successfully with ${allUsers.length} user record${allUsers.length === 1 ? "" : "s"}.`
                : "No users are available yet. The dashboard will populate once accounts are created.",
            allUsers.length ? "success" : ""
        );
    } catch (error) {
        renderAdminSummary([]);
        renderAdminTable([], "The admin user table could not be loaded.");
        renderAdminChart([], "The follow-through chart could not be loaded.");

        const normalizedMessage = normalizeText(error?.message || error?.details || "");
        const isMissingRpc =
            normalizedMessage.includes("get_admin_dashboard_users") ||
            normalizedMessage.includes("could not find the function");

        setStatusMessage(
            "admin-page-status",
            isMissingRpc
                ? "Admin data access is not available yet. Apply the latest Supabase migration, then reload this page."
                : error?.message || "We could not load the admin dashboard right now.",
            "error"
        );
        tableStatus.textContent = "The admin user table could not be loaded.";
    }
}

function setInlineStatus(id, message, type = "") {
    const element = document.getElementById(id);
    if (!element) {
        return;
    }

    element.textContent = message || "";
    element.className = "inline-status";

    if (type) {
        element.classList.add(`is-${type}`);
    }
}

function normalizeOtpValue(value) {
    return String(value || "")
        .replace(/\D/g, "")
        .slice(0, OTP_LENGTH);
}

function generateOtpCode() {
    return String(Math.floor(100000 + Math.random() * 900000));
}

function normalizeOtpTarget(type, value) {
    return type === "phone" ? normalizePhone(value) : normalizeText(value);
}

function normalizePhoneOtpTarget(value) {
    const compactValue = String(value || "")
        .trim()
        .replace(/[\s().-]/g, "");

    return /^\+[1-9]\d{7,14}$/.test(compactValue) ? compactValue : "";
}

function isOtpVerifiedForValue(otpRecord, value, type = "email") {
    return Boolean(
        otpRecord &&
            otpRecord.verified &&
            normalizeOtpTarget(type, otpRecord.sentTo) === normalizeOtpTarget(type, value)
    );
}

function getOtpSendErrorMessage(error, type) {
    const fallbackMessage = `We could not send the ${type} OTP. Please try again.`;
    const rawMessage = String(error?.message || "").trim();
    const message =
        rawMessage && rawMessage !== "{}" && rawMessage !== "[object Object]" ? rawMessage : fallbackMessage;
    const normalizedMessage = message.toLowerCase();
    const normalizedDetails = String(error?.details || "").toLowerCase();
    const statusCode = Number(error?.status);

    if (normalizedMessage.includes("rate limit")) {
        return `Please wait before requesting another ${type} OTP.`;
    }

    if (
        statusCode === 504 ||
        normalizedMessage.includes("gateway timeout") ||
        normalizedMessage.includes("504") ||
        normalizedDetails.includes("gateway timeout")
    ) {
        return `Supabase timed out while sending the ${type} OTP. This is usually an email or SMTP delivery issue on the Supabase side, not your login session. Wait a moment and try again.`;
    }

    if (type === "email" && normalizedMessage.includes("not authorized")) {
        return "Supabase blocked that email send. Add custom SMTP or use an authorized team email while testing.";
    }

    if (type === "phone" && (normalizedMessage.includes("provider") || normalizedMessage.includes("sms"))) {
        return "Configure a phone auth provider in Supabase before sending SMS OTPs.";
    }

    return message;
}

function getOtpVerifyErrorMessage(error, type) {
    const fallbackMessage = `We could not verify that ${type} OTP. Please try again.`;
    const rawMessage = String(error?.message || "").trim();
    const message =
        rawMessage && rawMessage !== "{}" && rawMessage !== "[object Object]" ? rawMessage : fallbackMessage;
    const normalizedMessage = message.toLowerCase();
    const normalizedDetails = String(error?.details || "").toLowerCase();
    const statusCode = Number(error?.status);

    if (normalizedMessage.includes("expired") || normalizedMessage.includes("invalid")) {
        return "That OTP is invalid or has expired. Send a new code and try again.";
    }

    if (normalizedMessage.includes("rate limit")) {
        return "Too many verification attempts. Please wait a moment and try again.";
    }

    if (
        statusCode === 504 ||
        normalizedMessage.includes("gateway timeout") ||
        normalizedMessage.includes("504") ||
        normalizedDetails.includes("gateway timeout")
    ) {
        return `Supabase timed out while verifying the ${type} OTP. Wait a moment, request a new code, and try again.`;
    }

    return message;
}

function getVerificationCropOutputConfig(targetField) {
    if (targetField === "id-photo") {
        return {
            aspectRatio: 1.586,
            width: 1200,
            height: 757,
            title: "Crop your ID photo",
            note: "Position the full ID inside the crop frame with all details visible."
        };
    }

    return {
        aspectRatio: 1,
        width: 1080,
        height: 1080,
        title: "Crop your selfie",
        note: "Center your face inside the crop frame before saving the image."
    };
}

function loadImageFromFile(file) {
    return new Promise((resolve, reject) => {
        const objectUrl = URL.createObjectURL(file);
        const image = new Image();

        image.onload = () => {
            URL.revokeObjectURL(objectUrl);
            resolve(image);
        };

        image.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error("We could not read that image."));
        };

        image.src = objectUrl;
    });
}

function createFileFromCanvas(canvas, fileName) {
    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => {
                if (!blob) {
                    reject(new Error("We could not prepare the cropped image."));
                    return;
                }

                resolve(new File([blob], fileName, { type: "image/jpeg" }));
            },
            "image/jpeg",
            0.92
        );
    });
}

function getSellerImageComparisonHook() {
    if (typeof window.compareSellerVerificationImages === "function") {
        return window.compareSellerVerificationImages;
    }

    if (typeof window.veriTradeCompareSellerImages === "function") {
        return window.veriTradeCompareSellerImages;
    }

    return null;
}

function getSellerVerificationOutcome(verificationResult) {
    const normalizedResult = normalizeDemoVerificationResult(verificationResult);
    const fallbackResult = simulateVerification();
    const safeResult = normalizedResult || fallbackResult;
    const isVerified = safeResult.status === "verified";

    return {
        ...safeResult,
        statusLabel: isVerified ? "Verified" : "Needs Review",
        trustScore: safeResult.total_score,
        isRegisteredSeller: isVerified,
        purchaseConfidenceScore: safeResult.total_score,
        message: isVerified
            ? `Demo facial match complete at ${safeResult.match_percentage}%. Identity marked as verified.`
            : `Demo facial match complete at ${safeResult.match_percentage}%. Identity needs review.`
    };
}

function createVerificationImageController(prefix, onStateChange) {
    const modal = document.getElementById(`${prefix}-crop-modal`);
    const canvas = document.getElementById(`${prefix}-crop-canvas`);
    const titleElement = document.getElementById(`${prefix}-crop-modal-title`);
    const noteElement = document.getElementById(`${prefix}-crop-modal-note`);
    const cancelButton = document.getElementById(`${prefix}-crop-cancel`);
    const uploadButton = document.getElementById(`${prefix}-crop-upload`);
    const cameraButton = document.getElementById(`${prefix}-crop-camera`);
    const resetButton = document.getElementById(`${prefix}-crop-reset`);
    const saveButton = document.getElementById(`${prefix}-crop-save`);

    if (
        !modal ||
        !canvas ||
        !titleElement ||
        !noteElement ||
        !cancelButton ||
        !uploadButton ||
        !cameraButton ||
        !resetButton ||
        !saveButton
    ) {
        return {
            getFile() {
                return null;
            },
            openModalForTarget() {
                return;
            },
            clearAll() {
                return;
            }
        };
    }

    const context = canvas.getContext("2d");
    const state = {
        activeField: null,
        image: null,
        sourceFile: null,
        aspectRatio: 1,
        outputWidth: 1080,
        outputHeight: 1080,
        baseScale: 1,
        offsetX: 0,
        offsetY: 0,
        dragPointerId: null,
        dragLastX: 0,
        dragLastY: 0,
        selectedFiles: {
            selfie: null,
            "id-photo": null
        },
        previewUrls: {
            selfie: null,
            "id-photo": null
        }
    };

    function getPreviewElements(targetField) {
        return {
            thumb: document.getElementById(`${prefix}-${targetField}-preview-thumb`),
            name: document.getElementById(`${prefix}-${targetField}-file-name`),
            note: document.getElementById(`${prefix}-${targetField}-preview-note`)
        };
    }

    function updatePreview(targetField, file) {
        const preview = getPreviewElements(targetField);
        if (!preview.thumb || !preview.name || !preview.note) {
            return;
        }

        const previewCard = document.getElementById(`${prefix}-${targetField}-preview-card`);

        if (state.previewUrls[targetField]) {
            URL.revokeObjectURL(state.previewUrls[targetField]);
            state.previewUrls[targetField] = null;
        }

        if (!file) {
            if (previewCard) {
                previewCard.hidden = true;
            }
            preview.thumb.style.backgroundImage = "";
            preview.thumb.classList.add("is-empty");
            preview.name.textContent =
                targetField === "selfie" ? "No selfie selected" : "No ID photo selected";
            preview.note.textContent =
                targetField === "selfie"
                    ? "A cropped selfie preview will appear here."
                    : "A cropped ID preview will appear here.";
            return;
        }

        const previewUrl = URL.createObjectURL(file);
        state.previewUrls[targetField] = previewUrl;
        if (previewCard) {
            previewCard.hidden = false;
        }
        preview.thumb.style.backgroundImage = `url("${previewUrl}")`;
        preview.thumb.classList.remove("is-empty");
        preview.name.textContent = file.name;
        preview.note.textContent = "Cropped image ready for submission.";
    }

    function getCropFrame() {
        const padding = 42;
        const maxWidth = canvas.width - padding * 2;
        const maxHeight = canvas.height - padding * 2;
        let frameWidth = maxWidth;
        let frameHeight = frameWidth / state.aspectRatio;

        if (frameHeight > maxHeight) {
            frameHeight = maxHeight;
            frameWidth = frameHeight * state.aspectRatio;
        }

        return {
            width: frameWidth,
            height: frameHeight,
            x: (canvas.width - frameWidth) / 2,
            y: (canvas.height - frameHeight) / 2
        };
    }

    function constrainOffsets() {
        if (!state.image) {
            return;
        }

        const frame = getCropFrame();
        const scaledWidth = state.image.width * state.baseScale;
        const scaledHeight = state.image.height * state.baseScale;
        const maxOffsetX = Math.max(0, (scaledWidth - frame.width) / 2);
        const maxOffsetY = Math.max(0, (scaledHeight - frame.height) / 2);

        state.offsetX = Math.max(-maxOffsetX, Math.min(maxOffsetX, state.offsetX));
        state.offsetY = Math.max(-maxOffsetY, Math.min(maxOffsetY, state.offsetY));
    }

    function drawCropCanvas() {
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = "#0b1e31";
        context.fillRect(0, 0, canvas.width, canvas.height);

        if (!state.image) {
            context.fillStyle = "rgba(255, 255, 255, 0.85)";
            context.font = "600 22px Segoe UI";
            context.textAlign = "center";
            context.fillText("Choose an image to start cropping.", canvas.width / 2, canvas.height / 2);
            return;
        }

        const frame = getCropFrame();
        const scaledWidth = state.image.width * state.baseScale;
        const scaledHeight = state.image.height * state.baseScale;
        const drawX = canvas.width / 2 - scaledWidth / 2 + state.offsetX;
        const drawY = canvas.height / 2 - scaledHeight / 2 + state.offsetY;

        context.drawImage(state.image, drawX, drawY, scaledWidth, scaledHeight);

        context.fillStyle = "rgba(5, 18, 33, 0.62)";
        context.fillRect(0, 0, canvas.width, frame.y);
        context.fillRect(0, frame.y, frame.x, frame.height);
        context.fillRect(frame.x + frame.width, frame.y, canvas.width - (frame.x + frame.width), frame.height);
        context.fillRect(0, frame.y + frame.height, canvas.width, canvas.height - (frame.y + frame.height));

        context.strokeStyle = "#7FE4D4";
        context.lineWidth = 3;
        context.strokeRect(frame.x, frame.y, frame.width, frame.height);

        context.strokeStyle = "rgba(255, 255, 255, 0.45)";
        context.lineWidth = 1;
        context.beginPath();
        context.moveTo(frame.x + frame.width / 3, frame.y);
        context.lineTo(frame.x + frame.width / 3, frame.y + frame.height);
        context.moveTo(frame.x + (frame.width / 3) * 2, frame.y);
        context.lineTo(frame.x + (frame.width / 3) * 2, frame.y + frame.height);
        context.moveTo(frame.x, frame.y + frame.height / 3);
        context.lineTo(frame.x + frame.width, frame.y + frame.height / 3);
        context.moveTo(frame.x, frame.y + (frame.height / 3) * 2);
        context.lineTo(frame.x + frame.width, frame.y + (frame.height / 3) * 2);
        context.stroke();
    }

    function resetCropPosition() {
        if (!state.image) {
            return;
        }

        const frame = getCropFrame();
        state.baseScale = Math.max(frame.width / state.image.width, frame.height / state.image.height);
        state.offsetX = 0;
        state.offsetY = 0;
        constrainOffsets();
        drawCropCanvas();
    }

    function closeModal() {
        modal.hidden = true;
        state.image = null;
        state.sourceFile = null;
        state.dragPointerId = null;
        drawCropCanvas();
    }

    function openModalForTarget(targetField) {
        const cropConfig = getVerificationCropOutputConfig(targetField);
        state.activeField = targetField;
        state.aspectRatio = cropConfig.aspectRatio;
        state.outputWidth = cropConfig.width;
        state.outputHeight = cropConfig.height;
        titleElement.textContent = cropConfig.title;
        noteElement.textContent = cropConfig.note;
        modal.hidden = false;
        state.image = null;
        state.sourceFile = null;
        state.offsetX = 0;
        state.offsetY = 0;
        drawCropCanvas();
    }

    async function openModalForFile(file, targetField) {
        openModalForTarget(targetField);
        state.image = await loadImageFromFile(file);
        state.sourceFile = file;
        resetCropPosition();
    }

    async function handleInputFile(file, targetField) {
        if (!file) {
            return;
        }

        try {
            await openModalForFile(file, targetField);
        } catch (error) {
            showAlert(error.message || "We could not load that image.");
        }
    }

    async function saveCropSelection() {
        if (!state.image || !state.activeField) {
            return;
        }

        const frame = getCropFrame();
        const scaledWidth = state.image.width * state.baseScale;
        const scaledHeight = state.image.height * state.baseScale;
        const drawX = canvas.width / 2 - scaledWidth / 2 + state.offsetX;
        const drawY = canvas.height / 2 - scaledHeight / 2 + state.offsetY;
        const sourceX = (frame.x - drawX) / state.baseScale;
        const sourceY = (frame.y - drawY) / state.baseScale;
        const sourceWidth = frame.width / state.baseScale;
        const sourceHeight = frame.height / state.baseScale;
        const outputCanvas = document.createElement("canvas");

        outputCanvas.width = state.outputWidth;
        outputCanvas.height = state.outputHeight;

        outputCanvas
            .getContext("2d")
            .drawImage(
                state.image,
                sourceX,
                sourceY,
                sourceWidth,
                sourceHeight,
                0,
                0,
                outputCanvas.width,
                outputCanvas.height
            );

        const safeName = state.sourceFile?.name?.replace(/\.[^.]+$/, "") || state.activeField;
        const croppedFile = await createFileFromCanvas(outputCanvas, `${safeName}-cropped.jpg`);

        state.selectedFiles[state.activeField] = croppedFile;
        updatePreview(state.activeField, croppedFile);
        closeModal();

        if (typeof onStateChange === "function") {
            onStateChange();
        }
    }

    canvas.addEventListener("pointerdown", (event) => {
        if (!state.image) {
            return;
        }

        state.dragPointerId = event.pointerId;
        state.dragLastX = event.clientX;
        state.dragLastY = event.clientY;
        canvas.setPointerCapture(event.pointerId);
    });

    canvas.addEventListener("pointermove", (event) => {
        if (state.dragPointerId !== event.pointerId || !state.image) {
            return;
        }

        state.offsetX += event.clientX - state.dragLastX;
        state.offsetY += event.clientY - state.dragLastY;
        state.dragLastX = event.clientX;
        state.dragLastY = event.clientY;
        constrainOffsets();
        drawCropCanvas();
    });

    function stopDragging(event) {
        if (state.dragPointerId !== event.pointerId) {
            return;
        }

        canvas.releasePointerCapture(event.pointerId);
        state.dragPointerId = null;
    }

    canvas.addEventListener("pointerup", stopDragging);
    canvas.addEventListener("pointercancel", stopDragging);

    cancelButton.addEventListener("click", closeModal);
    uploadButton.addEventListener("click", () => {
        if (!state.activeField) {
            return;
        }

        const input = document.getElementById(`${prefix}-${state.activeField}-upload`);
        if (input) {
            input.click();
        }
    });
    cameraButton.addEventListener("click", () => {
        if (!state.activeField) {
            return;
        }

        const input = document.getElementById(`${prefix}-${state.activeField}-camera`);
        if (input) {
            input.click();
        }
    });
    resetButton.addEventListener("click", resetCropPosition);
    saveButton.addEventListener("click", () => {
        saveCropSelection().catch((error) => {
            showAlert(error.message || "We could not save that cropped image.");
        });
    });

    modal.addEventListener("click", (event) => {
        if (event.target === modal) {
            closeModal();
        }
    });

    ["selfie", "id-photo"].forEach((targetField) => {
        ["camera", "upload"].forEach((sourceType) => {
            const input = document.getElementById(`${prefix}-${targetField}-${sourceType}`);
            if (!input) {
                return;
            }

            input.addEventListener("change", async (event) => {
                const selectedFile = event.target.files?.[0];
                event.target.value = "";
                await handleInputFile(selectedFile, targetField);
            });
        });

        updatePreview(targetField, null);
    });

    drawCropCanvas();

    return {
        getFile(targetField) {
            return state.selectedFiles[targetField] || null;
        },
        openModalForTarget,
        clearAll() {
            Object.keys(state.selectedFiles).forEach((targetField) => {
                state.selectedFiles[targetField] = null;
                updatePreview(targetField, null);
            });

            if (typeof onStateChange === "function") {
                onStateChange();
            }
        }
    };
}

function createSellerImageController(onStateChange) {
    return createVerificationImageController("seller", onStateChange);
}

function createBuyerImageController(onStateChange) {
    return createVerificationImageController("buyer", onStateChange);
}

async function initUserPage(session, initialProfile) {
    const { profile, sellerProfile, purchases, historyList, snapshot } = await collectUserSnapshot(
        session.user.id,
        initialProfile
    );
    const displayProfile = getDisplayProfile(profile, session.user);

    await upsertAnalyticsSnapshot(session.user.id, snapshot);

    const linkedMarketplaces = Array.isArray(displayProfile.linked_marketplaces) ? displayProfile.linked_marketplaces : [];

    setStatValue("stat-trust-checks", snapshot.trustChecksRun ? String(snapshot.trustChecksRun) : EMPTY_LABEL);
    setStatValue(
        "stat-sellers-monitored",
        snapshot.sellersMonitored ? String(snapshot.sellersMonitored) : EMPTY_LABEL
    );
    setStatValue("stat-profile-completion", `${snapshot.profileCompletion}%`);
    setStatValue("stat-history-records", snapshot.historyRecords ? String(snapshot.historyRecords) : EMPTY_LABEL);

    setTextContent("profile-full-name", displayProfile.full_name || EMPTY_LABEL);
    setTextContent("profile-username", displayProfile.username || EMPTY_LABEL);
    setTextContent("profile-email", displayProfile.auth_email || EMPTY_LABEL);
    setTextContent("profile-registered-seller", getSellerRegistrationBadge(sellerProfile));
    setTextContent(
        "profile-verification-status",
        sellerProfile?.seller_verification_status || EMPTY_LABEL
    );
    setTextContent(
        "profile-linked-marketplaces",
        linkedMarketplaces.length ? linkedMarketplaces.join(", ") : EMPTY_LABEL
    );

    setMetric("metric-profile-completion", snapshot.profileCompletion);
    setMetric("metric-otp-success", snapshot.otpConfirmationSuccess);
    setMetric("metric-match-rate", snapshot.matchedSellerDetailRate);
    setMetric("metric-feedback", snapshot.positiveFeedbackTrend);

    renderHistoryList(historyList);
    renderUserPurchaseAnalytics(purchases);
    renderPurchaseList(purchases);
    initUserSearch();
    bindPurchaseActions(session.user.id);
}

async function initSellerPage(session, initialProfile) {
    const form = document.getElementById("seller-profile-form");
    if (!form) {
        return;
    }

    let currentAuthUser = session.user;
    const profile = initialProfile || getBaseProfileFromUser(currentAuthUser);
    const existingSellerProfile = await fetchSellerProfile(session.user.id);
    const fullNameInput = document.getElementById("seller-full-name");
    const emailInput = document.getElementById("seller-email");
    const phoneInput = document.getElementById("seller-phone");
    const socialHandleInput = document.getElementById("seller-social-handle");
    const emailOtpInput = document.getElementById("seller-email-otp");
    const phoneOtpInput = document.getElementById("seller-phone-otp");
    const addressStreetInput = document.getElementById("seller-address-street");
    const addressCityInput = document.getElementById("seller-address-city");
    const addressProvinceInput = document.getElementById("seller-address-province");
    const addressPostalCodeInput = document.getElementById("seller-address-postal-code");
    const submitButton = document.getElementById("seller-submit-btn");
    const emailOtpSendButton = document.getElementById("seller-email-otp-send");
    const phoneOtpSendButton = document.getElementById("seller-phone-otp-send");
    const selfieActivateButton = document.getElementById("seller-selfie-activate-btn");
    const idActivateButton = document.getElementById("seller-id-photo-activate-btn");
    const verifyIdentityButton = document.getElementById("seller-verify-identity-btn");
    const rerunVerificationButton = document.getElementById("seller-rerun-verification-btn");
    const verificationStatusPill = document.getElementById("seller-verification-status-pill");
    const verificationIdState = document.getElementById("seller-verification-id-state");
    const verificationSelfieState = document.getElementById("seller-verification-selfie-state");
    const verificationMatchState = document.getElementById("seller-verification-match-state");
    const verificationBreakdownScore = document.getElementById("seller-verification-breakdown-score");
    const verificationTotalScore = document.getElementById("seller-verification-total-score");
    const verificationStatusText = document.getElementById("seller-verification-status-text");
    const verificationProgressText = document.getElementById("seller-verification-progress-text");
    const verificationLoadingText = document.getElementById("seller-verification-loading-text");
    const verificationScoreFill = document.getElementById("seller-verification-score-fill");
    const initialEmailValue = currentAuthUser.email || profile.auth_email || existingSellerProfile?.email || "";
    const initialPhoneValue = profile.phone_number || existingSellerProfile?.phone || currentAuthUser.phone || "";
    const selectedPlatforms = Array.isArray(existingSellerProfile?.selling_platforms)
        ? existingSellerProfile.selling_platforms
        : Array.isArray(profile?.linked_marketplaces)
            ? profile.linked_marketplaces
            : [];
    const verificationState = {
        result: null,
        isLoading: false,
        helperMessage: ""
    };
    const otpState = {
        email: {
            sentTo: initialEmailValue,
            verified: Boolean(
                currentAuthUser.email_confirmed_at &&
                    normalizeOtpTarget("email", currentAuthUser.email) === normalizeOtpTarget("email", initialEmailValue)
            ),
            hasSentCode: false,
            sendInFlight: false,
            verifyInFlight: false
        },
        phone: {
            code: null,
            sentTo: initialPhoneValue,
            verified: Boolean(
                currentAuthUser.phone_confirmed_at &&
                    normalizeOtpTarget("phone", currentAuthUser.phone) === normalizeOtpTarget("phone", initialPhoneValue)
            ),
            hasSentCode: false,
            sendInFlight: false,
            verifyInFlight: false
        }
    };
    const imageController = createSellerImageController(handleSellerImageChange);

    fullNameInput.value =
        existingSellerProfile?.full_name || profile.full_name || currentAuthUser.user_metadata?.full_name || "";
    emailInput.value = initialEmailValue;
    phoneInput.value = initialPhoneValue;
    socialHandleInput.value = "";
    addressStreetInput.value = "";
    addressCityInput.value = "";
    addressProvinceInput.value = "";
    addressPostalCodeInput.value = "";

    otpState.email.hasSentCode = otpState.email.verified;
    otpState.phone.hasSentCode = otpState.phone.verified;

    if (otpState.email.verified) {
        setInlineStatus("seller-email-otp-status", "Email already verified on your account.", "success");
        emailOtpInput.value = "000000";
        emailOtpSendButton.textContent = "Resend OTP";
    }

    if (otpState.phone.verified) {
        setInlineStatus("seller-phone-otp-status", "Phone already verified on your account.", "success");
        phoneOtpInput.value = "000000";
        phoneOtpSendButton.textContent = "Resend OTP";
    }

    document.querySelectorAll('input[name="seller-selling-platform"]').forEach((input) => {
        input.checked = selectedPlatforms.includes(input.value);
    });

    renderSellerStatusSummary(existingSellerProfile, session.user);

    async function refreshCurrentAuthUser() {
        if (!supabaseClient) {
            return currentAuthUser;
        }

        const {
            data: { user }
        } = await supabaseClient.auth.getUser();

        if (user) {
            currentAuthUser = user;
        }

        return currentAuthUser;
    }

    function isAuthContactVerified(type, value) {
        if (!currentAuthUser) {
            return false;
        }

        if (type === "email") {
            return Boolean(
                currentAuthUser.email_confirmed_at &&
                    normalizeOtpTarget("email", currentAuthUser.email) === normalizeOtpTarget("email", value)
            );
        }

        return Boolean(
            currentAuthUser.phone_confirmed_at &&
                normalizeOtpTarget("phone", currentAuthUser.phone) === normalizeOtpTarget("phone", value)
        );
    }

    function getOtpTargetValue(type) {
        if (type === "email") {
            return emailInput.value.trim().toLowerCase();
        }

        return phoneInput.value.trim();
    }

    async function sendOtp(type) {
        const statusId = type === "email" ? "seller-email-otp-status" : "seller-phone-otp-status";
        const otpInput = type === "email" ? emailOtpInput : phoneOtpInput;
        const sendButton = type === "email" ? emailOtpSendButton : phoneOtpSendButton;
        const label = type === "email" ? "email address" : "phone number";
        const targetValue = getOtpTargetValue(type);

        if (!targetValue) {
            setInlineStatus(
                statusId,
                type === "email"
                    ? "Enter your email first so we know where to send the OTP."
                    : "Enter your phone first so we know where to send the OTP.",
                "error"
            );
            return;
        }

        if (type === "phone") {
            otpState.phone.code = generateOtpCode();
            otpState.phone.sentTo = targetValue;
            otpState.phone.verified = false;
            otpState.phone.hasSentCode = true;
            otpState.phone.sendInFlight = false;
            otpState.phone.verifyInFlight = false;
            phoneInput.value = targetValue;
            phoneOtpInput.value = "";
            setInlineStatus(statusId, "OTP sent to your phone number. Enter the 6-digit code to verify it.", "success");
            phoneOtpSendButton.textContent = "Resend OTP";
            showAlert(`Demo phone OTP: ${otpState.phone.code}`);
            updateSubmitState();
            return;
        }

        setInlineStatus(statusId, `Sending OTP to your ${label}...`);
        otpState[type].verified = false;
        otpState[type].hasSentCode = false;
        otpState[type].sentTo = targetValue;
        otpState[type].sendInFlight = true;
        otpState[type].verifyInFlight = false;
        otpInput.value = "";
        sendButton.disabled = true;
        updateSubmitState();

        try {
            if (type === "email") {
                const emailOtpClient = getSupabaseOtpClient() || supabaseClient;
                const { error } = await emailOtpClient.auth.signInWithOtp({
                    email: targetValue,
                    options: {
                        shouldCreateUser: false
                    }
                });

                if (error) {
                    throw error;
                }
            } else {
                if (isAuthContactVerified("phone", targetValue)) {
                    otpState.phone.verified = true;
                    otpState.phone.hasSentCode = true;
                    phoneOtpInput.value = "000000";
                    setInlineStatus(statusId, "Phone already verified on your account.", "success");
                    updateSubmitState();
                    return;
                }

                const { data, error } = await supabaseClient.auth.updateUser({
                    phone: targetValue
                });

                if (error) {
                    throw error;
                }

                if (data?.user) {
                    currentAuthUser = data.user;
                }
            }

            otpState[type].hasSentCode = true;
            setInlineStatus(statusId, `OTP sent to your ${label}. Enter the 6-digit code to verify it.`, "success");
            sendButton.textContent = "Resend OTP";
            otpInput.focus();
        } catch (error) {
            setInlineStatus(statusId, getOtpSendErrorMessage(error, type), "error");
        } finally {
            otpState[type].sendInFlight = false;
            sendButton.disabled = false;
            updateSubmitState();
        }
    }

    function validateOtpField(type, showErrors = false) {
        const otpInput = type === "email" ? emailOtpInput : phoneOtpInput;
        const targetValue = type === "email" ? emailInput.value.trim().toLowerCase() : phoneInput.value.trim();
        const statusId = type === "email" ? "seller-email-otp-status" : "seller-phone-otp-status";
        const enteredCode = normalizeOtpValue(otpInput.value);

        otpInput.value = enteredCode;

        if (isOtpVerifiedForValue(otpState[type], targetValue, type)) {
            setInlineStatus(statusId, `${type === "email" ? "Email" : "Phone"} OTP verified.`, "success");
            return true;
        }

        if (otpState[type].verifyInFlight) {
            if (showErrors) {
                setInlineStatus(statusId, `Verifying your ${type} OTP...`);
            }
            return false;
        }

        if (
            !otpState[type].hasSentCode ||
            normalizeOtpTarget(type, otpState[type].sentTo) !== normalizeOtpTarget(type, targetValue)
        ) {
            otpState[type].verified = false;
            if (showErrors) {
                setInlineStatus(statusId, `Send an OTP to verify your ${type}.`, "error");
            }
            return false;
        }

        if (enteredCode.length !== OTP_LENGTH) {
            otpState[type].verified = false;
            if (showErrors) {
                setInlineStatus(statusId, `Enter the full ${OTP_LENGTH}-digit OTP.`, "error");
            }
            return false;
        }

        if (type === "phone") {
            if (enteredCode === otpState.phone.code) {
                otpState.phone.verified = true;
                setInlineStatus(statusId, "Phone OTP verified.", "success");
                return true;
            }

            otpState.phone.verified = false;
            if (showErrors) {
                setInlineStatus(statusId, "That OTP code does not match. Use resend and try again.", "error");
            }
            return false;
        }

        otpState[type].verified = false;
        return false;
    }

    function resetOtpVerification(type, message) {
        otpState[type].verified = false;
        otpState[type].code = null;
        otpState[type].hasSentCode = false;
        otpState[type].sendInFlight = false;
        otpState[type].verifyInFlight = false;
        otpState[type].sentTo = type === "email" ? emailInput.value.trim().toLowerCase() : phoneInput.value.trim();
        const otpInput = type === "email" ? emailOtpInput : phoneOtpInput;
        otpInput.value = "";
        setInlineStatus(type === "email" ? "seller-email-otp-status" : "seller-phone-otp-status", message);
    }

    async function verifyOtpCode(type) {
        const otpInput = type === "email" ? emailOtpInput : phoneOtpInput;
        const targetValue = type === "email" ? emailInput.value.trim().toLowerCase() : phoneInput.value.trim();
        const statusId = type === "email" ? "seller-email-otp-status" : "seller-phone-otp-status";
        const enteredCode = normalizeOtpValue(otpInput.value);

        otpInput.value = enteredCode;

        if (validateOtpField(type)) {
            return true;
        }

        if (type === "phone") {
            if (enteredCode.length !== OTP_LENGTH || !otpState.phone.hasSentCode) {
                return false;
            }

            if (enteredCode === otpState.phone.code) {
                otpState.phone.verified = true;
                setInlineStatus(statusId, "Phone OTP verified.", "success");
                updateSubmitState();
                return true;
            }

            otpState.phone.verified = false;
            setInlineStatus(statusId, "That OTP code does not match. Use resend and try again.", "error");
            updateSubmitState();
            return false;
        }

        if (enteredCode.length !== OTP_LENGTH || otpState[type].verifyInFlight || !otpState[type].hasSentCode) {
            return false;
        }

        otpState[type].verifyInFlight = true;
        setInlineStatus(statusId, `Verifying your ${type} OTP...`);
        updateSubmitState();

        try {
            const authClient = type === "email" ? getSupabaseOtpClient() || supabaseClient : supabaseClient;
            const { data, error } = await authClient.auth.verifyOtp(
                type === "email"
                    ? {
                          email: targetValue,
                          token: enteredCode,
                          type: "email"
                      }
                    : {
                          phone: otpState[type].sentTo,
                          token: enteredCode,
                          type: "phone_change"
                      }
            );

            if (error) {
                throw error;
            }

            otpState[type].verified = true;

            if (type === "phone") {
                if (data?.user) {
                    currentAuthUser = data.user;
                } else {
                    await refreshCurrentAuthUser();
                }

                if (currentAuthUser?.phone) {
                    otpState.phone.sentTo = currentAuthUser.phone;
                    phoneInput.value = currentAuthUser.phone;
                }
            }

            setInlineStatus(statusId, `${type === "email" ? "Email" : "Phone"} OTP verified.`, "success");
            updateSubmitState();
            return true;
        } catch (error) {
            otpState[type].verified = false;
            setInlineStatus(statusId, getOtpVerifyErrorMessage(error, type), "error");
            return false;
        } finally {
            otpState[type].verifyInFlight = false;
            updateSubmitState();
        }
    }

    function getSellerAddressValue() {
        const street = addressStreetInput.value.trim();
        const city = addressCityInput.value.trim();
        const province = addressProvinceInput.value.trim();
        const postalCode = addressPostalCodeInput.value.trim();

        return {
            street,
            city,
            province,
            postalCode,
            formatted: [street, city, province, postalCode].filter(Boolean).join(", ")
        };
    }

    function setSellerVerificationPill(status) {
        if (!verificationStatusPill) {
            return;
        }

        verificationStatusPill.className = "result-pill";

        if (status === "verified") {
            verificationStatusPill.classList.add("low-pill");
            verificationStatusPill.textContent = "Verified";
            return;
        }

        if (status === "review") {
            verificationStatusPill.classList.add("medium-pill");
            verificationStatusPill.textContent = "Needs Review";
            return;
        }

        if (status === "loading") {
            verificationStatusPill.classList.add("neutral-pill");
            verificationStatusPill.textContent = "Verifying";
            return;
        }

        verificationStatusPill.classList.add("neutral-pill");
        verificationStatusPill.textContent = "Not verified";
    }

    function renderSellerVerificationState() {
        const hasIdPhoto = Boolean(imageController.getFile("id-photo"));
        const hasSelfiePhoto = Boolean(imageController.getFile("selfie"));
        const verificationResult = verificationState.result;
        const hasVerification = Boolean(verificationResult);

        if (verificationIdState) {
            verificationIdState.textContent = hasIdPhoto ? "ID Uploaded: complete" : "ID upload pending";
        }

        if (verificationSelfieState) {
            verificationSelfieState.textContent = hasSelfiePhoto ? "Selfie Captured: complete" : "Selfie upload pending";
        }

        if (verificationMatchState) {
            verificationMatchState.textContent = hasVerification
                ? `Facial Match: ${verificationResult.match_percentage}%`
                : "Facial match: -";
        }

        if (verificationBreakdownScore) {
            verificationBreakdownScore.textContent = hasVerification
                ? `${verificationResult.id_selfie_score.toFixed(1)} / 40`
                : "0 / 40";
        }

        if (verificationTotalScore) {
            verificationTotalScore.textContent = hasVerification
                ? `${verificationResult.total_score.toFixed(1)} / 100`
                : "0 / 100";
        }

        if (verificationStatusText) {
            verificationStatusText.textContent = hasVerification
                ? verificationResult.status === "verified"
                    ? "Status: Verified"
                    : "Status: Needs Review"
                : "Upload both images and run the check.";
        }

        if (verificationScoreFill) {
            verificationScoreFill.style.width = hasVerification
                ? `${Math.max(0, Math.min(100, verificationResult.total_score))}%`
                : "0%";
        }

        if (verificationProgressText && !verificationState.isLoading) {
            verificationProgressText.textContent = hasVerification
                ? verificationResult.message
                : verificationState.helperMessage ||
                    (hasIdPhoto && hasSelfiePhoto
                        ? "Both images are ready. Click Verify Identity to run the demo check."
                        : "Upload both images, then click Verify Identity.");
        }

        if (verificationLoadingText && !verificationState.isLoading) {
            verificationLoadingText.textContent = "";
        }

        setSellerVerificationPill(
            verificationState.isLoading
                ? "loading"
                : hasVerification
                    ? verificationResult.status
                    : "idle"
        );

        if (verifyIdentityButton) {
            verifyIdentityButton.disabled = !hasIdPhoto || !hasSelfiePhoto || verificationState.isLoading;
        }

        if (rerunVerificationButton) {
            rerunVerificationButton.disabled = !hasIdPhoto || !hasSelfiePhoto || verificationState.isLoading;
        }
    }

    function clearSellerVerification(message = "") {
        verificationState.result = null;
        verificationState.isLoading = false;
        verificationState.helperMessage = message;

        if (verificationLoadingText) {
            verificationLoadingText.textContent = "";
        }

        renderSellerVerificationState();
    }

    function handleSellerImageChange() {
        clearSellerVerification("Images updated. Verify identity again to calculate a new match score.");
        updateSubmitState();
    }

    function isFormReady() {
        const fullName = fullNameInput.value.trim();
        const email = emailInput.value.trim().toLowerCase();
        const phone = phoneInput.value.trim();
        const address = getSellerAddressValue();
        const marketplaces = getCheckedValues("seller-selling-platform");

        return Boolean(
            fullName &&
                email &&
                phone &&
                address.street &&
                address.city &&
                address.province &&
                address.postalCode &&
                marketplaces.length > 0 &&
                validateOtpField("email") &&
                validateOtpField("phone") &&
                imageController.getFile("selfie") &&
                imageController.getFile("id-photo") &&
                verificationState.result
        );
    }

    function updateSubmitState() {
        renderSellerVerificationState();
        if (submitButton) {
            submitButton.disabled = !isFormReady();
        }
    }

    emailOtpSendButton.addEventListener("click", () => {
        sendOtp("email").catch((error) => {
            setInlineStatus("seller-email-otp-status", getOtpSendErrorMessage(error, "email"), "error");
            otpState.email.sendInFlight = false;
            updateSubmitState();
        });
    });
    phoneOtpSendButton.addEventListener("click", () => {
        sendOtp("phone").catch((error) => {
            setInlineStatus("seller-phone-otp-status", getOtpSendErrorMessage(error, "phone"), "error");
            otpState.phone.sendInFlight = false;
            updateSubmitState();
        });
    });
    emailOtpInput.addEventListener("input", () => {
        validateOtpField("email");
        updateSubmitState();
        if (normalizeOtpValue(emailOtpInput.value).length === OTP_LENGTH) {
            verifyOtpCode("email").catch((error) => {
                otpState.email.verifyInFlight = false;
                setInlineStatus("seller-email-otp-status", getOtpVerifyErrorMessage(error, "email"), "error");
                updateSubmitState();
            });
        }
    });
    phoneOtpInput.addEventListener("input", () => {
        validateOtpField("phone");
        updateSubmitState();
        if (normalizeOtpValue(phoneOtpInput.value).length === OTP_LENGTH) {
            verifyOtpCode("phone").catch((error) => {
                otpState.phone.verifyInFlight = false;
                setInlineStatus("seller-phone-otp-status", getOtpVerifyErrorMessage(error, "phone"), "error");
                updateSubmitState();
            });
        }
    });
    phoneInput.addEventListener("input", () => {
        resetOtpVerification("phone", "Phone number changed. Send a new OTP to verify it.");
        updateSubmitState();
    });
    addressPostalCodeInput.addEventListener("input", () => {
        addressPostalCodeInput.value = addressPostalCodeInput.value.replace(/\D/g, "").slice(0, 4);
        updateSubmitState();
    });

    [
        fullNameInput,
        emailInput,
        socialHandleInput,
        addressStreetInput,
        addressCityInput,
        addressProvinceInput
    ].forEach((input) => {
        input.addEventListener("input", updateSubmitState);
    });
    addressProvinceInput.addEventListener("change", updateSubmitState);
    document.querySelectorAll('input[name="seller-selling-platform"]').forEach((input) => {
        input.addEventListener("change", updateSubmitState);
    });
    if (selfieActivateButton) {
        selfieActivateButton.addEventListener("click", () => {
            imageController.openModalForTarget("selfie");
        });
    }

    if (idActivateButton) {
        idActivateButton.addEventListener("click", () => {
            imageController.openModalForTarget("id-photo");
        });
    }

    async function runSellerIdentityVerification() {
        const selfieFile = imageController.getFile("selfie");
        const idPhotoFile = imageController.getFile("id-photo");

        if (!selfieFile || !idPhotoFile) {
            clearSellerVerification("Upload both images before running the identity check.");
            return;
        }

        verificationState.isLoading = true;
        verificationState.result = null;
        verificationState.helperMessage = "";
        renderSellerVerificationState();

        if (verificationProgressText) {
            verificationProgressText.textContent = "Verifying identity...";
        }

        if (verificationLoadingText) {
            verificationLoadingText.textContent = "";
        }

        await delay(700);

        if (verificationLoadingText) {
            verificationLoadingText.textContent = "Checking facial match...";
        }

        await delay(900);

        const demoVerificationResult = await requestDemoIdentityVerification(session, {
            selfieFile,
            idPhotoFile
        });
        const verificationOutcome = getSellerVerificationOutcome(demoVerificationResult);

        verificationState.result = verificationOutcome;
        verificationState.isLoading = false;
        verificationState.helperMessage = "";
        renderSellerVerificationState();
        await persistSellerIdentityVerification(session.user.id, demoVerificationResult);
        updateSubmitState();
    }

    if (verifyIdentityButton) {
        verifyIdentityButton.addEventListener("click", () => {
            runSellerIdentityVerification().catch(() => {
                verificationState.isLoading = false;
                clearSellerVerification("We could not complete the demo verification. Please try again.");
                updateSubmitState();
            });
        });
    }

    if (rerunVerificationButton) {
        rerunVerificationButton.addEventListener("click", () => {
            runSellerIdentityVerification().catch(() => {
                verificationState.isLoading = false;
                clearSellerVerification("We could not complete the demo verification. Please try again.");
                updateSubmitState();
            });
        });
    }

    updateSubmitState();

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const fullName = fullNameInput.value.trim();
        const email = emailInput.value.trim().toLowerCase();
        const phone = phoneInput.value.trim();
        const socialHandle = socialHandleInput.value.trim();
        const address = getSellerAddressValue();
        const sellingPlatforms = getCheckedValues("seller-selling-platform");
        const selfieFile = imageController.getFile("selfie");
        const idPhotoFile = imageController.getFile("id-photo");
        const requiredSellerInfoComplete =
            [fullName, email, phone, address.street, address.city, address.province, address.postalCode].every(Boolean) &&
            sellingPlatforms.length > 0;
        const otpReady = validateOtpField("email", true) && validateOtpField("phone", true);
        const imagesReady = Boolean(selfieFile && idPhotoFile);
        const verificationResult = verificationState.result;

        if (!requiredSellerInfoComplete || !otpReady || !imagesReady || !verificationResult) {
            setStatusMessage(
                "seller-save-status",
                "Complete every required field, verify both OTPs, select a marketplace, add both cropped images, and run Verify Identity before submitting.",
                "error"
            );
            updateSubmitState();
            return;
        }

        setStatusMessage("seller-save-status", "Submitting seller profile...", "");

        const updatedPublicProfile = {
            id: session.user.id,
            username: (profile.username || session.user.user_metadata?.username || "").toLowerCase(),
            full_name: fullName,
            auth_email: email,
            workspace_access: DEFAULT_WORKSPACE_ACCESS,
            phone_number: phone,
            marketplace_profile_link: null,
            linked_marketplaces: sellingPlatforms,
            otp_alerts: true
        };

        const { data: publicProfileData, error: publicProfileError } = await supabaseClient
            .from("profiles")
            .upsert(updatedPublicProfile, { onConflict: "id" })
            .select("*")
            .maybeSingle();

        if (publicProfileError) {
            setStatusMessage("seller-save-status", publicProfileError.message, "error");
            return;
        }

        const sellerProfilePayload = {
            user_id: session.user.id,
            full_name: fullName,
            email,
            phone,
            id_number: null,
            location: null,
            student_number: null,
            institution: null,
            selling_platforms: sellingPlatforms,
            platform_links: null,
            verification_notes: null,
            verification_documents: null,
            agreement_flags: null,
            seller_verification_status: verificationResult.statusLabel,
            seller_trust_score: verificationResult.trustScore,
            is_registered_seller: verificationResult.isRegisteredSeller,
            purchase_confidence_score: verificationResult.purchaseConfidenceScore,
            listed_products_count: existingSellerProfile?.listed_products_count || 0,
            completed_sales_count: existingSellerProfile?.completed_sales_count || 0
        };

        const { data: sellerProfileData, error: sellerProfileError } = await supabaseClient
            .from("seller_profiles")
            .upsert(sellerProfilePayload, { onConflict: "user_id" })
            .select("*")
            .maybeSingle();

        if (sellerProfileError) {
            setStatusMessage("seller-save-status", sellerProfileError.message, "error");
            return;
        }

        const savedPublicProfile = publicProfileData || updatedPublicProfile;
        const savedSellerProfile = sellerProfileData || sellerProfilePayload;

        renderSellerStatusSummary(savedSellerProfile, session.user);
        populateAccountNav(savedPublicProfile);

        await createHistoryEntry({
            userId: session.user.id,
            eventType: "profile",
            title: "Seller profile submitted",
            description: verificationResult.message
        });

        const { snapshot } = await collectUserSnapshot(session.user.id, savedPublicProfile);
        await upsertAnalyticsSnapshot(session.user.id, snapshot);

        setStatusMessage(
            "seller-save-status",
            verificationResult.isRegisteredSeller
                ? "Seller profile submitted successfully. Verification status: Verified."
                : `Seller profile submitted successfully. Verification status: ${verificationResult.statusLabel}.`,
            "success"
        );
        window.setTimeout(() => {
            window.location.href = getUserPageUrl(savedPublicProfile);
        }, 1200);
    });
}

async function findSellerMatches(criteria) {
    if (!supabaseClient) {
        return [];
    }

    const { data, error } = await supabaseClient.rpc("search_seller_matches", {
        p_username: criteria.seller_username_input || null,
        p_email: criteria.seller_email || null,
        p_phone: criteria.seller_phone || null,
        p_social_handle_url: criteria.social_handle_url || null,
        p_business_name: criteria.business_name || null,
        p_bank_account_holder_name: criteria.bank_account_holder_name || null,
        p_marketplace_profile_link: criteria.marketplace_profile_link || null
    });

    if (error || !Array.isArray(data)) {
        return [];
    }

    return data;
}

function compareSellerCandidate(criteria, candidate) {
    const comparisons = [
        {
            provided: normalizeText(criteria.seller_username_input),
            candidate: normalizeText(candidate.username)
        },
        {
            provided: normalizeText(criteria.seller_email),
            candidate: normalizeText(candidate.auth_email)
        },
        {
            provided: normalizePhone(criteria.seller_phone),
            candidate: normalizePhone(candidate.phone_number)
        },
        {
            provided: normalizeUrl(criteria.social_handle_url),
            candidate: normalizeUrl(candidate.social_handle_url)
        },
        {
            provided: normalizeText(criteria.business_name),
            candidate: normalizeText(candidate.business_name)
        },
        {
            provided: normalizeText(criteria.bank_account_holder_name),
            candidate: normalizeText(candidate.bank_account_holder_name)
        },
        {
            provided: normalizeUrl(criteria.marketplace_profile_link),
            candidate: normalizeUrl(candidate.marketplace_profile_link)
        }
    ].filter((entry) => entry.provided);

    const matchedCount = comparisons.filter((entry) => entry.provided === entry.candidate).length;
    const matchedDetailRate = comparisons.length
        ? clampPercent((matchedCount / comparisons.length) * 100)
        : 0;

    return {
        candidate,
        matchedCount,
        matchedDetailRate,
        comparableFields: comparisons.length
    };
}

function calculateTrustResult(criteria, matches) {
    const sellerDetailsProvided = [
        criteria.seller_username_input,
        criteria.seller_email,
        criteria.seller_phone,
        criteria.social_handle_url,
        criteria.business_name,
        criteria.bank_account_holder_name,
        criteria.marketplace_profile_link
    ].filter(Boolean).length;

    if (!sellerDetailsProvided) {
        return null;
    }

    const scoredMatches = matches.map((candidate) => compareSellerCandidate(criteria, candidate));
    const bestMatch = scoredMatches.sort((left, right) => {
        if (right.matchedCount !== left.matchedCount) {
            return right.matchedCount - left.matchedCount;
        }

        return right.matchedDetailRate - left.matchedDetailRate;
    })[0];

    const matchedDetailRate = bestMatch ? bestMatch.matchedDetailRate : 0;
    const matchedRegisteredUser = Boolean(bestMatch && bestMatch.matchedCount > 0);
    const trustScore = clampPercent(
        matchedDetailRate * 0.7 +
            (criteria.otp_confirmed ? 15 : 0) +
            (matchedRegisteredUser ? 15 : 0)
    );
    const riskCategory = getRiskCategory(trustScore);

    return {
        trustScore,
        riskCategory,
        matchedDetailRate,
        matchedRegisteredUser,
        matchedSellerId: matchedRegisteredUser ? bestMatch.candidate.seller_profile_id : null,
        matchedUsername: matchedRegisteredUser ? bestMatch.candidate.username : null
    };
}

async function initBuyerPage(session) {
    const buyerProfileForm = document.getElementById("buyer-profile-form");
    const purchaseForm = document.getElementById("buyer-purchase-form");

    if (!buyerProfileForm && !purchaseForm) {
        return;
    }

    const existingBuyerProfile = await fetchBuyerProfile(session.user.id);
    const existingPlatformLinks =
        existingBuyerProfile?.platform_links && typeof existingBuyerProfile.platform_links === "object"
            ? existingBuyerProfile.platform_links
            : {};

    if (buyerProfileForm) {
        document.getElementById("buyer-full-name").value =
            existingBuyerProfile?.full_name || session.user.user_metadata?.full_name || "";
        document.getElementById("buyer-email").value =
            existingBuyerProfile?.email || session.user.email || "";
        document.getElementById("buyer-phone").value =
            existingBuyerProfile?.phone || "";
        document.getElementById("buyer-location").value =
            existingBuyerProfile?.location || "";
        document.getElementById("buyer-student-number").value =
            existingBuyerProfile?.student_number || "";
        document.getElementById("buyer-institution").value =
            existingBuyerProfile?.institution || "";
        document.getElementById("buyer-platform-facebook").value =
            existingPlatformLinks.facebook_marketplace || "";
        document.getElementById("buyer-platform-whatsapp").value =
            existingPlatformLinks.whatsapp || "";
        document.getElementById("buyer-platform-instagram").value =
            existingPlatformLinks.instagram || "";
        document.getElementById("buyer-platform-gumtree").value =
            existingPlatformLinks.gumtree || "";
        document.getElementById("buyer-platform-other-name").value =
            existingPlatformLinks.other_name || "";
        document.getElementById("buyer-platform-other-link").value =
            existingPlatformLinks.other || "";
        document.getElementById("buyer-contact-reference").value =
            existingPlatformLinks.contact_reference || "";
        document.getElementById("buyer-extra-details").value =
            existingPlatformLinks.extra_buyer_details || "";
        document.getElementById("buyer-verification-notes").value =
            existingBuyerProfile?.verification_notes || "";

        const selectedPlatforms = Array.isArray(existingBuyerProfile?.buying_platforms)
            ? existingBuyerProfile.buying_platforms
            : [];

        document.querySelectorAll('input[name="buyer-platform"]').forEach((input) => {
            input.checked = selectedPlatforms.includes(input.value);
        });

        document.getElementById("buyer-behaviour-respectful").checked =
            existingBuyerProfile?.behaviour_flags?.respectful === true;
        document.getElementById("buyer-behaviour-no-fake-offers").checked =
            existingBuyerProfile?.behaviour_flags?.no_fake_offers === true;
        document.getElementById("buyer-behaviour-honour-agreements").checked =
            existingBuyerProfile?.behaviour_flags?.honour_agreements === true;
        document.getElementById("buyer-behaviour-cancel-properly").checked =
            existingBuyerProfile?.behaviour_flags?.cancel_properly === true;
        document.getElementById("buyer-behaviour-rules").checked =
            existingBuyerProfile?.behaviour_flags?.marketplace_rules === true;

        renderBuyerResult(existingBuyerProfile);

        buyerProfileForm.addEventListener("submit", async (event) => {
            event.preventDefault();

            let verificationDocuments = existingBuyerProfile?.verification_documents || {};

            try {
                const identityFile = document.getElementById("buyer-identity-proof").files?.[0];
                const studentFile = document.getElementById("buyer-student-proof").files?.[0];
                const addressFile = document.getElementById("buyer-address-proof").files?.[0];

                if (identityFile) {
                    verificationDocuments.identity_proof = await uploadBuyerVerificationFile(
                        session.user.id,
                        "identity-proof",
                        identityFile
                    );
                }

                if (studentFile) {
                    verificationDocuments.student_registration = await uploadBuyerVerificationFile(
                        session.user.id,
                        "student-registration",
                        studentFile
                    );
                }

                if (addressFile) {
                    verificationDocuments.proof_of_address = await uploadBuyerVerificationFile(
                        session.user.id,
                        "proof-of-address",
                        addressFile
                    );
                }
            } catch (error) {
                setStatusMessage("buyer-profile-status", `Document upload failed: ${error.message}`, "error");
                return;
            }

            const buyerProfilePayload = {
                user_id: session.user.id,
                full_name: document.getElementById("buyer-full-name").value.trim(),
                email: (session.user.email || document.getElementById("buyer-email").value.trim()).toLowerCase(),
                phone: document.getElementById("buyer-phone").value.trim(),
                location: document.getElementById("buyer-location").value.trim(),
                student_number: document.getElementById("buyer-student-number").value.trim() || null,
                institution: document.getElementById("buyer-institution").value.trim() || null,
                buying_platforms: getCheckedValues("buyer-platform"),
                platform_links: {
                    facebook_marketplace: document.getElementById("buyer-platform-facebook").value.trim(),
                    whatsapp: document.getElementById("buyer-platform-whatsapp").value.trim(),
                    instagram: document.getElementById("buyer-platform-instagram").value.trim(),
                    gumtree: document.getElementById("buyer-platform-gumtree").value.trim(),
                    other_name: document.getElementById("buyer-platform-other-name").value.trim(),
                    other: document.getElementById("buyer-platform-other-link").value.trim(),
                    contact_reference: document.getElementById("buyer-contact-reference").value.trim(),
                    extra_buyer_details: document.getElementById("buyer-extra-details").value.trim()
                },
                verification_notes: document.getElementById("buyer-verification-notes").value.trim() || null,
                behaviour_flags: {
                    respectful: document.getElementById("buyer-behaviour-respectful").checked,
                    no_fake_offers: document.getElementById("buyer-behaviour-no-fake-offers").checked,
                    honour_agreements: document.getElementById("buyer-behaviour-honour-agreements").checked,
                    cancel_properly: document.getElementById("buyer-behaviour-cancel-properly").checked,
                    marketplace_rules: document.getElementById("buyer-behaviour-rules").checked
                },
                verification_documents: verificationDocuments
            };

            const buyerTrustScore = calculateBuyerTrustScore(buyerProfilePayload);
            buyerProfilePayload.buyer_trust_score = buyerTrustScore;
            buyerProfilePayload.buyer_verification_status = getBuyerVerificationStatus(
                buyerProfilePayload,
                buyerTrustScore
            );

            const publicProfilePayload = {
                id: session.user.id,
                username: session.user.user_metadata?.username?.toLowerCase() || session.user.email?.split("@")[0] || "",
                full_name: buyerProfilePayload.full_name,
                auth_email: buyerProfilePayload.email,
                workspace_access: DEFAULT_WORKSPACE_ACCESS,
                phone_number: buyerProfilePayload.phone
            };

            const { error: publicProfileError } = await supabaseClient
                .from("profiles")
                .upsert(publicProfilePayload, { onConflict: "id" });

            if (publicProfileError) {
                setStatusMessage("buyer-profile-status", publicProfileError.message, "error");
                return;
            }

            const { data, error } = await supabaseClient
                .from("buyer_profiles")
                .upsert(buyerProfilePayload, { onConflict: "user_id" })
                .select("*")
                .maybeSingle();

            if (error) {
                setStatusMessage("buyer-profile-status", error.message, "error");
                return;
            }

            const savedBuyerProfile = data || buyerProfilePayload;
            renderBuyerResult(savedBuyerProfile);

            await createHistoryEntry({
                userId: session.user.id,
                eventType: "profile",
                title: "Buyer profile submitted",
                description: `Buyer profile submitted successfully. Buyer trust score: ${buyerTrustScore}%.`
            });

            const { snapshot } = await collectUserSnapshot(session.user.id);
            await upsertAnalyticsSnapshot(session.user.id, snapshot);

            setStatusMessage(
                "buyer-profile-status",
                `Buyer profile submitted successfully. Your Buyer Trust Score is ${buyerTrustScore}%.`,
                "success"
            );

            window.setTimeout(() => {
                window.location.href = getUserPageUrl(publicProfilePayload);
            }, 1800);
        });
    }

    if (purchaseForm) {
        const sellerNameInput = document.getElementById("purchase-seller-name");
        const sellerEmailInput = document.getElementById("purchase-seller-email");
        const sellerEmailOtpInput = document.getElementById("seller-email-otp");
        const sellerEmailOtpSendButton = document.getElementById("seller-email-otp-send");
        const sellerPhoneInput = document.getElementById("purchase-seller-phone");
        const sellerPhoneOtpInput = document.getElementById("seller-phone-otp");
        const sellerPhoneOtpSendButton = document.getElementById("seller-phone-otp-send");
        const sellerSocialHandleInput = document.getElementById("purchase-seller-social-handle");
        const marketplaceProfileInput = document.getElementById("purchase-marketplace-profile");
        const businessNameInput = document.getElementById("purchase-business-name");
        const sellerNotesInput = document.getElementById("purchase-seller-notes");
        const selfieActivateButton = document.getElementById("buyer-selfie-activate-btn");
        const idActivateButton = document.getElementById("buyer-id-photo-activate-btn");
        const verifyIdentityButton = document.getElementById("buyer-verify-identity-btn");
        const rerunVerificationButton = document.getElementById("buyer-rerun-verification-btn");
        const verificationStatusPill = document.getElementById("buyer-verification-status-pill");
        const verificationIdState = document.getElementById("buyer-verification-id-state");
        const verificationSelfieState = document.getElementById("buyer-verification-selfie-state");
        const verificationMatchState = document.getElementById("buyer-verification-match-state");
        const verificationBreakdownScore = document.getElementById("buyer-verification-breakdown-score");
        const verificationTotalScore = document.getElementById("buyer-verification-total-score");
        const verificationStatusText = document.getElementById("buyer-verification-status-text");
        const verificationTotalCard = verificationTotalScore?.closest(".buyer-safety-score-card");
        const verificationProgressText = document.getElementById("buyer-verification-progress-text");
        const verificationLoadingText = document.getElementById("buyer-verification-loading-text");
        const verificationScoreFill = document.getElementById("buyer-verification-score-fill");
        const imageController = createBuyerImageController(handleBuyerImageChange);
        const verificationState = {
            result: null,
            isLoading: false,
            helperMessage: ""
        };
        const buyerEmailOtpState = {
            sentTo: "",
            verified: false,
            hasSentCode: false,
            sendInFlight: false,
            verifyInFlight: false
        };
        const buyerPhoneOtpState = {
            code: null,
            sentTo: "",
            verified: false
        };

        async function sendBuyerEmailOtp() {
            const targetValue = sellerEmailInput.value.trim().toLowerCase();

            if (!targetValue) {
                setInlineStatus("seller-email-otp-status", "Enter the seller email first so we know where to send the OTP.", "error");
                return;
            }

            if (!sellerEmailInput.checkValidity()) {
                setInlineStatus("seller-email-otp-status", "Enter a valid seller email address before sending the OTP.", "error");
                sellerEmailInput.reportValidity();
                return;
            }

            buyerEmailOtpState.sentTo = targetValue;
            buyerEmailOtpState.verified = false;
            buyerEmailOtpState.hasSentCode = false;
            buyerEmailOtpState.sendInFlight = true;
            buyerEmailOtpState.verifyInFlight = false;
            sellerEmailOtpInput.value = "";
            sellerEmailOtpSendButton.disabled = true;
            setInlineStatus("seller-email-otp-status", "Sending OTP to the seller email address...");

            try {
                const client = getSupabaseOtpClient() || supabaseClient;
                const { error } = await client.auth.signInWithOtp({
                    email: targetValue,
                    options: {
                        shouldCreateUser: true
                    }
                });

                if (error) {
                    throw error;
                }

                buyerEmailOtpState.hasSentCode = true;
                sellerEmailOtpSendButton.textContent = "Resend OTP";
                setInlineStatus("seller-email-otp-status", "OTP sent to the seller email address. Enter the 6-digit code to verify it.", "success");
            } catch (error) {
                setInlineStatus("seller-email-otp-status", getOtpSendErrorMessage(error, "email"), "error");
            } finally {
                buyerEmailOtpState.sendInFlight = false;
                sellerEmailOtpSendButton.disabled = false;
                renderBuyerVerificationState();
            }
        }

        function validateBuyerEmailOtp(showErrors = false) {
            const targetValue = sellerEmailInput.value.trim().toLowerCase();
            const enteredCode = normalizeOtpValue(sellerEmailOtpInput.value);
            sellerEmailOtpInput.value = enteredCode;

            if (isOtpVerifiedForValue(buyerEmailOtpState, targetValue, "email")) {
                setInlineStatus("seller-email-otp-status", "Email OTP verified.", "success");
                return true;
            }

            if (buyerEmailOtpState.verifyInFlight) {
                if (showErrors) {
                    setInlineStatus("seller-email-otp-status", "Verifying the seller email OTP...");
                }
                return false;
            }

            if (
                !buyerEmailOtpState.hasSentCode ||
                normalizeOtpTarget("email", buyerEmailOtpState.sentTo) !== normalizeOtpTarget("email", targetValue)
            ) {
                buyerEmailOtpState.verified = false;
                if (showErrors) {
                    setInlineStatus("seller-email-otp-status", "Send an OTP to verify the seller email address.", "error");
                }
                return false;
            }

            if (enteredCode.length !== OTP_LENGTH) {
                buyerEmailOtpState.verified = false;
                if (showErrors) {
                    setInlineStatus("seller-email-otp-status", `Enter the full ${OTP_LENGTH}-digit OTP.`, "error");
                }
                return false;
            }

            buyerEmailOtpState.verified = false;
            return false;
        }

        async function verifyBuyerEmailOtp() {
            const targetValue = sellerEmailInput.value.trim().toLowerCase();
            const enteredCode = normalizeOtpValue(sellerEmailOtpInput.value);
            sellerEmailOtpInput.value = enteredCode;

            if (validateBuyerEmailOtp()) {
                return true;
            }

            if (
                enteredCode.length !== OTP_LENGTH ||
                buyerEmailOtpState.verifyInFlight ||
                !buyerEmailOtpState.hasSentCode
            ) {
                return false;
            }

            buyerEmailOtpState.verifyInFlight = true;
            setInlineStatus("seller-email-otp-status", "Verifying the seller email OTP...");

            try {
                const client = getSupabaseOtpClient() || supabaseClient;
                const { error } = await client.auth.verifyOtp({
                    email: targetValue,
                    token: enteredCode,
                    type: "email"
                });

                if (error) {
                    throw error;
                }

                buyerEmailOtpState.verified = true;
                setInlineStatus("seller-email-otp-status", "Email OTP verified.", "success");
                renderBuyerVerificationState();
                return true;
            } catch (error) {
                buyerEmailOtpState.verified = false;
                setInlineStatus("seller-email-otp-status", getOtpVerifyErrorMessage(error, "email"), "error");
                return false;
            } finally {
                buyerEmailOtpState.verifyInFlight = false;
                renderBuyerVerificationState();
            }
        }

        function sendBuyerPhoneOtp() {
            const targetValue = sellerPhoneInput.value.trim();

            if (!targetValue) {
                setInlineStatus("seller-phone-otp-status", "Enter the seller phone number first so we know where to send the OTP.", "error");
                return;
            }

            buyerPhoneOtpState.code = generateOtpCode();
            buyerPhoneOtpState.sentTo = targetValue;
            buyerPhoneOtpState.verified = false;
            sellerPhoneOtpInput.value = "";
            sellerPhoneOtpSendButton.textContent = "Resend OTP";
            setInlineStatus("seller-phone-otp-status", "OTP sent to the seller phone number. Enter the 6-digit code to verify it.", "success");
            showAlert(`Demo phone OTP: ${buyerPhoneOtpState.code}`);
            renderBuyerVerificationState();
        }

        function validateBuyerPhoneOtp(showErrors = false) {
            const targetValue = sellerPhoneInput.value.trim();
            const enteredCode = normalizeOtpValue(sellerPhoneOtpInput.value);
            sellerPhoneOtpInput.value = enteredCode;

            if (isOtpVerifiedForValue(buyerPhoneOtpState, targetValue, "phone")) {
                setInlineStatus("seller-phone-otp-status", "Phone OTP verified.", "success");
                return true;
            }

            if (!buyerPhoneOtpState.code || normalizeOtpTarget("phone", buyerPhoneOtpState.sentTo) !== normalizeOtpTarget("phone", targetValue)) {
                buyerPhoneOtpState.verified = false;
                if (showErrors) {
                    setInlineStatus("seller-phone-otp-status", "Send an OTP to verify the seller phone number.", "error");
                }
                return false;
            }

            if (enteredCode.length !== OTP_LENGTH) {
                buyerPhoneOtpState.verified = false;
                if (showErrors) {
                    setInlineStatus("seller-phone-otp-status", `Enter the full ${OTP_LENGTH}-digit OTP.`, "error");
                }
                return false;
            }

            if (enteredCode === buyerPhoneOtpState.code) {
                buyerPhoneOtpState.verified = true;
                setInlineStatus("seller-phone-otp-status", "Phone OTP verified.", "success");
                return true;
            }

            buyerPhoneOtpState.verified = false;
            if (showErrors) {
                setInlineStatus("seller-phone-otp-status", "That OTP code does not match. Use resend and try again.", "error");
            }
            return false;
        }

        function setBuyerVerificationPill(status) {
            if (!verificationStatusPill) {
                return;
            }

            verificationStatusPill.className = "result-pill";

            if (status === "verified") {
                verificationStatusPill.classList.add("low-pill");
                verificationStatusPill.textContent = "Verified";
                return;
            }

            if (status === "review") {
                verificationStatusPill.classList.add("medium-pill");
                verificationStatusPill.textContent = "Needs Review";
                return;
            }

            if (status === "loading") {
                verificationStatusPill.classList.add("neutral-pill");
                verificationStatusPill.textContent = "Verifying";
                return;
            }

            verificationStatusPill.classList.add("neutral-pill");
            verificationStatusPill.textContent = "Not verified";
        }

        function calculateBuyerSafetyScore(verificationResult = verificationState.result) {
            const detailsComplete = [
                sellerNameInput.value.trim(),
                sellerEmailInput.value.trim(),
                sellerPhoneInput.value.trim()
            ].every(Boolean);
            const emailOtpVerified = isOtpVerifiedForValue(
                buyerEmailOtpState,
                sellerEmailInput.value.trim().toLowerCase(),
                "email"
            );
            const phoneOtpVerified = isOtpVerifiedForValue(
                buyerPhoneOtpState,
                sellerPhoneInput.value.trim(),
                "phone"
            );
            const rawFaceScore = Number(verificationResult?.id_selfie_score);
            const faceScore = Number.isFinite(rawFaceScore) ? Math.max(0, Math.min(40, rawFaceScore)) : 0;
            const detailsScore = detailsComplete ? 20 : 0;
            const emailOtpScore = emailOtpVerified ? 20 : 0;
            const phoneOtpScore = phoneOtpVerified ? 20 : 0;

            return {
                detailsScore,
                emailOtpScore,
                phoneOtpScore,
                faceScore,
                totalScore: Number((detailsScore + emailOtpScore + phoneOtpScore + faceScore).toFixed(1))
            };
        }

        function renderBuyerVerificationState() {
            const hasIdPhoto = Boolean(imageController.getFile("id-photo"));
            const hasSelfiePhoto = Boolean(imageController.getFile("selfie"));
            const verificationResult = verificationState.result;
            const hasVerification = Boolean(verificationResult);
            const safetyScore = calculateBuyerSafetyScore(verificationResult);
            const safetyStatus = safetyScore.totalScore >= 75 ? "Verified" : "Needs Review";

            if (verificationIdState) {
                verificationIdState.textContent = hasIdPhoto ? "ID Uploaded: complete" : "ID upload pending";
            }

            if (verificationSelfieState) {
                verificationSelfieState.textContent = hasSelfiePhoto
                    ? "Selfie Captured: complete"
                    : "Selfie upload pending";
            }

            if (verificationMatchState) {
                verificationMatchState.textContent = hasVerification
                    ? `Facial Match: ${verificationResult.match_percentage}%`
                    : "Facial match: -";
            }

            if (verificationBreakdownScore) {
                verificationBreakdownScore.textContent = hasVerification
                    ? `${verificationResult.id_selfie_score.toFixed(1)} / 40`
                    : "0 / 40";
            }

            if (verificationTotalScore) {
                verificationTotalScore.textContent = `${safetyScore.totalScore.toFixed(1)} / 100`;
            }

            if (verificationStatusText) {
                verificationStatusText.textContent = hasVerification
                    ? `Status: ${safetyStatus}`
                    : "Complete the seller details, verify both OTPs, and run the identity check.";
            }

            if (verificationTotalCard) {
                verificationTotalCard.classList.remove(
                    "buyer-safety-score-card-high",
                    "buyer-safety-score-card-medium",
                    "buyer-safety-score-card-low"
                );
                verificationTotalCard.classList.add(
                    safetyScore.totalScore >= 70
                        ? "buyer-safety-score-card-low"
                        : safetyScore.totalScore >= 40
                            ? "buyer-safety-score-card-medium"
                            : "buyer-safety-score-card-high"
                );
            }

            if (verificationScoreFill) {
                verificationScoreFill.style.width = `${safetyScore.totalScore}%`;
            }

            if (verificationProgressText && !verificationState.isLoading) {
                verificationProgressText.textContent = hasVerification
                    ? verificationResult.message
                    : verificationState.helperMessage ||
                        (hasIdPhoto && hasSelfiePhoto
                            ? "Both images are ready. Click Verify Identity to run the demo check."
                            : "Upload both images, then click Verify Identity.");
            }

            if (verificationLoadingText && !verificationState.isLoading) {
                verificationLoadingText.textContent = "";
            }

            setBuyerVerificationPill(
                verificationState.isLoading
                    ? "loading"
                    : hasVerification
                        ? verificationResult.status
                        : "idle"
            );

            if (verifyIdentityButton) {
                verifyIdentityButton.disabled = !hasIdPhoto || !hasSelfiePhoto || verificationState.isLoading;
            }

            if (rerunVerificationButton) {
                rerunVerificationButton.disabled = !hasIdPhoto || !hasSelfiePhoto || verificationState.isLoading;
            }
        }

        function clearBuyerVerification(message = "") {
            verificationState.result = null;
            verificationState.isLoading = false;
            verificationState.helperMessage = message;

            if (verificationLoadingText) {
                verificationLoadingText.textContent = "";
            }

            renderBuyerVerificationState();
        }

        function handleBuyerImageChange() {
            clearBuyerVerification("Images updated. Verify identity again to calculate a new safety score.");
        }

        async function runBuyerIdentityVerification() {
            const selfieFile = imageController.getFile("selfie");
            const idPhotoFile = imageController.getFile("id-photo");

            if (!selfieFile || !idPhotoFile) {
                clearBuyerVerification("Upload both images before running the identity check.");
                return null;
            }

            verificationState.isLoading = true;
            verificationState.result = null;
            verificationState.helperMessage = "";
            renderBuyerVerificationState();

            if (verificationProgressText) {
                verificationProgressText.textContent = "Verifying identity...";
            }

            if (verificationLoadingText) {
                verificationLoadingText.textContent = "";
            }

            await delay(700);

            if (verificationLoadingText) {
                verificationLoadingText.textContent = "Checking facial match...";
            }

            await delay(900);

            const demoVerificationResult = await requestDemoIdentityVerification(session, {
                selfieFile,
                idPhotoFile
            });
            const verificationOutcome = getSellerVerificationOutcome(demoVerificationResult);

            verificationState.result = verificationOutcome;
            verificationState.isLoading = false;
            verificationState.helperMessage = "";
            renderBuyerVerificationState();
            return verificationOutcome;
        }

        [sellerNameInput, sellerEmailInput, sellerPhoneInput].forEach((input) => {
            input?.addEventListener("input", () => {
                setStatusMessage("buyer-purchase-status", "", "");
                renderBuyerVerificationState();
            });
        });

        sellerEmailInput?.addEventListener("input", () => {
            buyerEmailOtpState.sentTo = sellerEmailInput.value.trim().toLowerCase();
            buyerEmailOtpState.verified = false;
            buyerEmailOtpState.hasSentCode = false;
            buyerEmailOtpState.sendInFlight = false;
            buyerEmailOtpState.verifyInFlight = false;
            if (sellerEmailOtpInput) {
                sellerEmailOtpInput.value = "";
            }
            setInlineStatus("seller-email-otp-status", "Email address changed. Send a new OTP to verify it.");
            renderBuyerVerificationState();
        });

        sellerEmailOtpSendButton?.addEventListener("click", () => {
            sendBuyerEmailOtp().catch((error) => {
                buyerEmailOtpState.sendInFlight = false;
                setInlineStatus("seller-email-otp-status", getOtpSendErrorMessage(error, "email"), "error");
            });
        });

        sellerEmailOtpInput?.addEventListener("input", () => {
            validateBuyerEmailOtp();
            renderBuyerVerificationState();
            if (normalizeOtpValue(sellerEmailOtpInput.value).length === OTP_LENGTH) {
                verifyBuyerEmailOtp().catch((error) => {
                    buyerEmailOtpState.verifyInFlight = false;
                    setInlineStatus("seller-email-otp-status", getOtpVerifyErrorMessage(error, "email"), "error");
                    renderBuyerVerificationState();
                });
            }
        });

        sellerPhoneInput?.addEventListener("input", () => {
            buyerPhoneOtpState.code = null;
            buyerPhoneOtpState.sentTo = sellerPhoneInput.value.trim();
            buyerPhoneOtpState.verified = false;
            if (sellerPhoneOtpInput) {
                sellerPhoneOtpInput.value = "";
            }
            setInlineStatus("seller-phone-otp-status", "Phone number changed. Send a new OTP to verify it.");
            renderBuyerVerificationState();
        });

        sellerPhoneOtpSendButton?.addEventListener("click", sendBuyerPhoneOtp);
        sellerPhoneOtpInput?.addEventListener("input", () => {
            validateBuyerPhoneOtp();
            if (normalizeOtpValue(sellerPhoneOtpInput.value).length === OTP_LENGTH) {
                validateBuyerPhoneOtp(true);
            }
            renderBuyerVerificationState();
        });

        if (selfieActivateButton) {
            selfieActivateButton.addEventListener("click", () => {
                imageController.openModalForTarget("selfie");
            });
        }

        if (idActivateButton) {
            idActivateButton.addEventListener("click", () => {
                imageController.openModalForTarget("id-photo");
            });
        }

        if (verifyIdentityButton) {
            verifyIdentityButton.addEventListener("click", () => {
                runBuyerIdentityVerification().catch(() => {
                    verificationState.isLoading = false;
                    clearBuyerVerification("We could not complete the demo verification. Please try again.");
                });
            });
        }

        if (rerunVerificationButton) {
            rerunVerificationButton.addEventListener("click", () => {
                runBuyerIdentityVerification().catch(() => {
                    verificationState.isLoading = false;
                    clearBuyerVerification("We could not complete the demo verification. Please try again.");
                });
            });
        }

        renderBuyerVerificationState();

        async function saveBuyerSellerAssessment() {
            const sellerName = sellerNameInput.value.trim();
            const sellerEmail = sellerEmailInput.value.trim().toLowerCase();
            const sellerPhone = sellerPhoneInput.value.trim();
            const sellerSocialHandle = sellerSocialHandleInput.value.trim();
            const marketplaceProfileLink = marketplaceProfileInput.value.trim();
            const businessName = businessNameInput.value.trim();
            const sellerNotes = sellerNotesInput.value.trim();
            const selfieFile = imageController.getFile("selfie");
            const idPhotoFile = imageController.getFile("id-photo");
            const requiredFieldsComplete = [sellerName, sellerEmail, sellerPhone].every(Boolean);

            if (!requiredFieldsComplete || !selfieFile || !idPhotoFile) {
                setStatusMessage(
                    "buyer-purchase-status",
                    "Complete the seller name, email, phone number, and both cropped images before saving this seller record.",
                    "error"
                );
                return;
            }

            const emailOtpReady = validateBuyerEmailOtp(true);
            const phoneOtpReady = validateBuyerPhoneOtp(true);
            const otpReady = emailOtpReady && phoneOtpReady;

            if (!otpReady) {
                setStatusMessage(
                    "buyer-purchase-status",
                    "Verify both seller OTPs before saving this seller record.",
                    "error"
                );
                renderBuyerVerificationState();
                return;
            }

            let verificationResult = verificationState.result;

            if (!verificationResult) {
                try {
                    verificationResult = await runBuyerIdentityVerification();
                } catch (error) {
                    verificationState.isLoading = false;
                    clearBuyerVerification("We could not complete the demo verification. Please try again.");
                }
            }

            if (!verificationResult) {
                setStatusMessage(
                    "buyer-purchase-status",
                    "Run the demo ID and selfie verification before saving this seller record.",
                    "error"
                );
                return;
            }

            setStatusMessage("buyer-purchase-status", "Saving seller information...", "");

            const registeredSeller = await findRegisteredSellerByContact(sellerEmail, sellerPhone);
            const riskWarning = await hasSellerRiskWarning(sellerEmail, sellerPhone);
            const safetyBreakdown = calculateBuyerSafetyScore(verificationResult);
            const safetyScore = safetyBreakdown.totalScore;

            // Save only the privacy-safe seller summary fields and purchase workflow metadata.
            const purchasePayload = {
                buyer_user_id: session.user.id,
                seller_user_id: registeredSeller?.user_id || null,
                seller_type: registeredSeller ? "Registered Seller" : "Unregistered Seller",
                seller_name: sellerName,
                seller_email: sellerEmail,
                seller_phone: sellerPhone,
                seller_social_handle: sellerSocialHandle || null,
                marketplace_profile_link: marketplaceProfileLink || null,
                business_name: businessName || null,
                seller_notes: sellerNotes || null,
                safety_score: safetyScore,
                details_score: safetyBreakdown.detailsScore,
                email_otp_score: safetyBreakdown.emailOtpScore,
                phone_otp_score: safetyBreakdown.phoneOtpScore,
                face_recognition_score: safetyBreakdown.faceScore,
                purchase_status: "pending",
                fraud_reported: false,
                fraud_reason: null
            };

            const { data, error } = await insertBuyerSellerAssessment(purchasePayload);

            if (error) {
                setStatusMessage("buyer-purchase-status", error.message, "error");
                return;
            }

            await createHistoryEntry({
                userId: session.user.id,
                eventType: "verification",
                title: "Seller assessment saved",
                description: `Seller record saved for ${sellerName}. Safety score: ${formatSafetyScore(safetyScore)}.`
            });

            const { snapshot } = await collectUserSnapshot(session.user.id);
            await upsertAnalyticsSnapshot(session.user.id, snapshot);

            setStatusMessage(
                "buyer-purchase-status",
                riskWarning
                    ? `Seller record saved successfully with a safety score of ${formatSafetyScore(safetyScore)}. Warning: This seller has previous non-delivery or fraud reports.`
                    : registeredSeller
                        ? `Seller record saved successfully. It now appears in Purchases / Post-Purchase on your user page. Registered Seller found. Safety score: ${formatSafetyScore(safetyScore)}.`
                        : `Seller record saved successfully. It now appears in Purchases / Post-Purchase on your user page. Safety score: ${formatSafetyScore(safetyScore)}.`,
                "success"
            );

            purchaseForm.reset();
            imageController.clearAll();
            clearBuyerVerification("Upload both images, then click Verify Identity.");

            window.setTimeout(() => {
                window.location.href = getUserPageUrl(session.user);
            }, 1800);
        }

        purchaseForm.addEventListener("submit", (event) => {
            event.preventDefault();

            saveBuyerSellerAssessment().catch((error) => {
                setStatusMessage(
                    "buyer-purchase-status",
                    error?.message || "We could not save this seller assessment. Please try again.",
                    "error"
                );
            });
        });
    }
}

async function initPortalPage() {
    const portalContext = await ensurePortalSession();
    if (!portalContext) {
        return;
    }

    const { session, profile } = portalContext;

    if (document.getElementById("history-list")) {
        await initUserPage(session, profile);
    }

    if (document.getElementById("admin-dashboard-shell")) {
        await initAdminPage(session, profile);
    }

    if (document.getElementById("seller-profile-form")) {
        await initSellerPage(session, profile);
    }

    if (document.getElementById("buyer-profile-form") || document.getElementById("buyer-purchase-form")) {
        await initBuyerPage(session);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    initFooterYears();

    if (document.getElementById("login-form")) {
        initAuthPage();
    }

    if (document.body.classList.contains("portal-page")) {
        initPortalNav();
        initPortalPage();
    }
});


