// @ts-nocheck

/* =========================================================
GEPA PERSONAL WEBSITE
Vanilla JavaScript

Payment System & Supabase Auth Integration (Sign In & Sign Up)
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
const loginGoogleBtn = document.getElementById("loginGoogleBtn");
const loginPhoneBtn = document.getElementById("loginPhoneBtn");
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
SUPABASE AUTH INITIALIZATION & SESSION CHECK (ANTI-LOOP)
========================================================= */
const SUPABASE_URL = "https://dkybfxbhlwyrjcycpatp.supabase.co"; 
const SUPABASE_ANON_KEY = "sb_publishable_Av4YqKP2rl2BePcsms8wGA_JqUmHpCX"; 

const supabaseClient = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
let currentUserSession = null;

function updateAuthButtonState(session) {
    currentUserSession = session;
    if (session && openAuthModalBtn) {
        openAuthModalBtn.textContent = "✨ Akun";
        openAuthModalBtn.onclick = () => {
            loadUserProfileData(session.user);
            openInfoModal("accountModal");
        };
    } else if (openAuthModalBtn) {
        openAuthModalBtn.textContent = "✨ Masuk";
        openAuthModalBtn.onclick = () => {
            isRegisterMode = false;
            updateAuthModalUI();
            openInfoModal("authModal");
        };
    }
}

