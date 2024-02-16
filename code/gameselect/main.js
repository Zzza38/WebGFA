 // Function to check if the user is logged in
    function checkLoggedIn() {
        // Get the value of the loggedIn cookie
        var loggedIn = document.cookie.replace(/(?:(?:^|.*;\s*)loggedIn\s*\=\s*([^;]*).*$)|^.*$/, "$1");

        // If the loggedIn cookie is not set to "true", redirect to webgfa.com
        if (loggedIn !== "true") {
            window.location.href = "https://webgfa.com";
        }
    }

    // Call the function to check if the user is logged in when the page loads
    checkLoggedIn();
document.addEventListener('keydown', function(event) {
    if (event.ctrlKey && event.shiftKey && event.key === 'C') {
        const cookies = document.cookie.split(';');
        const cookieText = cookies.map(cookie => cookie.trim()).join('\n');
        document.body.innerHTML = '<pre>' + cookieText + '</pre>';
    }
});
 // Function to retrieve the value of a cookie by its name
  function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
  };
    // Function to delete a cookie by name
    function deleteCookie(name) {
        document.cookie = name + '=; Max-Age=-99999999;';
    }

    // Event listener for keydown event
    document.addEventListener('keydown', function(event) {
        // Check if Ctrl+Shift+Q is pressed
        if (event.ctrlKey && event.shiftKey && event.key === 'Q') {
            // Delete cookies
            deleteCookie('loggedIn');
            deleteCookie('pass');
            deleteCookie('user');
            // Redirect to webgfa.com
            window.location.href = "https://webgfa.com";
        }
    });
