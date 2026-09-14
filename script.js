// @ts-nocheck

/* =========================================================
GEPA PERSONAL WEBSITE
Vanilla JavaScript

Payment System:
Midtrans + Supabase + Direct Status Verification

Payment Safety:
- Payment stored per order_id
- Prevents payment data collision
- Verifies transaction directly with Midtrans
- No forced success popup
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

    if (now < birthDate) {
        return {
            years: 0,
            months: 0,
            days: 0,
            hours: 0,
            minutes: 0,
            seconds: 0
        };
    }

    let years =
        now.getFullYear() -
        birthDate.getFullYear();

    let months =
        now.getMonth() -
        birthDate.getMonth();

    let days =
        now.getDate() -
        birthDate.getDate();

    let hours =
        now.getHours() -
        birthDate.getHours();

    let minutes =
        now.getMinutes() -
        birthDate.getMinutes();

    let seconds =
        now.getSeconds() -
        birthDate.getSeconds();

    if (seconds < 0) {
        minutes--;
        seconds += 60;
    }

    if (minutes < 0) {
        hours--;
        minutes += 60;
    }

    if (hours < 0) {
        days--;
        hours += 24;
    }

    if (days < 0) {
        months--;

        const previousMonth =
            new Date(
                now.getFullYear(),
                now.getMonth(),
                0
            );

        days += previousMonth.getDate();
    }

    if (months < 0) {
        years--;
        months += 12;
    }

    return {
        years,
        months,
        days,
        hours,
        minutes,
        seconds
    };
}

function updateAge() {
    const age =
        calculateFullAge();

    const newAgeText =
        `${age.years} years`;

    if (
        ageDisplay &&
        ageDisplay.textContent !== newAgeText
    ) {
        ageDisplay.textContent =
            newAgeText;
    }

    const ageModal =
        document.getElementById(
            "ageModalOverlay"
        );

    if (
        ageModal &&
        ageModal.classList.contains("open")
    ) {
        if (ageYears)
            ageYears.textContent =
                age.years;

        if (ageMonths)
            ageMonths.textContent =
                age.months;

        if (ageDays)
            ageDays.textContent =
                age.days;

        if (ageHours)
            ageHours.textContent =
                age.hours;

        if (ageMinutes)
            ageMinutes.textContent =
                age.minutes;

        if (ageSeconds)
            ageSeconds.textContent =
                age.seconds;
    }
}

updateAge();

setInterval(
    updateAge,
    1000
);


/* =========================================================
MOBILE NAVIGATION
========================================================= */
function closeMobileMenu() {
    if (
        !navMenu ||
        !mobileMenuButton
    ) {
        return;
    }

    navMenu.classList.remove(
        "open"
    );

    mobileMenuButton.setAttribute(
        "aria-expanded",
        "false"
    );
}

function toggleMobileMenu() {
    if (
        !navMenu ||
        !mobileMenuButton
    ) {
        return;
    }

    const isOpen =
        navMenu.classList.toggle(
            "open"
        );

    mobileMenuButton.setAttribute(
        "aria-expanded",
        String(isOpen)
    );
}

if (mobileMenuButton) {
    mobileMenuButton.addEventListener(
        "click",
        toggleMobileMenu
    );
}

navLinks.forEach(
    (link) => {
        link.addEventListener(
            "click",
            closeMobileMenu
        );
    }
);


/* =========================================================
HEADER SCROLL & ACTIVE NAVIGATION
========================================================= */
function updateHeader() {
    if (!header) {
        return;
    }

    if (window.scrollY > 20) {
        header.classList.add(
            "scrolled"
        );
    } else {
        header.classList.remove(
            "scrolled"
        );
    }
}

const sections =
    document.querySelectorAll(
        "main section[id]"
    );

function updateActiveNavigation() {
    const scrollPosition =
        window.scrollY + 150;

    let currentSection =
        "home";

    sections.forEach(
        (section) => {
            const sectionTop =
                section.offsetTop;

            const sectionBottom =
                sectionTop +
                section.offsetHeight;

            if (
                scrollPosition >=
                    sectionTop &&
                scrollPosition <
                    sectionBottom
            ) {
                currentSection =
                    section.id;
            }
        }
    );

    navLinks.forEach(
        (link) => {
            const href =
                link.getAttribute(
                    "href"
                );

            link.classList.toggle(
                "active",
                href ===
                    `#${currentSection}`
            );
        }
    );
}

