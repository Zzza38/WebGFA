// load particles.js
particlesJS.load('particles-js', '/assets/json/particles.json', function () {
    console.log('callback - particles.js config loaded');
});

// there for vscode intellisense, should be removed / commented in production or the code breaks
// let config = {};

// Account Creation
if (!config.email.enabled) {
    document.getElementById("createAccount").disabled = true;
    document.getElementById("resetPassword").disabled = true;
    document.getElementById("emailPopup").style.display = "";
}

document.querySelectorAll('.popup').forEach(popup => {
    popup.addEventListener('click', () => {
        popup.style.display = 'none';
    });
});

document.getElementById("createAccount").addEventListener("click", async (event) => {
    event.preventDefault();

    const username = document.getElementById("usernameCreate").value;
    const email = document.getElementById("emailCreate").value;

    const accountFetch = await fetch('/api/request-account-creation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            username: username,
            email: email
        })
    });

    const alertText = document.getElementById("createAlert");

    if (accountFetch.ok) {
        alertText.textContent = "Email has been sent successfully! Email will be from \"alexanderaronov@hwps.net\""
        alertText.style.color = "green";
    } else {
        alertText.textContent = "Email was not sent. Error: "
        switch (accountFetch.status) {
            case 409:
                alertText.textContent += "Account with this email / username already exists.";
                break;
            case 403:
                alertText.textContent += "This email is blacklisted.";
                break;
            case 400:
                alertText.textContent += "Invalid email format.";
                break;
            default:
                alertText.textContent += "Unknown Error: Please report this. CODE: " + accountFetch.status;
                break;
        }
        alertText.style.color = "red";
    }
});

// Password Reset

document.getElementById("resetPassword").addEventListener("click", async (event) => {
    event.preventDefault();

    const username = document.getElementById("usernameReset").value;

    const accountFetch = await fetch('/api/request-password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            username: username
        })
    });

    const alertText = document.getElementById("resetAlert");

    if (accountFetch.ok) {
        alertText.textContent = "Email has been sent successfully! Email will be from \"alexanderaronov@hwps.net\""
        alertText.style.color = "green";
    } else {
        alertText.textContent = "Email was not sent. Error: "
        switch (accountFetch.status) {
            case 404:
                alertText.textContent += "Username not found.";
                break;
            default:
                alertText.textContent += "Unknown Error: Please report this. CODE: " + accountFetch.status;
                break;
        }
        alertText.style.color = "red";
    }
});
