// @ts-nocheck

/* =========================================================
GEPA PERSONAL WEBSITE
Vanilla JavaScript (Updated with Midtrans Integration & Carousel Fix)
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

// Support Elements
const supportButton = document.getElementById("supportButton");
const amountButtons = document.querySelectorAll(".amount-button");
const customAmount = document.getElementById("customAmount");
const selectedAmount = document.getElementById("selectedAmount");
const continueSupport = document.getElementById("continueSupport");

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
CURRENT YEAR
========================================================= */
if (currentYear) {
    currentYear.textContent = new Date().getFullYear();
}

/* =========================================================
REAL-TIME AGE
Birthday: 17 May 2006 (00:00:00)
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
    
    // Cegah DOM overwrite berulang jika angkanya tidak berubah
    const newAgeText = `${age.years} years`;
    if (ageDisplay && ageDisplay.textContent !== newAgeText) {
        ageDisplay.textContent = newAgeText;
    }

    // Hanya update detik/menit jika modal sedang terbuka (hemat performa)
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
    navMenu.classList.remove("open");
    mobileMenuButton.setAttribute("aria-expanded", "false");
    mobileMenuButton.setAttribute("aria-label", "Open navigation menu");
}

function toggleMobileMenu() {
    const isOpen = navMenu.classList.toggle("open");
    mobileMenuButton.setAttribute("aria-expanded", String(isOpen));
    mobileMenuButton.setAttribute("aria-label", isOpen ? "Close navigation menu" : "Open navigation menu");
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
    if (window.scrollY > 20) header.classList.add("scrolled");
    else header.classList.remove("scrolled");
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
    const isDark = body.classList.contains("dark-mode");
    themeIcon.textContent = isDark ? "☀" : "☾";
    themeToggle.setAttribute("aria-label", isDark ? "Switch to light mode" : "Switch to dark mode");
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
PHOTO CAROUSEL (INFINITE LOOP CLONE)
========================================================= */
const photoTrack = document.getElementById("photoTrack");
const photoCarousel = document.getElementById("photoCarousel");
const prevPhoto = document.getElementById("prevPhoto");
const nextPhoto = document.getElementById("nextPhoto");
const carouselDots = document.getElementById("carouselDots");

const photoList = [
    "assets/foto-1.jpg", "assets/foto-2.jpg", "assets/foto-6.jpg"
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
            slide.innerHTML = `<div class="photo-fallback"><span>G</span></div><span class="photo-caption">foto ${index + 1}</span>`;
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
    photoList.forEach((photo, index) => { createSlide(photo, index, false); });
    createSlide(photoList[0], 0, true);

    photoTrack.style.transition = "none";
    photoTrack.style.transform = `translate3d(-100%, 0, 0)`;
}

function createCarouselDots() {
    if (!carouselDots) return;
    carouselDots.innerHTML = "";
    photoList.forEach((_, index) => {
        const dot = document.createElement("button");
        dot.type = "button";
        dot.className = "carousel-dot";
        dot.setAttribute("aria-label", `Go to photo ${index + 1}`);
        dot.addEventListener("click", () => { goToPhoto(index); });
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
    if (photoList.length <= 1 || isMoving) return;
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
                photoTrack.style.transform = `translate3d(-100%, 0, 0)`;
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
                // BUG FIX: Menggunakan variabel currentPhoto, bukan -100% mati
                photoTrack.style.transform = `translate3d(-${currentPhoto * 100}%, 0, 0)`;
            }
            isMoving = false;
        }, 430);
    }
}

function goToPhoto(index) {
    const targetPhoto = index + 1;
    if (isMoving || currentPhoto === targetPhoto) return;
    
    isMoving = true;
    currentPhoto = targetPhoto;
    photoTrack.style.transition = "transform 420ms cubic-bezier(.22,.61,.36,1)";
    photoTrack.style.transform = `translate3d(-${currentPhoto * 100}%, 0, 0)`;
    updateDots();
    
    setTimeout(() => { isMoving = false; }, 430);
}

if (prevPhoto) prevPhoto.addEventListener("click", () => { moveCarousel("prev"); });
if (nextPhoto) nextPhoto.addEventListener("click", () => { moveCarousel("next"); });

if (photoCarousel) {
    photoCarousel.addEventListener("touchstart", (e) => {
        if (e.touches.length !== 1) return;
        startX = e.touches[0].clientX;
        currentX = startX;
        isDragging = true;
        photoTrack.style.transition = "none";
    }, { passive: true });

    photoCarousel.addEventListener("touchmove", (e) => {
        if (!isDragging) return;
        currentX = e.touches[0].clientX;
        const diff = currentX - startX;
        const width = photoCarousel.offsetWidth;
        const dragPercent = width > 0 ? (diff / width) * 100 : 0;
        const base = -(currentPhoto * 100);
        photoTrack.style.transform = `translate3d(${base + dragPercent}%, 0, 0)`;
    }, { passive: true });

    photoCarousel.addEventListener("touchend", () => {
        if (!isDragging) return;
        isDragging = false;
        const diff = currentX - startX;
        if (Math.abs(diff) >= 45) {
            diff < 0 ? moveCarousel("next") : moveCarousel("prev");
        } else {
            photoTrack.style.transition = "transform 420ms cubic-bezier(.22,.61,.36,1)";
            photoTrack.style.transform = `translate3d(-${currentPhoto * 100}%, 0, 0)`;
        }
    }, { passive: true });
    
    photoCarousel.addEventListener("dragstart", (e) => e.preventDefault());
}

