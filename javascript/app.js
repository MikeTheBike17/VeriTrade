const SUPABASE_URL = "https://ppbeiefwfqwmtatfgsve.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_lb1Eiw4hXEfTMDYh3nMp0w_WolruYMh";
const DEFAULT_WORKSPACE_ACCESS = "Buyer and Seller";
const EMPTY_LABEL = "none";
const SELLER_STORAGE_BUCKET = "seller-verification-records";
const BUYER_STORAGE_BUCKET = "buyer-verification-records";
const USER_REDIRECT_PAGE = "user.html";
const USER_SLUG_PARAM = "slug";
const LOGIN_ALIAS_STORAGE_KEY = "veritrade_login_aliases";

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
        // Ignore storage quota or browser privacy mode failures.
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

function getProfileCompletion(profile) {
    const checkpoints = [
        Boolean(profile?.full_name),
        Boolean(profile?.username),
        Boolean(profile?.auth_email),
        Boolean(profile?.phone_number),
        Boolean(profile?.business_name),
        Boolean(profile?.social_handle_url),
        Boolean(profile?.marketplace_profile_link),
        Array.isArray(profile?.linked_marketplaces) && profile.linked_marketplaces.length > 0,
        profile?.otp_alerts !== null && profile?.otp_alerts !== undefined
    ];

    const completed = checkpoints.filter(Boolean).length;
    return clampPercent((completed / checkpoints.length) * 100);
}

function getDistinctSellerCount(checksList) {
    const sellerKeys = new Set();

    checksList.forEach((check) => {
        const key =
            check.seller_profile_id ||
            check.seller_username_input ||
            check.seller_email ||
            check.seller_phone ||
            check.marketplace_profile_link;

        if (key) {
            sellerKeys.add(key);
        }
    });

    return sellerKeys.size;
}

