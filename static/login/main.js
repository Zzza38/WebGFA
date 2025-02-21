function getCookie(cname) {
    let name = cname + "=";
    let decodedCookie = decodeURIComponent(document.cookie);
    let ca = decodedCookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
}

const form = document.getElementById('loginForm');
const alertText = document.getElementById('alertText');

form.addEventListener('submit', function (event) {
    event.preventDefault();
    const username = form.username.value;
    const password = form.password.value;

    fetch('/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ username, password })
    })
        .then(response => {
            if (response.ok) {
                localStorage.setItem('loggedIn', 'true');
                window.location.href = '/';
            } else {
                return response.text();
            }
        })
        .then(errorMsg => {
            if (errorMsg) alertText.textContent = errorMsg;
        })
        .catch(error => {
            console.error('Error:', error);
            alertText.textContent = 'Connection error';
        });
});

if (localStorage.getItem('loggedIn')) {
    window.location.href = '/';
}