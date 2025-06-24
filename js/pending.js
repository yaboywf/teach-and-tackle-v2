const pendingContainer = document.querySelector(".pending_container");
let profile = {};

/**
 * Fetches user data
 * @param {*} adminNum - Admin number of the user
 * @returns {object | null}
 */
async function getUser(adminNum) {
    try {
        const resp = await axios.get(`https://s5y8kqe8x9.execute-api.us-east-1.amazonaws.com/api/account/account-information?id=${encodeURIComponent(adminNum.toUpperCase())}`, { headers: { "authorization": `Bearer ${getCookie("id_token")}` } });
        return resp.data;
    } catch (err) {
        console.error(err);
        showMessage("Failed to fetch user information");
        return null;
    }
}

axios.get("https://s5y8kqe8x9.execute-api.us-east-1.amazonaws.com/api/request/user-requests", { headers: { "authorization": `Bearer ${getCookie("id_token")}` } })
.then(async resp => {
    const requests = resp.data;
    
    // split requests into sent and received 
    const received = requests.filter(request => request.receiver_id.toUpperCase() === decodeToken["cognito:username"].toUpperCase());
    const sent = requests.filter(request => request.sender_id.toUpperCase() === decodeToken["cognito:username"].toUpperCase());

    // HTML template for sent requests
    const sentFormat = (request, otherUser) => {
        return `
            <div class="request" id="${request.pair_id}">
                <div class="student_info">
                    <p style="--year: '${otherUser?.year_of_study}'">${otherUser?.name}</p>
                    <p>${otherUser?.student_id}@student.tp.edu.sg</p>
                    <p>${otherUser?.diploma}</p>
                </div>
                <div class="request_info">
                    <p>${request.module}</p>
                    <p>${dayNumberToName(request.day)} | ${request.start_time} - ${request.end_time}</p>
                </div>
                <div class="request_button sent">
                    <button>Edit</button>
                    <button>Withdraw</button>
                </div>
            </div>
        `;
    };

    // HTML template for received requests
    const receivedFormat = (request, otherUser) => {
        return `
            <div class="request" id="${request.pair_id}">
                <div class="student_info">
                    <p style="--year: '${otherUser?.year_of_study}'">${otherUser?.name}</p>
                    <p>${otherUser?.student_id}@student.tp.edu.sg</p>
                    <p>${otherUser?.diploma}</p>
                </div>
                <div class="request_info">
                    <p>${request.module}</p>
                    <p>${dayNumberToName(request.day)} | ${request.start_time} - ${request.end_time}</p>
                </div>
                <div class="request_button received">
                    <button>Accept</button>
                    <button>Decline</button>
                </div>
            </div>
        `;
    };

    const sentContainer = document.getElementById("sent_container");
    const receivedContainer = document.getElementById("received_container");

    // remove spinners for received and sent containers
    ["sent", "received"].forEach(id => {
        const container = document.getElementById(`${id}_container`);
        const containerSpinner = container.querySelector(".spinner");
        if (containerSpinner) containerSpinner.remove();
    });

    // show empty message if there are no requests
    if (sent.length === 0) sentContainer.insertAdjacentHTML("beforeend", `<p>No sent requests</p>`); 
    if (received.length === 0) receivedContainer.insertAdjacentHTML("beforeend", `<p>No received requests</p>`); 

    // show data for each sent request
    await Promise.all(sent.map(async (request) => {
        const user = await getUser(request.receiver_id);
        const format = sentFormat(request, user);
        sentContainer.insertAdjacentHTML("beforeend", format);
    }));

    // show data for each received request
    await Promise.all(received.map(async (request) => {
        const user = await getUser(request.sender_id);
        const format = receivedFormat(request, user);
        receivedContainer.insertAdjacentHTML("beforeend", format);
    }));
})
.catch(err => {
    showMessage("Failed to fetch requests");
    console.error(err);
})

pendingContainer.addEventListener("click", (e) => {
    const target = e.target;
    if (target.tagName.toLowerCase() != "button") return;
    const pairId = target.closest(".request").getAttribute("id");

    switch (target.textContent.toLowerCase()) {
        case "accept":
            axios.put("https://s5y8kqe8x9.execute-api.us-east-1.amazonaws.com/api/request/update-request-status", { id: pairId }, { headers: { "authorization": `Bearer ${getCookie("id_token")}` }})
            .then(() => {
                showMessage("Request accepted", "success");
                target.closest(".request").remove();
                checkEmpty("received");
            })
            .catch(err => {
                console.error(err);
                showMessage("Failed to accept request");
            }); 

            break;
        case "decline":
            axios.delete(`https://s5y8kqe8x9.execute-api.us-east-1.amazonaws.com/api/request/delete-request?id=${encodeURIComponent(pairId)}`, { headers: { "authorization": `Bearer ${getCookie("id_token")}` }})
            .then(() => {
                showMessage("Request declined", "success");
                target.closest(".request").remove();
                checkEmpty("received");
            })
            .catch(err => {
                console.error(err);
                showMessage("Failed to accept request");
            });

            break;
        case "withdraw":
            axios.delete(`https://s5y8kqe8x9.execute-api.us-east-1.amazonaws.com/api/request/delete-request?id=${encodeURIComponent(pairId)}`, { headers: { "authorization": `Bearer ${getCookie("id_token")}` }})
            .then(() => {
                showMessage("Request withdrawed", "success");
                target.closest(".request").remove();
                checkEmpty("sent");
            })
            .catch(err => {
                console.error(err);
                showMessage("Failed to accept request");
            });

            break;
        case "edit":
            window.location.href = `session.html?id=${encodeURIComponent(pairId)}`;
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