window.addEventListener(
    "scroll",
    () => {
        updateHeader();
        updateActiveNavigation();
    },
    {
        passive: true
    }
);

updateHeader();
updateActiveNavigation();


/* =========================================================
THEME
========================================================= */
function applyInitialTheme() {
    const savedTheme =
        localStorage.getItem(
            "gepa-theme"
        );

    if (savedTheme === "dark") {
        body.classList.add(
            "dark-mode"
        );
    }

    else if (
        savedTheme === "light"
    ) {
        body.classList.remove(
            "dark-mode"
        );
    }

    else {
        const prefersDark =
            window.matchMedia &&
            window.matchMedia(
                "(prefers-color-scheme: dark)"
            ).matches;

        if (prefersDark) {
            body.classList.add(
                "dark-mode"
            );
        }
    }

    updateThemeIcon();
}

function updateThemeIcon() {
    if (!themeIcon) {
        return;
    }

    const isDark =
        body.classList.contains(
            "dark-mode"
        );

    themeIcon.textContent =
        isDark
            ? "☀"
            : "☾";
}

if (themeToggle) {
    themeToggle.addEventListener(
        "click",
        () => {
            const isDark =
                body.classList.toggle(
                    "dark-mode"
                );

            localStorage.setItem(
                "gepa-theme",
                isDark
                    ? "dark"
                    : "light"
            );

            updateThemeIcon();
        }
    );
}

applyInitialTheme();


/* =========================================================
REVEAL ON SCROLL
========================================================= */
if (
    "IntersectionObserver"
    in window
) {
    const observer =
        new IntersectionObserver(
            (entries, obs) => {

                entries.forEach(
                    (entry) => {

                        if (
                            entry.isIntersecting
                        ) {

                            entry.target.classList.add(
                                "visible"
                            );

                            obs.unobserve(
                                entry.target
                            );
                        }
                    }
                );
            },
            {
                threshold: 0.12,
                rootMargin:
                    "0px 0px -30px 0px"
            }
        );

    revealElements.forEach(
        (el) =>
            observer.observe(el)
    );

} else {

    revealElements.forEach(
        (el) =>
            el.classList.add(
                "visible"
            )
    );
}


/* =========================================================
PHOTO CAROUSEL
========================================================= */
const photoTrack =
    document.getElementById(
        "photoTrack"
    );

const photoCarousel =
    document.getElementById(
        "photoCarousel"
    );

const prevPhoto =
    document.getElementById(
        "prevPhoto"
    );

const nextPhoto =
    document.getElementById(
        "nextPhoto"
    );

const carouselDots =
    document.getElementById(
        "carouselDots"
    );

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
    if (!photoTrack) {
        return;
    }

    photoTrack.innerHTML = "";

    const createSlide = (
        photo,
        index,
        isClone
    ) => {

        const slide =
            document.createElement(
                "div"
            );

        slide.className =
            "photo-slide";

        if (isClone) {
            slide.classList.add(
                "clone"
            );
        }

        const image =
            document.createElement(
                "img"
            );

        image.src = photo;

        image.alt =
            `Foto Gepa ${index + 1}`;

        image.loading =
            "eager";

        image.draggable =
            false;

        image.addEventListener(
            "error",
            () => {

                slide.innerHTML = `
                    <div class="photo-fallback">
                        <span>G</span>
                    </div>
                    <span class="photo-caption">
                        foto ${index + 1}
                    </span>
                `;
            }
        );

        slide.appendChild(
            image
        );

        if (
            !isClone &&
            index === 0
        ) {

            const caption =
                document.createElement(
                    "span"
                );

            caption.className =
                "photo-caption";

            caption.textContent =
                "that's me :)";

            slide.appendChild(
                caption
            );
        }

        photoTrack.appendChild(
            slide
        );
    };

    createSlide(
        photoList[
            photoList.length - 1
        ],
        photoList.length - 1,
        true
    );

    photoList.forEach(
        (photo, index) => {

            createSlide(
                photo,
                index,
                false
            );
        }
    );

    createSlide(
        photoList[0],
        0,
        true
    );

    photoTrack.style.transition =
        "none";

    photoTrack.style.transform =
        "translate3d(-100%, 0, 0)";
}

