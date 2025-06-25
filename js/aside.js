const aside = document.querySelector("aside");
let startX, endX = 0;

// Function for swipe gestures
function swipe_gesture() {
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

// Add event listeners for editing user proficiency
aside.querySelectorAll(".fa-edit").forEach(icon => icon.addEventListener("click", () => window.location.href = "profile.html#modules_proficiency"));

// check if user is authenticated
if (!isAuthenticated()) window.location.href = "../pages/login.html";

// get user's id token
const idToken = getCookie("id_token");
const decodeToken = decodeJWT(idToken);

// show the user's name in the aside
if (decodeToken.name) {
    document.querySelector(".user").textContent = decodeToken.name;
}

// show the user's proficiency
axios.get(`https://s5y8kqe8x9.execute-api.us-east-1.amazonaws.com/api/proficiency/user-proficiency?id=${decodeToken["cognito:username"].toUpperCase()}`)
    .then(resp => {
        const strength = resp.data.filter(record => record.type === 1);
        const weakness = resp.data.filter(record => record.type === 2);

        const formattedHTML = (moduleName) => {
            return `<li title='${moduleName}'>${moduleName}</li>`;
        }

        if (strength.length === 0) document.getElementById("strength_content").textContent = "No strength modules";
        if (weakness.length === 0) document.getElementById("weakness_content").textContent = "No weakness modules";

        strength.map(proficiency => {
            const format = formattedHTML(proficiency.module);
            document.getElementById("strength_content").insertAdjacentHTML("beforeend", format)
        })

        weakness.map(proficiency => {
            const format = formattedHTML(proficiency.module);
            document.getElementById("weakness_content").insertAdjacentHTML("beforeend", format)
        })
    })
    .catch(err => {
        showMessage("Failed to fetch user's proficiency");
        console.error(err)
    });