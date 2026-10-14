// @ts-nocheck

/* =========================================================
GEPA PERSONAL WEBSITE - SCRIPT.JS
Vanilla JavaScript

Payment System & Supabase Auth Integration (Sign In, Sign Up, Profile, History)
========================================================= */

document.addEventListener("DOMContentLoaded", () => {

/* =========================
ELEMENTS
========================= */
const body = document.body;
const header = document.querySelector(".site-header");
const mobileMenuButton = document.getElementById("mobileMenuButton");
const navMenu = document.getElementById("navMenu");
const navLinks = document.querySelectorAll(".nav-link");
const themeToggle = document.getElementById("themeToggle");
const themeIcon = document.getElementById("themeIcon");
const currentYear = document.getElementById("currentYear");
const ageDisplay = document.getElementById("ageDisplay");
const toast = document.getElementById("toast");
const revealElements = document.querySelectorAll(".reveal");

// Auth Elements
const openAuthModalBtn = document.getElementById("openAuthModalBtn");
const submitLoginEmailBtn = document.getElementById("submitLoginEmailBtn");
const toggleAuthModeLink = document.getElementById("toggleAuthModeLink");
const authUsernameField = document.getElementById("authUsernameField");
const authUsernameInput = document.getElementById("authUsernameInput");
const authConfirmPasswordField = document.getElementById("authConfirmPasswordField");
const authConfirmPasswordInput = document.getElementById("authConfirmPasswordInput");
const authUsernameError = document.getElementById("authUsernameError");
const authenticatedUsernameField = document.getElementById("authenticatedUsernameField");
const guestUsernameField = document.getElementById("guestUsernameField");
const loginForUsernameLink = document.getElementById("loginForUsernameLink");

// Support & Payment Elements
const supportButton = document.getElementById("supportButton");
const amountButtons = document.querySelectorAll(".amount-button");
const customAmount = document.getElementById("customAmount");
const selectedAmount = document.getElementById("selectedAmount");
const continueSupport = document.getElementById("continueSupport");
const supporterUsername = document.getElementById("supporterUsername");
const usernameError = document.getElementById("usernameError");

// Ranking Elements
const rankTabs = document.querySelectorAll(".rank-tab");
const rankingList = document.getElementById("rankingList");

// Info Cards Clickable
const ageCard = document.getElementById("ageCard");
const locationCard = document.getElementById("locationCard");
const hobbyCard = document.getElementById("hobbyCard");

// Live Age Counters
const ageYears = document.getElementById("ageYears");
const ageMonths = document.getElementById("ageMonths");
const ageDays = document.getElementById("ageDays");
const ageHours = document.getElementById("ageHours");
const ageMinutes = document.getElementById("ageMinutes");
const ageSeconds = document.getElementById("ageSeconds");


/* =========================================================
   OVERHAULED AUTHENTICATION & SESSION MANAGER
   Local storage persistence + Server / Supabase sync
========================================================= */
const AUTH_STORAGE_KEY = "gepa_corner_auth_session";
let currentUserSession = null;
let userProfileCache = null;

// Initialize session from localStorage and sync with server
function initAuthSession() {
    try {
        let saved = localStorage.getItem(AUTH_STORAGE_KEY);
        if (!saved) {
            saved = localStorage.getItem("gepa_auth_session");
        }
        if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed && parsed.user) {
                applyUserSession(parsed, false);
                // Background check if user data was updated on server
                const targetId = parsed.user.id || "";
                fetch(`/api/auth?action=me&userId=${encodeURIComponent(targetId)}`, {
                    headers: parsed.token ? { "Authorization": `Bearer ${parsed.token}` } : {}
                })
                .then(res => res.ok ? res.json() : null)
                .then(data => {
                    if (data && data.user) {
                        parsed.user = { ...parsed.user, ...data.user };
                        applyUserSession(parsed, true);
                    }
                })
                .catch(() => {});
            }
        } else {
            syncSupportModalAuthState();
        }
    } catch (e) {
        console.warn("Failed to load saved auth session:", e);
    }
}

function syncSupportModalAuthState() {
    const guestField = document.getElementById("guestUsernameField");
    const authField = document.getElementById("authenticatedUsernameField");
    const input = document.getElementById("supporterUsername");
    const supporterAvatarPreview = document.getElementById("supporterAvatarPreview");
    const activeUser = (currentUserSession && currentUserSession.user) || userProfileCache;

    if (activeUser && activeUser.username) {
        if (guestField) guestField.style.display = "none";
        if (authField) authField.style.display = "block";
        if (input) {
            input.value = activeUser.username;
            input.readOnly = true;
            input.style.background = "var(--bg-secondary)";
            input.style.cursor = "not-allowed";
        }
        if (supporterAvatarPreview) {
            const avatar = activeUser.avatar || "👤";
            const isImg = typeof avatar === "string" && (avatar.startsWith("http://") || avatar.startsWith("https://") || avatar.startsWith("data:image"));
            if (isImg) {
                supporterAvatarPreview.innerHTML = `<img src="${avatar}" alt="Avatar" style="width: 24px; height: 24px; border-radius: 50%; object-fit: cover; vertical-align: middle;">`;
            } else {
                supporterAvatarPreview.textContent = avatar;
            }
        }
    } else {
        if (guestField) guestField.style.display = "flex";
        if (authField) authField.style.display = "none";
        if (input) {
            input.value = "";
            input.readOnly = false;
            input.style.background = "";
            input.style.cursor = "";
        }
    }
}

window.openSupportModal = function() {
    syncSupportModalAuthState();
    openInfoModal("supportModal");
};

function applyUserSession(session, saveToStorage = true) {
    currentUserSession = session;
    userProfileCache = session ? session.user : null;
    
    if (saveToStorage) {
        if (session) {
            localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
            localStorage.setItem("gepa_auth_session", JSON.stringify(session));
        } else {
            localStorage.removeItem(AUTH_STORAGE_KEY);
            localStorage.removeItem("gepa_auth_session");
        }
    }

    updateNavbarAuthState();
    syncSupportModalAuthState();

    if (session && session.user) {
        loadUserProfileData(session.user);
    }

    // Auto reopen support modal if user authenticated via donate link
    if (window._reopenSupportModalAfterAuth) {
        window._reopenSupportModalAfterAuth = false;
        closeInfoModal("authModal");
        setTimeout(() => {
            openSupportModal();
        }, 150);
    }
}

function updateNavbarAuthState() {
    if (!openAuthModalBtn) return;
    
    if (currentUserSession && currentUserSession.user) {
        const u = currentUserSession.user;
        const avatarDisplay = u.avatar || "👤";
        const isImg = typeof avatarDisplay === "string" && (avatarDisplay.startsWith("http://") || avatarDisplay.startsWith("https://") || avatarDisplay.startsWith("data:image"));
        openAuthModalBtn.className = "auth-nav-btn";
        openAuthModalBtn.title = `Akun: @${u.username}`;
        openAuthModalBtn.innerHTML = `
            <span class="auth-nav-avatar">
                ${isImg ? `<img src="${avatarDisplay}" style="width: 20px; height: 20px; border-radius: 50%; object-fit: cover;">` : `<span style="font-size: 0.95rem;">${avatarDisplay}</span>`}
            </span>
            <span style="font-weight: 700;">@${u.username}</span>
        `;
        openAuthModalBtn.onclick = () => {
            loadUserProfileData(currentUserSession.user);
            openInfoModal("accountModal");
        };
    } else {
        openAuthModalBtn.className = "button button-primary";
        openAuthModalBtn.style.cssText = "padding: 8px 16px; font-size: 0.85rem; border-radius: 12px; margin-left: 6px;";
        openAuthModalBtn.title = "Masuk ke Akun";
        openAuthModalBtn.innerHTML = "✨ Masuk";
        openAuthModalBtn.onclick = () => {
            if (window.switchAuthTab) window.switchAuthTab('login');
            openInfoModal("authModal");
        };
    }
}

/* =========================================================
   LOAD USER PROFILE & DONATION STATS
========================================================= */
async function loadUserProfileData(user) {
    if (!user) return;
    
    // Header Hero Elements
    const accHeroEmoji = document.getElementById("accHeroEmoji");
    const accHeroImg = document.getElementById("accHeroImg");
    const accDisplayName = document.getElementById("accDisplayName");
    const accBioDisplay = document.getElementById("accBioDisplay");
    const accEmailDisplay = document.getElementById("accEmailDisplay");
    
    // Inputs
    const usernameInput = document.getElementById("accUsernameInput");
    const bioInput = document.getElementById("accBioInput");
    const phoneInput = document.getElementById("accPhoneInput");
    const customAvatarUrlInput = document.getElementById("accCustomAvatarUrl");
    
    // Render Avatar
    const avatar = user.avatar || "👤";
    const isImageUrl = typeof avatar === "string" && (avatar.startsWith("http://") || avatar.startsWith("https://") || avatar.startsWith("data:image"));
    if (isImageUrl && accHeroImg && accHeroEmoji) {
        accHeroImg.src = avatar;
        accHeroImg.style.display = "block";
        accHeroEmoji.style.display = "none";
    } else if (accHeroEmoji && accHeroImg) {
        accHeroEmoji.textContent = avatar;
        accHeroEmoji.style.display = "block";
        accHeroImg.style.display = "none";
    }

    if (accDisplayName) accDisplayName.textContent = `@${user.username}`;
    if (accBioDisplay) accBioDisplay.textContent = user.bio ? `"${user.bio}"` : `"Sahabat Corner"`;
    if (accEmailDisplay) accEmailDisplay.textContent = user.email || `${user.username}@gepacorner.my.id`;
    if (usernameInput) usernameInput.value = user.username || "";
    if (bioInput) bioInput.value = user.bio || "";
    if (phoneInput) phoneInput.value = user.phone || "";
    if (customAvatarUrlInput) customAvatarUrlInput.value = isImageUrl ? avatar : "";
    
    // Highlight currently selected avatar in account modal if emoji
    const accAvatarBtns = document.querySelectorAll("#accAvatarPicker .avatar-choice-btn");
    accAvatarBtns.forEach(btn => {
        btn.classList.toggle("selected", !isImageUrl && btn.dataset.avatar === avatar);
    });

    // Load donation history and calculate statistics
    await loadUserDonationHistoryAndStats(user);
}

