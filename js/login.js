AWS.config.update({ region: 'us-east-1' });
const cognitoidentityserviceprovider = new AWS.CognitoIdentityServiceProvider();

async function signInUser(username, password) {
    calculateSecretHash(username)
        .then(secretHash => {
            const params = {
                AuthFlow: 'USER_PASSWORD_AUTH',
                ClientId: '2lave0d420lofl9ead9h87mi41',  // Your App Client ID
                AuthParameters: {
                    USERNAME: username,
                    PASSWORD: password,
                    SECRET_HASH: secretHash
                }
            };

            cognitoidentityserviceprovider.initiateAuth(params, (err, data) => {
                if (err) {
                    console.log(err);
                    showError('Error: ' + err.message);
                } else {
                    console.log(data); // successful login
                    if (data.ChallengeName === 'NEW_PASSWORD_REQUIRED') {
                        handleNewPasswordChallenge(data.Session, username, password);
                    }

                    document.cookie = `id_token=${data.AuthenticationResult.IdToken}; path=/; max-age=3600`;
                    document.cookie = `access_token=${data.AuthenticationResult.AccessToken}; path=/; max-age=3600`;
                    document.cookie = `refresh_token=${data.AuthenticationResult.RefreshToken}; path=/; max-age=86400`;
                }
            });
        })
};

// After initial login attempt, check if the challenge is NEW_PASSWORD_REQUIRED
function handleNewPasswordChallenge(session, username, newPassword) {
    calculateSecretHash(username)
        .then(secretHash => {
            const params = {
                ChallengeName: 'NEW_PASSWORD_REQUIRED',
                ClientId: '2lave0d420lofl9ead9h87mi41',  // Your App Client ID
                ChallengeResponses: {
                    USERNAME: username,
                    NEW_PASSWORD: newPassword,
                    SECRET_HASH: secretHash
                },
                Session: session,
            };

            cognitoidentityserviceprovider.respondToAuthChallenge(params, function (err, data) {
                if (err) {
                    console.error("Error responding to password change challenge:", err);
                }
            });
        })
        .catch(err => {
            console.error('Error calculating SECRET_HASH:', err);
            document.getElementById('errorMessage').style.display = 'block';
            document.getElementById('errorMessage').textContent = 'Error calculating secret hash';
        });
}


// Sign-in form handling
document.getElementById('signInForm').addEventListener('submit', function (event) {
    event.preventDefault();

    const username = document.getElementById('signInUsername').value;
    const password = document.getElementById('signInPassword').value;
    const regex = '^\d{7}[A-Za-z]$';

    if (!username) return showError('Please enter your admission number.');
    if (!password) return showError('Please enter your password.');
    if (!username.match(regex)) return showError('Please enter a valid admission number.');

    signInUser(username, password);
});

const loginContainer = document.querySelector('.login');
const passwordInput = document.getElementById('signInPassword');

loginContainer.addEventListener("click", (e) => {
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

// login
// username: dylanyeowf@gmail.com
// password: Yousuck1!