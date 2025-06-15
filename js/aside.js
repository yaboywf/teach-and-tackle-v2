const aside = document.querySelector("aside");

// Function for swipe gestures
function swipe_gesture() {
    let startX, endX = 0;
    window.addEventListener("touchstart", (e) => handle_touch(e, true));
    window.addEventListener("touchmove", (e) => handle_touch(e, false));
    window.addEventListener("touchend", handle_swipe);
}

// Function to handle swipe gesture
function handle_swipe() {
    const deltaX = endX - startX;
    deltaX > 100 ? aside.classList.add("show_aside") : aside.classList.remove("show_aside");
    startX = endX = 0;
}

// Function to check user touch events
function handle_touch(event, isStart = true) {
    if (window.innerWidth > 800) return;
    const touchX = event.touches[0].clientX;
    isStart ? startX = touchX : endX = touchX;
}

// Function to check screen size and apply swipe gesture if met criteria
function checkSwipeGesture() {
    if (window.innerWidth <= 800) {
        swipe_gesture();
    } else {
        window.removeEventListener("touchstart", handle_touch);
        window.removeEventListener("touchmove", handle_touch);
        window.removeEventListener("touchend", handle_swipe);
    }
}

// Check swipe gesture on initial load and resizing
checkSwipeGesture();
window.addEventListener("resize", checkSwipeGesture);