// credits.js
// Currently the animation is handled 100% by pure CSS for max performance.
// We can add logic here if we need to restart it or play sound sync.

window.onload = function () {
    console.log("Credits Loaded");

    // Optional: Reset animation if re-loaded via JS
    const content = document.getElementById("scroll-content");
    content.style.animation = 'none';
    content.offsetHeight; /* trigger reflow */
    content.style.animation = null;
};
