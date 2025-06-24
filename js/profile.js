const profileContainer = document.querySelector(".profile_container");
let inputFocused = false;
let isFormDirty = false;

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
async function addNewModule(e) {
    const value = e.target.value;
    const moduleName = value.trim();

    if (!moduleName.includes("(") && !moduleName.includes(")")) return showMessage("Invalid module format");

    const words = await axios.get("https://raw.githubusercontent.com/zacanger/profane-words/master/words.json");
    console.log(words);
    const isProfane = words.data.some(badWord => moduleName.toLowerCase().includes(badWord));

    if (isProfane) return showMessage("Module name is profane");
    
    const newHTML = `<span>${moduleName}</span>`;
    e.target.insertAdjacentHTML("beforebegin", newHTML);
    e.target.value = "";
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
axios.get("https://s5y8kqe8x9.execute-api.us-east-1.amazonaws.com/api/proficiency/user-proficiency", { headers: { "authorization": `Bearer ${getCookie("id_token")}` } })
.then(resp => {
    const strength = resp.data.filter(record => record.type === 1);
    const weakness = resp.data.filter(record => record.type === 2);

    const formattedHTML = (moduleName) => {
        return `<span>${moduleName}</span>`;
    }

    strength.map(proficiency => {
        const format = formattedHTML(proficiency.module);
        document.getElementById("new_strength").insertAdjacentHTML("beforebegin", format)
    })

    weakness.map(proficiency => {
        const format = formattedHTML(proficiency.module);
        document.getElementById("new_weakness").insertAdjacentHTML("beforebegin", format)
    })
})
.catch(err => {
    showMessage("Failed to fetch user information");
    console.error(err)
})

// Add new module on frontend on enter key
profileContainer.addEventListener("keydown", (e) => {
    const key = e.key;

    if (key === "Enter" && inputFocused && e.target.value !== "") {
        addNewModule(e);
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

// AWS Cognito Service
AWS.config.update({ region: 'us-east-1' });
const cognito = new AWS.CognitoIdentityServiceProvider();

// Change password on AWS Cognito
async function changePassword(currentPassword, newPassword) {
    const params = {
        AccessToken: getCookie("access_token"),
        PreviousPassword: currentPassword,
        ProposedPassword: newPassword
    };

    try {
        await cognito.changePassword(params).promise();
        showMessage("Password changed successfully", "success");
        isFormDirty = false;
    } catch (error) {
        console.error('Error changing password', error);
    }
}

// Trigger change password flow
document.getElementById("password_form").addEventListener("submit", (e) => {
    e.preventDefault();

    const currentPassword = document.getElementById("current_password").value;
    const newPassword = document.getElementById("new_password").value;
    const confirmPassword = document.getElementById("confirm_password").value;

    if (newPassword !== confirmPassword) return showMessage("Passwords do not match");

    changePassword(currentPassword, newPassword);
})