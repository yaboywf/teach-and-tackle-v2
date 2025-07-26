if (!sessionStorage.getItem("admin_number")) window.location.href = "/pages/register1.html";

document.getElementById("signupForm").addEventListener("submit", (e) => {
    e.preventDefault();

    const code = Array.from(inputs).map(input => input.value).join('');
    if (code === "") return showMessage("Please enter the confirmation code");
    if (code.length !== 6) return showMessage("Please enter a valid confirmation code");
    console.log(code);

    axios.post("https://s5y8kqe8x9.execute-api.us-east-1.amazonaws.com/api/account/confirm-email", { username: sessionStorage.getItem("admin_number"), code })
        .then(() => {
            showMessage("Account confirmed", "success");
            sessionStorage.removeItem("admin_number");
            setTimeout(() => window.location.href = "/pages/login.html", 3000);
        })
        .catch(err => {
            console.error(err);
            showMessage("Invalid confirmation code");
        })
})

const inputs = document.querySelectorAll('input');

inputs.forEach((input, index) => {
    input.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/\D/g, '');

        if (e.target.value.length > 1) e.target.value = e.target.value.slice(0, 1);
        if (index < inputs.length - 1 && e.target.value !== '') inputs[index + 1].focus();
    });

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && e.target.value === '') {
            if (index > 0) inputs[index - 1].focus();
        } else if (e.key === 'ArrowLeft' && index > 0) {
            if (index > 0) inputs[index - 1].focus();
        } else if (e.key === 'ArrowRight' && index < inputs.length - 1) {
            if (index < inputs.length - 1) inputs[index + 1].focus();
        }
    });
});

inputs[0].addEventListener('paste', (e) => {
    const paste = e.clipboardData.getData('Text');
    const numericPaste = paste.replace(/\D/g, '');
    inputs.forEach((input, index) => {
        input.value = numericPaste[index] || '';
        if (numericPaste[index] && index < inputs.length - 1) {
            inputs[index + 1].focus();
        }
    });

    e.preventDefault();
});