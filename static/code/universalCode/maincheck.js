// Function to check if the user is logged in
function checkLoggedIn() {
    // Get the value of the loggedIn cookie
    let loggedIn = localStorage.getItem("loggedIn")

    // If the loggedIn cookie is not set to "true", redirect to webgfa.com
    if (loggedIn != 'true') {
        alert('You are not logged in!')
        window.location.href = "/";
    }
}

function checkLockdown() {
    if (sessionStorage.getItem('lockdown') &! window.location.href.includes('lockdown.html')) {
        window.location.href = "/code/universalCode/lockdown.html"
    }
}

// Call the function to check if the user is logged in when the page loads
checkLockdown();
checkLoggedIn();
