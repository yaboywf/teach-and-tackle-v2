if (!sessionStorage.getItem("admin_number")) window.location.href = "/pages/register1.html";

document.getElementById("signupForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const code = document.getElementById("code").value;
    if (code === "") return showMessage("Please enter the confirmation code");
    
    axios.post("https://s5y8kqe8x9.execute-api.us-east-1.amazonaws.com/api/account/confirm-email", { username: sessionStorage.getItem("admin_number"), code })
        .then(() => {
            showMessage("Account confirmed", "success");
            sessionStorage.removeItem("admin_number");
            setTimeout(() => window.location.href = "/pages/login.html", 3000);
        })
        .catch(err => {
            console.error(err);
            showMessage("Error confirming account");
        })
})