async function loadUserDonationHistoryAndStats(user) {
    if (!user || !user.username) return;
    const historyList = document.getElementById("userHistoryList");
    const statTotalAmount = document.getElementById("accStatTotalAmount");
    const statTxCount = document.getElementById("accStatTxCount");
    const statRankPos = document.getElementById("accStatRankPos");
    const tierBadge = document.getElementById("accTierBadge");

    const donationMap = new Map();
    const targetUsername = String(user.username || "").replace(/^@/, "").trim().toLowerCase();

    function ingestItem(d) {
        if (!d) return;
        const orderId = d.order_id || d.orderId;
        if (!orderId) return;

        const rawUser = String(d.username || "").replace(/^@/, "").trim().toLowerCase();
        // If donation has a username and doesn't match this user, skip it
        if (rawUser && rawUser !== targetUsername) {
            return;
        }

        const amount = Number(d.amount || d.gross_amount) || 0;
        const rawStatus = String(d.status || d.transaction_status || "pending").toLowerCase();
        const isSuccess = rawStatus === "settlement" || rawStatus === "capture" || rawStatus === "success" || rawStatus === "200";
        const status = isSuccess ? "settlement" : rawStatus;
        const paymentType = d.payment_type || d.paymentType || "ONLINE PAYMENT";
        const time = d.transaction_time || d.transactionTime || d.createdAt || (typeof d.createdAt === "number" ? new Date(d.createdAt).toISOString() : new Date().toISOString());

        const existing = donationMap.get(orderId);
        if (!existing) {
            donationMap.set(orderId, {
                order_id: orderId,
                orderId: orderId,
                amount: amount,
                gross_amount: amount,
                status: status,
                transaction_status: status,
                payment_type: paymentType,
                paymentType: paymentType,
                transaction_time: time,
                username: user.username
            });
        } else {
            if (isSuccess) {
                existing.status = "settlement";
                existing.transaction_status = "settlement";
            }
            if (amount > 0 && (existing.amount === 0 || !existing.amount)) existing.amount = amount;
            if (!existing.transaction_time && time) existing.transaction_time = time;
        }
    }

    try {
        // Source 1: Authoritative server /api/user-donations (Supabase & memory sync)
        const queryUrl = `/api/user-donations?username=${encodeURIComponent(user.username)}&userId=${encodeURIComponent(user.id || "")}`;
        const token = currentUserSession ? (currentUserSession.accessToken || currentUserSession.token) : null;
        const headers = token ? { "Authorization": `Bearer ${token}` } : {};
        const res = await fetch(queryUrl, { headers }).catch(() => null);
        if (res && res.ok) {
            const apiData = await res.json().catch(() => []);
            if (Array.isArray(apiData)) {
                apiData.forEach(ingestItem);
            }
        }

        // Source 2: Main completed history array from localStorage
        const rawHistory = localStorage.getItem("gepa_completed_donations");
        if (rawHistory) {
            try {
                const list = JSON.parse(rawHistory);
                if (Array.isArray(list)) list.forEach(ingestItem);
            } catch (e) {}
        }

        // Source 3: User-specific local storage
        const userKey = "gepa_user_donations_" + targetUsername;
        const rawUserHistory = localStorage.getItem(userKey);
        if (rawUserHistory) {
            try {
                const list = JSON.parse(rawUserHistory);
                if (Array.isArray(list)) list.forEach(ingestItem);
            } catch (e) {}
        }
    } catch (err) {
        console.warn("History fetch error:", err);
    }

    const donations = Array.from(donationMap.values());
    donations.sort((a, b) => new Date(b.transaction_time || 0).getTime() - new Date(a.transaction_time || 0).getTime());

    // Save user-specific donation history
    try {
        const userKey = "gepa_user_donations_" + targetUsername;
        localStorage.setItem(userKey, JSON.stringify(donations.slice(0, 100)));
    } catch (e) {}

    // Calculate stats strictly from verified successful transactions
    const successfulDonations = donations.filter(d => {
        const s = String(d.status || d.transaction_status || "").toLowerCase();
        return s === "settlement" || s === "capture" || s === "success" || s === "200";
    });

    let totalAmount = successfulDonations.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
    let txCount = successfulDonations.length;

    // Check with leaderboard cache to guarantee 100% data consistency
    if (window.rankingDataCache && window.rankingDataCache.lifetime) {
        const lifetime = window.rankingDataCache.lifetime || [];
        const rankItem = lifetime.find(item => item.username && item.username.replace(/^@/, "").toLowerCase() === targetUsername);
        const index = lifetime.findIndex(item => item.username && item.username.replace(/^@/, "").toLowerCase() === targetUsername);
        
        if (statRankPos) {
            statRankPos.textContent = index >= 0 ? `#${index + 1}` : "-";
        }
        if (rankItem) {
            if (rankItem.totalAmount > totalAmount) totalAmount = rankItem.totalAmount;
            if (rankItem.txCount > txCount) txCount = rankItem.txCount;
        }
    }

    if (statTotalAmount) statTotalAmount.textContent = `Rp${formatRupiah(totalAmount)}`;
    if (statTxCount) statTxCount.textContent = `${txCount}x`;

    // Tier badge calculation
    if (tierBadge) {
        if (totalAmount >= 100000) {
            tierBadge.innerHTML = `<span>👑 VIP Legend Supporter</span>`;
            tierBadge.style.background = "#d97706";
        } else if (totalAmount >= 20000) {
            tierBadge.innerHTML = `<span>🥈 Supporter Aktif</span>`;
            tierBadge.style.background = "var(--sage-700)";
        } else if (totalAmount > 0) {
            tierBadge.innerHTML = `<span>🥉 Sahabat Corner</span>`;
            tierBadge.style.background = "var(--sage-600)";
        } else {
            tierBadge.innerHTML = `<span>✨ Pendukung Baru</span>`;
            tierBadge.style.background = "var(--sage-500)";
        }
    }

    // Render history list
    if (historyList) {
        if (donations.length === 0) {
            historyList.innerHTML = `
                <div style="text-align: center; color: var(--text-soft); padding: 25px 15px;">
                    <div style="font-size: 2rem; margin-bottom: 8px;">☕</div>
                    <div style="font-weight: 600; font-size: 0.9rem; color: var(--text-main); margin-bottom: 4px;">Belum Ada Riwayat Traktir</div>
                    <p style="font-size: 0.8rem; margin: 0 0 14px 0;">Traktir Gepa kopi pertamamu untuk mulai mengumpulkan riwayat & masuk ke leaderboard!</p>
                    <button type="button" class="button button-primary" style="padding: 6px 16px; font-size: 0.8rem; border-radius: 10px;" onclick="closeInfoModal('accountModal'); openSupportModal();">
                        Traktir Sekarang ☕
                    </button>
                </div>
            `;
            return;
        }

        historyList.innerHTML = "";
        donations.forEach(item => {
            const div = document.createElement("div");
            div.style.cssText = "display: flex; justify-content: space-between; align-items: center; padding: 12px 14px; background: var(--bg-secondary); border-radius: 10px; margin-bottom: 8px; border: 1px solid var(--border); cursor: pointer; transition: transform 0.15s ease;";
            div.title = "Klik untuk membuka bukti invoice resmi";
            div.innerHTML = `
                <div>
                    <div style="font-weight: 700; font-size: 0.88rem; color: var(--text-main);">Rp${formatRupiah(item.amount)}</div>
                    <div style="font-size: 0.72rem; color: var(--text-soft); margin-top: 2px;">
                        ${item.order_id ? item.order_id + ' · ' : ''}${new Date(item.transaction_time || Date.now()).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                    </div>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 0.72rem; padding: 4px 8px; background: var(--sage-700); color: #fff; border-radius: 6px; font-weight: 600;">
                        ✓ Sukses
                    </span>
                    <button type="button" style="padding: 4px 8px; border: 1px solid var(--border); background: var(--sage-50); border-radius: 6px; font-size: 0.72rem; cursor: pointer; color: var(--sage-800); font-weight: 600;">
                        Invoice 📄
                    </button>
                </div>
            `;
            div.addEventListener("click", () => {
                if (item.order_id) {
                    closeInfoModal("accountModal");
                    showInvoiceModal(item.order_id, item);
                }
            });
            historyList.appendChild(div);
        });
    }
}

// Preview / Terapkan Custom Avatar Image URL
const applyAvatarUrlBtn = document.getElementById("applyAvatarUrlBtn");
if (applyAvatarUrlBtn) {
    applyAvatarUrlBtn.addEventListener("click", () => {
        const urlInput = document.getElementById("accCustomAvatarUrl");
        const url = (urlInput?.value || "").trim();
        if (!url || (!url.startsWith("http://") && !url.startsWith("https://") && !url.startsWith("data:image"))) {
            showToast("Masukkan URL gambar yang valid (dimulai dengan https://)");
            return;
        }

        const accHeroImg = document.getElementById("accHeroImg");
        const accHeroEmoji = document.getElementById("accHeroEmoji");
        if (accHeroImg && accHeroEmoji) {
            accHeroImg.src = url;
            accHeroImg.style.display = "block";
            accHeroEmoji.style.display = "none";
        }

        // Hapus seleksi preset avatar
        document.querySelectorAll("#accAvatarPicker .avatar-choice-btn").forEach(b => b.classList.remove("selected"));
        showToast("Foto profil diterapkan ke preview! Klik 'Simpan Perubahan' untuk mengunci.");
    });
}