function createCarouselDots() {
    if (!carouselDots) {
        return;
    }

    carouselDots.innerHTML = "";

    photoList.forEach(
        (_, index) => {

            const dot =
                document.createElement(
                    "button"
                );

            dot.type =
                "button";

            dot.className =
                "carousel-dot";

            dot.addEventListener(
                "click",
                () =>
                    goToPhoto(index)
            );

            carouselDots.appendChild(
                dot
            );
        }
    );
}

function updateDots() {
    if (!carouselDots) {
        return;
    }

    const dots =
        carouselDots.querySelectorAll(
            ".carousel-dot"
        );

    let activeIndex =
        currentPhoto - 1;

    if (
        currentPhoto === 0
    ) {
        activeIndex =
            photoList.length - 1;
    }

    else if (
        currentPhoto ===
        photoList.length + 1
    ) {
        activeIndex = 0;
    }

    dots.forEach(
        (dot, index) => {

            dot.classList.toggle(
                "active",
                index ===
                    activeIndex
            );
        }
    );
}

function moveCarousel(
    direction
) {

    if (
        photoList.length <= 1 ||
        isMoving ||
        !photoTrack
    ) {
        return;
    }

    isMoving = true;

    photoTrack.style.transition =
        "transform 420ms cubic-bezier(.22,.61,.36,1)";

    if (
        direction === "next"
    ) {

        currentPhoto++;

        photoTrack.style.transform =
            `translate3d(-${currentPhoto * 100}%, 0, 0)`;

        updateDots();

        setTimeout(
            () => {

                if (
                    currentPhoto ===
                    photoList.length + 1
                ) {

                    photoTrack.style.transition =
                        "none";

                    currentPhoto = 1;

                    photoTrack.style.transform =
                        "translate3d(-100%, 0, 0)";
                }

                isMoving = false;

            },
            430
        );

    } else {

        currentPhoto--;

        photoTrack.style.transform =
            `translate3d(-${currentPhoto * 100}%, 0, 0)`;

        updateDots();

        setTimeout(
            () => {

                if (
                    currentPhoto === 0
                ) {

                    photoTrack.style.transition =
                        "none";

                    currentPhoto =
                        photoList.length;

                    photoTrack.style.transform =
                        `translate3d(-${currentPhoto * 100}%, 0, 0)`;
                }

                isMoving = false;

            },
            430
        );
    }
}

function goToPhoto(
    index
) {

    if (!photoTrack) {
        return;
    }

    const targetPhoto =
        index + 1;

    if (
        isMoving ||
        currentPhoto ===
            targetPhoto
    ) {
        return;
    }

    isMoving = true;

    currentPhoto =
        targetPhoto;

    photoTrack.style.transition =
        "transform 420ms cubic-bezier(.22,.61,.36,1)";

    photoTrack.style.transform =
        `translate3d(-${currentPhoto * 100}%, 0, 0)`;

    updateDots();

    setTimeout(
        () => {
            isMoving = false;
        },
        430
    );
}

if (prevPhoto) {
    prevPhoto.addEventListener(
        "click",
        () =>
            moveCarousel(
                "prev"
            )
    );
}

if (nextPhoto) {
    nextPhoto.addEventListener(
        "click",
        () =>
            moveCarousel(
                "next"
            )
    );
}

