AWS.config.update({ region: 'us-east-1' });
const cognito = new AWS.CognitoIdentityServiceProvider();

async function signUp(adminNumber, name, password, yearOfStudy, diploma) {
    try {
        await axios.post("https://s5y8kqe8x9.execute-api.us-east-1.amazonaws.com/api/account/register", { student_id: adminNumber, diploma: diploma, name, year_of_study: yearOfStudy });
        const secretHash = await calculateSecretHash(adminNumber);
        const params = {
            ClientId: "2lave0d420lofl9ead9h87mi41",
            SecretHash: secretHash,
            Username: adminNumber,
            Password: password,
            UserAttributes: [
                { Name: 'name', Value: name },
                { Name: 'email', Value: "dylanyeowf@gmail.com" }
            ]
        };

        
        await cognito.signUp(params).promise();
        window.location.href = '/pages/register2.html';
    } catch(err) {
        console.error(err);
        showMessage('Error calculating secret hash');
    };
}

document.getElementById("signupForm").addEventListener("submit", (e) => {
    e.preventDefault();
    
    let passCheck = true;
    const adminNum = document.getElementById("admin_number").value;
    const name = document.getElementById("name").value;
    const password = document.getElementById("password").value;
    const diploma = document.getElementById("diploma").value;
    let yearOfStudy = document.querySelector("input[name='year']:checked");
    if (yearOfStudy) yearOfStudy = yearOfStudy.getAttribute("id").split("y")[1];
    
    [adminNum, name, password, diploma, yearOfStudy].forEach(field => {
        if ((field === "" || !field) && passCheck) {
            showMessage("Please fill in all fields");
            passCheck = false;
        }
    });

    if (!passCheck) return;
    const regex = /^\d{7}[A-Za-z]$/;
    if (!adminNum.match(regex)) return showMessage("Please enter a valid admission number.");

    axios.get(`https://s5y8kqe8x9.execute-api.us-east-1.amazonaws.com/api/account/account-information?id=${encodeURIComponent(adminNum.toUpperCase())}`, { headers: { "authorization": `Bearer ${getCookie("id_token")}` } })
    .then(resp => {
        if (resp.data) return showMessage("User already exists");
    })
    .catch(err => {
        if (err.response.status === 404) {
            sessionStorage.setItem("admin_number", adminNum);
            signUp(adminNum, name, password, yearOfStudy, diploma);
            return;
        } else {
            console.error(err);
            showMessage("Failed to fetch user");
        }
    })
})

const registerContainer = document.querySelector('.register');
const passwordInput = document.getElementById('password');

registerContainer.addEventListener("click", (e) => {
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