function getOtpSuccessRate(checksList) {
    if (!checksList.length) {
        return null;
    }

    const successfulChecks = checksList.filter((check) => check.otp_confirmed).length;
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

function ensureUserSellerAnalyticsCard() {
    const dashboardGrid = document.querySelector(".dashboard-grid");

    if (!dashboardGrid) {
        return null;
    }

    let sellerCard = document.getElementById("seller-analytics-card");
    if (sellerCard) {
        return sellerCard;
    }

    sellerCard = document.createElement("article");
    sellerCard.className = "detail-card";
    sellerCard.id = "seller-analytics-card";
    sellerCard.innerHTML = `
        <span class="card-kicker">Seller analytics</span>
        <h3>Seller confidence status</h3>
        <ul class="detail-list">
            <li><span>Registered seller</span><strong id="seller-analytics-registered">${EMPTY_LABEL}</strong></li>
            <li><span>Verification status</span><strong id="seller-analytics-status">${EMPTY_LABEL}</strong></li>
            <li><span>Seller trust score</span><strong id="seller-analytics-trust">${EMPTY_LABEL}</strong></li>
            <li><span>Purchase confidence</span><strong id="seller-analytics-confidence">${EMPTY_LABEL}</strong></li>
            <li><span>Listed products</span><strong id="seller-analytics-products">${EMPTY_LABEL}</strong></li>
            <li><span>Completed sales</span><strong id="seller-analytics-sales">${EMPTY_LABEL}</strong></li>
        </ul>
    `;

    dashboardGrid.appendChild(sellerCard);
    return sellerCard;
}

function renderUserSellerAnalytics(sellerProfile) {
    const sellerCard = ensureUserSellerAnalyticsCard();

    if (!sellerCard) {
        return;
    }

    setTextContent("seller-analytics-registered", getSellerRegistrationBadge(sellerProfile));
    setTextContent(
        "seller-analytics-status",
        sellerProfile?.seller_verification_status || EMPTY_LABEL
    );
    setTextContent("seller-analytics-trust", getSellerTrustScoreLabel(sellerProfile));
    setTextContent("seller-analytics-confidence", getPurchaseConfidenceLabel(sellerProfile));
    setTextContent(
        "seller-analytics-products",
        Number.isFinite(Number(sellerProfile?.listed_products_count))
            ? String(Number(sellerProfile.listed_products_count))
            : EMPTY_LABEL
    );
    setTextContent(
        "seller-analytics-sales",
        Number.isFinite(Number(sellerProfile?.completed_sales_count))
            ? String(Number(sellerProfile.completed_sales_count))
            : EMPTY_LABEL
    );
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

function renderPurchaseList(purchases) {
    const purchaseList = document.getElementById("purchase-list");

    if (!purchaseList) {
        return;
    }

    if (!purchases.length) {
        purchaseList.innerHTML = `
            <article class="history-item empty-state">
                <h4>${EMPTY_LABEL}</h4>
                <p>Your purchases will appear here after you save them from the Buyer page.</p>
            </article>
        `;
        return;
    }

    const fraudKeys = new Set(
        purchases
            .filter((purchase) => purchase.fraud_reported)
            .flatMap((purchase) => [normalizeText(purchase.seller_email), normalizePhone(purchase.seller_phone)])
            .filter(Boolean)
    );

    purchaseList.innerHTML = purchases
        .map((purchase) => {
            const warningTriggered =
                !purchase.fraud_reported &&
                (
                    fraudKeys.has(normalizeText(purchase.seller_email)) ||
                    fraudKeys.has(normalizePhone(purchase.seller_phone))
                );

            return `
                <article class="history-item" data-purchase-id="${escapeHtml(purchase.id)}">
                    <p class="history-date">${escapeHtml(formatDate(purchase.created_at))}</p>
                    <h4>${escapeHtml(purchase.product_name || "Purchase")}</h4>
                    <p>Seller type: ${escapeHtml(purchase.seller_type || EMPTY_LABEL)}</p>
                    <p>Seller name: ${escapeHtml(purchase.seller_name || EMPTY_LABEL)}</p>
                    <p>Seller email: ${escapeHtml(purchase.seller_email || EMPTY_LABEL)}</p>
                    <p>Seller phone: ${escapeHtml(purchase.seller_phone || EMPTY_LABEL)}</p>
                    <p>Current status: ${escapeHtml(purchase.purchase_status || EMPTY_LABEL)}</p>
                    ${
                        purchase.fraud_reported
                            ? '<p><strong class="result-pill high-pill">Fraud Reported</strong></p>'
                            : ""
                    }
                    ${
                        warningTriggered
                            ? '<p><strong class="result-pill medium-pill">Warning: This seller has been reported before.</strong></p>'
                            : ""
                    }
                    <p>
                        <button type="button" class="card-btn buyer-btn" data-purchase-action="delivered" data-purchase-id="${escapeHtml(purchase.id)}">Mark as Delivered</button>
                        <button type="button" class="card-btn seller-btn" data-purchase-action="not-delivered" data-purchase-id="${escapeHtml(purchase.id)}">Mark as Not Delivered</button>
                        <button type="button" class="card-btn seller-btn" data-purchase-action="fraud" data-purchase-id="${escapeHtml(purchase.id)}">Report as Fraud</button>
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

    const username = user.user_metadata?.username || user.email?.split("@")[0] || "";
    const fullName = user.user_metadata?.full_name || "";
    const profilePayload = {
        id: user.id,
        username: username.toLowerCase(),
        full_name: fullName,
        auth_email: user.email ? user.email.toLowerCase() : "",
        workspace_access: DEFAULT_WORKSPACE_ACCESS
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
    const [profile, checksResponse, historyResponse] = await Promise.all([
        profileOverride ? Promise.resolve(profileOverride) : fetchCurrentProfile(userId),
        supabaseClient.from("verification_checks").select("*").eq("user_id", userId),
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
        trustChecksRun: checksList.length,
        sellersMonitored: getDistinctSellerCount(checksList),
        profileCompletion: getProfileCompletion(resolvedProfile),
        otpConfirmationSuccess: getOtpSuccessRate(checksList),
        matchedSellerDetailRate: getAverageMatchRate(checksList),
        positiveFeedbackTrend: getPositiveFeedbackTrend(allHistory),
        historyRecords: allHistory.length
    };

    return {
        profile: resolvedProfile,
        checksList,
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

    if (sellerEmail) {
        const { data } = await supabaseClient
            .from("seller_profiles")
            .select("user_id, full_name, email, phone, is_registered_seller, seller_trust_score, purchase_confidence_score")
            .eq("email", sellerEmail)
            .eq("is_registered_seller", true)
            .maybeSingle();

        if (data) {
            return data;
        }
    }

    if (sellerPhone) {
        const { data } = await supabaseClient
            .from("seller_profiles")
            .select("user_id, full_name, email, phone, is_registered_seller, seller_trust_score, purchase_confidence_score")
            .eq("phone", sellerPhone)
            .eq("is_registered_seller", true)
            .maybeSingle();

        if (data) {
            return data;
        }
    }

    return null;
}

async function hasSellerFraudWarning(sellerEmail, sellerPhone) {
    if (!supabaseClient) {
        return false;
    }

    const { data } = await supabaseClient
        .from("purchases")
        .select("seller_email, seller_phone")
        .eq("fraud_reported", true);

    const purchases = Array.isArray(data) ? data : [];
    const normalizedEmail = normalizeText(sellerEmail);
    const normalizedPhone = normalizePhone(sellerPhone);

    return purchases.some(
        (purchase) =>
            (normalizedEmail && normalizeText(purchase.seller_email) === normalizedEmail) ||
            (normalizedPhone && normalizePhone(purchase.seller_phone) === normalizedPhone)
    );
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
                purchase_status: "not_delivered"
            };
        } else if (action === "fraud") {
            const fraudReason = window.prompt("Enter a short fraud reason:");

            if (!fraudReason || !fraudReason.trim()) {
                return;
            }

            updates = {
                purchase_status: "fraud_reported",
                fraud_reported: true,
                fraud_reason: fraudReason.trim()
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
            description: `Purchase "${data.product_name}" was updated to ${data.purchase_status.replaceAll("_", " ")}.`
        });

        const [buyerProfile, purchases] = await Promise.all([
            fetchBuyerProfile(userId),
            fetchPurchases(userId)
        ]);

        renderPurchaseList(purchases);
        renderUserBuyerAnalytics(buyerProfile, purchases);
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

    const requestedMode = new URLSearchParams(window.location.search).get("mode");

    let existingSession = null;
    try {
        existingSession = await getCurrentSession();
    } catch (error) {
        existingSession = null;
    }

    if (existingSession?.user) {
        await syncProfileFromUser(existingSession.user);
    }

    if (existingSession && !requestedMode) {
        const redirectProfile =
            (await fetchCurrentProfile(existingSession.user.id)) || getBaseProfileFromUser(existingSession.user);
        window.location.href = getUserPageUrl(redirectProfile);
        return;
    }

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

        if (data.user) {
            await syncProfileFromUser(data.user);
        }

        showAlert("Login successful! Redirecting to your workspace...");
        setTimeout(() => {
            authUi.loginForm.reset();
            window.location.href = getUserPageUrl(data.user);
        }, 1200);
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
            await syncProfileFromUser(data.user);
            showAlert("Account created successfully! Opening your workspace...");
            setTimeout(() => {
                authUi.signupForm.reset();
                window.location.href = getUserPageUrl(data.user);
            }, 1200);
            return;
        }

        showAlert("Account created. Confirm your email, then log in with your username or email and password.");
        authUi.signupForm.reset();
        authUi.showLoginForm();
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

    populateAccountNav(profile);
    syncCurrentUserPageSlug(profile);

    return {
        session,
        profile
    };
}

async function initUserPage(session, initialProfile) {
    const { profile, historyList, snapshot } = await collectUserSnapshot(session.user.id, initialProfile);
    const displayProfile = getDisplayProfile(profile, session.user);
    const [sellerProfile, buyerProfile, purchases] = await Promise.all([
        fetchSellerProfile(session.user.id),
        fetchBuyerProfile(session.user.id),
        fetchPurchases(session.user.id)
    ]);

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
    setTextContent(
        "profile-otp-alerts",
        profile.otp_alerts === true ? "Enabled" : profile.otp_alerts === false ? "Disabled" : EMPTY_LABEL
    );
    setTextContent(
        "profile-linked-marketplaces",
        linkedMarketplaces.length ? `${linkedMarketplaces.length} profile${linkedMarketplaces.length === 1 ? "" : "s"}` : EMPTY_LABEL
    );

    setMetric("metric-profile-completion", snapshot.profileCompletion);
    setMetric("metric-otp-success", snapshot.otpConfirmationSuccess);
    setMetric("metric-match-rate", snapshot.matchedSellerDetailRate);
    setMetric("metric-feedback", snapshot.positiveFeedbackTrend);

    renderHistoryList(historyList);
    renderUserSellerAnalytics(sellerProfile);
    renderUserBuyerAnalytics(buyerProfile, purchases);
    renderPurchaseList(purchases);
    bindPurchaseActions(session.user.id);
}

async function initSellerPage(session, initialProfile) {
    const form = document.getElementById("seller-profile-form");
    if (!form) {
        return;
    }

    const profile = initialProfile || getBaseProfileFromUser(session.user);
    const existingSellerProfile = await fetchSellerProfile(session.user.id);
    const existingPlatformLinks =
        existingSellerProfile?.platform_links && typeof existingSellerProfile.platform_links === "object"
            ? existingSellerProfile.platform_links
            : {};

    document.getElementById("seller-full-name").value =
        existingSellerProfile?.full_name || profile.full_name || session.user.user_metadata?.full_name || "";
    document.getElementById("seller-email").value =
        existingSellerProfile?.email || profile.auth_email || session.user.email || "";
    document.getElementById("seller-phone").value =
        existingSellerProfile?.phone || profile.phone_number || "";
    document.getElementById("seller-id-number").value =
        existingSellerProfile?.id_number || "";
    document.getElementById("seller-location").value =
        existingSellerProfile?.location || "";
    document.getElementById("seller-student-number").value =
        existingSellerProfile?.student_number || "";
    document.getElementById("seller-institution").value =
        existingSellerProfile?.institution || "";
    document.getElementById("seller-verification-notes").value =
        existingSellerProfile?.verification_notes || "";
    document.getElementById("seller-platform-facebook").value =
        existingPlatformLinks.facebook_marketplace || "";
    document.getElementById("seller-platform-whatsapp").value =
        existingPlatformLinks.whatsapp || "";
    document.getElementById("seller-platform-instagram").value =
        existingPlatformLinks.instagram || "";
    document.getElementById("seller-platform-gumtree").value =
        existingPlatformLinks.gumtree || "";
    document.getElementById("seller-platform-other-name").value =
        existingPlatformLinks.other_name || "";
    document.getElementById("seller-platform-other-link").value =
        existingPlatformLinks.other || "";

    const selectedPlatforms = Array.isArray(existingSellerProfile?.selling_platforms)
        ? existingSellerProfile.selling_platforms
        : [];

    document.querySelectorAll('input[name="seller-selling-platform"]').forEach((input) => {
        input.checked = selectedPlatforms.includes(input.value);
    });

    document.getElementById("seller-agreement-accurate").checked =
        existingSellerProfile?.agreement_flags?.accurate === true;
    document.getElementById("seller-agreement-private").checked =
        existingSellerProfile?.agreement_flags?.private_storage === true;
    document.getElementById("seller-agreement-dispute").checked =
        existingSellerProfile?.agreement_flags?.dispute_resolution === true;
    document.getElementById("seller-agreement-products").checked =
        existingSellerProfile?.agreement_flags?.product_rules === true;
    document.getElementById("seller-agreement-rules").checked =
        existingSellerProfile?.agreement_flags?.marketplace_rules === true;

    renderSellerStatusSummary(existingSellerProfile, session.user);

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const fullName = document.getElementById("seller-full-name").value.trim();
        const email = session.user.email || document.getElementById("seller-email").value.trim().toLowerCase();
        const phone = document.getElementById("seller-phone").value.trim();
        const idNumber = document.getElementById("seller-id-number").value.trim();
        const location = document.getElementById("seller-location").value.trim();
        const studentNumber = document.getElementById("seller-student-number").value.trim();
        const institution = document.getElementById("seller-institution").value.trim();
        const verificationNotes = document.getElementById("seller-verification-notes").value.trim();
        const sellingPlatforms = getCheckedValues("seller-selling-platform");
        const platformLinks = {
            facebook_marketplace: document.getElementById("seller-platform-facebook").value.trim(),
            whatsapp: document.getElementById("seller-platform-whatsapp").value.trim(),
            instagram: document.getElementById("seller-platform-instagram").value.trim(),
            gumtree: document.getElementById("seller-platform-gumtree").value.trim(),
            other_name: document.getElementById("seller-platform-other-name").value.trim(),
            other: document.getElementById("seller-platform-other-link").value.trim()
        };
        const agreementFlags = {
            accurate: document.getElementById("seller-agreement-accurate").checked,
            private_storage: document.getElementById("seller-agreement-private").checked,
            dispute_resolution: document.getElementById("seller-agreement-dispute").checked,
            product_rules: document.getElementById("seller-agreement-products").checked,
            marketplace_rules: document.getElementById("seller-agreement-rules").checked
        };

        const requiredSellerInfoComplete = [fullName, email, phone, idNumber, location].every(Boolean);
        const allAgreementsAccepted = Object.values(agreementFlags).every(Boolean);

        if (!requiredSellerInfoComplete) {
            setStatusMessage(
                "seller-save-status",
                "Complete all required seller information before submitting your profile.",
                "error"
            );
            return;
        }

        if (!sellingPlatforms.length) {
            setStatusMessage(
                "seller-save-status",
                "Select at least one external selling platform.",
                "error"
            );
            return;
        }

        if (!allAgreementsAccepted) {
            setStatusMessage(
                "seller-save-status",
                "Accept all seller agreement statements before submitting.",
                "error"
            );
            return;
        }

        let verificationDocuments = existingSellerProfile?.verification_documents || {};

        try {
            const idDocumentFile = document.getElementById("seller-id-document").files?.[0];
            const studentProofFile = document.getElementById("seller-student-proof").files?.[0];
            const addressProofFile = document.getElementById("seller-address-proof").files?.[0];

            if (idDocumentFile) {
                verificationDocuments.id_document = await uploadSellerVerificationFile(
                    session.user.id,
                    "id-document",
                    idDocumentFile
                );
            }

            if (studentProofFile) {
                verificationDocuments.student_registration = await uploadSellerVerificationFile(
                    session.user.id,
                    "student-registration",
                    studentProofFile
                );
            }

            if (addressProofFile) {
                verificationDocuments.proof_of_address = await uploadSellerVerificationFile(
                    session.user.id,
                    "proof-of-address",
                    addressProofFile
                );
            }
        } catch (error) {
            setStatusMessage(
                "seller-save-status",
                `Document upload failed: ${error.message}`,
                "error"
            );
            return;
        }

        const documentCount = Object.values(verificationDocuments).filter(Boolean).length;
        const sufficientRecordsSubmitted = requiredSellerInfoComplete && documentCount > 0;
        const sellerVerificationStatus = requiredSellerInfoComplete ? "Pending Verification" : EMPTY_LABEL;
        const sellerTrustScore = sufficientRecordsSubmitted ? 100 : 0;
        const isRegisteredSeller = requiredSellerInfoComplete;
        const purchaseConfidenceScore = isRegisteredSeller ? 100 : 0;

        const updatedPublicProfile = {
            id: session.user.id,
            username: (profile.username || session.user.user_metadata?.username || "").toLowerCase(),
            full_name: fullName,
            auth_email: email,
            workspace_access: DEFAULT_WORKSPACE_ACCESS,
            phone_number: phone,
            marketplace_profile_link:
                platformLinks.facebook_marketplace ||
                platformLinks.instagram ||
                platformLinks.gumtree ||
                platformLinks.whatsapp ||
                platformLinks.other ||
                null,
            linked_marketplaces: sellingPlatforms
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
            id_number: idNumber,
            location,
            student_number: studentNumber || null,
            institution: institution || null,
            selling_platforms: sellingPlatforms,
            platform_links: platformLinks,
            verification_notes: verificationNotes || null,
            verification_documents: verificationDocuments,
            agreement_flags: agreementFlags,
            seller_verification_status: sellerVerificationStatus,
            seller_trust_score: sellerTrustScore,
            is_registered_seller: isRegisteredSeller,
            purchase_confidence_score: purchaseConfidenceScore,
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
            description: "Your seller verification details were saved for admin verification and dispute handling."
        });

        const { snapshot } = await collectUserSnapshot(session.user.id, savedPublicProfile);
        await upsertAnalyticsSnapshot(session.user.id, snapshot);

        setStatusMessage("seller-save-status", "Seller profile submitted successfully.", "success");
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
        purchaseForm.addEventListener("submit", async (event) => {
            event.preventDefault();

            const productName = document.getElementById("purchase-product-name").value.trim();
            const listingId = document.getElementById("purchase-listing-id").value.trim() || null;
            const sellerName = document.getElementById("purchase-seller-name").value.trim();
            const sellerEmail = document.getElementById("purchase-seller-email").value.trim().toLowerCase();
            const sellerPhone = document.getElementById("purchase-seller-phone").value.trim();

            if (!productName || !sellerName || !sellerEmail || !sellerPhone) {
                setStatusMessage(
                    "buyer-purchase-status",
                    "Complete the product and seller contact details before saving the purchase.",
                    "error"
                );
                return;
            }

            const registeredSeller = await findRegisteredSellerByContact(sellerEmail, sellerPhone);
            const fraudWarning = await hasSellerFraudWarning(sellerEmail, sellerPhone);
            const purchasePayload = {
                buyer_user_id: session.user.id,
                listing_id: listingId,
                product_name: productName,
                seller_type: registeredSeller ? "Registered Seller" : "Unregistered Seller",
                seller_name: registeredSeller?.full_name || sellerName,
                seller_email: registeredSeller?.email || sellerEmail,
                seller_phone: registeredSeller?.phone || sellerPhone,
                purchase_status: "pending",
                fraud_reported: false,
                fraud_reason: null
            };

            const { data, error } = await supabaseClient
                .from("purchases")
                .insert(purchasePayload)
                .select("*")
                .single();

            if (error) {
                setStatusMessage("buyer-purchase-status", error.message, "error");
                return;
            }

            await createHistoryEntry({
                userId: session.user.id,
                eventType: "verification",
                title: "Purchase saved",
                description: `Purchase record saved for ${productName} with ${purchasePayload.seller_type.toLowerCase()}.`
            });

            setStatusMessage(
                "buyer-purchase-status",
                fraudWarning
                    ? "Purchase saved. Warning: This seller has been reported before."
                    : registeredSeller
                        ? "Purchase record saved successfully. Registered Seller. Purchase Confidence: 100%."
                        : "Purchase record saved successfully.",
                fraudWarning ? "error" : "success"
            );

            purchaseForm.reset();
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

    if (document.getElementById("seller-profile-form")) {
        await initSellerPage(session, profile);
    }

    if (document.getElementById("buyer-profile-form") || document.getElementById("buyer-purchase-form")) {
        await initBuyerPage(session);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById("login-form")) {
        initAuthPage();
    }

    if (document.body.classList.contains("portal-page")) {
        initPortalPage();
    }
});

