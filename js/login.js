// Sign-in form handling
document.getElementById('signInForm').addEventListener('submit', function (event) {
    event.preventDefault();

    const username = document.getElementById('signInUsername').value;
    const password = document.getElementById('signInPassword').value;
    const regex = /^\d{7}[A-Za-z]$/;

    if (!username) return showMessage('Please enter your admission number.');
    if (!password) return showMessage('Please enter your password.');
    if (!username.match(regex)) return showMessage('Please enter a valid admission number.');

    axios.post("https://s5y8kqe8x9.execute-api.us-east-1.amazonaws.com/api/account/authenticate", { username, password })
        .then(resp => {
            document.cookie = `id_token=${resp.data.IdToken}; path=/; max-age=3600`;
            document.cookie = `access_token=${resp.data.AccessToken}; path=/; max-age=3600`;
            document.cookie = `refresh_token=${resp.data.RefreshToken}; path=/; max-age=86400`;
            window.location.href = '/pages/explore.html';
        })
        .catch(err => {
            console.error(err);
            showMessage(err.response.data.error);
        });
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

if (isAuthenticated()) window.location.href = "./explore.html";