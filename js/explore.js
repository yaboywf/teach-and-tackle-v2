const exploreContainer = document.querySelector(".explore_container");

exploreContainer.addEventListener("click", (e) => {
    const target = e.target;
    if (target.classList.contains("fa-link")) {
        const parent = target.closest("#explore_student");
        const adminNum = parent.getAttribute("adminNum");
        window.location.href = `session.html?adminNum=${encodeURIComponent(adminNum)}`;
    }
})

document.getElementById("searchBar").addEventListener("input", (e) => {
    const value = e.target.value;
    const students = Array.from(document.getElementsByClassName("explore_student"));

    for (const student of students) {
        const name = student.querySelector("p").textContent;
        if (name.toLowerCase().includes(value.toLowerCase())) {
            student.style.display = "block";
        } else {
            student.style.display = "none";
        }
    }
})

async function getData() {
    try {
        const proficiencies = await axios.get(`https://s5y8kqe8x9.execute-api.us-east-1.amazonaws.com/api/proficiency/user-proficiency?id=${decodeToken["cognito:username"].toUpperCase()}`);
        const strength = proficiencies.data.filter(record => record.type === 1);
        const weakness = proficiencies.data.filter(record => record.type === 2);

        const strengthModules = strength.map(record => record.module);
        const weaknessModules = weakness.map(record => record.module);

        const matchableAccounts = await axios.get(`https://s5y8kqe8x9.execute-api.us-east-1.amazonaws.com/api/proficiency/matchable-accounts?strength=${encodeURIComponent(strengthModules.join(','))}&weakness=${encodeURIComponent(weaknessModules.join(','))}`);

        for (const account of matchableAccounts.data) {
            try {
                const userInfo = await axios.get(`https://s5y8kqe8x9.execute-api.us-east-1.amazonaws.com/api/account/account-information?id=${encodeURIComponent(account.toUpperCase())}`)
                const userProficiencies = await axios.get(`https://s5y8kqe8x9.execute-api.us-east-1.amazonaws.com/api/proficiency/user-proficiency?id=${encodeURIComponent(account.toUpperCase())}`)
                const userStrength = userProficiencies.data.filter(record => record.type === 1);
                const userWeakness = userProficiencies.data.filter(record => record.type === 2);

                let strengthString = '';
                let weaknessString = '';

                userStrength.forEach(strength => {
                    strengthString += `<div class="strength">${strength.module.split("(")[1].replace(")", "").toUpperCase()}</div>`;
                });

                userWeakness.forEach(weakness => {
                    weaknessString += `<div class="weakness">${weakness.module.split("(")[1].replace(")", "").toUpperCase()}</div>`;
                });

                const exploreStudentTemplate = `
                    <div id='explore_student' class="explore_student" adminNum="${userInfo.data.student_id}">
                        <div class="student_info">
                            <p style="--year: '${userInfo.data.year_of_study}'">${userInfo.data.name}</p>
                            <p>${userInfo.data.student_id}@student.tp.edu.sg</p>
                            <p>${userInfo.data.diploma}</p>
                        </div>
                        <div class="student_skills">
                            ${strengthString}
                            ${weaknessString}
                            <i class="fa-solid fa-link"></i>
                        </div>
                    </div>
                `;

                exploreContainer.innerHTML += exploreStudentTemplate;
            } catch (error) {
                console.error(error);
                continue;
            }
        };
    } catch (err) {
        console.error(err);
        showMessage("Failed to fetch matchable accounts");
    }
}

getData();