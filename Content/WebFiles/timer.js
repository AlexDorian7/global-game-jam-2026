"use strict";

let countdownInterval;
let timeLeft = 0;
let isRunning = false;

// Configuration (Defaults)
const DEFAULT_DURATION = 60;

let config = {
    lowTimeThreshold: 30,
    timerColor: "white",
    lowTimeColor: "red"
};

// --- Unreal Interface Functions ---

// Called by Unreal to Initialize (Set colors, config)
// ue.interface.startCountdown = function(duration, options)
window.startCountdown = function (duration, optionsJson) {
    // Stop any existing internal loop (we don't use it anymore, but safety)
    stopTimerInternal();

    timeLeft = parseFloat(duration);
    if (isNaN(timeLeft) || timeLeft <= 0) timeLeft = DEFAULT_DURATION;

    // Parse options (Colors, Thresholds)
    if (optionsJson) {
        try {
            const opts = JSON.parse(optionsJson);
            if (opts.lowTimeThreshold !== undefined) config.lowTimeThreshold = opts.lowTimeThreshold;
            if (opts.timerColor) config.timerColor = parseUnrealColor(opts.timerColor);
            if (opts.lowTimeColor) config.lowTimeColor = parseUnrealColor(opts.lowTimeColor);
        } catch (e) {
            console.error("Invalid JSON options", e);
        }
    }

    // Apply initial defaults
    const timerText = document.getElementById("timer-text");
    if (config.timerColor) timerText.style.color = config.timerColor;
    timerText.classList.remove("critical");

    updateDisplay();
    // WE DO NOT START AN INTERNAL INTERVAL. UNREAL DRIVES US.
};

// Called by Unreal every second to force the time
window.updateTimer = function (seconds) {
    timeLeft = parseFloat(seconds);

    // Handle Color Logic locally
    const timerText = document.getElementById("timer-text");
    if (timeLeft <= config.lowTimeThreshold) {
        timerText.style.color = config.lowTimeColor;
        timerText.classList.add("critical");
    } else {
        // Reset to normal color if we somehow went back up
        if (config.timerColor) timerText.style.color = config.timerColor;
        timerText.classList.remove("critical");
    }

    updateDisplay();
};

window.stopCountdown = function () {
    // Just visual cleanup if needed
    stopTimerInternal();
};

function stopTimerInternal() {
    if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
    }
    isRunning = false;
}

// Tick function is removed/unused effectively

function updateDisplay() {
    // Protect against negative
    let t = timeLeft > 0 ? timeLeft : 0;

    const minutes = Math.floor(t / 60);
    const seconds = Math.floor(t % 60);

    const mStr = minutes < 10 ? "0" + minutes : minutes;
    const sStr = seconds < 10 ? "0" + seconds : seconds;

    document.getElementById("timer-text").innerText = `${mStr}:${sStr}`;
}

/**
 * Parses various Unreal Engine color formats into valid CSS color strings.
 * Supports:
 * - Standard CSS names/hex: "red", "#FF0000"
 * - Raw Hex (UE style): "FF0000FF" -> "#FF0000FF"
 * - Struct String: "(R=1.000000,G=0.000000,B=0.000000,A=1.000000)" -> "rgba(255, 0, 0, 1)"
 * - JSON Object: {"R": 1, "G": 0, "B": 0, "A": 1} -> "rgba(255, 0, 0, 1)"
 */
function parseUnrealColor(input) {
    if (!input) return "white"; // Default fallback

    // 1. If it's already a valid object (from JSON parse)
    if (typeof input === 'object' && input !== null) {
        // Check for R, G, B properties (0-1 range expected from UE)
        if ('R' in input && 'G' in input && 'B' in input) {
            const r = Math.round((input.R || 0) * 255);
            const g = Math.round((input.G || 0) * 255);
            const b = Math.round((input.B || 0) * 255);
            const a = input.A !== undefined ? input.A : 1.0;
            return `rgba(${r}, ${g}, ${b}, ${a})`;
        }
    }

    if (typeof input !== 'string') return "white";

    const cleanInput = input.trim();

    // 2. Struct String: "(R=1.000000,G=0.000000,B=0.000000,A=1.000000)"
    if (cleanInput.startsWith("(") && cleanInput.endsWith(")")) {
        // Simple regex to extract values
        const rMatch = cleanInput.match(/R=([0-9.]+)/);
        const gMatch = cleanInput.match(/G=([0-9.]+)/);
        const bMatch = cleanInput.match(/B=([0-9.]+)/);
        const aMatch = cleanInput.match(/A=([0-9.]+)/);

        if (rMatch && gMatch && bMatch) {
            const r = Math.round(parseFloat(rMatch[1]) * 255);
            const g = Math.round(parseFloat(gMatch[1]) * 255);
            const b = Math.round(parseFloat(bMatch[1]) * 255);
            const a = aMatch ? parseFloat(aMatch[1]) : 1.0;
            return `rgba(${r}, ${g}, ${b}, ${a})`;
        }
    }

    // 3. Hex string without hash (UE often exports "RRGGBBAA" without #)
    // Check if it's 3, 6, or 8 chars of hex only
    const isHex = /^[0-9A-Fa-f]+$/.test(cleanInput);
    if (isHex && (cleanInput.length === 3 || cleanInput.length === 6 || cleanInput.length === 8)) {
        return "#" + cleanInput;
    }

    // 4. Fallback: Assume it's a valid CSS string (e.g., "blue", "rbg(...)")
    return cleanInput;
}

/**
 * Converts a CSS color string back to an Unreal-friendly JSON object.
 * Useful if we need to send color data BACK to Unreal in the future.
 * Supports: #RRGGBB, #RRGGBBAA, rgb(...), rgba(...)
 */
function formatColorForUnreal(cssColor) {
    if (!cssColor) return { R: 1, G: 1, B: 1, A: 1 };

    // 1. Hex: #RRGGBB or #RRGGBBAA
    if (cssColor.startsWith("#")) {
        const hex = cssColor.substring(1);
        // Expand shorthand #RGB -> #RRGGBB
        if (hex.length === 3) {
            const r = parseInt(hex[0] + hex[0], 16) / 255;
            const g = parseInt(hex[1] + hex[1], 16) / 255;
            const b = parseInt(hex[2] + hex[2], 16) / 255;
            return { R: r, G: g, B: b, A: 1.0 };
        }

        const r = parseInt(hex.substring(0, 2), 16) / 255;
        const g = parseInt(hex.substring(2, 4), 16) / 255;
        const b = parseInt(hex.substring(4, 6), 16) / 255;
        let a = 1.0;
        if (hex.length === 8) {
            a = parseInt(hex.substring(6, 8), 16) / 255;
        }
        return { R: r, G: g, B: b, A: a };
    }

    // 2. RGB/RGBA: rgb(r, g, b)
    if (cssColor.startsWith("rgb")) {
        const parts = cssColor.match(/[0-9.]+/g);
        if (parts && parts.length >= 3) {
            return {
                R: parseFloat(parts[0]) / 255,
                G: parseFloat(parts[1]) / 255,
                B: parseFloat(parts[2]) / 255,
                A: parts.length > 3 ? parseFloat(parts[3]) : 1.0
            };
        }
    }

    // Fallback: return null or default if untranslatable (like "red") without a lookup
    console.warn("formatColorForUnreal: Cannot convert named color '" + cssColor + "' without a lookup table.");
    return { R: 1, G: 1, B: 1, A: 1 };
}

// ON LOAD
window.onload = function () {
    document.getElementById("timer-text").innerText = "WAITING FOR UE...";
};
