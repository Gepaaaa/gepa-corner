// @ts-nocheck

/* =========================================================
GEPA PERSONAL WEBSITE - SCRIPT.JS (FINAL CLEAN VERSION)
========================================================= */

document.addEventListener("DOMContentLoaded", () => {

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

// Info Cards
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
SUPABASE AUTH INITIALIZATION & SESSION CHECK
========================================================= */
const SUPABASE_URL = "https://dkybfxbhlwyrjcycpatp.supabase.co"; 
const SUPABASE_ANON_KEY = "sb_publishable_Av4YqKP2rl2BePcsms8wGA_JqUmHpCX"; 

const supabaseClient = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
let currentUserSession = null;
let isRegisterMode = false;
let userProfileCache = null;

async function updateAuthButtonState(session) {
    currentUserSession = session;
    if (session && openAuthModalBtn) {
        openAuthModalBtn.textContent = "✨ Akun";
        openAuthModalBtn.onclick = () => {
            loadUserProfileData(session.user);
            openInfoModal("accountModal");
        };
        await fetchUserProfile(session.user.id);
    } else if (openAuthModalBtn) {
        openAuthModalBtn.textContent = "✨ Masuk";
        openAuthModalBtn.onclick = () => {
            isRegisterMode = false;
            updateAuthModalUI();
            openInfoModal("authModal");
        };
        userProfileCache = null;
    }
}

async function fetchUserProfile(userId) {
    if (!supabaseClient) return;
    const { data } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
    if (data) {
        userProfileCache = data;
    }
}

async function checkUserSession() {
    if (!supabaseClient) return;
    
    // Bersihkan URL dari sisa parameter error jika ada
    if (window.location.search) {
        window.history.replaceState({}, document.title, window.location.pathname);
    }

    const { data: { session } } = await supabaseClient.auth.getSession();
    await updateAuthButtonState(session);

    supabaseClient.auth.onAuthStateChange(async (event, session) => {
        await updateAuthButtonState(session);
    });
}
checkUserSession();


/* =========================================================
LOAD USER PROFILE & DONATION HISTORY
========================================================= */
async function loadUserProfileData(user) {
    const emailDisplay = document.getElementById("accEmailDisplay");
    const phoneInput = document.getElementById("accPhoneInput");
    const usernameInput = document.getElementById("accUsernameInput");

    if (emailDisplay) emailDisplay.textContent = user.email;

    if (supabaseClient) {
        const { data } = await supabaseClient
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (data) {
            userProfileCache = data;
            if (usernameInput) usernameInput.value = data.username || "";
            if (phoneInput) phoneInput.value = data.phone || "";
        }
    }

    loadUserDonationHistory(user.email);
}

async function loadUserDonationHistory(email) {
    const historyList = document.getElementById("userHistoryList");
    if (!historyList) return;
    
    try {
        const res = await fetch(`/api/user-donations?email=${encodeURIComponent(email)}`, { cache: "no-store" });
        if (!res.ok) throw new Error();
        const donations = await res.json();

        if (!donations || donations.length === 0) {
            historyList.innerHTML = `<div style="text-align: center; color: var(--text-soft); padding: 15px;">Belum ada riwayat traktiran.</div>`;
            return;
        }

        historyList.innerHTML = "";
        donations.forEach(item => {
            const div = document.createElement("div");
            div.style.cssText = "display: flex; justify-content: space-between; align-items: center; padding: 10px; background: var(--bg-secondary); border-radius: 8px; margin-bottom: 6px; border: 1px solid var(--border);";
            div.innerHTML = `
                <div>
                    <div style="font-weight: 600; font-size: 0.85rem;">Rp${formatRupiah(item.amount)}</div>
                    <div style="font-size: 0.72rem; color: var(--text-soft);">${new Date(item.created_at).toLocaleDateString("id-ID")}</div>
                </div>
                <span style="font-size: 0.75rem; padding: 3px 8px; background: var(--sage-700); color: #fff; border-radius: 6px;">Berhasil</span>
            `;
            historyList.appendChild(div);
        });
    } catch (err) {
        historyList.innerHTML = `<div style="text-align: center; color: var(--text-soft); padding: 15px;">Gagal memuat riwayat.</div>`;
    }
}

// Simpan & Verifikasi Username Unik (Wajib & Anti-Kembar)
const saveProfileBtn = document.getElementById("saveProfileBtn");
if (saveProfileBtn && supabaseClient) {
    saveProfileBtn.addEventListener("click", async () => {
        if (!currentUserSession) return;
        const newUsername = document.getElementById("accUsernameInput").value.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
        const newPhone = document.getElementById("accPhoneInput").value.trim();

        if (!newUsername || newUsername.length < 3) {
            showToast("Username minimal 3 karakter (alfanumerik/underscore)!");
            return;
        }

        saveProfileBtn.textContent = "Memverifikasi...";
        saveProfileBtn.disabled = true;

        // Cek duplikasi username di database profiles
        const { data: existingUser } = await supabaseClient
            .from('profiles')
            .select('id')
            .eq('username', newUsername)
            .neq('id', currentUserSession.user.id)
            .single();

        if (existingUser) {
            showToast("Username sudah dipakai orang lain! Pilih yang lain.");
            saveProfileBtn.textContent = "Simpan & Verifikasi Username";
            saveProfileBtn.disabled = false;
            return;
        }

        const { error } = await supabaseClient
            .from('profiles')
            .upsert({ 
                id: currentUserSession.user.id, 
                username: newUsername, 
                phone: newPhone, 
                updated_at: new Date() 
            });

        saveProfileBtn.textContent = "Simpan & Verifikasi Username";
        saveProfileBtn.disabled = false;

        if (error) {
            showToast("Gagal menyimpan: " + error.message);
        } else {
            userProfileCache = { id: currentUserSession.user.id, username: newUsername, phone: newPhone };
            showToast("Username berhasil diverifikasi & disimpan! ✨");
            closeInfoModal("accountModal");
        }
    });
}

// Logout Handler
const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn && supabaseClient) {
    logoutBtn.addEventListener("click", () => {
        if (confirm("Mau keluar (logout) dari Corner?")) {
            supabaseClient.auth.signOut().then(() => {
                window.location.reload();
            });
        }
    });
}


/* =========================================================
CURRENT YEAR & REAL-TIME AGE
========================================================= */
if (currentYear) {
    currentYear.textContent = new Date().getFullYear();
}

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
NAVIGATION, HEADER, THEME & CAROUSEL
========================================================= */
function closeMobileMenu() {
    if (!navMenu || !mobileMenuButton) return;
    navMenu.classList.remove("open");
    mobileMenuButton.setAttribute("aria-expanded", "false");
}

if (mobileMenuButton) {
    mobileMenuButton.addEventListener("click", (e) => {
        e.stopPropagation();
        const isOpen = navMenu.classList.toggle("open");
        mobileMenuButton.setAttribute("aria-expanded", String(isOpen));
    });
}

navLinks.forEach((link) => link.addEventListener("click", closeMobileMenu));

window.addEventListener("scroll", () => {
    if (header) {
        header.classList.toggle("scrolled", window.scrollY > 20);
    }
}, { passive: true });

const savedTheme = localStorage.getItem("gepa-theme");
if (savedTheme === "dark") body.classList.add("dark-mode");
if (themeToggle) {
    themeToggle.addEventListener("click", () => {
        const isDark = body.classList.toggle("dark-mode");
        localStorage.setItem("gepa-theme", isDark ? "dark" : "light");
        if (themeIcon) themeIcon.textContent = isDark ? "☀" : "☾";
    });
}


/* =========================================================
MODAL SYSTEM & AUTHENTICATION CLEAN FLOW
========================================================= */
window.openInfoModal = function(modalId) {
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

// Tombol Dukung (Support) dengan Validasi Wajib Login & Username Terverifikasi
if (supportButton) supportButton.addEventListener("click", async () => {
    if (!currentUserSession) {
        showToast("Silakan masuk/login terlebih dahulu untuk traktir!");
        isRegisterMode = false;
        updateAuthModalUI();
        openInfoModal("authModal");
        return;
    }

    await fetchUserProfile(currentUserSession.user.id);
    if (!userProfileCache || !userProfileCache.username) {
        showToast("Akun kamu wajib memiliki username unik! Silakan lengkapi profil.");
        loadUserProfileData(currentUserSession.user);
        openInfoModal("accountModal");
        return;
    }

    if (supporterUsername) {
        supporterUsername.value = userProfileCache.username;
        supporterUsername.readOnly = true;
    }

    openInfoModal("supportModal");
});

if (openAuthModalBtn) openAuthModalBtn.addEventListener("click", () => {
    isRegisterMode = false; 
    updateAuthModalUI();
    openInfoModal("authModal");
});

if (toggleAuthModeLink) {
    toggleAuthModeLink.addEventListener("click", (e) => {
        e.preventDefault();
        isRegisterMode = !isRegisterMode;
        updateAuthModalUI();
    });
}

function updateAuthModalUI() {
    const titleEl = document.getElementById("authModalTitle");
    const descEl = document.getElementById("authModalDesc");
    const submitBtn = document.getElementById("submitLoginEmailBtn");
    const promptEl = document.getElementById("authSwitchPrompt");

    if (!titleEl || !submitBtn) return;

    if (isRegisterMode) {
        titleEl.textContent = "Daftar Akun Baru";
        descEl.textContent = "Buat akun baru dengan email & password.";
        submitBtn.textContent = "Daftar Sekarang";
        promptEl.innerHTML = `Sudah punya akun? <a href="#" id="toggleAuthModeLink" style="color: var(--sage-700); font-weight: 700; text-decoration: underline;">Masuk sekarang</a>`;
    } else {
        titleEl.textContent = "Masuk ke Corner";
        descEl.textContent = "Hubungkan akunmu buat lihat riwayat traktir & kelola profil.";
        submitBtn.textContent = "Masuk Sekarang";
        promptEl.innerHTML = `Belum punya akun? <a href="#" id="toggleAuthModeLink" style="color: var(--sage-700); font-weight: 700; text-decoration: underline;">Daftar sekarang</a>`;
    }

    const rebindLink = document.getElementById("toggleAuthModeLink");
    if (rebindLink) {
        rebindLink.addEventListener("click", (ev) => {
            ev.preventDefault();
            isRegisterMode = !isRegisterMode;
            updateAuthModalUI();
        });
    }
}

window.switchAccTab = function(tabName) {
    const profileBtn = document.getElementById("accTabProfileBtn");
    const historyBtn = document.getElementById("accTabHistoryBtn");
    const profileContent = document.getElementById("accProfileContent");
    const historyContent = document.getElementById("accHistoryContent");

    if (tabName === 'profile') {
        if (profileBtn) { profileBtn.style.background = "var(--sage-700)"; profileBtn.style.color = "#fff"; }
        if (historyBtn) { historyBtn.style.background = "transparent"; historyBtn.style.color = "var(--text-soft)"; }
        if (profileContent) profileContent.style.display = "flex";
        if (historyContent) historyContent.style.display = "none";
    } else {
        if (historyBtn) { historyBtn.style.background = "var(--sage-700)"; historyBtn.style.color = "#fff"; }
        if (profileBtn) { profileBtn.style.background = "transparent"; profileBtn.style.color = "var(--text-soft)"; }
        if (historyContent) historyContent.style.display = "flex";
        if (profileContent) profileContent.style.display = "none";
    }
};

// Proses Login / Registrasi Email & Password Murni
if (submitLoginEmailBtn && supabaseClient) {
    submitLoginEmailBtn.addEventListener("click", async () => {
        const emailInput = document.getElementById("authEmailInput").value.trim();
        const passwordInput = document.getElementById("authPasswordInput").value;

        if (!emailInput || !passwordInput) {
            showToast("Email dan Password wajib diisi.");
            return;
        }

        submitLoginEmailBtn.textContent = isRegisterMode ? "Mendaftarkan..." : "Memeriksa...";
        submitLoginEmailBtn.disabled = true;

        let result;
        if (isRegisterMode) {
            result = await supabaseClient.auth.signUp({ email: emailInput, password: passwordInput });
        } else {
            result = await supabaseClient.auth.signInWithPassword({ email: emailInput, password: passwordInput });
        }

        submitLoginEmailBtn.textContent = isRegisterMode ? "Daftar Sekarang" : "Masuk Sekarang";
        submitLoginEmailBtn.disabled = false;

        if (result.error) {
            showToast(result.error.message);
        } else {
            showToast(isRegisterMode ? "Registrasi berhasil! Silakan atur username unikmu." : "Berhasil masuk! ☺");
            closeInfoModal("authModal");
            await checkUserSession();
            
            if (isRegisterMode && result.data && result.data.user) {
                setTimeout(() => {
                    loadUserProfileData(result.data.user);
                    openInfoModal("accountModal");
                }, 400);
            }
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
SUPPORT PAYMENT & RANKING SYSTEM
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

function savePendingPayment(orderId, username, amount, token) {
    if (!orderId) return;
    const paymentData = { orderId, username: username || "Anonim", amount: Number(amount) || 0, token: token || "", createdAt: Date.now() };
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
        if (Date.now() - data.createdAt > PAYMENT_MAX_AGE) {
            localStorage.removeItem(key);
            return null;
        }
        return data;
    } catch (e) {
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

async function checkPaymentStatus(orderId) {
    if (!orderId) return null;
    try {
        const response = await fetch(`/api/check-payment?order_id=${encodeURIComponent(orderId)}`, { cache: "no-store" });
        return await response.json();
    } catch (e) {
        return null;
    }
}

async function handlePaymentResult(orderId) {
    if (!orderId) return;
    const payment = getPendingPayment(orderId);
    const statusData = await checkPaymentStatus(orderId);

    if (!statusData) return;
    const status = statusData.transaction_status;

    if (status === "settlement" || status === "capture") {
        const username = payment?.username || "Supporter";
        const amount = payment?.amount || statusData.gross_amount;

        const resultOrderId = document.getElementById("resOrderId");
        const resultAmount = document.getElementById("resAmount");
        const resultUsername = document.getElementById("resUsername");
        const resultPaymentType = document.getElementById("resPaymentType");

        if (resultOrderId) resultOrderId.textContent = statusData.order_id || orderId;
        if (resultAmount) resultAmount.textContent = `Rp${formatRupiah(amount)}`;
        if (resultUsername) resultUsername.textContent = username;
        if (resultPaymentType) resultPaymentType.textContent = (statusData.payment_type || "ONLINE").replace(/_/g, " ").toUpperCase();

        clearPendingPayment(orderId);
        openInfoModal("successPaymentModal");
        await fetchRankings();
    }
}

function validateInput() {
    if (!supporterUsername) return true;
    if (userProfileCache && userProfileCache.username) {
        supporterUsername.value = userProfileCache.username;
    }
    return selectedValue >= 1000 && supporterUsername.value.trim() !== "";
}

function updateSupportAmount() {
    if (!selectedAmount) return;
    selectedAmount.textContent = selectedValue > 0 ? `Nominal: Rp${formatRupiah(selectedValue)}` : "Belum memilih nominal";
    if (continueSupport) continueSupport.disabled = !validateInput();
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

function launchSnapPayment(token, orderId) {
    window.snap.pay(token, {
        onSuccess: async () => { await handlePaymentResult(orderId); },
        onPending: async () => { await handlePaymentResult(orderId); },
        onError: () => { clearPendingPayment(orderId); openInfoModal("errorPaymentModal"); },
        onClose: async () => { await handlePaymentResult(orderId); }
    });
}

if (continueSupport) {
    continueSupport.addEventListener("click", async () => {
        if (!validateInput() || selectedValue < 1000) return;
        const amount = selectedValue;
        const username = userProfileCache?.username;

        if (!username) {
            showToast("Username akun belum terverifikasi.");
            return;
        }

        continueSupport.disabled = true;
        continueSupport.textContent = "Memproses...";

        try {
            const response = await fetch("/api/create-payment", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ amount, username })
            });

            const data = await response.json();
            if (!response.ok || !data.token || !data.order_id) {
                throw new Error(data.error || "Gagal membuat pembayaran.");
            }

            savePendingPayment(data.order_id, username, amount, data.token);
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

// Cek Invoice
const checkInvoiceBtn = document.getElementById("checkInvoiceBtn");
const checkOrderIdInput = document.getElementById("checkOrderIdInput");
if (checkInvoiceBtn && checkOrderIdInput) {
    checkInvoiceBtn.addEventListener("click", async () => {
        const orderId = checkOrderIdInput.value.trim();
        if (!orderId) { showToast("Masukkan Order ID."); return; }
        
        checkInvoiceBtn.textContent = "Mengecek...";
        const statusData = await checkPaymentStatus(orderId);
        checkInvoiceBtn.textContent = "Cek Invoice";

        if (!statusData || !statusData.transaction_status) {
            showToast("Invoice tidak ditemukan.");
            return;
        }

        document.getElementById("invOrderId").textContent = statusData.order_id || orderId;
        document.getElementById("invStatus").textContent = statusData.transaction_status.toUpperCase();
        document.getElementById("invAmount").textContent = `Rp${formatRupiah(statusData.gross_amount || 0)}`;
        document.getElementById("invPaymentType").textContent = (statusData.payment_type || "-").replace(/_/g, " ").toUpperCase();
        document.getElementById("invTime").textContent = statusData.transaction_time || "-";

        openInfoModal("invoiceModal");
    });
}

window.scrollToRanking = function () {
    closeInfoModal("successPaymentModal");
    document.getElementById("support")?.scrollIntoView({ behavior: "smooth" });
};

let currentRankTab = "daily";
let rankingDataCache = { daily: [], weekly: [], lifetime: [] };

async function fetchRankings() {
    if (!rankingList) return;
    try {
        const res = await fetch("/api/ranking", { cache: "no-store" });
        if (!res.ok) throw new Error();
        rankingDataCache = await res.json();
        renderRanking(currentRankTab);
    } catch (e) {
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

        li.innerHTML = `
            <div class="rank-medal">${medal}</div>
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

});