// Simpan Perubahan Profil di Account Modal
const saveProfileBtn = document.getElementById("saveProfileBtn");
if (saveProfileBtn) {
    saveProfileBtn.addEventListener("click", async () => {
        if (!currentUserSession || !currentUserSession.user) return;
        const newUsername = (document.getElementById("accUsernameInput").value || "").trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
        const newBio = (document.getElementById("accBioInput")?.value || "").trim().substring(0, 60);
        const newPhone = (document.getElementById("accPhoneInput").value || "").trim();
        
        // Cek apakah user menggunakan URL gambar kustom
        const customUrl = (document.getElementById("accCustomAvatarUrl")?.value || "").trim();
        const selectedBtn = document.querySelector("#accAvatarPicker .avatar-choice-btn.selected");
        
        let newAvatar = currentUserSession.user.avatar || "🐱";
        if (customUrl && (customUrl.startsWith("http://") || customUrl.startsWith("https://") || customUrl.startsWith("data:image"))) {
            newAvatar = customUrl;
        } else if (selectedBtn && selectedBtn.dataset.avatar) {
            newAvatar = selectedBtn.dataset.avatar;
        }

        if (!newUsername || newUsername.length < 3) {
            showToast("Username minimal 3 karakter (huruf, angka, _)");
            return;
        }

        saveProfileBtn.textContent = "Menyimpan...";
        saveProfileBtn.disabled = true;

        try {
            const authHeaders = { "Content-Type": "application/json" };
            const token = currentUserSession.accessToken || currentUserSession.token;
            if (token) authHeaders["Authorization"] = `Bearer ${token}`;

            const res = await fetch("/api/auth", {
                method: "POST",
                headers: authHeaders,
                body: JSON.stringify({
                    action: "update-profile",
                    userId: currentUserSession.user.id,
                    username: newUsername,
                    bio: newBio,
                    phone: newPhone,
                    avatar: newAvatar
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Gagal menyimpan perubahan");

            // Update session cache
            currentUserSession.user.username = newUsername;
            currentUserSession.user.bio = newBio;
            currentUserSession.user.phone = newPhone;
            currentUserSession.user.avatar = newAvatar;
            applyUserSession(currentUserSession, true);

            // Update avatar langsung di cache leaderboard agar sinkron 100% instan
            if (window.rankingDataCache) {
                ["daily", "weekly", "lifetime"].forEach(period => {
                    const list = window.rankingDataCache[period] || [];
                    list.forEach(item => {
                        if (item.username && item.username.replace(/^@/, "").toLowerCase() === newUsername.toLowerCase()) {
                            item.avatar = newAvatar;
                        }
                    });
                });
                renderRanking(currentRankTab);
            }

            // Muat ulang data hero & refresh ranking dari server
            loadUserProfileData(currentUserSession.user);
            fetchRankings();

            showToast("Profil & foto avatar berhasil diperbarui! ✨");
        } catch (err) {
            showToast(err.message || "Gagal memperbarui profil.");
        } finally {
            saveProfileBtn.textContent = "Simpan Perubahan ✨";
            saveProfileBtn.disabled = false;
        }
    });
}

// Logout Handler
const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
        applyUserSession(null, true);
        closeInfoModal("accountModal");
        showToast("Kamu telah keluar dari akun. Sampai jumpa! 👋");
    });
}

initAuthSession();


/* =========================================================
CURRENT YEAR
========================================================= */
if (currentYear) {
    currentYear.textContent = new Date().getFullYear();
}


/* =========================================================
REAL-TIME AGE
========================================================= */
const birthDate = new Date(2006, 4, 17, 0, 0, 0);

function calculateFullAge() {
    const now = new Date();
    if (now < birthDate) return { years: 0, months: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };

    let years = now.getFullYear() - birthDate.getFullYear();
    let months = now.getMonth() - birthDate.getMonth();
    let days = now.getDate() - birthDate.getDate();
    let hours = now.getHours() - birthDate.getHours();
    let minutes = now.getMinutes() - birthDate.getMinutes();
    let seconds = now.getSeconds() - birthDate.getSeconds();

    if (seconds < 0) { minutes--; seconds += 60; }
    if (minutes < 0) { hours--; minutes += 60; }
    if (hours < 0) { days--; hours += 24; }
    if (days < 0) {
        months--;
        const previousMonth = new Date(now.getFullYear(), now.getMonth(), 0);
        days += previousMonth.getDate();
    }
    if (months < 0) { years--; months += 12; }

    return { years, months, days, hours, minutes, seconds };
}

function updateAge() {
    const age = calculateFullAge();
    const newAgeText = `${age.years} years`;
    if (ageDisplay && ageDisplay.textContent !== newAgeText) {
        ageDisplay.textContent = newAgeText;
    }

    const ageModal = document.getElementById("ageModalOverlay");
    if (ageModal && ageModal.classList.contains("open")) {
        if (ageYears) ageYears.textContent = age.years;
        if (ageMonths) ageMonths.textContent = age.months;
        if (ageDays) ageDays.textContent = age.days;
        if (ageHours) ageHours.textContent = age.hours;
        if (ageMinutes) ageMinutes.textContent = age.minutes;
        if (ageSeconds) ageSeconds.textContent = age.seconds;
    }
}

updateAge();
setInterval(updateAge, 1000);


/* =========================================================
MOBILE NAVIGATION
========================================================= */
function closeMobileMenu() {
    if (!navMenu || !mobileMenuButton) return;
    navMenu.classList.remove("open");
    mobileMenuButton.setAttribute("aria-expanded", "false");
}

function toggleMobileMenu(e) {
    if (!navMenu || !mobileMenuButton) return;
    if (e) e.stopPropagation();
    const isOpen = navMenu.classList.toggle("open");
    mobileMenuButton.setAttribute("aria-expanded", String(isOpen));
}

if (mobileMenuButton) {
    mobileMenuButton.addEventListener("click", toggleMobileMenu);
}

navLinks.forEach((link) => {
    link.addEventListener("click", closeMobileMenu);
});


/* =========================================================
HEADER SCROLL & ACTIVE NAVIGATION
========================================================= */
function updateHeader() {
    if (!header) return;
    if (window.scrollY > 20) {
        header.classList.add("scrolled");
    } else {
        header.classList.remove("scrolled");
    }
}

const sections = document.querySelectorAll("main section[id]");

function updateActiveNavigation() {
    const scrollPosition = window.scrollY + 150;
    let currentSection = "home";

    sections.forEach((section) => {
        const sectionTop = section.offsetTop;
        const sectionBottom = sectionTop + section.offsetHeight;
        if (scrollPosition >= sectionTop && scrollPosition < sectionBottom) {
            currentSection = section.id;
        }
    });

    navLinks.forEach((link) => {
        const href = link.getAttribute("href");
        link.classList.toggle("active", href === `#${currentSection}`);
    });
}

window.addEventListener("scroll", () => {
    updateHeader();
    updateActiveNavigation();
}, { passive: true });

updateHeader();
updateActiveNavigation();


/* =========================================================
THEME
========================================================= */
function applyInitialTheme() {
    const savedTheme = localStorage.getItem("gepa-theme");
    if (savedTheme === "dark") {
        body.classList.add("dark-mode");
    } else if (savedTheme === "light") {
        body.classList.remove("dark-mode");
    } else {
        const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
        if (prefersDark) body.classList.add("dark-mode");
    }
    updateThemeIcon();
}

function updateThemeIcon() {
    if (!themeIcon) return;
    const isDark = body.classList.contains("dark-mode");
    themeIcon.textContent = isDark ? "☀" : "☾";
}

if (themeToggle) {
    themeToggle.addEventListener("click", () => {
        const isDark = body.classList.toggle("dark-mode");
        localStorage.setItem("gepa-theme", isDark ? "dark" : "light");
        updateThemeIcon();
    });
}

applyInitialTheme();


/* =========================================================
REVEAL ON SCROLL
========================================================= */
if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add("visible");
                obs.unobserve(entry.target);
            }
        });
    }, { threshold: 0.12, rootMargin: "0px 0px -30px 0px" });

    revealElements.forEach((el) => observer.observe(el));
} else {
    revealElements.forEach((el) => el.classList.add("visible"));
}


/* =========================================================
PHOTO CAROUSEL
========================================================= */
const photoTrack = document.getElementById("photoTrack");
const photoCarousel = document.getElementById("photoCarousel");
const prevPhoto = document.getElementById("prevPhoto");
const nextPhoto = document.getElementById("nextPhoto");
const carouselDots = document.getElementById("carouselDots");

const photoList = [
    "assets/foto-1.jpg",
    "assets/foto-6.jpg"
];

let currentPhoto = 1;
let isMoving = false;
let startX = 0;
let currentX = 0;
let isDragging = false;

function createPhotoSlides() {
    if (!photoTrack) return;
    photoTrack.innerHTML = "";

    const createSlide = (photo, index, isClone) => {
        const slide = document.createElement("div");
        slide.className = "photo-slide";
        if (isClone) slide.classList.add("clone");

        const image = document.createElement("img");
        image.src = photo;
        image.alt = `Foto Gepa ${index + 1}`;
        image.loading = "eager";
        image.draggable = false;
        image.addEventListener("error", () => {
            slide.innerHTML = `
                <div class="photo-fallback"><span>G</span></div>
                <span class="photo-caption">foto ${index + 1}</span>
            `;
        });
        slide.appendChild(image);

        if (!isClone && index === 0) {
            const caption = document.createElement("span");
            caption.className = "photo-caption";
            caption.textContent = "that's me :)";
            slide.appendChild(caption);
        }
        photoTrack.appendChild(slide);
    };

    createSlide(photoList[photoList.length - 1], photoList.length - 1, true);
    photoList.forEach((photo, index) => createSlide(photo, index, false));
    createSlide(photoList[0], 0, true);

    photoTrack.style.transition = "none";
    photoTrack.style.transform = "translate3d(-100%, 0, 0)";
}

function createCarouselDots() {
    if (!carouselDots) return;
    carouselDots.innerHTML = "";
    photoList.forEach((_, index) => {
        const dot = document.createElement("button");
        dot.type = "button";
        dot.className = "carousel-dot";
        dot.addEventListener("click", () => goToPhoto(index));
        carouselDots.appendChild(dot);
    });
}

function updateDots() {
    if (!carouselDots) return;
    const dots = carouselDots.querySelectorAll(".carousel-dot");
    let activeIndex = currentPhoto - 1;
    if (currentPhoto === 0) activeIndex = photoList.length - 1;
    else if (currentPhoto === photoList.length + 1) activeIndex = 0;

    dots.forEach((dot, index) => {
        dot.classList.toggle("active", index === activeIndex);
    });
}

function moveCarousel(direction) {
    if (photoList.length <= 1 || isMoving || !photoTrack) return;
    isMoving = true;
    photoTrack.style.transition = "transform 420ms cubic-bezier(.22,.61,.36,1)";

    if (direction === "next") {
        currentPhoto++;
        photoTrack.style.transform = `translate3d(-${currentPhoto * 100}%, 0, 0)`;
        updateDots();
        setTimeout(() => {
            if (currentPhoto === photoList.length + 1) {
                photoTrack.style.transition = "none";
                currentPhoto = 1;
                photoTrack.style.transform = "translate3d(-100%, 0, 0)";
            }
            isMoving = false;
        }, 430);
    } else {
        currentPhoto--;
        photoTrack.style.transform = `translate3d(-${currentPhoto * 100}%, 0, 0)`;
        updateDots();
        setTimeout(() => {
            if (currentPhoto === 0) {
                photoTrack.style.transition = "none";
                currentPhoto = photoList.length;
                photoTrack.style.transform = `translate3d(-${currentPhoto * 100}%, 0, 0)`;
            }
            isMoving = false;
        }, 430);
    }
}

function goToPhoto(index) {
    if (!photoTrack) return;
    const targetPhoto = index + 1;
    if (isMoving || currentPhoto === targetPhoto) return;
    isMoving = true;
    currentPhoto = targetPhoto;
    photoTrack.style.transition = "transform 420ms cubic-bezier(.22,.61,.36,1)";
    photoTrack.style.transform = `translate3d(-${currentPhoto * 100}%, 0, 0)`;
    updateDots();
    setTimeout(() => { isMoving = false; }, 430);
}

if (prevPhoto) prevPhoto.addEventListener("click", () => moveCarousel("prev"));
if (nextPhoto) nextPhoto.addEventListener("click", () => moveCarousel("next"));

if (photoCarousel) {
    photoCarousel.addEventListener("touchstart", (e) => {
        if (e.touches.length !== 1) return;
        startX = e.touches[0].clientX;
        currentX = startX;
        isDragging = true;
        if (photoTrack) photoTrack.style.transition = "none";
    }, { passive: true });

    photoCarousel.addEventListener("touchmove", (e) => {
        if (!isDragging || !photoTrack) return;
        currentX = e.touches[0].clientX;
        const diff = currentX - startX;
        const width = photoCarousel.offsetWidth;
        const dragPercent = width > 0 ? (diff / width) * 100 : 0;
        const base = -(currentPhoto * 100);
        photoTrack.style.transform = `translate3d(${base + dragPercent}%, 0, 0)`;
    }, { passive: true });

    photoCarousel.addEventListener("touchend", () => {
        if (!isDragging || !photoTrack) return;
        isDragging = false;
        const diff = currentX - startX;
        if (Math.abs(diff) >= 45) {
            diff < 0 ? moveCarousel("next") : moveCarousel("prev");
        } else {
            photoTrack.style.transition = "transform 420ms cubic-bezier(.22,.61,.36,1)";
            photoTrack.style.transform = `translate3d(-${currentPhoto * 100}%, 0, 0)`;
        }
    }, { passive: true });
}

