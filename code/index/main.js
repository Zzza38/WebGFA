
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
        import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
        import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js";

        // Your web app's Firebase configuration
        const firebaseConfig = {
            apiKey: "AIzaSyAMOJV2z02dLtMb8X1uWDGkDx6ysrzBcUo",
            authDomain: "webgfa-games.firebaseapp.com",
            projectId: "webgfa-games",
            storageBucket: "webgfa-games.appspot.com",
            messagingSenderId: "553239008504",
            appId: "1:553239008504:web:b91fba77cf0f131849170d",
            measurementId: "G-5W79NYJZ11"
        };

        // Initialize Firebase
        const app = initializeApp(firebaseConfig);
        const analytics = getAnalytics(app);
        const firestore = getFirestore();
const form = document.getElementById('loginForm');
const alertText = document.getElementById('alertText');


form.addEventListener('submit', async function(event) {
      event.preventDefault(); // Prevent the form from submitting

      // Get the username and password values from the form
      const username = form.username.value;
      const password = form.password.value;

      console.log('Attempting login with username:', username, 'and password:', password);

      try {
        // Reference to the document containing usernames
        const usernamesRef = doc(firestore, 'users', 'usernames');

        // Get the document snapshot
        const usernamesDoc = await getDoc(usernamesRef);

        console.log('Retrieved usernames document:', usernamesDoc.data());

        if (usernamesDoc.exists()) {
          const usernamesData = usernamesDoc.data();

          // Check if the entered username exists and retrieve the associated password
          if (usernamesData.hasOwnProperty(username)) {
            const storedPassword = usernamesData[username];
            if (password === storedPassword) {
              console.log('Login successful for user:', username);
              // Redirect the user to another page or perform other actions
          } else {
                    alertText.textContent = 'Incorrect password for user: ' + username;
                }
            } else {
                alertText.textContent = 'User not found: ' + username;
            }
        } else {
            alertText.textContent = 'Usernames document does not exist';
        }
    } catch (error) {
        console.error('Error fetching usernames document:', error);
        // Display error message
        alertText.textContent = 'An error occurred while attempting to login. If you wish to report this error, here is the error code: ' + error;
    }
    });
