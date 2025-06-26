document.getElementById("signupForm").addEventListener("submit", (e) => {
    e.preventDefault();

    const adminNum = document.getElementById("admin_number").value;
    const regex = /^\d{7}[A-Za-z]$/;

    if (adminNum === "") return showMessage("Please enter your admission number.");
    if (!adminNum.match(regex)) return showMessage("Please enter a valid admission number.");

    sessionStorage.setItem("admin_number", adminNum);
    axios.post("https://s5y8kqe8x9.execute-api.us-east-1.amazonaws.com/api/account/forget-password", { username: adminNum })
        .then(() => {
            window.location.href = "/pages/reset2.html";
        })
        .catch(err => {
            console.error(err);
            showMessage("Error resetting password");
        });
})