createPhotoSlides();
createCarouselDots();
updateDots();


/* =========================================================
MODAL SYSTEM & AUTH TOGGLE (MASUK / DAFTAR)
========================================================= */
window.openInfoModal = function(modalId) {
    if (modalId === "supportModal") {
        syncSupportModalAuthState();
    }
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add("open");
        body.classList.add("modal-open");
    }
};

window.closeInfoModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove("open");
        if (!document.querySelector(".modal-overlay.open")) {
            body.classList.remove("modal-open");
        }
    }
};

if (ageCard) ageCard.addEventListener("click", () => openInfoModal("ageModalOverlay"));
if (locationCard) locationCard.addEventListener("click", () => openInfoModal("locationModalOverlay"));
if (hobbyCard) hobbyCard.addEventListener("click", () => openInfoModal("hobbyModalOverlay"));

if (supportButton) {
    supportButton.addEventListener("click", () => {
        openSupportModal();
    });
}

if (openAuthModalBtn) {
    openAuthModalBtn.addEventListener("click", () => {
        if (currentUserSession && currentUserSession.user) {
            loadUserProfileData(currentUserSession.user);
            openInfoModal("accountModal");
        } else {
            if (window.switchAuthTab) window.switchAuthTab('login');
            openInfoModal("authModal");
        }
    });
}

if (loginForUsernameLink) {
    loginForUsernameLink.addEventListener("click", (e) => {
        e.preventDefault();
        window._reopenSupportModalAfterAuth = true;
        closeInfoModal("supportModal");
        if (window.switchAuthTab) window.switchAuthTab('login');
        openInfoModal("authModal");
    });
}

// Banner Alert Helper
function setAuthAlert(msg, type = "error") {
    const banner = document.getElementById("authAlertBanner");
    const icon = document.getElementById("authAlertIcon");
    const text = document.getElementById("authAlertText");
    if (!banner || !text) return;
    
    if (!msg) {
        banner.className = "auth-alert";
        banner.style.display = "none";
        return;
    }

    text.textContent = msg;
    if (type === "success") {
        banner.className = "auth-alert success";
        if (icon) icon.textContent = "✓";
    } else {
        banner.className = "auth-alert error";
        if (icon) icon.textContent = "⚠️";
    }
    banner.style.display = "flex";
}

// Switch Auth Modal Tabs (Login, Register, Reset)
window.switchAuthTab = function(tabName) {
    const tabButtons = document.querySelectorAll("#authSegmentTabs .auth-tab");
    const loginForm = document.getElementById("loginForm");
    const registerForm = document.getElementById("registerForm");
    const resetPasswordForm = document.getElementById("resetPasswordForm");
    const titleEl = document.getElementById("authModalTitle");
    const descEl = document.getElementById("authModalDesc");
    const segmentTabs = document.getElementById("authSegmentTabs");

    setAuthAlert(null); // Clear previous alerts

    if (tabName === "reset") {
        if (segmentTabs) segmentTabs.style.display = "none";
    } else {
        if (segmentTabs) segmentTabs.style.display = "flex";
    }

    tabButtons.forEach(btn => {
        btn.classList.toggle("active", btn.dataset.tab === tabName);
    });

    if (loginForm) loginForm.style.display = tabName === "login" ? "flex" : "none";
    if (registerForm) registerForm.style.display = tabName === "register" ? "flex" : "none";
    if (resetPasswordForm) resetPasswordForm.style.display = tabName === "reset" ? "flex" : "none";

    if (titleEl && descEl) {
        if (tabName === "login") {
            titleEl.textContent = "Masuk ke Corner";
            descEl.textContent = "Hubungkan akunmu buat lihat riwayat & ranking.";
        } else if (tabName === "register") {
            titleEl.textContent = "Daftar Akun Baru";
            descEl.textContent = "Daftar sekali untuk simpan traktiran & profil personal.";
        } else if (tabName === "reset") {
            titleEl.textContent = "Reset Kata Sandi 🔐";
            descEl.textContent = "Pulihkan akses akunmu secara mandiri via email terdaftar.";
        }
    }
};

// Global Password Visibility Toggle
window.togglePasswordVisibility = function(inputId, btnEl) {
    const input = document.getElementById(inputId);
    if (!input) return;
    if (input.type === "password") {
        input.type = "text";
        if (btnEl) btnEl.textContent = "🙈";
    } else {
        input.type = "password";
        if (btnEl) btnEl.textContent = "👁️";
    }
};

window.dismissRecoveryError = function() {
    const banner = document.getElementById("recoveryErrorBanner");
    if (banner) banner.style.display = "none";
};

window.backToResetStep1 = function() {
    const step1 = document.getElementById("resetStep1");
    const step2 = document.getElementById("resetStep2");
    if (step1) step1.style.display = "block";
    if (step2) step2.style.display = "none";
    setAuthAlert(null);
};

window.openResetPasswordView = function(e) {
    if (e) e.preventDefault();
    const step1 = document.getElementById("resetStep1");
    const step2 = document.getElementById("resetStep2");
    const identInput = document.getElementById("resetIdentifierInput");
    const otpInput = document.getElementById("resetOtpInput");
    const newPwdInput = document.getElementById("resetNewPasswordInput");
    const confirmPwdInput = document.getElementById("resetConfirmPasswordInput");
    const verifiedNotice = document.getElementById("resetLinkVerifiedNotice");
    const otpGroup = document.getElementById("resetOtpGroup");

    if (step1) step1.style.display = "block";
    if (step2) step2.style.display = "none";
    if (verifiedNotice) verifiedNotice.style.display = "none";
    if (otpGroup) otpGroup.style.display = "block";
    if (otpInput) otpInput.value = "";
    if (newPwdInput) newPwdInput.value = "";
    if (confirmPwdInput) confirmPwdInput.value = "";

    // Pre-fill identifier if already entered in login
    const loginIdent = document.getElementById("authLoginIdentifier")?.value || "";
    if (identInput && loginIdent) identInput.value = loginIdent;

    setAuthAlert(null);
    window.switchAuthTab("reset");
};

// Avatar Selection in Register Form
let currentRegAvatar = "🐱";
window.selectRegAvatar = function(emoji, label, btnEl) {
    currentRegAvatar = emoji;
    const labelEl = document.getElementById("selectedAvatarLabel");
    if (labelEl) labelEl.textContent = `${emoji} ${label}`;

    const allBtns = document.querySelectorAll("#regAvatarPicker .avatar-choice-btn");
    allBtns.forEach(b => b.classList.remove("selected"));
    if (btnEl) btnEl.classList.add("selected");
};

// Avatar Selection in Account Modal
window.selectAccAvatar = function(emoji, btnEl) {
    const heroEmoji = document.getElementById("accHeroEmoji");
    if (heroEmoji) heroEmoji.textContent = emoji;

    const allBtns = document.querySelectorAll("#accAvatarPicker .avatar-choice-btn");
    allBtns.forEach(b => b.classList.remove("selected"));
    if (btnEl) btnEl.classList.add("selected");
};

// Random Guest Name Generator
window.generateRandomGuestName = function(e) {
    if (e) e.preventDefault();
    const prefixes = ["KawanKopi", "SobatSantai", "GamerBogor", "BintangMalam", "TemanGepa", "PenikmatSenja", "SahabatSetia"];
    const randomName = prefixes[Math.floor(Math.random() * prefixes.length)] + "_" + Math.floor(Math.random() * 90 + 10);
    const input = document.getElementById("quickUsernameInput");
    if (input) input.value = randomName;
};

// Password Strength Meter Listener
const regPasswordInput = document.getElementById("regPasswordInput");
if (regPasswordInput) {
    regPasswordInput.addEventListener("input", () => {
        const val = regPasswordInput.value;
        const bar1 = document.getElementById("pwdBar1");
        const bar2 = document.getElementById("pwdBar2");
        const bar3 = document.getElementById("pwdBar3");
        const lbl = document.getElementById("regPwdStrengthLabel");
        if (!bar1 || !bar2 || !bar3 || !lbl) return;

        let score = 0;
        if (val.length >= 6) score++;
        if (val.length >= 8 && /[0-9]/.test(val)) score++;
        if (val.length >= 10 && /[^a-zA-Z0-9]/.test(val)) score++;

        if (val.length === 0) {
            bar1.style.background = "var(--border)";
            bar2.style.background = "var(--border)";
            bar3.style.background = "var(--border)";
            lbl.textContent = "-";
            lbl.style.color = "var(--text-soft)";
        } else if (score <= 1) {
            bar1.style.background = "#dc2626";
            bar2.style.background = "var(--border)";
            bar3.style.background = "var(--border)";
            lbl.textContent = "Lemah";
            lbl.style.color = "#dc2626";
        } else if (score === 2) {
            bar1.style.background = "#d97706";
            bar2.style.background = "#d97706";
            bar3.style.background = "var(--border)";
            lbl.textContent = "Sedang";
            lbl.style.color = "#d97706";
        } else {
            bar1.style.background = "#10b981";
            bar2.style.background = "#10b981";
            bar3.style.background = "#10b981";
            lbl.textContent = "Sangat Kuat";
            lbl.style.color = "#10b981";
        }
    });
}

// 1. SUBMIT LOGIN HANDLER
const submitLoginBtn = document.getElementById("submitLoginBtn");
if (submitLoginBtn) {
    submitLoginBtn.addEventListener("click", async () => {
        const identifier = (document.getElementById("authLoginIdentifier")?.value || "").trim();
        const password = document.getElementById("authLoginPassword")?.value || "";

        if (!identifier || !password) {
            setAuthAlert("Email atau Username serta Password wajib diisi.");
            return;
        }

        submitLoginBtn.disabled = true;
        submitLoginBtn.textContent = "Memverifikasi...";
        setAuthAlert(null);

        try {
            const res = await fetch("/api/auth", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "login", identifier, password })
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || "Gagal masuk. Periksa kredensial kamu.");
            }

            applyUserSession(data, true);
            showToast(`Selamat datang kembali, @${data.user.username}! ✨`);
            closeInfoModal("authModal");
        } catch (err) {
            setAuthAlert(err.message || "Gagal masuk. Silakan coba lagi.");
        } finally {
            submitLoginBtn.disabled = false;
            submitLoginBtn.textContent = "Masuk Sekarang →";
        }
    });
}

