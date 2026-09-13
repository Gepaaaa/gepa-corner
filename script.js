// @ts-nocheck
document.addEventListener("DOMContentLoaded", () => {
    /* Elements */
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
    const supporterUsername = document.getElementById("supporterUsername");
    const usernameError = document.getElementById("usernameError");
    
    // Ranking Elements
    const rankTabs = document.querySelectorAll(".rank-tab");
    const rankingList = document.getElementById("rankingList");

    /* Current Year */
    if (currentYear) currentYear.textContent = new Date().getFullYear();

    /* Theme, Age, Navigation, Carousel (Logic maintained from original) */
    function updateHeader() {
        if (window.scrollY > 20) header.classList.add("scrolled");
        else header.classList.remove("scrolled");
    }
    window.addEventListener("scroll", updateHeader, { passive: true });
    updateHeader();

    if (themeToggle) {
        themeToggle.addEventListener("click", () => {
            const isDark = body.classList.toggle("dark-mode");
            themeIcon.textContent = isDark ? "☀" : "☾";
        });
    }

    /* Modal System */
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
            if (!document.querySelector('.modal-overlay.open')) {
                body.classList.remove("modal-open");
            }
        }
    };

    if (supportButton) supportButton.addEventListener("click", () => openInfoModal("supportModal"));

    /* Support Amount & Username Logic */
    let selectedValue = 0;
    function formatRupiah(value) {
        return new Intl.NumberFormat("id-ID").format(value);
    }
    
    function validateInput() {
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

    if (supporterUsername) {
        supporterUsername.addEventListener("input", validateInput);
    }

    /* Process Payment (Popup Flow, No Redirect) */
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
                if (!response.ok) throw new Error(data.error);

                closeInfoModal("supportModal");

                // POPUP MIDTRANS SNAP (TIDAK REDIRECT)
                window.snap.pay(data.token, {
                    onSuccess: function(result) {
                        document.getElementById("resOrderId").textContent = result.order_id || data.order_id;
                        document.getElementById("resAmount").textContent = `Rp${formatRupiah(amount)}`;
                        document.getElementById("resUsername").textContent = username;
                        document.getElementById("resPaymentType").textContent = result.payment_type ? result.payment_type.replace(/_/g, ' ').toUpperCase() : "ONLINE PAYMENT";
                        
                        openInfoModal("successPaymentModal");
                        fetchRankings(); // Update ranking real-time
                    },
                    onPending: function(result) {
                        openInfoModal("pendingPaymentModal");
                    },
                    onError: function(result) {
                        openInfoModal("errorPaymentModal");
                    },
                    onClose: function() {
                        showToast("Popup pembayaran ditutup.");
                    }
                });
            } catch (error) {
                console.error("Payment error:", error);
                showToast(error.message || "Terjadi kesalahan koneksi.");
            } finally {
                continueSupport.disabled = false;
                continueSupport.textContent = "Proses Payment →";
                supporterUsername.value = ""; // reset
                selectedValue = 0;
                amountButtons.forEach(btn => btn.classList.remove("selected"));
                customAmount.value = "";
                updateSupportAmount();
            }
        });
    }

    /* Scroll to Ranking from Success Modal */
    window.scrollToRanking = function() {
        closeInfoModal('successPaymentModal');
        document.getElementById('support').scrollIntoView({ behavior: 'smooth' });
    };

    /* Ranking System Logic */
    let currentRankTab = 'daily';
    let rankingDataCache = { daily: [], weekly: [], lifetime: [] };

    async function fetchRankings() {
        try {
            const res = await fetch('/api/ranking');
            const data = await res.json();
            rankingDataCache = data;
            renderRanking(currentRankTab);
        } catch (error) {
            rankingList.innerHTML = `<li class="ranking-empty">Gagal memuat ranking.</li>`;
        }
    }

    function renderRanking(tab) {
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

    rankTabs.forEach(tab => {
        tab.addEventListener("click", () => {
            rankTabs.forEach(t => t.classList.remove("active"));
            tab.classList.add("active");
            currentRankTab = tab.dataset.tab;
            renderRanking(currentRankTab);
        });
    });

    // Initial Fetch
    fetchRankings();

    /* Toast */
    let toastTimer;
    function showToast(msg) {
        toast.textContent = msg;
        toast.classList.add("show");
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toast.classList.remove("show"), 3000);
    }
});
