const path = window.location.pathname;
const username = localStorage.getItem('username');
const UID = localStorage.getItem('UID');

fetch('/webhooks/webgfa', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({
        path,
        username,
        UID
    })
});