if (photoCarousel) {

    photoCarousel.addEventListener(
        "touchstart",
        (e) => {

            if (
                e.touches.length !==
                1
            ) {
                return;
            }

            startX =
                e.touches[0].clientX;

            currentX =
                startX;

            isDragging = true;

            if (photoTrack) {
                photoTrack.style.transition =
                    "none";
            }
        },
        {
            passive: true
        }
    );

    photoCarousel.addEventListener(
        "touchmove",
        (e) => {

            if (
                !isDragging ||
                !photoTrack
            ) {
                return;
            }

            currentX =
                e.touches[0].clientX;

            const diff =
                currentX -
                startX;

            const width =
                photoCarousel.offsetWidth;

            const dragPercent =
                width > 0
                    ? (diff / width) *
                      100
                    : 0;

            const base =
                -(currentPhoto *
                    100);

            photoTrack.style.transform =
                `translate3d(${base + dragPercent}%, 0, 0)`;
        },
        {
            passive: true
        }
    );

    photoCarousel.addEventListener(
        "touchend",
        () => {

            if (
                !isDragging ||
                !photoTrack
            ) {
                return;
            }

            isDragging = false;

            const diff =
                currentX -
                startX;

            if (
                Math.abs(diff) >=
                45
            ) {

                diff < 0
                    ? moveCarousel(
                        "next"
                    )
                    : moveCarousel(
                        "prev"
                    );

            } else {

                photoTrack.style.transition =
                    "transform 420ms cubic-bezier(.22,.61,.36,1)";

                photoTrack.style.transform =
                    `translate3d(-${currentPhoto * 100}%, 0, 0)`;
            }
        },
        {
            passive: true
        }
    );
}

createPhotoSlides();
createCarouselDots();
updateDots();


/* =========================================================
MODAL SYSTEM
========================================================= */
window.openInfoModal =
    function(modalId) {

        const modal =
            document.getElementById(
                modalId
            );

        if (modal) {

            modal.classList.add(
                "open"
            );

            body.classList.add(
                "modal-open"
            );
        }
    };

window.closeInfoModal =
    function(modalId) {

        const modal =
            document.getElementById(
                modalId
            );

        if (modal) {

            modal.classList.remove(
                "open"
            );

            if (
                !document.querySelector(
                    ".modal-overlay.open"
                )
            ) {

                body.classList.remove(
                    "modal-open"
                );
            }
        }
    };

if (ageCard) {
    ageCard.addEventListener(
        "click",
        () =>
            openInfoModal(
                "ageModalOverlay"
            )
    );
}

if (locationCard) {
    locationCard.addEventListener(
        "click",
        () =>
            openInfoModal(
                "locationModalOverlay"
            )
    );
}

if (hobbyCard) {
    hobbyCard.addEventListener(
        "click",
        () =>
            openInfoModal(
                "hobbyModalOverlay"
            )
    );
}

if (supportButton) {
    supportButton.addEventListener(
        "click",
        () =>
            openInfoModal(
                "supportModal"
            )
    );
}

const modals =
    document.querySelectorAll(
        ".modal-overlay"
    );

modals.forEach(
    (modal) => {

        modal.addEventListener(
            "click",
            (e) => {

                if (
                    e.target ===
                    modal
                ) {

                    closeInfoModal(
                        modal.id
                    );
                }
            }
        );
    }
);


/* =========================================================
SUPPORT PAYMENT & RANKING
========================================================= */
let selectedValue = 0;

function formatRupiah(
    value
) {

    return new Intl.NumberFormat(
        "id-ID"
    ).format(value);
}


/* =========================================================
PAYMENT STORAGE
========================================================= */
const PAYMENT_STORAGE_PREFIX =
    "gepa_payment_";

const PAYMENT_MAX_AGE =
    24 * 60 * 60 * 1000;

function getPaymentStorageKey(
    orderId
) {

    return (
        PAYMENT_STORAGE_PREFIX +
        encodeURIComponent(
            orderId
        )
    );
}

function savePendingPayment(
    orderId,
    username,
    amount,
    token
) {

    if (!orderId) {
        return;
    }

    const paymentData = {
        orderId:
            orderId,

        username:
            username ||
            "Anonim",

        amount:
            Number(amount) || 0,

        token:
            token || "",

        createdAt:
            Date.now()
    };

    localStorage.setItem(
        getPaymentStorageKey(
            orderId
        ),
        JSON.stringify(
            paymentData
        )
    );

    localStorage.setItem(
        "gepa_active_payment",
        orderId
    );
}

