function exportStorageData() {
    function getCookies() {
        let cookies = document.cookie.split('; ');
        let cookieObj = {};
        cookies.forEach(cookie => {
            let [name, value] = cookie.split('=');
            cookieObj[name] = value;
        });
        return cookieObj;
    }

    const excludedLocalStorage = Object.keys(localStorage).filter(key => 
        key.startsWith("gameLinks-") || 
        key === "username" || 
        key === "hasEmail" || 
        key === "premCount" || 
        key.startsWith("cus-")
    );
    function getLocalStorage() {
        let localStorageObj = {};
        for (let key in localStorage) {
            if (localStorage.hasOwnProperty(key) &! excludedLocalStorage.includes(key)) {
                localStorageObj[key] = localStorage.getItem(key);
            }
        }
        return localStorageObj;
    }

    return {
        cookies: getCookies(),
        localStorage: getLocalStorage()
    };
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

function sendData() {
    let data = exportStorageData();
    let response = fetch('/api/save-data', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ data })
    });
    if (response.ok) {
        console.log('Data saved successfully');
    } else {
        console.error('Failed to save data:', response.status, response.statusText);
    }
}

async function fetchUsername() {
    try {
        const response = await fetch("/api/get-user", {
            headers: {
                "Content-Type": "application/json"
            }
        });
        const data = await response.json();
        return data.user;
    } catch (error) {
        console.error("Error fetching username:", error);
    }
}

(async () => {
    const username = await fetchUsername();
    if (username === 'guest') {
       console.error('Cannot save data for guest user');
    } else {
      let saveInterval = setInterval(sendData, (1000 * 60) * 1); // Save every minute
    }
})();