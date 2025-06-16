const pendingContainer = document.querySelector(".pending_container");

pendingContainer.addEventListener("click", (e) => {
    const target = e.target;
    if (target.tagName.toLowerCase() != "button") return;

    switch (target.textContent.toLowerCase()) {
        case "accept":
            // insert fetch request for accepting request

            target.closest(".request").remove();
            checkEmpty("received");
            break;
        case "decline":
            // insert fetch request for declining request

            target.closest(".request").remove();
            checkEmpty("received");
            break;
        case "withdraw":
            // insert fetch request for withdrawing request

            target.closest(".request").remove();
            checkEmpty("sent");
            break;
        case "edit":
            window.location.href = "session.html";
            break;
        default:
            break;
    };
})

/**
 * Shows the empty message for a given container id when the container is empty.
 * @param {string} id - The id of the container element.
 * @param {string} type - The type of requests [received, sent]. 
 * @returns {void}
 */
function checkEmpty(id) {
    const reference = document.getElementById(id);

    if (reference.nextElementSibling) return;
    const emptyText = `<p>No ${id} requests</p>`;
    reference.insertAdjacentHTML("afterend", emptyText);
}