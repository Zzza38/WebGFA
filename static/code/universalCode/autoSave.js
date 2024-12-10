// Function to push the entire localStorage to Firebase
async function saveEntireLocalStorageToFirebase() {
    const username = localStorage.getItem('user');
    if (!username) {
        console.error("No username found, cannot save to Firebase.");
        return;
    }

    // Collect all localStorage data
    const localStorageData = {};
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        // Use && to check that the key is NOT any of the excluded keys
        if (key !== 'user' && key !== 'pass' && key !== 'UID' && key !== 'loggedIn') {
            localStorageData[key] = localStorage.getItem(key);
        }
    }


    try {
        // Save the entire localStorage object to Firestore under the user's document
        await setDoc(doc(firestore, 'data', 'saveData'), {
            [username]: localStorageData
        }, { merge: true });

        console.log(`Entire localStorage saved to Firebase for user "${username}".`);
    } catch (error) {
        console.error("Error saving localStorage data to Firebase:", error);
    }
}

// Function to monitor localStorage updates and save the entire localStorage
function monitorLocalStorage() {
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = function (key, value) {
        originalSetItem.apply(this, arguments); // Keep original setItem functionality
        saveEntireLocalStorageToFirebase(); // Save entire localStorage to Firebase
        return 'yippe!';
    };

    console.log("Firebase auto-save functionality for entire localStorage initialized.");
}

// Auto-start monitoring localStorage when the page loads
window.addEventListener('load', () => {
    if (localStorage.getItem('user') == 'guest') return
    monitorLocalStorage();
    console.log('Monitoring Local Storage')
});
