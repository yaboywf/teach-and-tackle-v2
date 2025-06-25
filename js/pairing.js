const body = document.body;
let deletingPair;
let deletingPairId;

body.addEventListener("click", (e) => {
    const target = e.target;
    if (!["span", "button"].includes(target.tagName.toLowerCase())) return;

    const confirmation = document.querySelector(".confirmation");

    switch (target.textContent.toLowerCase()) {
        case "unlink":
            deletingPair = target.closest(".pair");
            if (!deletingPair) break;
            deletingPairId = deletingPair.getAttribute("id");
            confirmation.style.display = "flex";
            break;
        case "yes":
            if (!deletingPair || !deletingPairId) break;

            // delete pair from backend
            axios.delete(`https://s5y8kqe8x9.execute-api.us-east-1.amazonaws.com/api/pairs/delete-pair?id=${encodeURIComponent(deletingPairId)}`, { headers: { "authorization": `Bearer ${getCookie("id_token")}` } })
                .then(resp => {
                    showMessage(resp.data.message, "success");
                })
                .catch(err => {
                    console.error(err);
                    showMessage("Failed to delete pair");
                });

            // delete pair from frontend
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

/**
 * Fetches user data
 * @param {*} adminNum - Admin number of the user
 * @returns {object | null}
 */
const getUser = async (adminNum) => {
    try {
        // backend to ensure that the only people who can delete the pair is user within the pair
        const resp = await axios.get(`https://s5y8kqe8x9.execute-api.us-east-1.amazonaws.com/api/account/account-information?id=${encodeURIComponent(adminNum.toUpperCase())}`, { headers: { "authorization": `Bearer ${getCookie("id_token")}` } });
        return resp.data;
    } catch (err) {
        console.error(err);
        showMessage("Failed to fetch user");
        return null;
    }
}

(async () => {
    try {
        const resp = await axios.get("https://s5y8kqe8x9.execute-api.us-east-1.amazonaws.com/api/pairs/user-pairs", { headers: { "authorization": `Bearer ${getCookie("id_token")}` }});

        // extract module short form from module name
        const extractModuleName = (moduleName) => {
            const match = moduleName.match(/\(([^)]+)\)/);
            const result = match ? match[1] : null;
            return result;
        }

        // show a pair HTML via a template
        const showPair = (currentUserData, otherUserData, pairInfo) => {
            return `
                <div class="pair" id="${pairInfo.pair_id}">
                    <span>Unlink</span>
                    <div class="student_info">
                        <p style="--year: '${currentUserData?.year_of_study}'">${currentUserData?.name}</p>
                        <p>${currentUserData?.student_id}@student.tp.edu.sg</p>
                        <p>${currentUserData?.diploma}</p>
                    </div>

                    <div class="pair_info">
                        <i class="fa-solid fa-link"></i>
                        <p>${dayNumberToName(pairInfo.day)}</p>
                        <p>${pairInfo.start_time} - ${pairInfo.end_time}</p>
                        <p>${extractModuleName(pairInfo.module)}</p>
                    </div>

                    <div class="student_info">
                        <p style="--year: '${otherUserData?.year_of_study}'">${otherUserData?.name}</p>
                        <p>${otherUserData?.student_id}@student.tp.edu.sg</p>
                        <p>${otherUserData?.diploma}</p>
                    </div>
                </div>
            `;
        };

        const currentUsername = decodeToken["cognito:username"].toUpperCase();
        document.querySelector(".pairing_container").innerHTML = '';

        if (resp.data.length === 0) {
            const emptyText = `<p>No current pairings</p>`;
            document.querySelector(".pairing_container").insertAdjacentHTML("beforeend", emptyText);
        }

        for (const pair of resp.data) {
            const otherUser = pair.receiver_id.toUpperCase() === currentUsername ? pair.sender_id : pair.receiver_id;
            const currentUserData = await getUser(currentUsername);
            const otherUserData = await getUser(otherUser);

            if (currentUserData && otherUserData) {
                const html = showPair(currentUserData, otherUserData, pair);
                document.querySelector(".pairing_container").innerHTML += html;
            }
        }
    } catch (err) {
        console.error(err);
        showMessage("Failed to fetch pairs");
    }
})();