async function fetchUsername() {
    try {
        const response = await fetch('/api/get-user', { method: 'POST' });
        if (!response.ok) throw new Error('Failed to get username');

        const data = await response.json();
        return data.user;
    } catch (error) {
        console.error('Error getting username:', error);
        return 'guest';
    }
}

async function fetchSaveData() {
    try {
        const response = await fetch('/api/get-save', { method: 'POST' });
        if (!response.ok) throw new Error('Failed to get save data');

        return await response.json();
    } catch (error) {
        console.error('Error getting save data:', error);
        return null;
    }
}

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
function titleCase(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}
async function initializePage() {
    const username = await fetchUsername();
    const saveData = await fetchSaveData();

    document.getElementById('message').innerText = `Hello, ${titleCase(username)}. You ${saveData ? 'do' : 'don\'t'} have saved data.`;

    document.getElementById('saveButton').addEventListener('click', async () => {
        if (saveData) {
            importStorageData(saveData);
            console.log('Data saved successfully');
        }
    });

    if (username === 'guest') {
        document.getElementById('saveData').disabled = true;
        document.getElementById('message').innerText = `Hello, guest. You don't have saved data as a guest account cannot get save data. Make a free account today!`;
    }
}

initializePage();