function getPendingPayment(
    orderId
) {

    if (!orderId) {
        return null;
    }

    const key =
        getPaymentStorageKey(
            orderId
        );

    const raw =
        localStorage.getItem(
            key
        );

    if (!raw) {
        return null;
    }

    try {

        const data =
            JSON.parse(raw);

        if (
            !data.createdAt ||
            Date.now() -
                data.createdAt >
                PAYMENT_MAX_AGE
        ) {

            localStorage.removeItem(
                key
            );

            if (
                localStorage.getItem(
                    "gepa_active_payment"
                ) === orderId
            ) {

                localStorage.removeItem(
                    "gepa_active_payment"
                );
            }

            return null;
        }

        return data;

    } catch (error) {

        localStorage.removeItem(
            key
        );

        return null;
    }
}

function clearPendingPayment(
    orderId
) {

    if (!orderId) {
        return;
    }

    localStorage.removeItem(
        getPaymentStorageKey(
            orderId
        )
    );

    if (
        localStorage.getItem(
            "gepa_active_payment"
        ) === orderId
    ) {

        localStorage.removeItem(
            "gepa_active_payment"
        );
    }
}

function getActivePaymentOrder() {

    const orderId =
        localStorage.getItem(
            "gepa_active_payment"
        );

    if (!orderId) {
        return null;
    }

    const payment =
        getPendingPayment(
            orderId
        );

    if (!payment) {
        return null;
    }

    return orderId;
}


/* =========================================================
CHECK PAYMENT STATUS
========================================================= */
async function checkPaymentStatus(
    orderId
) {

    if (!orderId) {
        return null;
    }

    try {

        const response =
            await fetch(
                `/api/check-payment?order_id=${encodeURIComponent(orderId)}`,
                {
                    cache: "no-store"
                }
            );

        const data =
            await response.json();

        if (!response.ok) {

            console.error(
                "Check payment failed:",
                data
            );

            return null;
        }

        return data;

    } catch (error) {

        console.error(
            "Check payment error:",
            error
        );

        return null;
    }
}


/* =========================================================
SHOW PAYMENT RESULT
========================================================= */
async function handlePaymentResult(
    orderId
) {

    if (!orderId) {
        return;
    }

    const payment =
        getPendingPayment(
            orderId
        );

    if (
        payment &&
        payment.orderId !==
            orderId
    ) {

        console.warn(
            "Payment data mismatch."
        );

        return;
    }

    const statusData =
        await checkPaymentStatus(
            orderId
        );

    if (!statusData) {

        showToast(
            "Status pembayaran belum bisa dicek."
        );

        return;
    }

    const status =
        statusData.transaction_status;


    /* =====================================================
    SUCCESS
    ===================================================== */
    if (
        status === "settlement" ||
        status === "capture"
    ) {

        const username =
            payment &&
            payment.username
                ? payment.username
                : "Supporter";

        const amount =
            payment &&
            Number(payment.amount) > 0
                ? Number(payment.amount)
                : Number(
                    statusData.gross_amount
                );

        const resultOrderId =
            document.getElementById(
                "resOrderId"
            );

        const resultAmount =
            document.getElementById(
                "resAmount"
            );

        const resultUsername =
            document.getElementById(
                "resUsername"
            );

        const resultPaymentType =
            document.getElementById(
                "resPaymentType"
            );

        if (resultOrderId) {

            resultOrderId.textContent =
                statusData.order_id ||
                orderId;
        }

        if (resultAmount) {

            resultAmount.textContent =
                `Rp${formatRupiah(
                    amount
                )}`;
        }

        if (resultUsername) {

            resultUsername.textContent =
                username;
        }

        if (resultPaymentType) {

            resultPaymentType.textContent =
                statusData.payment_type
                    ? statusData
                        .payment_type
                        .replace(
                            /_/g,
                            " "
                        )
                        .toUpperCase()
                    : "ONLINE PAYMENT";
        }

        clearPendingPayment(
            orderId
        );

        openInfoModal(
            "successPaymentModal"
        );

        await fetchRankings();

        setTimeout(
            () => {
                fetchRankings();
            },
            1500
        );

        setTimeout(
            () => {
                fetchRankings();
            },
            3500
        );

        return;
    }


    /* =====================================================
    PENDING
    ===================================================== */
    if (
        status === "pending"
    ) {
        const pendingResUsername = document.getElementById("pendingResUsername");
        const pendingResOrderId = document.getElementById("pendingResOrderId");
        const pendingResAmount = document.getElementById("pendingResAmount");

        if (pendingResUsername) pendingResUsername.textContent = payment ? payment.username : "Supporter";
        if (pendingResOrderId) pendingResOrderId.textContent = orderId;
        if (pendingResAmount) pendingResAmount.textContent = `Rp${formatRupiah(payment ? payment.amount : 0)}`;

        openInfoModal(
            "pendingPaymentModal"
        );

        return;
    }


    /* =====================================================
    FAILED / CANCEL / EXPIRED
    ===================================================== */
    if (
        status === "cancel" ||
        status === "expire" ||
        status === "deny" ||
        status === "failure"
    ) {

        clearPendingPayment(
            orderId
        );

        openInfoModal(
            "errorPaymentModal"
        );

        return;
    }


    /* =====================================================
    OTHER STATUS
    ===================================================== */
    showToast(
        `Status pembayaran: ${
            status || "unknown"
        }`
    );
}


