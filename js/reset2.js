if (!sessionStorage.getItem("admin_number")) window.location.href = "/pages/reset1.html";

document.getElementById("signupForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const code = document.getElementById("code").value;
    const password = document.getElementById("new_password").value;
    const confirmPassword = document.getElementById("confirm_password").value;

    if (code === "") return showMessage("Please enter the confirmation code");
    if (password === "") return showMessage("Please enter a new password");
    if (confirmPassword === "") return showMessage("Please confirm your new password");
    if (password !== confirmPassword) return showMessage("Passwords do not match");
    
    axios.post("https://s5y8kqe8x9.execute-api.us-east-1.amazonaws.com/api/account/confirm-password", { username: sessionStorage.getItem("admin_number"), code, password })
        .then(() => {
            showMessage("Password reset", "success");
            sessionStorage.removeItem("admin_number");
            setTimeout(() => window.location.href = "/pages/login.html", 3000);
        })
        .catch(err => {
            console.error(err);
            showMessage("Error resetting password");
        })
})

const form = document.getElementById('signupForm');
const passwordInput = document.getElementById('new_password');

form.addEventListener("click", (e) => {
    if (e.target.classList.contains("fa-eye-slash") || e.target.classList.contains("fa-eye")) {
        if (passwordInput.type === "password") {
            passwordInput.type = "text";
            eyeIcon.classList.remove("fa-eye-slash");
            eyeIcon.classList.add("fa-eye");
        } else {
            passwordInput.type = "password";
            eyeIcon.classList.remove("fa-eye");
            eyeIcon.classList.add("fa-eye-slash");
        }
    }
})