async function checkUserSession() {
    if (!supabaseClient) return;
    
    // Cek sesi aktif saat halaman dimuat
    const { data: { session } } = await supabaseClient.auth.getSession();
    updateAuthButtonState(session);

    // Pantau perubahan sesi secara real-time (mencegah token hilang/loop)
    supabaseClient.auth.onAuthStateChange((event, session) => {
        updateAuthButtonState(session);
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
    const avatarPreview = document.getElementById("userAvatarPreview");

    if (emailDisplay) emailDisplay.textContent = user.email;

    // Ambil data profil dari tabel profiles
    const { data } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    if (data) {
        if (usernameInput) usernameInput.value = data.username || "";
        if (phoneInput) phoneInput.value = data.phone || "";
        if (data.avatar_url && avatarPreview) {
            avatarPreview.src = data.avatar_url;
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

// Simpan Perubahan Profil (Username Unik & No HP)
const saveProfileBtn = document.getElementById("saveProfileBtn");
if (saveProfileBtn && supabaseClient) {
    saveProfileBtn.addEventListener("click", async () => {
        if (!currentUserSession) return;
        const newUsername = document.getElementById("accUsernameInput").value.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
        const newPhone = document.getElementById("accPhoneInput").value.trim();

        if (!newUsername) {
            showToast("Username tidak boleh kosong!");
            return;
        }

        saveProfileBtn.textContent = "Menyimpan...";
        saveProfileBtn.disabled = true;

        // Cek duplikasi username
        const { data: existingUser } = await supabaseClient
            .from('profiles')
            .select('id')
            .eq('username', newUsername)
            .neq('id', currentUserSession.user.id)
            .single();

        if (existingUser) {
            showToast("Username sudah digunakan orang lain!");
            saveProfileBtn.textContent = "Simpan Perubahan";
            saveProfileBtn.disabled = false;
            return;
        }

        const { error } = await supabaseClient
            .from('profiles')
            .update({ username: newUsername, phone: newPhone, updated_at: new Date() })
            .eq('id', currentUserSession.user.id);

        saveProfileBtn.textContent = "Simpan Perubahan";
        saveProfileBtn.disabled = false;

        if (error) {
            showToast("Gagal menyimpan: " + error.message);
        } else {
            showToast("Profil berhasil diperbarui! ✨");
        }
    });
}

// Upload Foto Profil ke Supabase Storage
const avatarUploadInput = document.getElementById("avatarUploadInput");
if (avatarUploadInput && supabaseClient) {
    avatarUploadInput.addEventListener("change", async (e) => {
        const file = e.target.files[0];
        if (!file || !currentUserSession) return;

        showToast("Mengupload foto...");
        const fileExt = file.name.split('.').pop();
        const fileName = `${currentUserSession.user.id}-${Math.random()}.${fileExt}`;

        const { error: uploadError } = await supabaseClient.storage
            .from('avatars')
            .upload(fileName, file);

        if (uploadError) {
            showToast("Gagal upload foto: " + uploadError.message);
            return;
        }

        const { data: publicURLData } = supabaseClient.storage
            .from('avatars')
            .getPublicUrl(fileName);

        const avatarUrl = publicURLData.publicUrl;

        await supabaseClient
            .from('profiles')
            .update({ avatar_url: avatarUrl })
            .eq('id', currentUserSession.user.id);

        document.getElementById("userAvatarPreview").src = avatarUrl;
        showToast("Foto profil berhasil diubah! 📸");
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
let isRegisterMode = false;

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
if (supportButton) supportButton.addEventListener("click", () => openInfoModal("supportModal"));

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
        descEl.textContent = "Buat akun baru buat mulai nyimpen riwayat traktiranmu.";
        submitBtn.textContent = "Daftar Sekarang";
        promptEl.innerHTML = `Sudah punya akun? <a href="#" id="toggleAuthModeLink" style="color: var(--sage-700); font-weight: 700; text-decoration: underline;">Masuk sekarang</a>`;
    } else {
        titleEl.textContent = "Masuk ke Corner";
        descEl.textContent = "Hubungkan akunmu buat lihat riwayat traktir & kelola profil.";
        submitBtn.textContent = "Masuk Sekarang";
        promptEl.innerHTML = `Belum punya akun? <a href="#" id="toggleAuthModeLink" style="color: var(--sage-700); font-weight: 700; text-decoration: underline;">Daftar sekarang</a>`;
    }

    setTimeout(() => {
        const rebindLink = document.getElementById("toggleAuthModeLink");
        if (rebindLink) {
            rebindLink.addEventListener("click", (ev) => {
                ev.preventDefault();
                isRegisterMode = !isRegisterMode;
                updateAuthModalUI();
            });
        }
    }, 10);
}

// Auth Tab Switcher (Social vs Email)
window.switchAuthTab = function(tabName) {
    const tabSocialBtn = document.getElementById("tabSocialBtn");
    const tabEmailBtn = document.getElementById("tabEmailBtn");
    const socialContent = document.getElementById("socialAuthContent");
    const emailContent = document.getElementById("emailAuthContent");

    if (tabName === 'social') {
        if (tabSocialBtn) { tabSocialBtn.style.background = "var(--sage-700)"; tabSocialBtn.style.color = "#fff"; }
        if (tabEmailBtn) { tabEmailBtn.style.background = "transparent"; tabEmailBtn.style.color = "var(--text-soft)"; }
        if (socialContent) socialContent.style.display = "flex";
        if (emailContent) emailContent.style.display = "none";
    } else {
        if (tabEmailBtn) { tabEmailBtn.style.background = "var(--sage-700)"; tabEmailBtn.style.color = "#fff"; }
        if (tabSocialBtn) { tabSocialBtn.style.background = "transparent"; tabSocialBtn.style.color = "var(--text-soft)"; }
        if (emailContent) emailContent.style.display = "flex";
        if (socialContent) socialContent.style.display = "none";
    }
};

// Account Modal Tab Switcher (Edit Profil vs Riwayat Donasi)
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

// Supabase Google & Email Actions
if (loginGoogleBtn && supabaseClient) {
    loginGoogleBtn.addEventListener("click", async () => {
        const { error } = await supabaseClient.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: window.location.origin }
        });
        if (error) showToast("Gagal login Google: " + error.message);
    });
}

if (loginPhoneBtn) {
    loginPhoneBtn.addEventListener("click", () => {
        showToast("Login WhatsApp menggunakan verifikasi OTP Supabase.");
    });
}

if (submitLoginEmailBtn && supabaseClient) {
    submitLoginEmailBtn.addEventListener("click", async () => {
        const emailInput = document.getElementById("authEmailInput").value.trim();
        const passwordInput = document.getElementById("authPasswordInput").value;

        if (!emailInput || !passwordInput) {
            showToast("Email/No. HP dan Password wajib diisi.");
            return;
        }

        submitLoginEmailBtn.textContent = isRegisterMode ? "Mendaftarkan..." : "Memeriksa...";
        submitLoginEmailBtn.disabled = true;

        const isEmail = emailInput.includes("@");
        const identifier = isEmail ? emailInput : `${emailInput.replace(/[^0-9]/g, "")}@phone.local`;

        let result;
        if (isRegisterMode) {
            result = await supabaseClient.auth.signUp({ email: identifier, password: passwordInput });
        } else {
            result = await supabaseClient.auth.signInWithPassword({ email: identifier, password: passwordInput });
        }

        submitLoginEmailBtn.textContent = isRegisterMode ? "Daftar Sekarang" : "Masuk Sekarang";
        submitLoginEmailBtn.disabled = false;

        if (result.error) {
            showToast(result.error.message);
        } else {
            showToast(isRegisterMode ? "Registrasi berhasil!" : "Berhasil masuk! ☺");
            closeInfoModal("authModal");
            checkUserSession();
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

function savePendingPayment(orderId, username, amount, token) {
    if (!orderId) return;
    const paymentData = {
        orderId: orderId,
        username: username || "Anonim",
        amount: Number(amount) || 0,
        token: token || "",
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

async function handlePaymentResult(orderId) {
    if (!orderId) return;
    const payment = getPendingPayment(orderId);
    const statusData = await checkPaymentStatus(orderId);

    if (!statusData) {
        showPendingModal(orderId, payment);
        return;
    }

    const status = statusData.transaction_status;

    if (status === "settlement" || status === "capture") {
        const username = payment && payment.username ? payment.username : "Supporter";
        const amount = payment && Number(payment.amount) > 0 ? Number(payment.amount) : Number(statusData.gross_amount);

        const resultOrderId = document.getElementById("resOrderId");
        const resultAmount = document.getElementById("resAmount");
        const resultUsername = document.getElementById("resUsername");
        const resultPaymentType = document.getElementById("resPaymentType");

        if (resultOrderId) resultOrderId.textContent = statusData.order_id || orderId;
        if (resultAmount) resultAmount.textContent = `Rp${formatRupiah(amount)}`;
        if (resultUsername) resultUsername.textContent = username;
        if (resultPaymentType) {
            resultPaymentType.textContent = statusData.payment_type ? statusData.payment_type.replace(/_/g, " ").toUpperCase() : "ONLINE PAYMENT";
        }

        clearPendingPayment(orderId);
        openInfoModal("successPaymentModal");
        await fetchRankings();
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
    if (!supporterUsername || !usernameError) return true;
    const username = supporterUsername.value.trim();
    const hasHtml = /<[a-z][\s\S]*>/i.test(username);

    if (username === "" || hasHtml) {
        continueSupport.disabled = true;
        if (selectedValue > 0) usernameError.style.display = "block";
        return false;
    } else {
        usernameError.style.display = "none";
        if (selectedValue > 0) {
            continueSupport.disabled = false;
            return true;
        }
    }
    return false;
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
    window.snap.pay(token, {
        onSuccess: async function () { await handlePaymentResult(orderId); },
        onPending: async function () { await handlePaymentResult(orderId); },
        onError: async function () { clearPendingPayment(orderId); openInfoModal("errorPaymentModal"); },
        onClose: async function () { await handlePaymentResult(orderId); }
    });
}

if (continueSupport) {
    continueSupport.addEventListener("click", async () => {
        if (!validateInput() || selectedValue < 1000) return;
        const amount = selectedValue;
        const username = supporterUsername.value.trim();

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
            if (supporterUsername) supporterUsername.value = "";
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
CHECK INVOICE HANDLER (DIKEMBALIKAN & DIAKTIFKAN)
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

        if (invOrderId) invOrderId.textContent = statusData.order_id || orderId;
        if (invStatus) {
            const st = statusData.transaction_status.toUpperCase();
            invStatus.textContent = st;
            invStatus.style.color = (st === "SETTLEMENT" || st === "CAPTURE") ? "var(--sage-700)" : "#d97706";
        }
        if (invAmount) invAmount.textContent = `Rp${formatRupiah(statusData.gross_amount || 0)}`;
        if (invPaymentType) invPaymentType.textContent = statusData.payment_type ? statusData.payment_type.replace(/_/g, " ").toUpperCase() : "-";
        if (invTime) invTime.textContent = statusData.transaction_time || "-";

        openInfoModal("invoiceModal");
    });
}

window.scrollToRanking = function () {
    closeInfoModal("successPaymentModal");
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

async function handlePaymentReturn() {
    const urlParams = new URLSearchParams(window.location.search);
    const incomingOrderId = urlParams.get("order_id");
    const activeOrderId = getActivePaymentOrder();
    let orderId = incomingOrderId || activeOrderId;

    if (!orderId) return;
    if (window.location.search) {
        window.history.replaceState({}, document.title, window.location.pathname);
    }
    await new Promise((resolve) => setTimeout(resolve, 1500));
    await handlePaymentResult(orderId);
}

setTimeout(() => { handlePaymentReturn(); }, 500);

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
