// load particles.js
particlesJS.load('particles-js', '/assets/json/particles.json', function () {
    console.log('callback - particles.js config loaded');
});

const urlParams = new URLSearchParams(window.location.search);
const username = urlParams.get('username');
const creationID = urlParams.get('creationID');
const alertText = document.getElementById('alertText');
document.getElementById('username').value = username;

document.getElementById('createAccount').addEventListener('click', async (event) => {
    event.preventDefault();
    
    let requestJSON = {}
    let newUsername = document.getElementById('username').value;
    requestJSON.username = username
    if (newUsername !== username) requestJSON.updatedUsername = newUsername

    const password = document.getElementById('password').value;
    const passwordRepeat = document.getElementById('passwordRepeat').value;

    if (password !== passwordRepeat) return alertText.textContent = "The passwords do not match.";

    requestJSON.password = password;
    requestJSON.creationID = creationID;

    const resultFetch = await fetch('/api/create-account', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestJSON)
    });

    if (resultFetch.ok) {
        alertText.style.color = 'green';
        alertText.textContent = 'Your account has been created!';
    } else if (resultFetch.status === 409) {
        alertText.textContent = 'The specified username exists. Please choose another one.';
    } else {
        alertText.textContent = 'Unhandled error: ' + resultFetch.statusText;
    }
});