// 2. SUBMIT REGISTER HANDLER
const submitRegisterBtn = document.getElementById("submitRegisterBtn");
if (submitRegisterBtn) {
    submitRegisterBtn.addEventListener("click", async () => {
        const email = (document.getElementById("regEmailInput")?.value || "").trim();
        const username = (document.getElementById("regUsernameInput")?.value || "").trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
        const password = document.getElementById("regPasswordInput")?.value || "";
        const confirmPassword = document.getElementById("regConfirmPasswordInput")?.value || "";

        if (!email || !email.includes("@")) {
            setAuthAlert("Masukkan alamat email yang valid.");
            return;
        }

        if (!username || username.length < 3) {
            setAuthAlert("Username minimal 3 karakter (hanya huruf, angka, underscore).");
            return;
        }

        if (!password || password.length < 6) {
            setAuthAlert("Password minimal 6 karakter.");
            return;
        }

        if (password !== confirmPassword) {
            setAuthAlert("Konfirmasi password tidak cocok dengan password.");
            return;
        }

        submitRegisterBtn.disabled = true;
        submitRegisterBtn.textContent = "Mendaftarkan...";
        setAuthAlert(null);

        try {
            const res = await fetch("/api/auth", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "register",
                    email,
                    username,
                    password,
                    avatar: currentRegAvatar
                })
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || "Pendaftaran gagal. Silakan coba username/email lain.");
            }

            applyUserSession(data, true);
            showToast(`Akun @${data.user.username} berhasil dibuat! Selamat datang ✨`);
            closeInfoModal("authModal");
        } catch (err) {
            setAuthAlert(err.message || "Gagal mendaftar.");
        } finally {
            submitRegisterBtn.disabled = false;
            submitRegisterBtn.textContent = "Daftar & Masuk Otomatis ✨";
        }
    });
}

// ==========================================
// 3. RESET PASSWORD STATE & HANDLERS (SUPABASE AUTH)
// ==========================================
let pendingResetIdentifier = "";
let recoveryAccessToken = "";
let resetResendInterval = null;

function startResetCountdown(seconds = 60) {
    if (resetResendInterval) clearInterval(resetResendInterval);
    const timerWrap = document.getElementById("resetResendTimerWrap");
    const countVal = document.getElementById("resetCountdownVal");
    const resendBtn = document.getElementById("resetResendBtn");
    
    if (timerWrap) timerWrap.style.display = "inline";
    if (resendBtn) resendBtn.style.display = "none";
    if (countVal) countVal.textContent = String(seconds);

    let remaining = seconds;
    resetResendInterval = setInterval(() => {
        remaining--;
        if (countVal) countVal.textContent = String(remaining);
        if (remaining <= 0) {
            clearInterval(resetResendInterval);
            resetResendInterval = null;
            if (timerWrap) timerWrap.style.display = "none";
            if (resendBtn) resendBtn.style.display = "inline";
        }
    }, 1000);
}

window.resendResetOtp = async function() {
    const identifier = pendingResetIdentifier || (document.getElementById("resetIdentifierInput")?.value || "").trim();
    if (!identifier) {
        setAuthAlert("Masukkan email atau username terlebih dahulu.");
        return;
    }

    const resendBtn = document.getElementById("resetResendBtn");
    if (resendBtn) {
        resendBtn.disabled = true;
        resendBtn.textContent = "Mengirim ulang...";
    }
    setAuthAlert(null);

    try {
        const res = await fetch("/api/auth", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "request-reset-otp", identifier })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Gagal mengirim ulang instruksi.");

        setAuthAlert(data.message || "Kode verifikasi baru telah dikirim ke email Anda.", "success");
        showToast("Kode verifikasi baru telah dikirim! ✉️");
        startResetCountdown(60);
    } catch (err) {
        setAuthAlert(err.message || "Gagal mengirim ulang kode.");
    } finally {
        if (resendBtn) {
            resendBtn.disabled = false;
            resendBtn.textContent = "Kirim Ulang Kode 🔄";
        }
    }
};

// Password Strength Meter for Reset Password
const resetNewPasswordInputEl = document.getElementById("resetNewPasswordInput");
if (resetNewPasswordInputEl) {
    resetNewPasswordInputEl.addEventListener("input", () => {
        const val = resetNewPasswordInputEl.value;
        const bar1 = document.getElementById("resetPwdBar1");
        const bar2 = document.getElementById("resetPwdBar2");
        const bar3 = document.getElementById("resetPwdBar3");
        const lbl = document.getElementById("resetPwdStrengthLabel");
        if (!bar1 || !bar2 || !bar3 || !lbl) return;

        let score = 0;
        if (val.length >= 6) score++;
        if (val.length >= 8 && /[0-9]/.test(val)) score++;
        if (val.length >= 10 && /[^a-zA-Z0-9]/.test(val)) score++;

        if (val.length === 0) {
            bar1.style.background = "var(--border)";
            bar2.style.background = "var(--border)";
            bar3.style.background = "var(--border)";
            lbl.textContent = "-";
            lbl.style.color = "var(--text-soft)";
        } else if (score <= 1) {
            bar1.style.background = "#dc2626";
            bar2.style.background = "var(--border)";
            bar3.style.background = "var(--border)";
            lbl.textContent = "Lemah";
            lbl.style.color = "#dc2626";
        } else if (score === 2) {
            bar1.style.background = "#d97706";
            bar2.style.background = "#d97706";
            bar3.style.background = "var(--border)";
            lbl.textContent = "Sedang";
            lbl.style.color = "#d97706";
        } else {
            bar1.style.background = "#16a34a";
            bar2.style.background = "#16a34a";
            bar3.style.background = "#16a34a";
            lbl.textContent = "Kuat";
            lbl.style.color = "#16a34a";
        }
    });
}

// 1. Submit Request Reset Instructions Handler
const submitRequestOtpBtn = document.getElementById("submitRequestOtpBtn");
if (submitRequestOtpBtn) {
    submitRequestOtpBtn.addEventListener("click", async () => {
        const identifier = (document.getElementById("resetIdentifierInput")?.value || "").trim();
        if (!identifier) {
            setAuthAlert("Masukkan email atau username terdaftar.");
            return;
        }

        submitRequestOtpBtn.disabled = true;
        submitRequestOtpBtn.textContent = "Mengirim Instruksi...";
        setAuthAlert(null);

        try {
            const res = await fetch("/api/auth", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "request-reset-otp", identifier })
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || "Gagal memproses permintaan reset.");
            }

            pendingResetIdentifier = identifier;

            // Transition to Step 2 (Verification code + new password)
            const step1 = document.getElementById("resetStep1");
            const step2 = document.getElementById("resetStep2");
            const emailLabel = document.getElementById("resetTargetEmailLabel");
            const otpInput = document.getElementById("resetOtpInput");
            const verifiedNotice = document.getElementById("resetLinkVerifiedNotice");
            const otpGroup = document.getElementById("resetOtpGroup");

            if (emailLabel) emailLabel.textContent = data.maskedEmail || identifier;
            if (verifiedNotice) verifiedNotice.style.display = "none";
            if (otpGroup) otpGroup.style.display = "block";
            if (step1) step1.style.display = "none";
            if (step2) step2.style.display = "block";
            if (otpInput) {
                otpInput.value = "";
                setTimeout(() => otpInput.focus(), 150);
            }

            startResetCountdown(60);
            setAuthAlert(data.message || "Instruksi dan kode telah dikirim ke email terdaftar.", "success");
        } catch (err) {
            setAuthAlert(err.message || "Gagal mengirim permintaan pemulihan kata sandi.");
        } finally {
            submitRequestOtpBtn.disabled = false;
            submitRequestOtpBtn.textContent = "Kirim Instruksi & Kode Pemulihan ✉️";
        }
    });
}

// 2. Submit Verification & Save New Password Handler
const submitVerifyResetBtn = document.getElementById("submitVerifyResetBtn");
if (submitVerifyResetBtn) {
    submitVerifyResetBtn.addEventListener("click", async () => {
        const identifier = pendingResetIdentifier || (document.getElementById("resetIdentifierInput")?.value || "").trim();
        const code = (document.getElementById("resetOtpInput")?.value || "").trim();
        const newPassword = document.getElementById("resetNewPasswordInput")?.value || "";
        const confirmPassword = document.getElementById("resetConfirmPasswordInput")?.value || "";

        // If not using recovery access token, code is strictly required
        if (!recoveryAccessToken && (!code || code.length < 6)) {
            setAuthAlert("Masukkan 6-digit kode verifikasi yang dikirim ke email Anda.");
            const otpInput = document.getElementById("resetOtpInput");
            if (otpInput) otpInput.focus();
            return;
        }

        if (!newPassword || newPassword.length < 6) {
            setAuthAlert("Kata sandi baru minimal 6 karakter.");
            document.getElementById("resetNewPasswordInput")?.focus();
            return;
        }

        if (newPassword !== confirmPassword) {
            setAuthAlert("Konfirmasi kata sandi tidak cocok dengan kata sandi baru.");
            document.getElementById("resetConfirmPasswordInput")?.focus();
            return;
        }

        submitVerifyResetBtn.disabled = true;
        submitVerifyResetBtn.textContent = "Menyimpan Kata Sandi...";
        setAuthAlert(null);

        try {
            const res = await fetch("/api/auth", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "verify-reset-password",
                    identifier,
                    code: code || undefined,
                    newPassword,
                    accessToken: recoveryAccessToken || undefined
                })
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || "Gagal memperbarui kata sandi.");
            }

            if (resetResendInterval) {
                clearInterval(resetResendInterval);
                resetResendInterval = null;
            }

            recoveryAccessToken = "";
            showToast("Kata sandi berhasil diperbarui! Silakan masuk dengan kata sandi baru Anda. 🔐");
            
            // Switch to login tab and prefill identifier
            window.switchAuthTab("login");
            const loginIdent = document.getElementById("authLoginIdentifier");
            const loginPwd = document.getElementById("authLoginPassword");
            if (loginIdent && identifier) loginIdent.value = identifier;
            if (loginPwd) {
                loginPwd.value = "";
                loginPwd.focus();
            }
            setAuthAlert("Kata sandi berhasil diperbarui! Silakan masuk sekarang.", "success");
        } catch (err) {
            setAuthAlert(err.message || "Gagal memperbarui kata sandi.");
        } finally {
            submitVerifyResetBtn.disabled = false;
            submitVerifyResetBtn.textContent = "Verifikasi & Simpan Kata Sandi Baru 🔐";
        }
    });
}

