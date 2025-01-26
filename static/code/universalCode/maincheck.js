// Function to check if the user is logged in
function checkLoggedIn() {
    // Get the value of the loggedIn cookie
    const loggedIn = localStorage.getItem("loggedIn") ? localStorage.getItem("loggedIn") : getCookie("loggedIn");

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

function getCookie(name) {
    // Split the cookie string into an array of key-value pairs
    const cookieArray = document.cookie.split('; ');

    // Loop through the array to find the value of the cookie with the specified name
    for (const cookie of cookieArray) {
        const [cookieName, cookieValue] = cookie.split('=');
        if (cookieName === name) {
            return cookieValue;
        }
    }
}
// Call the function to check if the user is logged in when the page loads
checkLockdown();
checkLoggedIn();
