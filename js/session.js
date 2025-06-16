function validate_time(time) {
    const [hours, minutes] = time.split(":").map(Number);
    return (hours >= 8 && hours <= 22) && (minutes === 0 || minutes === 30);
}

document.querySelector("#request_form").addEventListener("submit", (event) => {
    event.preventDefault();
    let pass_check = true;

    const show_error = (id, message) => {
        const error = document.querySelector(id);
        error.textContent = message;
        error.style.display = "block";
    }

    const strength = event.target.querySelectorAll("div:nth-of-type(2) > input[type='checkbox']:not(#nil)");
    const weakness = event.target.querySelectorAll("div:nth-of-type(3) > input[type='checkbox']:not(#nil1)");
    const start = document.getElementById("request_time_start").value;
    const end = document.getElementById("request_time_end").value;

    if (!document.getElementById("nil").checked && !Array.from(strength).some(checkbox => checkbox.checked)) {
        show_error(".fr1", "Please select at least one option");
        pass_check = false;
    }

    if (!document.getElementById("nil1").checked && !Array.from(weakness).some(checkbox => checkbox.checked)) {
        show_error(".fr2", "Please select at least one option");
        pass_check = false;
    }

    if (!validate_time(start) || !validate_time(end)) {
        show_error(".fr3", "Time must be between 08:00 and 22:30 and in 30 minute intervals");
        pass_check = false;
    }

    if (start >= end) {
        show_error(".fr3", "Invalid time range");
        pass_check = false;
    }

    if (document.getElementById("nil").checked && document.getElementById("nil1").checked) {
        show_error(".fr1", "Select at least one module from strength or weakness");
        show_error(".fr2", "Select at least one module from strength or weakness");
        pass_check = false;
    }

    if (pass_check) {
        const get_value = (id) => document.getElementById(id).value;
        const [name, email, day] = ["request_name", "request_email", "request_day"].map(get_value);
        const mentor = Array.from(document.querySelectorAll("#module_strength_checkboxes > input:not(#nil):checked")).map(checkbox => checkbox.id);
        const mentee = Array.from(document.querySelectorAll("#module_weakness_checkboxes > input:not(#nil1):checked")).map(checkbox => checkbox.id);
        const clone = document.importNode(document.getElementById("pending_template").content, true).querySelector(".student2");;
        clone.querySelector("p:nth-of-type(1)").textContent = name;
        clone.querySelector("p:nth-of-type(2)").textContent = email;
        clone.querySelector("p:nth-of-type(3)").innerHTML = request_diploma;
        clone.querySelector("div:nth-of-type(2) > div:nth-of-type(1)").textContent = `${day}, ${start} - ${end}`;
        const modules = (type, class_name) => {
            type.forEach(module => {
                const div = document.createElement("div");
                div.classList.add(class_name);
                div.textContent = module;
                clone.querySelector("div:nth-of-type(2) > div:nth-of-type(2)").appendChild(div);
            })
        }
        modules(mentor, "student_strength");
        modules(mentee, "student_weakness");
        const container = document.querySelector(".request_container");
        document.querySelector("#pending_container > div:nth-of-type(2)").appendChild(clone);
        container.style.opacity = "0";
        container.addEventListener("transitionend", () => { container.style.display = "none"; }, { once: true })
    }
})

document.querySelector(".request_form > div:nth-of-type(1) > input").addEventListener("change", () => {
    document.querySelector(".request_form > .form_error.fr3").style.display = "none";
})

document.querySelector("#request_form > .fa-xmark").addEventListener("click", () => {
    const container = document.querySelector(".request_container");
    const errors = document.querySelectorAll(".form_error");
    const checkboxesHTML = "<input type='checkbox' id='{id}' checked><label for='{id}'>None</label>";
    container.style.opacity = "0";
    document.getElementById("module_weakness_checkboxes").innerHTML = checkboxesHTML.replace(/{id}/g, "nil1");
    document.getElementById("module_strength_checkboxes").innerHTML = checkboxesHTML.replace(/{id}/g, "nil");
    ["request_time_start", "request_time_end"].forEach(id => document.getElementById(id).value = "08:00");
    errors.forEach(error => error.style.display = "none");
    container.addEventListener("transitionend", () => container.style.display = "none", { once: true });
})