// load particles.js
particlesJS.load('particles-js', '/assets/json/particles.json', function () {
    console.log('callback - particles.js config loaded');
});

const urlParams = new URLSearchParams(window.location.search);
const username = urlParams.get('username');
const resetID = urlParams.get('resetID');
const alertText = document.getElementById('alertText');

document.getElementById('resetPassword').addEventListener('click', async (event) => {
    event.preventDefault();

    let requestJSON = {}
    requestJSON.username = username

    const password = document.getElementById('password').value;
    const passwordRepeat = document.getElementById('passwordRepeat').value;

    if (password !== passwordRepeat) return alertText.textContent = "The passwords do not match.";

    requestJSON.password = password;
    requestJSON.resetID = resetID;

    const resultFetch = await fetch('/api/reset-password', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestJSON)
    });

    if (resultFetch.ok) {
        alertText.style.color = 'green';
        alertText.textContent = 'Your account password has been changed!';
    } else if (resultFetch.status === 403) {
        alertText.textContent = 'You do not have the proper access to change this password. Either you aren\'t and admin, or you clicked on this link.';
    } else {
        alertText.textContent = 'Unhandled error: ' + resultFetch.statusText;
    }
});