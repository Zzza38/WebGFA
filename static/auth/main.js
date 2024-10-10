// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, applyActionCode , signInWithEmailAndPassword, sendEmailVerification, createUserWithEmailAndPassword, updateProfile} from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyAMOJV2z02dLtMb8X1uWDGkDx6ysrzBcUo",
    authDomain: "webgfa-games.firebaseapp.com",
    databaseURL: "https://webgfa-games-default-rtdb.firebaseio.com",
    projectId: "webgfa-games",
    storageBucket: "webgfa-games.appspot.com",
    messagingSenderId: "553239008504",
    appId: "1:553239008504:web:b91fba77cf0f131849170d",
    measurementId: "G-5W79NYJZ11"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
//const analytics = getAnalytics(app);
const auth = getAuth(app);

// Function to parse URL query parameters
function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}
function getUID() {
    const userId = auth.currentUser ? auth.currentUser.uid : null;
    console.log(userId);
    return userId;
}
function signIn(email, password) {
    signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            // Signed in 
            let user = userCredential.user;
            window.loggedInUser = user;
            console.log("User signed in:", user.uid);
        })
        .catch((error) => {
            let errorCode = error.code;
            let errorMessage = error.message;
            console.error("Error signing in:", errorCode, errorMessage);
        });
}
function registerUser(email, password, displayName) {
    createUserWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        // Signed in 
        const user = userCredential.user;
        console.log("User created successfully!");
  
        // Update the display name
        updateProfile(user, {
          displayName: displayName
        }).then(() => {
          console.log("Display name updated to", user.displayName);
          // Additional logic or redirection after account creation and updating profile
        }).catch((error) => {
          console.error("Error updating display name", error);
        });
  
      })
      .catch((error) => {
        const errorCode = error.code;
        const errorMessage = error.message;
        // Handle Errors here, like email already in use, etc.
        console.error("Error creating user", errorCode, errorMessage);
      });
  }
function sendVerificationEmail(user) {
    
    sendEmailVerification(user)
        .then(() => {
            console.log("Verification email sent.");
        })
        .catch((error) => {
            console.error("Error sending verification email:", error);
        });
}
// Example usage: Get the 'mode' parameter which tells you what the URL is for (e.g., verifyEmail, resetPassword)

const mode = getQueryParam('mode');
function verifyEmail(){
    const oobCode = getQueryParam('oobCode');
    console.log(oobCode);
    const userId = getUID();
    // Update Firebase Authentication to mark the user's email as verified
    if (userId) {
        applyActionCode(auth, oobCode)
            .then(() => {
                // Email verification successful
                console.log("Email verification successful");
            })
            .catch((error) => {
                // Error updating email verification status
                console.error("Error updating email verification status:", error);
            });
    } else {
        // Invalid or missing user identifier
        console.error("Invalid or missing user identifier");
    }
}

document.getElementById('login').addEventListener('click', function() {
    let email = document.getElementById('email').value;
    let password = document.getElementById('password').value;
    signIn(email, password);
});

document.getElementById('sendAuthEmail').addEventListener('click', function() {
    sendVerificationEmail(loggedInUser);
});



window.verifyEmail = verifyEmail;
window.getUID = getUID;
window.sendVerificationEmail = sendVerificationEmail;
window.getQueryParam = getQueryParam;