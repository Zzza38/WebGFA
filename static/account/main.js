// Account Creation
document.getElementById("createAccount").addEventListener("click", async (event) => {
    const email = document.getElementById("emailCreate");
    const accountFetch = await fetch('/api/request-account-creation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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
                alertText.textContent += "Account with this email already exists.";
                break;
            case 403:
                alertText.textContent += "This email is blacklisted.";
                break;
            case 406:
                alertText.textContent += "Invalid email format.";
                break;
            default:
                alertText.textContent += "Unknown Error: Please report this. CODE: " + accountFetch.status;
                break;
        }
        alertText.style.color = "red";
    }
});