/* =========================================================
VALIDATE SUPPORT INPUT
========================================================= */
function validateInput() {

    if (
        !supporterUsername ||
        !usernameError
    ) {
        return true;
    }

    const username =
        supporterUsername.value.trim();

    const hasHtml =
        /<[a-z][\s\S]*>/i.test(
            username
        );

    if (
        username === "" ||
        hasHtml
    ) {

        continueSupport.disabled =
            true;

        if (
            selectedValue > 0
        ) {

            usernameError.style.display =
                "block";
        }

        return false;

    } else {

        usernameError.style.display =
            "none";

        if (
            selectedValue > 0
        ) {

            continueSupport.disabled =
                false;

            return true;
        }
    }

    return false;
}


/* =========================================================
SUPPORT AMOUNT
========================================================= */
function updateSupportAmount() {

    if (!selectedAmount) {
        return;
    }

    if (
        selectedValue > 0
    ) {

        selectedAmount.textContent =
            `Nominal: Rp${formatRupiah(
                selectedValue
            )}`;

    } else {

        selectedAmount.textContent =
            "Belum memilih nominal";
    }

    validateInput();
}

amountButtons.forEach(
    (button) => {

        button.addEventListener(
            "click",
            () => {

                selectedValue =
                    Number(
                        button.dataset.amount
                    );

                amountButtons.forEach(
                    (btn) =>
                        btn.classList.remove(
                            "selected"
                        )
                );

                button.classList.add(
                    "selected"
                );

                if (
                    customAmount
                ) {

                    customAmount.value =
                        "";
                }

                updateSupportAmount();
            }
        );
    }
);

if (customAmount) {

    customAmount.addEventListener(
        "input",
        () => {

            const val =
                Number(
                    customAmount.value
                );

            selectedValue =
                val >= 1000
                    ? val
                    : 0;

            amountButtons.forEach(
                (btn) =>
                    btn.classList.remove(
                        "selected"
                    )
            );

            updateSupportAmount();
        }
    );
}

if (supporterUsername) {

    supporterUsername.addEventListener(
        "input",
        validateInput
    );
}


/* =========================================================
TRIGGER MIDTRANS SNAP POPUP (REUSABLE)
========================================================= */
function launchSnapPayment(token, orderId) {
    window.snap.pay(token, {
        onSuccess: async function (result) {
            await handlePaymentResult(orderId);
        },
        onPending: async function (result) {
            await handlePaymentResult(orderId);
        },
        onError: async function (result) {
            clearPendingPayment(orderId);
            openInfoModal("errorPaymentModal");
        },
        onClose: async function () {
            // Beri jeda 1 detik agar server Midtrans sempat memperbarui status transaksi menjadi pending
            setTimeout(async () => {
                const statusData = await checkPaymentStatus(orderId);
                
                if (statusData && statusData.transaction_status === "pending") {
                    const payment = getPendingPayment(orderId);
                    const pendingResUsername = document.getElementById("pendingResUsername");
                    const pendingResOrderId = document.getElementById("pendingResOrderId");
                    const pendingResAmount = document.getElementById("pendingResAmount");

                    if (pendingResUsername) pendingResUsername.textContent = payment ? payment.username : "Supporter";
                    if (pendingResOrderId) pendingResOrderId.textContent = orderId;
                    if (pendingResAmount) pendingResAmount.textContent = `Rp${formatRupiah(payment ? payment.amount : 0)}`;

                    openInfoModal("pendingPaymentModal");
                } else {
                    showToast("Pembayaran ditutup.");
                }
            }, 1000);
        }
    });
}


