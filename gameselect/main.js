
document.addEventListener('keydown', function(event) {
    if (event.ctrlKey && event.shiftKey && event.key === 'C') {
        const cookies = document.cookie.split(';');
        const cookieText = cookies.map(cookie => cookie.trim()).join('\n');
        document.body.innerHTML = '<pre>' + cookieText + '</pre>';
    }
});
 // Function to retrieve the value of a cookie by its name

    // Function to delete a cookie by name
    function deleteCookie(name) {
        document.cookie = name + '=; Max-Age=-99999999;';
    }

    // Event listener for keydown event
    document.addEventListener('keydown', function(event) {
        // Check if Ctrl+Shift+L is pressed
        if (event.ctrlKey && event.shiftKey && event.key === 'L') {
            // Delete cookies
            deleteCookie('loggedIn');
            deleteCookie('pass');
            deleteCookie('user');
            // Redirect to webgfa.com
            window.location.href = "https://webgfa.com";
        }
    });