// 3. Robust Supabase Recovery Hash & Expired Link Error Listener
function checkSupabaseRecoveryHash() {
    const hash = window.location.hash;
    if (!hash) return;

    // A. Detect Supabase Auth Error in URL Fragment (e.g. otp_expired, access_denied)
    if (hash.includes("error=") || hash.includes("error_code=") || hash.includes("otp_expired")) {
        const cleanHash = hash.replace(/^#/, "");
        const params = new URLSearchParams(cleanHash);
        const errorCode = params.get("error_code") || "access_denied";
        const errorDesc = params.get("error_description") || "Tautan pemulihan email telah kedaluwarsa atau tidak valid.";

        // Clean ugly hash from browser address bar cleanly
        try {
            history.replaceState(null, "", window.location.pathname + window.location.search);
        } catch (e) {}

        // Open auth modal with helpful error banner and reset tab
        if (typeof openInfoModal === "function") openInfoModal("authModal");
        if (typeof window.switchAuthTab === "function") window.switchAuthTab("reset");

        const banner = document.getElementById("recoveryErrorBanner");
        const titleEl = document.getElementById("recoveryErrorTitle");
        const descEl = document.getElementById("recoveryErrorDesc");

        if (banner) banner.style.display = "flex";
        if (titleEl) titleEl.textContent = errorCode === "otp_expired" ? "Tautan Pemulihan Kedaluwarsa" : "Tautan Pemulihan Tidak Berlaku";
        if (descEl) {
            descEl.innerHTML = `Tautan pemulihan email dari Supabase sudah kedaluwarsa atau terpakai otomatis oleh proteksi email Anda.<br>Silakan masukkan email Anda di bawah untuk menerima kode verifikasi 6-digit yang dapat langsung dimasukkan di layar.`;
        }
        return;
    }

    // B. Detect Valid Supabase Recovery Token Link
    if (hash.includes("type=recovery") || hash.includes("access_token=")) {
        const cleanHash = hash.replace(/^#/, "");
        const params = new URLSearchParams(cleanHash);
        const type = params.get("type");
        const accessToken = params.get("access_token");

        if (type === "recovery" || accessToken) {
            recoveryAccessToken = accessToken || "";

            // Clean hash from browser address bar
            try {
                history.replaceState(null, "", window.location.pathname + window.location.search);
            } catch (e) {}

            if (typeof openInfoModal === "function") openInfoModal("authModal");
            if (typeof window.switchAuthTab === "function") window.switchAuthTab("reset");

            const step1 = document.getElementById("resetStep1");
            const step2 = document.getElementById("resetStep2");
            const verifiedNotice = document.getElementById("resetLinkVerifiedNotice");
            const otpGroup = document.getElementById("resetOtpGroup");
            const newPwdInput = document.getElementById("resetNewPasswordInput");

            if (step1) step1.style.display = "none";
            if (step2) step2.style.display = "block";
            if (verifiedNotice) verifiedNotice.style.display = "block";
            if (otpGroup) otpGroup.style.display = "none"; // Code not needed when link token is verified!
            if (newPwdInput) setTimeout(() => newPwdInput.focus(), 150);

            setAuthAlert("Tautan resmi Supabase terverifikasi! Silakan tentukan kata sandi baru Anda.", "success");
        }
    }
}
window.addEventListener("DOMContentLoaded", checkSupabaseRecoveryHash);
window.addEventListener("hashchange", checkSupabaseRecoveryHash);

// Account Modal Tab Switcher (Profil vs Riwayat vs Keamanan)
window.switchAccTab = function(tabName) {
    const profileBtn = document.getElementById("accTabProfileBtn");
    const historyBtn = document.getElementById("accTabHistoryBtn");
    const securityBtn = document.getElementById("accTabSecurityBtn");
    const profileContent = document.getElementById("accProfileContent");
    const historyContent = document.getElementById("accHistoryContent");
    const securityContent = document.getElementById("accSecurityContent");

    const tabs = [
        { btn: profileBtn, content: profileContent, name: "profile" },
        { btn: historyBtn, content: historyContent, name: "history" },
        { btn: securityBtn, content: securityContent, name: "security" }
    ];

    tabs.forEach(t => {
        if (!t.btn || !t.content) return;
        if (t.name === tabName) {
            t.btn.style.background = "var(--sage-700)";
            t.btn.style.color = "#fff";
            t.content.style.display = "flex";
        } else {
            t.btn.style.background = "transparent";
            t.btn.style.color = "var(--text-soft)";
            t.content.style.display = "none";
        }
    });
};

// Ubah Password Akun Pengguna
const submitChangePasswordBtn = document.getElementById("submitChangePasswordBtn");
if (submitChangePasswordBtn) {
    submitChangePasswordBtn.addEventListener("click", async () => {
        if (!currentUserSession || !currentUserSession.user) {
            showToast("Silakan login terlebih dahulu.");
            return;
        }

        const oldPasswordInput = document.getElementById("oldPasswordInput");
        const newPasswordInput = document.getElementById("newPasswordInput");
        const confirmNewPasswordInput = document.getElementById("confirmNewPasswordInput");

        const oldPassword = oldPasswordInput ? oldPasswordInput.value : "";
        const newPassword = newPasswordInput ? newPasswordInput.value : "";
        const confirmNewPassword = confirmNewPasswordInput ? confirmNewPasswordInput.value : "";

        if (!newPassword || newPassword.length < 6) {
            showToast("Password baru minimal 6 karakter.");
            return;
        }

        if (newPassword !== confirmNewPassword) {
            showToast("Konfirmasi password baru tidak cocok.");
            return;
        }

        submitChangePasswordBtn.disabled = true;
        submitChangePasswordBtn.textContent = "Memperbarui Password...";

        try {
            const res = await fetch("/api/auth", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "change-password",
                    userId: currentUserSession.user.id,
                    oldPassword,
                    newPassword
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Gagal mengubah password.");

            if (oldPasswordInput) oldPasswordInput.value = "";
            if (newPasswordInput) newPasswordInput.value = "";
            if (confirmNewPasswordInput) confirmNewPasswordInput.value = "";

            showToast(data.message || "Password berhasil diubah! 🔐");
        } catch (err) {
            showToast(err.message || "Terjadi kesalahan saat mengubah password.");
        } finally {
            submitChangePasswordBtn.disabled = false;
            submitChangePasswordBtn.textContent = "Perbarui Password 🔐";
        }
    });
}

// Shortcut tombol "Buka Dashboard Akun" di landing banner
const openAccountDashboardShortcut = document.getElementById("openAccountDashboardShortcut");
if (openAccountDashboardShortcut) {
    openAccountDashboardShortcut.addEventListener("click", () => {
        if (currentUserSession && currentUserSession.user) {
            openInfoModal("accountModal");
        } else {
            if (window.switchAuthTab) window.switchAuthTab("login");
            openInfoModal("authModal");
        }
    });
}

const modals = document.querySelectorAll(".modal-overlay");
modals.forEach((modal) => {
    modal.addEventListener("click", (e) => {
        if (e.target === modal) closeInfoModal(modal.id);
    });
});


/* =========================================================
SUPPORT PAYMENT & RANKING
========================================================= */
let selectedValue = 0;
function formatRupiah(value) {
    return new Intl.NumberFormat("id-ID").format(value);
}

const PAYMENT_STORAGE_PREFIX = "gepa_payment_";
const PAYMENT_MAX_AGE = 24 * 60 * 60 * 1000;

function getPaymentStorageKey(orderId) {
    return PAYMENT_STORAGE_PREFIX + encodeURIComponent(orderId);
}

function savePendingPayment(orderId, username, amount, token, avatar) {
    if (!orderId) return;
    const activeU = (currentUserSession && currentUserSession.user) || userProfileCache;
    const resolvedUser = (activeU && activeU.username) ? activeU.username : (username || "Anonim");
    const paymentData = {
        orderId: orderId,
        username: resolvedUser,
        amount: Number(amount) || 0,
        token: token || "",
        avatar: (activeU && activeU.avatar) || avatar || "✨",
        createdAt: Date.now()
    };
    localStorage.setItem(getPaymentStorageKey(orderId), JSON.stringify(paymentData));
    localStorage.setItem("gepa_active_payment", orderId);
}

function getPendingPayment(orderId) {
    if (!orderId) return null;
    const key = getPaymentStorageKey(orderId);
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    try {
        const data = JSON.parse(raw);
        if (!data.createdAt || Date.now() - data.createdAt > PAYMENT_MAX_AGE) {
            localStorage.removeItem(key);
            if (localStorage.getItem("gepa_active_payment") === orderId) {
                localStorage.removeItem("gepa_active_payment");
            }
            return null;
        }
        return data;
    } catch (error) {
        localStorage.removeItem(key);
        return null;
    }
}

function clearPendingPayment(orderId) {
    if (!orderId) return;
    localStorage.removeItem(getPaymentStorageKey(orderId));
    if (localStorage.getItem("gepa_active_payment") === orderId) {
        localStorage.removeItem("gepa_active_payment");
    }
}

function formatTransactionTime(val) {
    if (!val) {
        const d = new Date();
        return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) + ", " + 
               d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB";
    }
    try {
        let d = new Date(val);
        if (isNaN(d.getTime())) {
            d = new Date(String(val).replace(" ", "T") + "+07:00");
        }
        if (isNaN(d.getTime())) return String(val);
        return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) + ", " + 
               d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB";
    } catch (e) {
        return String(val);
    }
}

function saveCompletedPayment(orderId, username, amount, paymentType, time, status) {
    if (!orderId) return;
    const activeU = (currentUserSession && currentUserSession.user) || userProfileCache;
    const resolvedUser = (activeU && activeU.username) ? activeU.username : (username || "Anonim");
    const completedData = {
        orderId: orderId,
        order_id: orderId,
        username: resolvedUser,
        amount: Number(amount) || 0,
        paymentType: paymentType || "ONLINE PAYMENT",
        payment_type: paymentType || "ONLINE PAYMENT",
        transaction_time: time || new Date().toISOString(),
        status: status || "settlement",
        createdAt: Date.now()
    };
    
    try {
        localStorage.setItem("gepa_payment_completed_" + encodeURIComponent(orderId), JSON.stringify(completedData));
    } catch (e) {}

    try {
        const rawHistory = localStorage.getItem("gepa_completed_donations");
        let list = rawHistory ? JSON.parse(rawHistory) : [];
        if (!Array.isArray(list)) list = [];
        const existingIdx = list.findIndex(x => (x.orderId || x.order_id) === orderId);
        if (existingIdx >= 0) {
            list[existingIdx] = { ...list[existingIdx], ...completedData };
        } else {
            list.unshift(completedData);
        }
        localStorage.setItem("gepa_completed_donations", JSON.stringify(list.slice(0, 100)));
    } catch (e) {}

    if (resolvedUser && resolvedUser.toLowerCase() !== "anonim") {
        try {
            const userKey = "gepa_user_donations_" + resolvedUser.toLowerCase().replace(/^@/, "");
            const rawUserHistory = localStorage.getItem(userKey);
            let uList = rawUserHistory ? JSON.parse(rawUserHistory) : [];
            if (!Array.isArray(uList)) uList = [];
            const idx = uList.findIndex(x => (x.orderId || x.order_id) === orderId);
            if (idx >= 0) {
                uList[idx] = { ...uList[idx], ...completedData };
            } else {
                uList.unshift(completedData);
            }
            localStorage.setItem(userKey, JSON.stringify(uList.slice(0, 100)));
        } catch (e) {}
    }
}

function getCompletedPayment(orderId) {
    if (!orderId) return null;
    try {
        const direct = localStorage.getItem("gepa_payment_completed_" + encodeURIComponent(orderId));
        if (direct) return JSON.parse(direct);
    } catch (e) {}
    try {
        const raw = localStorage.getItem("gepa_completed_donations");
        if (raw) {
            const list = JSON.parse(raw);
            const found = list.find(x => x.orderId === orderId || x.order_id === orderId);
            if (found) return found;
        }
    } catch (e) {}
    return null;
}

function getActivePaymentOrder() {
    const orderId = localStorage.getItem("gepa_active_payment");
    if (!orderId) return null;
    const payment = getPendingPayment(orderId);
    if (!payment) return null;
    return orderId;
}

async function checkPaymentStatus(orderId) {
    if (!orderId) return null;
    try {
        const response = await fetch(`/api/check-payment?order_id=${encodeURIComponent(orderId)}`, { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) return null;
        return data;
    } catch (error) {
        return null;
    }
}

function showInvoiceModal(orderId, statusData = null, paymentData = null) {
    if (!orderId) return;

    const completed = getCompletedPayment(orderId);
    const pending = paymentData || getPendingPayment(orderId);
    
    let username = (statusData && (statusData.username || statusData.custom_field1)) || 
                   (completed && completed.username) || 
                   (pending && pending.username) || 
                   (userProfileCache && userProfileCache.username) || 
                   "Supporter";
    if (username.startsWith("@")) username = username.substring(1);

    const amount = (statusData && Number(statusData.gross_amount) > 0 ? Number(statusData.gross_amount) : 0) ||
                   (completed && Number(completed.amount) > 0 ? Number(completed.amount) : 0) ||
                   (pending && Number(pending.amount) > 0 ? Number(pending.amount) : 0);

    const rawStatus = (statusData && statusData.transaction_status) || (completed && completed.status) || "settlement";
    const isSuccess = rawStatus.toLowerCase() === "settlement" || rawStatus.toLowerCase() === "capture";

    const paymentType = (statusData && statusData.payment_type ? statusData.payment_type.replace(/_/g, " ").toUpperCase() : "") ||
                        (completed && completed.paymentType) || 
                        "ONLINE PAYMENT";

    const rawTime = (statusData && statusData.transaction_time) || (completed && completed.transaction_time) || (pending && pending.createdAt) || Date.now();
    const formattedTime = formatTransactionTime(rawTime);

    // Persist to completed storage & clear pending
    if (isSuccess) {
        saveCompletedPayment(orderId, username, amount, paymentType, rawTime, rawStatus);
        clearPendingPayment(orderId);
    }

    // Populate invoiceModal elements
    const invOrderIdEl = document.getElementById("invOrderId");
    const invUsernameEl = document.getElementById("invUsername");
    const invStatusEl = document.getElementById("invStatus");
    const invStatusBadgeEl = document.getElementById("invStatusBadge");
    const invAmountEl = document.getElementById("invAmount");
    const invPaymentTypeEl = document.getElementById("invPaymentType");
    const invTimeEl = document.getElementById("invTime");
    const invThankYouNoteEl = document.getElementById("invThankYouNote");

    if (invOrderIdEl) invOrderIdEl.textContent = orderId;
    if (invUsernameEl) invUsernameEl.textContent = username;
    if (invStatusEl) {
        invStatusEl.textContent = isSuccess ? "BERHASIL (SETTLEMENT)" : rawStatus.toUpperCase();
        invStatusEl.style.color = isSuccess ? "var(--sage-700)" : "#d97706";
    }
    if (invStatusBadgeEl) {
        invStatusBadgeEl.textContent = isSuccess ? "BERHASIL" : rawStatus.toUpperCase();
        invStatusBadgeEl.style.background = isSuccess ? "var(--sage-700)" : "#d97706";
    }
    if (invAmountEl) invAmountEl.textContent = `Rp${formatRupiah(amount)}`;
    if (invPaymentTypeEl) invPaymentTypeEl.textContent = paymentType;
    if (invTimeEl) invTimeEl.textContent = formattedTime;
    if (invThankYouNoteEl) {
        invThankYouNoteEl.style.display = isSuccess ? "flex" : "none";
    }

    // Also sync elements in successPaymentModal if user navigates
    const resultOrderId = document.getElementById("resOrderId");
    const resultAmount = document.getElementById("resAmount");
    const resultUsername = document.getElementById("resUsername");
    const resultPaymentType = document.getElementById("resPaymentType");
    if (resultOrderId) resultOrderId.textContent = orderId;
    if (resultAmount) resultAmount.textContent = `Rp${formatRupiah(amount)}`;
    if (resultUsername) resultUsername.textContent = username;
    if (resultPaymentType) resultPaymentType.textContent = paymentType;

    // Close any previous open modals and open invoiceModal
    closeInfoModal("pendingPaymentModal");
    closeInfoModal("supportModal");
    closeInfoModal("successPaymentModal");
    openInfoModal("invoiceModal");

    // Refresh rankings & user donation history
    fetchRankings();
    if (currentUserSession && currentUserSession.user) {
        loadUserDonationHistoryAndStats(userProfileCache || currentUserSession.user);
    }
}

async function handlePaymentResult(orderId, snapResult = null, statusHint = null) {
    if (!orderId) return;

    const payment = getPendingPayment(orderId) || getCompletedPayment(orderId);
    const activeUsername = (currentUserSession?.user?.username) || (userProfileCache?.username);
    const activeAvatar = (currentUserSession?.user?.avatar) || (userProfileCache?.avatar) || "✨";
    const resolvedUsername = (activeUsername && (!payment?.username || payment.username === "Anonim" || payment.username === "Supporter"))
        ? activeUsername
        : ((payment && payment.username) || activeUsername || "Supporter");

    // 1. Fast-track if snapResult already reported success/settlement
    if (snapResult) {
        const snapStatus = (snapResult.transaction_status || (snapResult.status_code === "200" ? "settlement" : snapResult.transaction_status) || "").toLowerCase();
        if (snapStatus === "settlement" || snapStatus === "capture" || snapResult.status_code === "200") {
            const enrichedData = {
                order_id: snapResult.order_id || orderId,
                transaction_status: "settlement",
                payment_type: snapResult.payment_type || "ONLINE PAYMENT",
                gross_amount: snapResult.gross_amount || (payment ? payment.amount : 0),
                transaction_time: snapResult.transaction_time || new Date().toISOString(),
                username: resolvedUsername
            };
            saveCompletedPayment(orderId, enrichedData.username, enrichedData.gross_amount, enrichedData.payment_type, enrichedData.transaction_time, "settlement");
            showInvoiceModal(orderId, enrichedData, payment);
            
            // Sync to server check-payment
            fetch("/api/check-payment", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    order_id: orderId,
                    username: enrichedData.username,
                    gross_amount: enrichedData.gross_amount,
                    transaction_status: "settlement",
                    payment_type: enrichedData.payment_type,
                    avatar: activeAvatar
                })
            }).catch(() => {});
            return;
        }
    }

    // 2. Fast-track if statusHint indicates settlement from redirect params
    if (statusHint === "settlement" || statusHint === "capture" || statusHint === "200") {
        const enrichedData = {
            order_id: orderId,
            transaction_status: "settlement",
            payment_type: "ONLINE PAYMENT",
            gross_amount: payment ? payment.amount : 0,
            transaction_time: new Date().toISOString(),
            username: resolvedUsername
        };
        saveCompletedPayment(orderId, enrichedData.username, enrichedData.gross_amount, enrichedData.payment_type, enrichedData.transaction_time, "settlement");
        showInvoiceModal(orderId, enrichedData, payment);
        
        fetch("/api/check-payment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                order_id: orderId,
                username: enrichedData.username,
                gross_amount: enrichedData.gross_amount,
                transaction_status: "settlement",
                payment_type: enrichedData.payment_type,
                avatar: activeAvatar
            })
        }).catch(() => {});

        checkPaymentStatus(orderId).then(statusData => {
            if (statusData && statusData.transaction_status) {
                showInvoiceModal(orderId, statusData, payment);
            }
        });
        return;
    }

    // 3. Query server check-payment API
    let statusData = await checkPaymentStatus(orderId);

    // If pending, retry once after 1.2 seconds in case status is transitioning
    if (!statusData || (statusData.transaction_status && statusData.transaction_status.toLowerCase() === "pending")) {
        await new Promise(resolve => setTimeout(resolve, 1200));
        const retryData = await checkPaymentStatus(orderId);
        if (retryData) statusData = retryData;
    }

    if (!statusData) {
        showPendingModal(orderId, payment);
        return;
    }

    const status = (statusData.transaction_status || "").toLowerCase();

    if (status === "settlement" || status === "capture" || statusData.status_code === "200") {
        showInvoiceModal(orderId, statusData, payment);
        return;
    }

    if (status === "cancel" || status === "expire" || status === "deny" || status === "failure") {
        clearPendingPayment(orderId);
        openInfoModal("errorPaymentModal");
        return;
    }

    showPendingModal(orderId, payment);
}

