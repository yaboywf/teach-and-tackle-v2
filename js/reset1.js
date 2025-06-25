AWS.config.update({ region: 'us-east-1' });
const cognito = new AWS.CognitoIdentityServiceProvider();

async function forgotPassword(username) {
    const secretHash = await calculateSecretHash(username);
    const params = {
        ClientId: '2lave0d420lofl9ead9h87mi41',
        SecretHash: secretHash,
        Username: username,
    };

    try {
        await cognito.forgotPassword(params).promise();
        window.location.href = '/pages/reset2.html';
    } catch (err) {
        showMessage("Error sending password reset code");
        console.error(err);
    }
}

document.getElementById("signupForm").addEventListener("submit", (e) => {
    e.preventDefault();
    
    let passCheck = true;
    const adminNum = document.getElementById("admin_number").value;
    
    if (adminNum === "") {
        showMessage("Please enter your admission number.");
        passCheck = false;
    }

    if (!passCheck) return;
    const regex = /^\d{7}[A-Za-z]$/;
    if (!adminNum.match(regex)) return showMessage("Please enter a valid admission number.");

    sessionStorage.setItem("admin_number", adminNum);
    forgotPassword(adminNum);
})