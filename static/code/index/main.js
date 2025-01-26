if (localStorage.getItem('loggedIn')) {
    window.location.href = '/gameselect/';
}

const form = document.getElementById('loginForm');
const alertText = document.getElementById('alertText');

function guestLogin() {
    fetch('/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ username: 'guest', password: 'guest' })
    })
    .then(response => {
        if (response.redirected) {
            localStorage.setItem('loggedIn', 'true');
            localStorage.setItem('user', 'guest');
            localStorage.setItem('pass', 'guest');
            window.location.href = response.url;
        } else {
            return response.text();
        }
    })
    .catch(error => {
        console.error('Error:', error);
    });
}
window.guestLogin = guestLogin;

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
        if (response.redirected) {
            localStorage.setItem('loggedIn', 'true');
            localStorage.setItem('user', username);
            localStorage.setItem('pass', password);
            window.location.href = response.url;
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