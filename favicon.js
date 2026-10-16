/**
 * =========================================================
 * GEPA CORNER - FAVICON MODULE (favicon.js)
 * High-definition dynamic favicon engine for Gepa Corner
 * 
 * Features:
 *  - Adaptive light/dark mode favicon palette
 *  - Canvas-based dynamic rendering (64x64 retina)
 *  - Live Music Equalizer badge & pulse animation when playing
 *  - Tab title synchronization with music playback
 *  - Notification badge support (count / dot / icon)
 *  - High-res SVG and PNG fallback management
 * =========================================================
 */

(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define([], factory);
    } else if (typeof module === "object" && module.exports) {
        module.exports = factory();
    } else {
        root.FaviconModule = factory();
        root.FaviconManager = root.FaviconModule; // Alias
    }
})(typeof self !== "undefined" ? self : this, function () {
    "use strict";

    // Canvas & Context for dynamic generation
    let canvas = null;
    let ctx = null;

    // Active state
    const state = {
        isDark: false,
        isMusicPlaying: false,
        trackTitle: "",
        badge: null, // null | string | number
        badgeColor: "#e63946",
        animFrameId: null,
        eqPhase: 0,
        originalTitle: document.title || "Gepa — Personal Corner",
        hasFaviconElement: false
    };

    // Color Palettes matching Gepa Corner design system
    const PALETTES = {
        light: {
            gradStart: "#78966f", // --sage-500
            gradEnd: "#486343",   // --sage-700
            letter: "#FAF8F1",    // --cream
            sparkle: "#FFFFFF",
            brandDot: "#BDCFB1",  // --sage-300
            eqColor: "#FAF8F1"
        },
        dark: {
            gradStart: "#5e7c57", // --sage-600
            gradEnd: "#263725",   // --sage-900
            letter: "#E8EFE1",    // --sage-100
            sparkle: "#F4F7F0",
            brandDot: "#9FB795",  // --sage-400
            eqColor: "#E8EFE1"
        }
    };

    /**
     * Get or create dynamic <link rel="icon"> in <head>
     */
    function getFaviconElement() {
        let link = document.querySelector("link[data-dynamic-favicon='true']");
        if (!link) {
            link = document.querySelector("link[rel='icon'][type='image/svg+xml']") ||
                   document.querySelector("link[rel='icon']");
        }
        if (!link) {
            link = document.createElement("link");
            link.rel = "icon";
            link.type = "image/png";
            document.head.appendChild(link);
        }
        link.setAttribute("data-dynamic-favicon", "true");
        return link;
    }

    /**
     * Draw rounded squircle
     */
    function drawSquircle(context, x, y, width, height, radius) {
        context.beginPath();
        context.moveTo(x + radius, y);
        context.lineTo(x + width - radius, y);
        context.quadraticCurveTo(x + width, y, x + width, y + radius);
        context.lineTo(x + width, y + height - radius);
        context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        context.lineTo(x + radius, y + height);
        context.quadraticCurveTo(x, y + height, x, y + height - radius);
        context.lineTo(x, y + radius);
        context.quadraticCurveTo(x, y, x + radius, y);
        context.closePath();
    }

    /**
     * Render the static Gepa brand icon onto canvas
     */
    function renderBrandIcon(palette) {
        if (!ctx) return;
        ctx.clearRect(0, 0, 64, 64);

        // 1. Background squircle with linear gradient
        const grad = ctx.createLinearGradient(0, 0, 64, 64);
        grad.addColorStop(0, palette.gradStart);
        grad.addColorStop(1, palette.gradEnd);

        ctx.save();
        drawSquircle(ctx, 2, 2, 60, 60, 16);
        ctx.fillStyle = grad;
        ctx.shadowColor = "rgba(38, 55, 37, 0.35)";
        ctx.shadowBlur = 4;
        ctx.shadowOffsetY = 2;
        ctx.fill();
        ctx.restore();

        // 2. Subtle inside border
        ctx.save();
        drawSquircle(ctx, 3, 3, 58, 58, 15);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.22)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();

        // 3. Top-right decorative sparkle ✦
        ctx.save();
        ctx.fillStyle = palette.sparkle;
        ctx.globalAlpha = 0.95;
        ctx.beginPath();
        // Simple star path at (48, 16)
        const sx = 47, sy = 15;
        ctx.moveTo(sx, sy - 6);
        ctx.quadraticCurveTo(sx, sy, sx + 6, sy);
        ctx.quadraticCurveTo(sx, sy, sx, sy + 6);
        ctx.quadraticCurveTo(sx, sy, sx - 6, sy);
        ctx.quadraticCurveTo(sx, sy, sx, sy - 6);
        ctx.fill();
        ctx.restore();

        // 4. Center 'G' Monogram for Gepa
        ctx.save();
        ctx.fillStyle = palette.letter;
        ctx.font = "bold 34px 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("G", 30, 34);
        ctx.restore();

        // 5. Gepa signature brand dot
        ctx.save();
        ctx.fillStyle = palette.brandDot;
        ctx.beginPath();
        ctx.arc(46, 42, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    /**
     * Render the animated music equalizer badge onto canvas
     */
    function renderMusicPlayingIcon(palette, phase) {
        if (!ctx) return;
        renderBrandIcon(palette);

        // Music Overlay: Pill or mini equalizer badge on bottom right
        ctx.save();
        const bx = 28, by = 38, bw = 32, bh = 22, br = 7;
        drawSquircle(ctx, bx, by, bw, bh, br);
        ctx.fillStyle = state.isDark ? "#172018" : "#263725";
        ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
        ctx.shadowBlur = 4;
        ctx.shadowOffsetY = 1;
        ctx.fill();

        ctx.strokeStyle = palette.brandDot;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();

        // Draw 3 dancing EQ bars
        ctx.save();
        ctx.fillStyle = "#FAF8F1";
        const h1 = 5 + Math.sin(phase) * 4;
        const h2 = 8 + Math.cos(phase * 1.3) * 5;
        const h3 = 6 + Math.sin(phase * 1.7) * 4;

        // Bar 1
        ctx.fillRect(bx + 7, by + bh - 4 - Math.max(3, h1), 3, Math.max(3, h1));
        // Bar 2
        ctx.fillRect(bx + 14, by + bh - 4 - Math.max(4, h2), 3, Math.max(4, h2));
        // Bar 3
        ctx.fillRect(bx + 21, by + bh - 4 - Math.max(3, h3), 3, Math.max(3, h3));
        ctx.restore();
    }

    /**
     * Render notification badge (if any)
     */
    function renderBadgeOverlay() {
        if (!ctx || !state.badge) return;

        const badgeStr = String(state.badge).slice(0, 3);
        const bx = 42, by = 4, bw = 20, bh = 20;

        ctx.save();
        ctx.beginPath();
        ctx.arc(bx + bw / 2, by + bh / 2, 10, 0, Math.PI * 2);
        ctx.fillStyle = state.badgeColor || "#e63946";
        ctx.shadowColor = "rgba(0, 0, 0, 0.35)";
        ctx.shadowBlur = 3;
        ctx.fill();

        ctx.strokeStyle = "#FFFFFF";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = "#FFFFFF";
        ctx.font = "bold 11px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(badgeStr, bx + bw / 2, by + bh / 2 + 0.5);
        ctx.restore();
    }

    /**
     * Commit the canvas image to <link rel="icon">
     */
    function updateFaviconHref() {
        if (!canvas) return;
        try {
            const dataUrl = canvas.toDataURL("image/png");
            const link = getFaviconElement();
            if (link) {
                link.type = "image/png";
                link.href = dataUrl;
            }
        } catch (e) {
            // Fallback gracefully if canvas toDataURL is restricted
            const link = getFaviconElement();
            if (link) link.href = "/favicon.svg";
        }
    }

    /**
     * Animation loop for active music equalizer
     */
    function animateMusicEq() {
        if (!state.isMusicPlaying) return;

        state.eqPhase += 0.35;
        const palette = state.isDark ? PALETTES.dark : PALETTES.light;
        renderMusicPlayingIcon(palette, state.eqPhase);
        if (state.badge) renderBadgeOverlay();
        updateFaviconHref();

        // 10-12 FPS is ideal for favicons (light on CPU/battery, smooth visual feedback)
        state.animFrameId = setTimeout(animateMusicEq, 90);
    }

    /**
     * Public API
     */
    const FaviconModule = {
        /**
         * Initialize the Favicon Module
         */
        init: function (options) {
            if (typeof document === "undefined") return;

            // Cache original title
            if (!state.originalTitle || state.originalTitle === "") {
                state.originalTitle = document.title || "Gepa — Personal Corner";
            }

            // Create offscreen 64x64 canvas
            if (!canvas) {
                canvas = document.createElement("canvas");
                canvas.width = 64;
                canvas.height = 64;
                ctx = canvas.getContext("2d", { willReadFrequently: true });
            }

            // Detect initial theme
            const hasDarkClass = document.body && document.body.classList.contains("dark-mode");
            const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
            state.isDark = hasDarkClass || prefersDark;

            // System theme listener
            if (window.matchMedia) {
                const darkMedia = window.matchMedia("(prefers-color-scheme: dark)");
                if (darkMedia.addEventListener) {
                    darkMedia.addEventListener("change", (e) => {
                        const isManualDark = document.body && document.body.classList.contains("dark-mode");
                        if (!localStorage.getItem("gepa-theme")) {
                            FaviconModule.setTheme(e.matches);
                        }
                    });
                }
            }

            // Render initial state
            FaviconModule.render();

            console.log("🌟 [FaviconModule] Initialized successfully with responsive theme & audio support.");
            return FaviconModule;
        },

        /**
         * Set light / dark mode
         * @param {boolean} isDark
         */
        setTheme: function (isDark) {
            state.isDark = Boolean(isDark);
            FaviconModule.render();
        },

        /**
         * Set music playback status and optional track title
         * @param {boolean} isPlaying
         * @param {string} [title]
         */
        setMusicPlaying: function (isPlaying, title) {
            state.isMusicPlaying = Boolean(isPlaying);
            if (title) state.trackTitle = title;

            if (state.animFrameId) {
                clearTimeout(state.animFrameId);
                state.animFrameId = null;
            }

            if (state.isMusicPlaying) {
                // Prepend music note to document title
                const cleanOriginal = state.originalTitle.replace(/^[▶🎵]\s*/, "");
                const trackInfo = state.trackTitle ? `${state.trackTitle} — ` : "";
                document.title = `🎵 ${trackInfo}${cleanOriginal}`;

                animateMusicEq();
            } else {
                // Restore document title
                const cleanOriginal = state.originalTitle.replace(/^[▶🎵]\s*/, "");
                document.title = cleanOriginal;

                FaviconModule.render();
            }
        },

        /**
         * Set notification badge
         * @param {string|number|null} badge - e.g. 1, "✦", "!"
         * @param {string} [color] - Optional badge hex color
         */
        setBadge: function (badge, color) {
            state.badge = badge;
            if (color) state.badgeColor = color;
            FaviconModule.render();
        },

        /**
         * Clear notification badge
         */
        clearBadge: function () {
            state.badge = null;
            FaviconModule.render();
        },

        /**
         * Re-render current static frame
         */
        render: function () {
            if (!ctx) return;
            const palette = state.isDark ? PALETTES.dark : PALETTES.light;

            if (state.isMusicPlaying) {
                renderMusicPlayingIcon(palette, state.eqPhase);
            } else {
                renderBrandIcon(palette);
            }

            if (state.badge) {
                renderBadgeOverlay();
            }

            updateFaviconHref();
        },

        /**
         * Reset to standard default brand icon
         */
        reset: function () {
            state.isMusicPlaying = false;
            state.badge = null;
            if (state.animFrameId) {
                clearTimeout(state.animFrameId);
                state.animFrameId = null;
            }
            const cleanOriginal = state.originalTitle.replace(/^[▶🎵]\s*/, "");
            document.title = cleanOriginal;
            FaviconModule.render();
        },

        /**
         * Get current module state
         */
        getState: function () {
            return { ...state };
        }
    };

    // Auto-init on load if in browser
    if (typeof document !== "undefined") {
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", () => FaviconModule.init());
        } else {
            FaviconModule.init();
        }
    }

    return FaviconModule;
});
