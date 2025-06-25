AWS.config.update({ region: 'us-east-1' });
const cognito = new AWS.CognitoIdentityServiceProvider();

if (!sessionStorage.getItem("admin_number")) {
    window.location.href = "/pages/register1.html";
}

async function confirmEmail(confirmationCode) {
    try {
        const admin_number = sessionStorage.getItem("admin_number");
        const secretHash = await calculateSecretHash(admin_number);
        const params = {
            ClientId: "2lave0d420lofl9ead9h87mi41",
            SecretHash: secretHash,
            Username: admin_number.toUpperCase(),
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
    if (code === "") return showMessage("Please enter the confirmation code");
    
    confirmEmail(code);
})