function showPendingModal(orderId, payment) {
    const pendingResUsername = document.getElementById("pendingResUsername");
    const pendingResOrderId = document.getElementById("pendingResOrderId");
    const pendingResAmount = document.getElementById("pendingResAmount");

    if (pendingResUsername) pendingResUsername.textContent = payment ? payment.username : "Supporter";
    if (pendingResOrderId) pendingResOrderId.textContent = orderId;
    if (pendingResAmount) pendingResAmount.textContent = `Rp${formatRupiah(payment ? payment.amount : 0)}`;

    openInfoModal("pendingPaymentModal");
}

function validateInput() {
    // Untuk authenticated user, pastikan username terisi (readonly, auto-filled)
    if (userProfileCache && userProfileCache.username) {
        supporterUsername.value = userProfileCache.username;
    }

    // Validation: hanya cek jika ada nominal yang dipilih
    if (selectedValue > 0) {
        continueSupport.disabled = false;
        return true;
    } else {
        continueSupport.disabled = true;
        return false;
    }
}

function updateSupportAmount() {
    if (!selectedAmount) return;
    if (selectedValue > 0) {
        selectedAmount.textContent = `Nominal: Rp${formatRupiah(selectedValue)}`;
    } else {
        selectedAmount.textContent = "Belum memilih nominal";
    }
    validateInput();
}

amountButtons.forEach((button) => {
    button.addEventListener("click", () => {
        selectedValue = Number(button.dataset.amount);
        amountButtons.forEach((btn) => btn.classList.remove("selected"));
        button.classList.add("selected");
        if (customAmount) customAmount.value = "";
        updateSupportAmount();
    });
});

if (customAmount) {
    customAmount.addEventListener("input", () => {
        const val = Number(customAmount.value);
        selectedValue = val >= 1000 ? val : 0;
        amountButtons.forEach((btn) => btn.classList.remove("selected"));
        updateSupportAmount();
    });
}

if (supporterUsername) {
    supporterUsername.addEventListener("input", validateInput);
}

function launchSnapPayment(token, orderId) {
    if (!window.snap || typeof window.snap.pay !== "function") {
        showToast("Sistem Midtrans Snap belum siap. Silakan muat ulang halaman.");
        return;
    }
    window.snap.pay(token, {
        onSuccess: async function (result) {
            console.log("Snap onSuccess:", result);
            await handlePaymentResult(orderId, result, "settlement");
        },
        onPending: async function (result) {
            console.log("Snap onPending:", result);
            await handlePaymentResult(orderId, result, "pending");
        },
        onError: async function () {
            clearPendingPayment(orderId);
            openInfoModal("errorPaymentModal");
        },
        onClose: async function () {
            console.log("Snap onClose, checking transaction status...");
            await handlePaymentResult(orderId, null, null);
        }
    });
}

