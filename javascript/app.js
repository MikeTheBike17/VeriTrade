const SUPABASE_URL = "https://ppbeiefwfqwmtatfgsve.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_lb1Eiw4hXEfTMDYh3nMp0w_WolruYMh";
const DEFAULT_WORKSPACE_ACCESS = "Buyer and Seller";
const EMPTY_LABEL = "empty";

const hasSupabaseConfig = Boolean(
    window.supabase &&
    SUPABASE_URL &&
    !SUPABASE_URL.includes("YOUR_PROJECT_REF") &&
    !SUPABASE_URL.includes("YOUR_SUPABASE_URL")
);

const supabase = hasSupabaseConfig
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
    document.querySelectorAll('.nav-links a[href="user.html"]').forEach((link) => {
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

function renderSellerSummary(profile) {
    if (!profile) {
        return;
    }

    const linkedMarketplaces = Array.isArray(profile.linked_marketplaces) ? profile.linked_marketplaces : [];

    setTextContent("seller-summary-name", profile.full_name || EMPTY_LABEL);
    setTextContent("seller-summary-phone", profile.phone_number || EMPTY_LABEL);
    setTextContent("seller-summary-business", profile.business_name || EMPTY_LABEL);
    setTextContent("seller-summary-social", profile.social_handle_url || EMPTY_LABEL);
    setTextContent("seller-summary-marketplace-link", profile.marketplace_profile_link || EMPTY_LABEL);
    setTextContent(
        "seller-summary-marketplaces",
        linkedMarketplaces.length ? linkedMarketplaces.join(", ") : EMPTY_LABEL
    );
    setTextContent(
        "seller-summary-otp",
        profile.otp_alerts === true ? "Enabled" : profile.otp_alerts === false ? "Disabled" : EMPTY_LABEL
    );
}

function renderBuyerResult(check) {
    const resultCard = document.getElementById("buyer-result-card");
    const riskElement = document.getElementById("buyer-result-risk");

    if (!resultCard || !riskElement) {
        return;
    }

    resultCard.classList.remove("is-low", "is-medium", "is-high");
    riskElement.className = "result-pill neutral-pill";

    if (!check) {
        setTextContent("buyer-result-heading", EMPTY_LABEL);
        setTextContent(
            "buyer-result-message",
            "Run a verification check to see a trust score, risk category, and matched seller signals."
        );
        setTextContent("buyer-result-score", EMPTY_LABEL);
        setTextContent("buyer-result-risk", EMPTY_LABEL);
        setTextContent("buyer-result-registered", EMPTY_LABEL);
        setTextContent("buyer-result-match-rate", EMPTY_LABEL);
        setTextContent("buyer-result-otp", EMPTY_LABEL);
        return;
    }

    const trustScore = Number(check.trust_score);
    const matchedDetailRate = Number(check.matched_detail_rate);
    const riskCategory = check.risk_category || getRiskCategory(trustScore || 0);
    const pillClass = `${riskCategory.toLowerCase()}-pill`;

    resultCard.classList.add(`is-${riskCategory.toLowerCase()}`);
    riskElement.className = `result-pill ${pillClass}`;

    setTextContent(
        "buyer-result-heading",
        check.matched_registered_user ? "Registered seller match found" : "Verification completed"
    );
    setTextContent(
        "buyer-result-message",
        getRiskMessage({
            riskCategory,
            isRegisteredUser: Boolean(check.matched_registered_user),
            otpConfirmed: Boolean(check.otp_confirmed),
            matchedDetailRate: Number.isFinite(matchedDetailRate) ? matchedDetailRate : null
        })
    );
    setTextContent(
        "buyer-result-score",
        Number.isFinite(trustScore) ? `${trustScore}/100` : EMPTY_LABEL
    );
    setTextContent("buyer-result-risk", `${riskCategory} risk`);
    setTextContent(
        "buyer-result-registered",
        check.matched_registered_user
            ? check.matched_username
                ? `Yes - ${check.matched_username}`
                : "Yes"
            : "No registered match"
    );
    setTextContent(
        "buyer-result-match-rate",
        Number.isFinite(matchedDetailRate) ? `${matchedDetailRate}%` : EMPTY_LABEL
    );
    setTextContent("buyer-result-otp", check.otp_confirmed ? "Confirmed" : "Not confirmed");
}

function getDisplayProfile(profile, user) {
    return {
        ...profile,
        full_name: profile?.full_name || user.user_metadata?.full_name || EMPTY_LABEL,
        username: profile?.username || user.user_metadata?.username || user.email?.split("@")[0] || EMPTY_LABEL,
        auth_email: profile?.auth_email || user.email || EMPTY_LABEL
    };
}

async function resolveLoginEmail(loginValue) {
    if (loginValue.includes("@")) {
        return loginValue.toLowerCase();
    }

    if (!supabase) {
        return null;
    }

    const { data, error } = await supabase.rpc("get_login_email", {
        p_login: loginValue.toLowerCase()
    });

    if (error) {
        return null;
    }

    return data || null;
}

async function isUsernameTaken(username) {
    if (!supabase) {
        return false;
    }

    const { data, error } = await supabase.rpc("get_login_email", {
        p_login: username.toLowerCase()
    });

    if (error) {
        return false;
    }

    return Boolean(data);
}

async function syncProfileFromUser(user) {
    if (!supabase || !user) {
        return null;
    }

    const username = user.user_metadata?.username || user.email?.split("@")[0] || "";
    const fullName = user.user_metadata?.full_name || "";
    const profilePayload = {
        id: user.id,
        username: username.toLowerCase(),
        full_name: fullName,
        auth_email: user.email,
        workspace_access: DEFAULT_WORKSPACE_ACCESS
    };

    const { data, error } = await supabase
        .from("profiles")
        .upsert(profilePayload, {
            onConflict: "id"
        })
        .select("*")
        .maybeSingle();

    if (error) {
        return null;
    }

    await supabase.from("user_analytics").upsert(
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
    if (!supabase || !userId) {
        return null;
    }

    const { data } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
    return data || null;
}

async function getCurrentSession() {
    if (!supabase) {
        return null;
    }

    const {
        data: { session }
    } = await supabase.auth.getSession();

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
    if (!supabase || !userId || !title || !description) {
        return;
    }

    await supabase.from("user_history").insert({
        user_id: userId,
        event_type: eventType,
        title,
        description,
        sentiment,
        related_check_id: relatedCheckId
    });
}

async function upsertAnalyticsSnapshot(userId, snapshot) {
    if (!supabase || !userId || !snapshot) {
        return;
    }

    await supabase.from("user_analytics").upsert(
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
        supabase.from("verification_checks").select("*").eq("user_id", userId),
        supabase
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

function bindSignOutLinks() {
    document.querySelectorAll("[data-signout-link]").forEach((link) => {
        link.addEventListener("click", async (event) => {
            event.preventDefault();

            if (supabase) {
                await supabase.auth.signOut();
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

    function showLoginForm() {
        loginForm.classList.add("active");
        signupForm.classList.remove("active");
        loginToggle.classList.add("active");
        signupToggle.classList.remove("active");
        clearFormErrors();
    }

    function showSignupForm() {
        signupForm.classList.add("active");
        loginForm.classList.remove("active");
        signupToggle.classList.add("active");
        loginToggle.classList.remove("active");
        clearFormErrors();
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
        const termsCheckbox = document.querySelector('input[name="terms"]');

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

        if (!termsCheckbox.checked) {
            showErrorMessage("signup-terms-error", "You must agree to the Terms of Service");
            isValid = false;
        }

        return isValid;
    }

    loginToggle.addEventListener("click", showLoginForm);
    signupToggle.addEventListener("click", showSignupForm);

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
        showSignupForm();
    } else {
        showLoginForm();
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
        showLoginForm
    };
}

async function initAuthPage() {
    const authUi = initAuthUi();
    if (!authUi) {
        return;
    }

    if (!supabase) {
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

    const existingSession = await getCurrentSession();
    if (existingSession) {
        window.location.href = "user.html";
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
            authUi.showErrorMessage("login-password-error", "Incorrect username/email or password.");
            return;
        }

        const { data, error } = await supabase.auth.signInWithPassword({
            email: resolvedEmail,
            password
        });

        if (error) {
            authUi.showErrorMessage("login-password-error", "Incorrect username/email or password.");
            return;
        }

        if (data.user) {
            await syncProfileFromUser(data.user);
        }

        showAlert("Login successful! Redirecting to your workspace...");
        setTimeout(() => {
            authUi.loginForm.reset();
            window.location.href = "user.html";
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

        const { data, error } = await supabase.auth.signUp({
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

        if (data.session && data.user) {
            await syncProfileFromUser(data.user);
            showAlert("Account created successfully! Opening your workspace...");
            setTimeout(() => {
                authUi.signupForm.reset();
                window.location.href = "user.html";
            }, 1200);
            return;
        }

        showAlert("Account created. Confirm your email, then log in with your username and password.");
        authUi.signupForm.reset();
        authUi.showLoginForm();
    });
}

async function ensurePortalSession() {
    if (!supabase) {
        return null;
    }

    const session = await getCurrentSession();
    if (!session) {
        window.location.href = "auth.html?mode=login";
        return null;
    }

    bindSignOutLinks();

    supabase.auth.onAuthStateChange((event, nextSession) => {
        if (event === "SIGNED_OUT" || !nextSession) {
            window.location.href = "auth.html?mode=login";
        }
    });

    const syncedProfile = await syncProfileFromUser(session.user);
    const profile = syncedProfile || (await fetchCurrentProfile(session.user.id)) || getBaseProfileFromUser(session.user);

    populateAccountNav(profile);

    return {
        session,
        profile
    };
}

async function initUserPage(session, initialProfile) {
    const { profile, historyList, snapshot } = await collectUserSnapshot(session.user.id, initialProfile);
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
}

async function initSellerPage(session, initialProfile) {
    const form = document.getElementById("seller-profile-form");
    if (!form) {
        return;
    }

    const profile = initialProfile || getBaseProfileFromUser(session.user);
    const linkedMarketplaces = Array.isArray(profile.linked_marketplaces) ? profile.linked_marketplaces : [];

    document.getElementById("seller-full-name").value = profile.full_name || session.user.user_metadata?.full_name || "";
    document.getElementById("seller-username").value = profile.username || session.user.user_metadata?.username || "";
    document.getElementById("seller-email").value = profile.auth_email || session.user.email || "";
    document.getElementById("seller-phone").value = profile.phone_number || "";
    document.getElementById("seller-business-name").value = profile.business_name || "";
    document.getElementById("seller-social-handle").value = profile.social_handle_url || "";
    document.getElementById("seller-bank-holder").value = profile.bank_account_holder_name || "";
    document.getElementById("seller-marketplace-link").value = profile.marketplace_profile_link || "";
    document.getElementById("seller-marketplaces").value = linkedMarketplaces.join(", ");
    document.getElementById("seller-otp-alerts").checked = profile.otp_alerts === true;

    renderSellerSummary(profile);

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const updatedProfile = {
            id: session.user.id,
            username: (profile.username || session.user.user_metadata?.username || "").toLowerCase(),
            full_name: profile.full_name || session.user.user_metadata?.full_name || "",
            auth_email: session.user.email,
            workspace_access: DEFAULT_WORKSPACE_ACCESS,
            phone_number: document.getElementById("seller-phone").value.trim(),
            business_name: document.getElementById("seller-business-name").value.trim(),
            social_handle_url: document.getElementById("seller-social-handle").value.trim(),
            bank_account_holder_name: document.getElementById("seller-bank-holder").value.trim(),
            marketplace_profile_link: document.getElementById("seller-marketplace-link").value.trim(),
            linked_marketplaces: parseMarketplaceList(document.getElementById("seller-marketplaces").value),
            otp_alerts: document.getElementById("seller-otp-alerts").checked
        };

        const { data, error } = await supabase
            .from("profiles")
            .upsert(updatedProfile, { onConflict: "id" })
            .select("*")
            .maybeSingle();

        if (error) {
            setStatusMessage("seller-save-status", error.message, "error");
            return;
        }

        const savedProfile = data || updatedProfile;

        renderSellerSummary(savedProfile);
        populateAccountNav(savedProfile);

        await createHistoryEntry({
            userId: session.user.id,
            eventType: "profile",
            title: "Seller profile updated",
            description: "Your seller verification details were saved and are now available for future buyer checks."
        });

        const { snapshot } = await collectUserSnapshot(session.user.id, savedProfile);
        await upsertAnalyticsSnapshot(session.user.id, snapshot);

        setStatusMessage("seller-save-status", "Seller profile saved successfully.", "success");
    });
}

async function findSellerMatches(criteria) {
    if (!supabase) {
        return [];
    }

    const { data, error } = await supabase.rpc("search_seller_matches", {
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

async function loadLatestBuyerResult(userId) {
    const { data } = await supabase
        .from("verification_checks")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    renderBuyerResult(data || null);
}

async function initBuyerPage(session) {
    const form = document.getElementById("buyer-check-form");
    if (!form) {
        return;
    }

    await loadLatestBuyerResult(session.user.id);

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const checkPayload = {
            user_id: session.user.id,
            seller_username_input: document.getElementById("buyer-seller-username").value.trim(),
            seller_email: document.getElementById("buyer-seller-email").value.trim().toLowerCase(),
            seller_phone: document.getElementById("buyer-seller-phone").value.trim(),
            social_handle_url: document.getElementById("buyer-social-handle").value.trim(),
            business_name: document.getElementById("buyer-business-name").value.trim(),
            bank_account_holder_name: document.getElementById("buyer-bank-holder").value.trim(),
            marketplace_profile_link: document.getElementById("buyer-marketplace-link").value.trim(),
            otp_confirmed: document.getElementById("buyer-otp-confirmed").checked
        };

        const matches = await findSellerMatches(checkPayload);
        const result = calculateTrustResult(checkPayload, matches);

        if (!result) {
            setStatusMessage(
                "buyer-check-status",
                "Add at least one seller detail before calculating a trust score.",
                "error"
            );
            renderBuyerResult(null);
            return;
        }

        const insertPayload = {
            ...checkPayload,
            seller_profile_id: result.matchedSellerId,
            matched_registered_user: result.matchedRegisteredUser,
            matched_username: result.matchedUsername,
            matched_detail_rate: result.matchedDetailRate,
            trust_score: result.trustScore,
            risk_category: result.riskCategory
        };

        const { data, error } = await supabase
            .from("verification_checks")
            .insert(insertPayload)
            .select("*")
            .single();

        if (error) {
            setStatusMessage("buyer-check-status", error.message, "error");
            return;
        }

        renderBuyerResult(data);

        await createHistoryEntry({
            userId: session.user.id,
            eventType: "verification",
            title: "Buyer trust check completed",
            description: `A seller verification check returned a score of ${result.trustScore}/100 with ${result.riskCategory.toLowerCase()} risk.`,
            relatedCheckId: data.id
        });

        const { snapshot } = await collectUserSnapshot(session.user.id);
        await upsertAnalyticsSnapshot(session.user.id, snapshot);

        setStatusMessage("buyer-check-status", "Trust score saved to your account history.", "success");
        form.reset();
    });
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

    if (document.getElementById("buyer-check-form")) {
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