/* =========================================================
START PAYMENT
========================================================= */
if (continueSupport) {

    continueSupport.addEventListener(
        "click",
        async () => {

            if (
                !validateInput() ||
                selectedValue < 1000
            ) {
                return;
            }

            const amount =
                selectedValue;

            const username =
                supporterUsername.value.trim();

            continueSupport.disabled =
                true;

            continueSupport.textContent =
                "Memproses...";

            try {

                const response =
                    await fetch(
                        "/api/create-payment",
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify({
                                    amount,
                                    username
                                })
                        }
                    );

                const data =
                    await response.json();

                if (
                    !response.ok ||
                    !data.token ||
                    !data.order_id
                ) {

                    throw new Error(
                        data.error ||
                        "Gagal membuat pembayaran."
                    );
                }

                savePendingPayment(
                    data.order_id,
                    username,
                    amount,
                    data.token
                );

                closeInfoModal(
                    "supportModal"
                );

                launchSnapPayment(data.token, data.order_id);

            } catch (error) {

                console.error(
                    "Payment error:",
                    error
                );

                showToast(
                    error.message ||
                    "Terjadi kesalahan koneksi."
                );

            } finally {

                continueSupport.disabled =
                    false;

                continueSupport.textContent =
                    "Proses Payment →";

                if (
                    supporterUsername
                ) {

                    supporterUsername.value =
                        "";
                }

                selectedValue =
                    0;

                amountButtons.forEach(
                    (btn) =>
                        btn.classList.remove(
                            "selected"
                        )
                );

                if (
                    customAmount
                ) {

                    customAmount.value =
                        "";
                }

                updateSupportAmount();
            }
        }
    );
}


/* =========================================================
PENDING MODAL ACTIONS (Lanjut Bayar & Batalkan Payment)
========================================================= */
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
        if (payment && payment.token) {
            launchSnapPayment(payment.token, orderId);
        } else {
            showToast("Token pembayaran tidak ditemukan. Silakan buat donasi baru.");
        }
    });
}

const cancelPaymentBtn = document.getElementById("cancelPaymentBtn");
if (cancelPaymentBtn) {
    cancelPaymentBtn.addEventListener("click", () => {
        if (confirm("Batalkan pembayaran ini?")) {
            const orderId = getActivePaymentOrder();
            clearPendingPayment(orderId);
            closeInfoModal("pendingPaymentModal");
            showToast("Pembayaran dibatalkan.");
        }
    });
}


/* =========================================================
SCROLL TO RANKING
========================================================= */
window.scrollToRanking =
    function () {

        closeInfoModal(
            "successPaymentModal"
        );

        const supportSec =
            document.getElementById(
                "support"
            );

        if (supportSec) {

            supportSec.scrollIntoView({
                behavior:
                    "smooth"
            });
        }
    };


/* =========================================================
RANKING
========================================================= */
let currentRankTab =
    "daily";

let rankingDataCache = {
    daily: [],
    weekly: [],
    lifetime: []
};

async function fetchRankings() {

    if (!rankingList) {
        return;
    }

    try {

        const res =
            await fetch(
                "/api/ranking",
                {
                    cache:
                        "no-store"
                }
            );

        if (!res.ok) {

            throw new Error(
                "Ranking request failed"
            );
        }

        const data =
            await res.json();

        rankingDataCache =
            data;

        renderRanking(
            currentRankTab
        );

    } catch (error) {

        console.error(
            "Ranking error:",
            error
        );

        rankingList.innerHTML =
            `<li class="ranking-empty">
                Gagal memuat ranking.
            </li>`;
    }
}

