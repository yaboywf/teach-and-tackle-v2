const exploreContainer = document.querySelector(".explore_container");
const exploreStudentTemplate = `
	<div>
        <div class="student_info">
            <p style="--year: '1'">Alice Johnson</p>
            <p>1234567A@student.tp.edu.sg</p>
            <p>Diploma in Information Technology</p>
        </div>
        <div class="student_skills">
            insert skills here
            <i class="fa-solid fa-link"></i>
        </div>
    </div>
`

exploreContainer.addEventListener("click", (e) => {
    const target = e.target;
    if (target.classList.contains("fa-link")) {
        const parent = target.closest("#explore_student");
        const adminNum = parent.querySelector(".student_info p:nth-of-type(2)").textContent.split("@")[0];
        const params = encodeURIComponent(adminNum);
        window.location.href = `session.html?adminNum=${params}`;
    }
})