createPhotoSlides();
createCarouselDots();
updateDots();

document.addEventListener("keydown", (e) => {
    const act = document.activeElement;
    if (act && (act.tagName === "INPUT" || act.tagName === "TEXTAREA")) return;
    if (e.key === "ArrowRight") moveCarousel("next");
    if (e.key === "ArrowLeft") moveCarousel("prev");
});

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
MODAL SYSTEM (SUPPORT & INFO)
========================================================= */
let selectedValue = 0;

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
        
        if (modalId === 'supportModal') {
            selectedValue = 0;
            amountButtons.forEach(btn => btn.classList.remove("selected"));
            if(customAmount) customAmount.value = "";
            updateSupportAmount();
        }

        if (!document.querySelector('.modal-overlay.open')) {
            body.classList.remove("modal-open");
        }
    }
};

if (ageCard) ageCard.addEventListener("click", () => openInfoModal("ageModalOverlay"));
if (locationCard) locationCard.addEventListener("click", () => openInfoModal("locationModalOverlay"));
if (hobbyCard) hobbyCard.addEventListener("click", () => openInfoModal("hobbyModalOverlay"));
if (supportButton) supportButton.addEventListener("click", () => openInfoModal("supportModal"));

const modals = document.querySelectorAll('.modal-overlay');
modals.forEach(modal => {
    modal.addEventListener("click", (e) => {
        if (e.target === modal) {
            closeInfoModal(modal.id);
        }
    });
});

document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
        modals.forEach(modal => {
            if (modal.classList.contains("open")) closeInfoModal(modal.id);
        });
    }
});

/* =========================================================
SUPPORT MODAL & MIDTRANS PAYMENT GATEWAY LOGIC
========================================================= */
function formatRupiah(value) {
    if (!value || value <= 0) return "0";
    return new Intl.NumberFormat("id-ID").format(value);
}

function updateSupportAmount() {
    if (selectedValue > 0) {
        selectedAmount.textContent = `Nominal dipilih: Rp${formatRupiah(selectedValue)}`;
        continueSupport.disabled = false;
    } else {
        selectedAmount.textContent = "Belum memilih nominal";
        continueSupport.disabled = true;
    }
}

amountButtons.forEach((button) => {
    button.addEventListener("click", () => {
        selectedValue = Number(button.dataset.amount);
        amountButtons.forEach(btn => btn.classList.remove("selected"));
        button.classList.add("selected");
        customAmount.value = "";
        updateSupportAmount();
    });
});

if (customAmount) {
    customAmount.addEventListener("input", () => {
        const val = Number(customAmount.value);
        selectedValue = val >= 1000 ? val : 0;
        amountButtons.forEach(btn => btn.classList.remove("selected"));
        updateSupportAmount();
    });
}

if (continueSupport) {
    continueSupport.addEventListener("click", async () => {
        if (selectedValue < 1000) return;
        const amount = selectedValue;
        
        continueSupport.disabled = true;
        continueSupport.textContent = "Memproses...";

        try {
            const response = await fetch("/api/create-payment", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ amount: amount })
            });

            let data;
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.indexOf("application/json") !== -1) {
                data = await response.json();
            } else {
                throw new Error("Terdapat masalah pada server, silakan coba beberapa saat lagi.");
            }

            if (!response.ok) {
                throw new Error(data.error || "Gagal membuat transaksi pembayaran.");
            }

            closeInfoModal("supportModal");

            if (window.snap) {
                window.snap.pay(data.token, {
                    onSuccess: function(result) {
                        showToast("Terima kasih! Pembayaran berhasil ☕");
                        console.log(result);
                    },
                    onPending: function(result) {
                        showToast("Menunggu pembayaran selesai...");
                        console.log(result);
                    },
                    onError: function(result) {
                        showToast("Pembayaran gagal. Coba lagi.");
                        console.log(result);
                    },
                    onClose: function() {
                        showToast("Popup pembayaran ditutup.");
                    }
                });
            } else {
                window.location.href = data.redirect_url;
            }

        } catch (error) {
            console.error("Payment error:", error);
            showToast(error.message || "Terjadi kesalahan koneksi.");
        } finally {
            continueSupport.disabled = false;
            continueSupport.textContent = "Lanjutkan →";
        }
    });
}

/* =========================================================
TOAST
========================================================= */
let toastTimer = null;
function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.classList.remove("show"); }, 3000);
}

});
