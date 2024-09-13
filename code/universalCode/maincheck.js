// Function to check if the user is logged in
function checkLoggedIn() {
    // Get the value of the loggedIn cookie
    const loggedIn = localStorage.getItem("loggedIn");

    // If the loggedIn cookie is not set to "true", redirect to webgfa.com
    if (loggedIn != true) {
        window.location.href = "/";
    }
}

function checkLockdown() {
    if (sessionStorage.getItem('lockdown')) {
        window.location.href = "/code/universalCode/lockdown.html"
    }
}
// Call the function to check if the user is logged in when the page loads
checkLoggedIn();
