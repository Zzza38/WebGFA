document.getElementById("loginForm").addEventListener("submit", async function(event) {
    event.preventDefault(); // Prevent form submission

    // Get input values
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    console.log('Attempting login with username:', username, 'and password:', password);

    try {
        // Initialize Firestore
        const firestore = firebase.firestore();

        // Reference to the document containing usernames
        const usernamesRef = firestore.collection('users').doc('usernames');

        // Get the document snapshot
        const usernamesDoc = await usernamesRef.get();

        console.log('Retrieved usernames document:', usernamesDoc.data());

        if (usernamesDoc.exists) {
            const usernamesData = usernamesDoc.data();

            // Check if the entered username exists and retrieve the associated password
            if (usernamesData.hasOwnProperty(username)) {
                const storedPassword = usernamesData[username];
                if (password === storedPassword) {
                    console.log('Login successful for user:', username);
                    // Set cookies with variable values
                    document.cookie = "loggedIn=true; path=/";
                    document.cookie = `user=${username}; path=/`;
                    document.cookie = `pass=${password}; path=/`;

                    // Redirect to the gameselect.html page
                    window.location.href = "gameselect.html"; 
                } else {
                    // Display invalid password message
                    document.getElementById("alertText").textContent = "Invalid password for user: " + username;
                }
            } else {
                // Display user not found message
                document.getElementById("alertText").textContent = "User not found: " + username;
            }
        } else {
            console.log('Usernames document does not exist');
            // Display error message
            document.getElementById("alertText").textContent = "Usernames document does not exist";
        }
    } catch (error) {
        console.error('Error:', error);
        // Display error message
        document.getElementById("alertText").textContent = "An error occurred while attempting to login";
    }
});