if (continueSupport) {
    continueSupport.addEventListener("click", async () => {
        if (!validateInput() || selectedValue < 1000) return;
        const amount = selectedValue;
        
        // Tentukan username dan avatar dari user yang aktif
        const activeUser = (currentUserSession && currentUserSession.user) || userProfileCache;
        const isAuthenticated = Boolean(activeUser && activeUser.username);
        const username = isAuthenticated ? activeUser.username : "Anonim";
        const avatar = isAuthenticated ? (activeUser.avatar || "✨") : "✨";

        continueSupport.disabled = true;
        continueSupport.textContent = "Memproses...";

        try {
            const body = { amount, username, avatar };
            const headers = { "Content-Type": "application/json" };
            
            // Jika authenticated, kirim JWT / token untuk server-side verification
            const token = currentUserSession?.token || currentUserSession?.access_token;
            if (isAuthenticated && token) {
                headers["Authorization"] = `Bearer ${token}`;
            }
            
            const response = await fetch("/api/create-payment", {
                method: "POST",
                headers,
                body: JSON.stringify(body)
            });

            const data = await response.json();
            if (!response.ok || !data.token || !data.order_id) {
                throw new Error(data.error || "Gagal membuat pembayaran.");
            }

            savePendingPayment(data.order_id, username, amount, data.token, avatar);
            closeInfoModal("supportModal");
            launchSnapPayment(data.token, data.order_id);
        } catch (error) {
            showToast(error.message || "Terjadi kesalahan koneksi.");
        } finally {
            continueSupport.disabled = false;
            continueSupport.textContent = "Proses Payment →";
            selectedValue = 0;
            amountButtons.forEach((btn) => btn.classList.remove("selected"));
            if (customAmount) customAmount.value = "";
            updateSupportAmount();
        }
    });
}

const resumePaymentBtn = document.getElementById("resumePaymentBtn");
if (resumePaymentBtn) {
    resumePaymentBtn.addEventListener("click", () => {
        const orderId = getActivePaymentOrder();
        if (!orderId) {
            closeInfoModal("pendingPaymentModal");
            showToast("Tidak ada transaksi aktif.");
            return;
        }
        const payment = getPendingPayment(orderId);
        closeInfoModal("pendingPaymentModal");
        if (payment && payment.token) launchSnapPayment(payment.token, orderId);
    });
}

const cancelPaymentBtn = document.getElementById("cancelPaymentBtn");
if (cancelPaymentBtn) {
    cancelPaymentBtn.addEventListener("click", () => {
        closeInfoModal("pendingPaymentModal");
        openInfoModal("confirmCancelModal");
    });
}

const yesCancelBtn = document.getElementById("yesCancelBtn");
if (yesCancelBtn) {
    yesCancelBtn.addEventListener("click", () => {
        const orderId = getActivePaymentOrder();
        clearPendingPayment(orderId);
        closeInfoModal("confirmCancelModal");
        showToast("Pembayaran dibatalkan.");
    });
}

/* =========================================================
CHECK INVOICE HANDLER
========================================================= */
const checkInvoiceBtn = document.getElementById("checkInvoiceBtn");
const checkOrderIdInput = document.getElementById("checkOrderIdInput");
const invOrderId = document.getElementById("invOrderId");
const invStatus = document.getElementById("invStatus");
const invAmount = document.getElementById("invAmount");
const invPaymentType = document.getElementById("invPaymentType");
const invTime = document.getElementById("invTime");

if (checkInvoiceBtn && checkOrderIdInput) {
    checkInvoiceBtn.addEventListener("click", async () => {
        const orderId = checkOrderIdInput.value.trim();
        if (!orderId) {
            showToast("Masukkan Order ID terlebih dahulu.");
            return;
        }
        
        checkInvoiceBtn.textContent = "Mengecek...";
        checkInvoiceBtn.disabled = true;

        const statusData = await checkPaymentStatus(orderId);
        
        checkInvoiceBtn.textContent = "Cek Invoice";
        checkInvoiceBtn.disabled = false;

        if (!statusData || !statusData.transaction_status) {
            showToast("Invoice tidak ditemukan / belum ada transaksi.");
            return;
        }

        showInvoiceModal(orderId, statusData);
    });
}

// Copy & Print Invoice Button Handlers
const copyInvoiceBtn = document.getElementById("copyInvoiceBtn");
if (copyInvoiceBtn) {
    copyInvoiceBtn.addEventListener("click", () => {
        const orderId = document.getElementById("invOrderId")?.textContent || "-";
        const username = document.getElementById("invUsername")?.textContent || "-";
        const amount = document.getElementById("invAmount")?.textContent || "-";
        const status = document.getElementById("invStatus")?.textContent || "-";
        const method = document.getElementById("invPaymentType")?.textContent || "-";
        const time = document.getElementById("invTime")?.textContent || "-";

        const text = `🧾 BUKTI INVOICE GEPA CORNER\n` +
                     `Order ID: ${orderId}\n` +
                     `Supporter: @${username}\n` +
                     `Nominal: ${amount}\n` +
                     `Status: ${status}\n` +
                     `Metode: ${method}\n` +
                     `Waktu: ${time}\n` +
                     `Terima kasih telah mendukung Gepa! ☺`;

        navigator.clipboard.writeText(text).then(() => {
            showToast("Detail invoice berhasil disalin ke clipboard! 📋");
        }).catch(() => {
            showToast("Order ID: " + orderId);
        });
    });
}

const printInvoiceBtn = document.getElementById("printInvoiceBtn");
if (printInvoiceBtn) {
    printInvoiceBtn.addEventListener("click", () => {
        window.print();
    });
}

const viewInvoiceFromSuccessBtn = document.getElementById("viewInvoiceFromSuccessBtn");
if (viewInvoiceFromSuccessBtn) {
    viewInvoiceFromSuccessBtn.addEventListener("click", () => {
        closeInfoModal("successPaymentModal");
        openInfoModal("invoiceModal");
    });
}

window.scrollToRanking = function () {
    closeInfoModal("successPaymentModal");
    closeInfoModal("invoiceModal");
    const supportSec = document.getElementById("support");
    if (supportSec) supportSec.scrollIntoView({ behavior: "smooth" });
};

let currentRankTab = "daily";
let rankingDataCache = { daily: [], weekly: [], lifetime: [] };

async function fetchRankings() {
    if (!rankingList) return;
    try {
        const res = await fetch("/api/ranking", { cache: "no-store" });
        if (!res.ok) throw new Error("Ranking request failed");
        const data = await res.json();
        rankingDataCache = data;
        renderRanking(currentRankTab);
    } catch (error) {
        rankingList.innerHTML = `<li class="ranking-empty">Gagal memuat ranking.</li>`;
    }
}

function renderRanking(tab) {
    if (!rankingList) return;
    const data = rankingDataCache[tab] || [];
    rankingList.innerHTML = "";

    if (data.length === 0) {
        rankingList.innerHTML = `<li class="ranking-empty">Belum ada supporter di periode ini.</li>`;
        return;
    }

    data.forEach((item, index) => {
        const li = document.createElement("li");
        li.className = "ranking-item";
        let medal = `${index + 1}`;
        if (index === 0) medal = "🥇";
        if (index === 1) medal = "🥈";
        if (index === 2) medal = "🥉";

        let avatarVal = item.avatar || "✨";
        const currentActiveUsername = (currentUserSession?.user?.username) || (userProfileCache?.username);
        if (currentActiveUsername && item.username && item.username.replace(/^@/, "").toLowerCase() === currentActiveUsername.replace(/^@/, "").toLowerCase()) {
            const activeUserAvatar = (currentUserSession?.user?.avatar) || (userProfileCache?.avatar);
            if (activeUserAvatar) avatarVal = activeUserAvatar;
        }

        const isImg = typeof avatarVal === "string" && (avatarVal.startsWith("http://") || avatarVal.startsWith("https://") || avatarVal.startsWith("data:image"));
        const avatarHtml = isImg
            ? `<img src="${avatarVal}" alt="${item.username}" class="rank-avatar-img" onerror="this.onerror=null;this.parentElement.innerHTML='<span class=\\'rank-avatar-emoji\\'>✨</span>';">`
            : `<span class="rank-avatar-emoji">${avatarVal}</span>`;

        li.innerHTML = `
            <div class="rank-medal">${medal}</div>
            <div class="rank-avatar" title="Avatar @${item.username}">${avatarHtml}</div>
            <div class="rank-info">
                <span class="rank-name">@${item.username}</span>
                <span class="rank-tx">${item.txCount}x Support</span>
            </div>
            <div class="rank-amount">Rp${formatRupiah(item.totalAmount)}</div>
        `;
        rankingList.appendChild(li);
    });
}

rankTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
        rankTabs.forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");
        currentRankTab = tab.dataset.tab;
        renderRanking(currentRankTab);
    });
});

fetchRankings();

let toastTimer;
function showToast(msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 3000);
}

async function handlePaymentReturn() {
    // 1. Check window.location.search and hash for Midtrans redirect parameters
    const urlParams = new URLSearchParams(window.location.search);
    let hashParams = new URLSearchParams();
    if (window.location.hash && window.location.hash.includes("?")) {
        hashParams = new URLSearchParams(window.location.hash.split("?")[1]);
    }

    const incomingOrderId = urlParams.get("order_id") || urlParams.get("orderId") || urlParams.get("id") ||
                            hashParams.get("order_id") || hashParams.get("orderId") || hashParams.get("id");
    const statusCode = urlParams.get("status_code") || hashParams.get("status_code");
    const txStatus = urlParams.get("transaction_status") || hashParams.get("transaction_status");

    const activeOrderId = getActivePaymentOrder();
    const orderId = incomingOrderId || activeOrderId;

    if (!orderId) return;

    // Clean address bar query params smoothly without reloading
    if (window.location.search || (window.location.hash && window.location.hash.includes("?"))) {
        const cleanPath = window.location.pathname + (window.location.hash ? window.location.hash.split("?")[0] : "");
        window.history.replaceState({}, document.title, cleanPath);
    }

    const isSuccessHint = statusCode === "200" || txStatus === "settlement" || txStatus === "capture";

    // Small delay to ensure all DOM elements are mounted and ready
    await new Promise((resolve) => setTimeout(resolve, 300));
    await handlePaymentResult(orderId, null, isSuccessHint ? "settlement" : txStatus);
}

// Trigger payment return check on startup and on pageshow (e.g. mobile back button from banking app)
handlePaymentReturn();
window.addEventListener("pageshow", () => {
    handlePaymentReturn();
});

/* =========================================================
AUTO-CLOSE MOBILE MENU ON OUTSIDE TAP OR SCROLL
========================================================= */
document.addEventListener("click", (e) => {
    if (navMenu && navMenu.classList.contains("open")) {
        if (!navMenu.contains(e.target) && !mobileMenuButton.contains(e.target)) {
            closeMobileMenu();
        }
    }
});

window.addEventListener("scroll", () => {
    if (navMenu && navMenu.classList.contains("open")) {
        closeMobileMenu();
    }
}, { passive: true });

});