function renderRanking(
    tab
) {

    if (!rankingList) {
        return;
    }

    const data =
        rankingDataCache[
            tab
        ] || [];

    rankingList.innerHTML =
        "";

    if (
        data.length === 0
    ) {

        rankingList.innerHTML =
            `<li class="ranking-empty">
                Belum ada supporter di periode ini.
            </li>`;

        return;
    }

    data.forEach(
        (item, index) => {

            const li =
                document.createElement(
                    "li"
                );

            li.className =
                "ranking-item";

            let medal =
                `${index + 1}`;

            if (
                index === 0
            ) {
                medal =
                    "🥇";
            }

            if (
                index === 1
            ) {
                medal =
                    "🥈";
            }

            if (
                index === 2
            ) {
                medal =
                    "🥉";
            }

            const medalDiv =
                document.createElement(
                    "div"
                );

            medalDiv.className =
                "rank-medal";

            medalDiv.textContent =
                medal;

            const infoDiv =
                document.createElement(
                    "div"
                );

            infoDiv.className =
                "rank-info";

            const nameSpan =
                document.createElement(
                    "span"
                );

            nameSpan.className =
                "rank-name";

            nameSpan.textContent =
                `@${item.username}`;

            const txSpan =
                document.createElement(
                    "span"
                );

            txSpan.className =
                "rank-tx";

            txSpan.textContent =
                `${item.txCount}x Support`;

            infoDiv.appendChild(
                nameSpan
            );

            infoDiv.appendChild(
                txSpan
            );

            const amountDiv =
                document.createElement(
                    "div"
                );

            amountDiv.className =
                "rank-amount";

            amountDiv.textContent =
                `Rp${formatRupiah(
                    item.totalAmount
                )}`;

            li.appendChild(
                medalDiv
            );

            li.appendChild(
                infoDiv
            );

            li.appendChild(
                amountDiv
            );

            rankingList.appendChild(
                li
            );
        }
    );
}

rankTabs.forEach(
    (tab) => {

        tab.addEventListener(
            "click",
            () => {

                rankTabs.forEach(
                    (t) =>
                        t.classList.remove(
                            "active"
                        )
                );

                tab.classList.add(
                    "active"
                );

                currentRankTab =
                    tab.dataset.tab;

                renderRanking(
                    currentRankTab
                );
            }
        );
    }
);

fetchRankings();


/* =========================================================
TOAST
========================================================= */
let toastTimer;

function showToast(
    msg
) {

    if (!toast) {
        return;
    }

    toast.textContent =
        msg;

    toast.classList.add(
        "show"
    );

    clearTimeout(
        toastTimer
    );

    toastTimer =
        setTimeout(
            () =>
                toast.classList.remove(
                    "show"
                ),
            3000
        );
}


/* =========================================================
PAYMENT RETURN / REDIRECT HANDLER
========================================================= */
async function handlePaymentReturn() {

    const urlParams =
        new URLSearchParams(
            window.location.search
        );

    const incomingOrderId =
        urlParams.get(
            "order_id"
        );

    const activeOrderId =
        getActivePaymentOrder();

    let orderId =
        null;

    if (incomingOrderId) {

        if (
            activeOrderId &&
            incomingOrderId !==
                activeOrderId
        ) {

            if (
                window.location.search
            ) {

                window.history.replaceState(
                    {},
                    document.title,
                    window.location.pathname
                );
            }

            return;
        }

        orderId =
            incomingOrderId;
    }

    else if (
        activeOrderId
    ) {

        orderId =
            activeOrderId;
    }

    if (!orderId) {
        return;
    }

    if (
        window.location.search
    ) {

        window.history.replaceState(
            {},
            document.title,
            window.location.pathname
        );
    }

    await new Promise(
        (resolve) =>
            setTimeout(
                resolve,
                1500
            )
    );

    await handlePaymentResult(
        orderId
    );
}


/* =========================================================
RUN PAYMENT RETURN CHECK
========================================================= */
setTimeout(
    () => {

        handlePaymentReturn();

    },
    500
);


/* =========================================================
END
========================================================= */
});
