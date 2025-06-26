AWS.config.update({ region: 'us-east-1' });
const cognito = new AWS.CognitoIdentityServiceProvider();

if (!sessionStorage.getItem("admin_number")) {
    window.location.href = "/pages/reset1.html";
}

async function confirmForgotPassword(verificationCode, newPassword) {
    const secretHash = await calculateSecretHash(sessionStorage.getItem("admin_number"));
    const params = {
        ClientId: '2lave0d420lofl9ead9h87mi41',
        SecretHash: secretHash,
        Username: sessionStorage.getItem("admin_number"),
        ConfirmationCode: verificationCode,
        Password: newPassword,
    };

    try {
        await cognito.confirmForgotPassword(params).promise();
        sessionStorage.removeItem("admin_number");
        showMessage("Password reset successfully. You will be redirected shortly", "success");
        setTimeout(() => window.location.href = "/pages/login.html", 3000);
    } catch (err) {
        console.error("Error resetting password:", err);
    }
}


async function confirmEmail(confirmationCode) {
    try {
        const admin_number = sessionStorage.getItem("admin_number");
        const secretHash = await calculateSecretHash(admin_number);
        const params = {
            ClientId: "2lave0d420lofl9ead9h87mi41",
            SecretHash: secretHash,
            Username: admin_number,
            ConfirmationCode: confirmationCode
        };

        await cognito.confirmSignUp(params).promise();
        sessionStorage.removeItem("admin_number");
        showMessage("Registration successful. You will be redirected shortly", "success");
        setTimeout(() => window.location.href = "/pages/login.html", 3000);
    } catch (err) {
        console.error('Error calculating SECRET_HASH:', err);
        showMessage('Error during registration');
    }
}

document.getElementById("signupForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const code = document.getElementById("code").value;
    const password = document.getElementById("new_password").value;
    const confirmPassword = document.getElementById("confirm_password").value;
    if (code === "") return showMessage("Please enter the confirmation code");
    if (password === "") return showMessage("Please enter a new password");
    if (confirmPassword === "") return showMessage("Please confirm your new password");
    if (password !== confirmPassword) return showMessage("Passwords do not match");
    confirmForgotPassword(code, password);
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