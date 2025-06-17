/**
 * Shows an error message in the error container
 * 
 * @param {string} message - The error message to show
 * @returns {void}
 */
function showError(message) {
    const errorContainer = document.querySelector(".error_container");
    if (!errorContainer) return console.error("Error container not found");
    if (!message) return console.error("Error message not provided");
    
    const error = document.createElement("div");
    error.classList.add("error");
    error.textContent = message;
    errorContainer.appendChild(error);

    setTimeout(() => error.remove(), 5000);
}

/**
 * Calculates the secret hash to be passed into AWS Cognito
 * 
 * @param {*} username - The username
 * @returns 
 */
function calculateSecretHash(username) {
    const crypto = window.crypto || window.msCrypto;
    const encoder = new TextEncoder();
    const data = `${username}2lave0d420lofl9ead9h87mi41`;
    const keyData = encoder.encode('kr3a1i8868lhcmmlain7jh10trjofrt4f2f4en2orh6oorbkp3t');
    const dataToSign = encoder.encode(data);

    return crypto.subtle.importKey(
        "raw",
        keyData,
        { name: "HMAC", hash: { name: "SHA-256" } },
        false,
        ["sign"]
    )
        .then(function (key) {
            return crypto.subtle.sign("HMAC", key, dataToSign)
                .then(function (signature) {
                    // Convert signature to base64 format
                    const byteArray = new Uint8Array(signature);
                    return btoa(String.fromCharCode.apply(null, byteArray));
                });
        });
}
