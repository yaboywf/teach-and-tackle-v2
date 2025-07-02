const profileContainer = document.querySelector(".profile_container");
let inputFocused = false;
let isFormDirty = false;
let strength = [];
let weakness = [];

// Logout by clearing cookies
document.getElementById("logout").addEventListener("click", () => {
    document.cookie = "id_token=; path=/; max-age=0";
    document.cookie = "access_token=; path=/; max-age=0";
    document.cookie = "refresh_token=; path=/; max-age=0";
    window.location.href = "../pages/login.html";
})

/**
 * Helper function to format modules
 * @param {*} module - event
 * @returns {string}
 */
async function addNewModule(e, type) {
    const value = e.target.value;
    const moduleName = value.trim();

    if (!moduleName.includes("(") && !moduleName.includes(")")) return showMessage("Invalid module format");

    const words = await axios.get("https://raw.githubusercontent.com/zacanger/profane-words/master/words.json");
    const isProfane = words.data.some(badWord => {
        const regex = new RegExp(`\\b${badWord.toLowerCase()}\\b`, 'i');
        return regex.test(moduleName.toLowerCase());
    });

    if (isProfane) return showMessage("Module name is profane");

    fetch(`https://s5y8kqe8x9.execute-api.us-east-1.amazonaws.com/api/proficiency/new?type=${encodeURIComponent(type)}&name=${encodeURIComponent(moduleName)}`, {
        method: "POST",
        headers: {
            "authorization": `Bearer ${getCookie("id_token")}`
        }
    })
        .then(resp => resp.json())
        .then(resp => {
            showMessage(resp?.message || "Module added", "success");
            isFormDirty = false;
            const newHTML = `<span id="${resp.id}">${moduleName}</span>`;
            e.target.insertAdjacentHTML("beforebegin", newHTML);
            e.target.value = "";

            const asideId = type === 1 ? "strength_content" : "weakness_content";
            document.getElementById(asideId).insertAdjacentHTML("beforeend", `<li id="aside-${resp.id}" title="${moduleName}">${moduleName}</li>`);
        })
        .catch(err => {
            console.error(err);
            showMessage("Failed to add module");
        })
}

// Display user information
if (decodeToken) {
    document.getElementById("name").textContent = decodeToken.name;
    document.getElementById("admission_number").textContent = decodeToken["cognito:username"].toUpperCase();
}

// Fetch user information
axios.get(`https://s5y8kqe8x9.execute-api.us-east-1.amazonaws.com/api/account/account-information?id=${decodeToken["cognito:username"].toUpperCase()}`, { headers: { "authorization": `Bearer ${getCookie("id_token")}` } })
    .then(resp => {
        document.getElementById("diploma").value = resp.data.diploma;
        document.getElementById(`y${resp.data.year_of_study}`).checked = true;
    })
    .catch(err => {
        showMessage("Failed to fetch user information");
        console.error(err);
    })

// Fetch user proficiency
axios.get(`https://s5y8kqe8x9.execute-api.us-east-1.amazonaws.com/api/proficiency/user-proficiency?id=${decodeToken["cognito:username"].toUpperCase()}`)
    .then(resp => {
        strength = resp.data.filter(record => record.type === 1);
        weakness = resp.data.filter(record => record.type === 2);

        const formattedHTML = (moduleName, moduleId) => {
            return `<span id="${moduleId}">${moduleName}</span>`;
        }

        strength.map(proficiency => {
            const format = formattedHTML(proficiency.module, proficiency.proficiency_id);
            document.getElementById("new_strength").insertAdjacentHTML("beforebegin", format)
        })

        weakness.map(proficiency => {
            const format = formattedHTML(proficiency.module, proficiency.proficiency_id);
            document.getElementById("new_weakness").insertAdjacentHTML("beforebegin", format)
        })
    })
    .catch(err => {
        showMessage("Failed to fetch user information");
        console.error(err);
    })

