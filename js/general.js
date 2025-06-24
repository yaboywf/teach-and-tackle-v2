/**
 * Shows an error message in the error container
 * 
 * @param {string} message - The error message to show
 * @returns {void}
 */
function showMessage(message, type = "error") {
    const errorContainer = document.querySelector(".error_container");
    if (!errorContainer) return console.error("Error container not found");
    if (!message) return console.error("Error message not provided");

    const error = document.createElement("div");
    error.classList.add("error");
    if (type === "success") error.classList.add("success");
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

/**
 * Function to check if the user is authenticated
 * @returns {boolean} - True if the user is authenticated, false otherwise
 */
function isAuthenticated() {
    const idToken = getCookie('id_token');
    const accessToken = getCookie('access_token');

    if (idToken || accessToken) return isTokenValid(idToken);
    return false;
}

/**
 * Helper function to retrieve cookies
 * @param {*} name - The name of the cookie
 * @returns {*}
 */
function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
}

/**
 * Function to check if a token is valid
 * @param {*} token - The token to check
 * @returns {bool}
 */
function isTokenValid(token) {
    if (!token) return false;

    const payload = decodeJWT(token);
    if (!payload || !payload.exp) return false;
    const now = Math.floor(Date.now() / 1000);
    return payload.exp > now;
}

/**
 * Function to decode a JWT
 * @param {*} token - The token to decode
 * @returns {object}
 */
function decodeJWT(token) {
    if (!token) return null;

    try {
        const payload = token.split('.')[1];
        const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
        return JSON.parse(decoded);
    } catch (e) {
        console.error('Failed to decode token:', e);
        return null;
    }
}