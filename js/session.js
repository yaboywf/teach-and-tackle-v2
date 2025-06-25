const queryParams = new URLSearchParams(window.location.search);
const pairId = queryParams.get("pairId");
const adminNum = queryParams.get("adminNum");

if ((!adminNum && !pairId) || (adminNum && adminNum === decodeToken["cognito:username"].toUpperCase())) {
    window.location.href = "/pages/explore.html";
}

async function getData() {
    if (adminNum) {
        document.querySelector("button[type='submit']").textContent = "Request";

        axios.get(`https://s5y8kqe8x9.execute-api.us-east-1.amazonaws.com/api/account/account-information?id=${encodeURIComponent(adminNum.toUpperCase())}`)
        .then(resp => {
            console.log(resp.data);
            document.getElementById("name").textContent = resp.data.name;
            document.getElementById("admission_number").textContent = resp.data.student_id.toUpperCase();
            document.getElementById("diploma").textContent = resp.data.diploma;
        })
        .catch(err => {
            console.error(err);
            showMessage("Failed to fetch user information");
        })

        document.getElementById("request_form").addEventListener("submit", (e) => {
            e.preventDefault();

            const module = document.querySelector('input[name="module"]:checked');
            const day = document.querySelector('input[name="day"]:checked');
            const startTime = document.getElementById('request_time_start').value;
            const endTime = document.getElementById('request_time_end').value;

            if (!module) return showMessage("Please select a module");
            if (!day) return showMessage("Please select a day");
            if (startTime === "") return showMessage("Please select a start time");
            if (endTime === "") return showMessage("Please select an end time");
            if (!e.target.checkValidity()) return;

            const data = {
                receiver_id: adminNum.toUpperCase(),
                module: module.value,
                day: day.value,
                start_time: startTime,
                end_time: endTime
            };

            axios.post("https://s5y8kqe8x9.execute-api.us-east-1.amazonaws.com/api/request/new-request", data, { headers: { "authorization": `Bearer ${getCookie("id_token")}` } })
            .then(resp => {
                showMessage(resp.data?.message, "success");
                window.location.href = "/pages/pending.html";
            })
            .catch(err => {
                console.error(err);
                showMessage("Failed to create new request");
            })
        })
    } else if (pairId) {
        try {
            document.querySelector("button[type='submit']").textContent = "Update";

            const requests = await axios.get("https://s5y8kqe8x9.execute-api.us-east-1.amazonaws.com/api/request/user-requests", { headers: { "authorization": `Bearer ${getCookie("id_token")}` }, params: { id: pairId }})
            const pair = requests.data.find(pair => pair.pair_id == Number(pairId))
            if (!pair) window.location.href = "/pages/pending.html";
            const user = await axios.get(`https://s5y8kqe8x9.execute-api.us-east-1.amazonaws.com/api/account/account-information?id=${encodeURIComponent(pair.receiver_id.toUpperCase())}`, { headers: { "authorization": `Bearer ${getCookie("id_token")}` } });
            if (user) {
                document.getElementById("name").textContent = user.data.name;
                document.getElementById("admission_number").textContent = pair.receiver_id.toUpperCase();
                document.getElementById("diploma").textContent = user.data.diploma;
            }
            document.querySelector(`.day input[value='${pair.day}']`).checked = true;
            document.querySelector(`.module input[value='${pair.module}']`).checked = true;
            document.getElementById("request_time_start").value = pair.start_time;
            document.getElementById("request_time_end").value = pair.end_time;
        } catch(err) {
            console.error(err);
            showMessage("Failed to fetch pair information");
        }

        document.getElementById("request_form").addEventListener("submit", (e) => {
            e.preventDefault();

            const module = document.querySelector('input[name="module"]:checked');
            const day = document.querySelector('input[name="day"]:checked');
            const startTime = document.getElementById('request_time_start').value;
            const endTime = document.getElementById('request_time_end').value;

            if (!module) return showMessage("Please select a module");
            if (!day) return showMessage("Please select a day");
            if (startTime === "") return showMessage("Please select a start time");
            if (endTime === "") return showMessage("Please select an end time");
            if (!e.target.checkValidity()) return;

            const data = {
                pair_id: pairId,
                module: module.value,
                day: day.value,
                start_time: startTime,
                end_time: endTime
            };

            axios.put("https://s5y8kqe8x9.execute-api.us-east-1.amazonaws.com/api/request/update-request-details", data, { headers: { "authorization": `Bearer ${getCookie("id_token")}` } })
            .then(resp => {
                showMessage(resp.data?.message, "success");
                setTimeout(() => window.location.href = "/pages/pending.html", 3000);
            })
            .catch(err => {
                console.error(err);
                showMessage("Failed to update request");
            })
        })
    }
}

getData();