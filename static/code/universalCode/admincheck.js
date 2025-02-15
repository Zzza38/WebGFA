// Function to check if the user is logged in
function checkLoggedIn() {
    // Get the value of the loggedIn cookie
    const loggedIn = getCookie("loggedInAdmin");

    // If the loggedIn cookie is not set to "true", redirect to webgfa.com
    if (loggedIn !== "true") {
        window.location.href = "/admin";
    }
}

// Function to retrieve the value of a cookie by its name
function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
}

// Call the function to check if the user is logged in when the page loads
checkLoggedIn();
