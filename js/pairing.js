const body = document.body;
let deletingPair;

body.addEventListener("click", (e) => {
    const target = e.target;
    if (!["span", "button"].includes(target.tagName.toLowerCase())) return;

    const confirmation = document.querySelector(".confirmation");

    switch (target.textContent.toLowerCase()) {
        case "unlink":
            deletingPair = target.closest(".pair");
            if (!deletingPair) break;
            confirmation.style.display = "flex";
            break;
        case "yes":
            // delete pair from backend
            // insert fetch request for unlinking

            // delete pair from frontend
            if (!deletingPair) break;
            confirmation.style.display = "none";
            deletingPair.remove();

            // show a message if no more pairs
            const reference = document.querySelector(".pairing_container");
            const pairs = Array.from(reference.querySelectorAll(".pair"));

            if (pairs.length === 0) {
                const emptyText = `<p>No current pairings</p>`;
                reference.insertAdjacentHTML("beforeend", emptyText);
            };
            break;
        case "no":
            confirmation.style.display = "none";
            break;
        default:
            break;
    }
})