const username = fetch('/api/get-iser', {
    method: 'POST'
}).then(response => {
    if (response.ok) {
        return response.json();
    }
    throw new Error('Failed to get username');
}).then(data => {
    return data.user;
}).catch(error => {
    console.error('Error getting username:', error);
});
const saveData = fetch('/api/get-save', {
    method: 'POST'
}).then(response => {
    if (response.ok) {
        return response.json();
    }
    throw new Error('Failed to get save data');
}).then(data => {
    return data;
}).catch(error => {
    console.error('Error getting save data:', error);
});

function importStorageData(data) {
    if (data.cookies) {
        Object.entries(data.cookies).forEach(([key, value]) => {
            document.cookie = `${key}=${value}; path=/`;
        });
    }
    if (data.localStorage) {
        Object.entries(data.localStorage).forEach(([key, value]) => {
            localStorage.setItem(key, value);
        });
    }
}


document.getElementById('message').innerText = `Hello, ${username}. You ${saveData ? 'do' : 'don\''} have saved data.`;
document.getElementById('saveButton').addEventListener('click', async () => {
    importStorageData(await saveData)
    console.log('Data saved successfully');
});
if (username === 'guest') {
    document.getElementById('saveData').disabled = true;
    document.getElementById('message').innerText = `Hello, guest. You don't have saved data as a guest account cannot get save data. Make a free WebGFA account today!`;

}