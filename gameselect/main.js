
document.addEventListener('keydown', function(event) {
    if (event.ctrlKey && event.shiftKey && event.key === 'C') {
        const cookies = document.cookie.split(';');
        const cookieText = cookies.map(cookie => cookie.trim()).join('\n');
        document.body.innerHTML = '<pre>' + cookieText + '</pre>';
    }
});
 // Function to retrieve the value of a cookie by its name

    // Function to delete a cookie by name
    function deleteCookie(name) {
        document.cookie = name + '=; Max-Age=-99999999;';
    }

    // Event listener for keydown event
    document.addEventListener('keydown', function(event) {
        // Check if Ctrl+Shift+L is pressed
        if (event.ctrlKey && event.shiftKey && event.key === 'L') {
            // Delete cookies
            deleteCookie('loggedIn');
            deleteCookie('pass');
            deleteCookie('user');
            // Redirect to webgfa.com
            window.location.href = "https://webgfa.com";
        }
    });
    import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js"; // Import Firestore modules
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
    //const analytics = getAnalytics(app);
    const firestore = getFirestore(app);

    const docRef = doc(firestore, 'data', 'ccfs');
    const docData = await getDoc(docRef);
    console.log(docData);
    window.docData = docData;