// Add new module on frontend on enter key
profileContainer.addEventListener("keydown", (e) => {
    const key = e.key;

    if (key === "Enter" && inputFocused && e.target.value !== "") {
        const type = e.target.getAttribute("id").split("_")[1];
        const array = type === "strength" ? strength : weakness;
        const otherArray = type === "strength" ? weakness : strength;
        if (array.find(record => record.module === e.target.value)) return showMessage("Module already exists");
        if (otherArray.find(record => record.module === e.target.value)) return showMessage("Module already exists in the other proficiency");
        addNewModule(e, type === "strength" ? 1 : 2);
    }
})

// Check if input is focused
document.querySelectorAll(".profile_proficiency_input").forEach(input => {
    input.addEventListener("focus", () => {
        inputFocused = true;
    })
    input.addEventListener("blur", () => {
        inputFocused = false;
    })
})

// Check if form is dirty
profileContainer.addEventListener("input", () => {
    isFormDirty = true;
});

profileContainer.addEventListener("click", (e) => {
    if (e.target.tagName.toLowerCase() === "span") {
        const moduleId = e.target.getAttribute("id");
        axios.delete(`https://s5y8kqe8x9.execute-api.us-east-1.amazonaws.com/api/proficiency/remove?id=${encodeURIComponent(moduleId)}`, { headers: { "authorization": `Bearer ${getCookie("id_token")}` } })
            .then(() => {
                e.target.remove();
                showMessage("Module removed", "success");
                isFormDirty = false;

                document.getElementById(`aside-${moduleId}`).remove();
            })
            .catch(err => {
                console.error(err);
                showMessage("Failed to remove module");
            })
    }
})

// Check if form is dirty (there is input)
window.addEventListener("beforeunload", (event) => {
    if (isFormDirty) {
        event.returnValue = "hi";
        return "hi";
    }
});

// Update user general information
document.getElementById("general_form").addEventListener("submit", (e) => {
    e.preventDefault();

    const diploma = document.getElementById("diploma").value;
    const year_of_study = document.querySelector("input[name='year']:checked").getAttribute("id").split("y")[1];

    if (diploma === "") return showMessage("Please enter your diploma");
    if (year_of_study === "") return showMessage("Please select your year of study");
    if (!e.target.checkValidity()) return;

    axios.put("https://s5y8kqe8x9.execute-api.us-east-1.amazonaws.com/api/account/update-account", { diploma, year_of_study }, { headers: { "authorization": `Bearer ${getCookie("id_token")}` } })
        .then(() => {
            showMessage("Profile updated", "success");
            isFormDirty = false;
        })
        .catch(err => {
            console.error(err);
            showMessage("Failed to update profile");
        })
})

// Trigger change password flow
document.getElementById("password_form").addEventListener("submit", (e) => {
    e.preventDefault();

    const currentPassword = document.getElementById("current_password").value;
    const newPassword = document.getElementById("new_password").value;
    const confirmPassword = document.getElementById("confirm_password").value;

    if (newPassword !== confirmPassword) return showMessage("Passwords do not match");

    axios.post("https://s5y8kqe8x9.execute-api.us-east-1.amazonaws.com/api/account/reset-password", { current_password: currentPassword, new_password: newPassword }, { headers: { "authorization": getCookie("access_token") }})
        .then(() => {
            showMessage("Password updated", "success");
            isFormDirty = false;
        })
        .catch(err => {
            console.error(err);
            showMessage("Failed to update password");
        })
})

document.getElementById("delete_form").addEventListener("submit", (e) => {
    e.preventDefault();
    if (!e.target.checkValidity()) return;
    if (!confirm("Are you sure you want to delete your account?")) return;
    
    axios.delete("https://s5y8kqe8x9.execute-api.us-east-1.amazonaws.com/api/account/delete-account", { headers: { "authorization": `Bearer ${getCookie("id_token")}` } })
        .then(() => {
            isFormDirty = false;
            showMessage("Account deleted", "success");
            setTimeout(() => window.location.href = "./pages/login.html", 2000)
        })
        .catch(err => {
            console.error(err);
            showMessage("Failed to delete account");
        })
})