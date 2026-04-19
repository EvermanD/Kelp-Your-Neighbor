document.querySelector("#signupForm").addEventListener("submit", signupUser);

let feedbackDiv = document.querySelector("#feedbackDiv");
feedbackDiv.style.display = "none";

async function signupUser(event) {
    event.preventDefault();

    let username = document.querySelector("input[name=username]").value;
    let password = document.querySelector("input[name=password]").value;
    let submitButton = document.querySelector('#signupForm button[type="submit"]');

    if (username === "") {
        feedbackDiv.style.display = "block";
        feedbackDiv.textContent = "Error: username cannot be blank";
        feedbackDiv.style.color = "red";
        if (window.showUiToast) window.showUiToast("Username cannot be blank.", "error");
        return;
    }

    if (password === "") {
        feedbackDiv.style.display = "block";
        feedbackDiv.textContent = "Error: password cannot be blank";
        feedbackDiv.style.color = "red";
        if (window.showUiToast) window.showUiToast("Password cannot be blank.", "error");
        return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "Creating account...";

    let formData = new URLSearchParams();
    formData.append("username", username);
    formData.append("password", password);

    let response = await fetch("/signup", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: formData
    });

    let data = await response.json();

    feedbackDiv.style.display = "block";

    if (data.error) {
        feedbackDiv.textContent = data.error;
        feedbackDiv.style.color = "red";
        if (window.showUiToast) window.showUiToast(data.error, "error");
        submitButton.disabled = false;
        submitButton.textContent = "Sign Up";
    } else {
        feedbackDiv.textContent = data.success;
        feedbackDiv.style.color = "green";
        if (window.showUiToast) window.showUiToast("Account created successfully!", "success");

        setTimeout(function() {
            window.location.href = "/";
        }, 900);
    }
}