

// Import the functions you need from the SDKs you need
import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
    getAnalytics
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js";
import {
    getFirestore,
    doc,
    getDoc,
    setDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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
const firestore = getFirestore(app);
const analytics = getAnalytics(app);
const username = localStorage.getItem('user');
let prem;

function jamesCheck() {
    if (username == 'james' || username == 'zion') {
        const jamesAddUser = document.getElementById("jamesAddUser");
        if (jamesAddUser) {
            jamesAddUser.style.display = "block";
        }
    }
}

function adminCheck() {
    const adminPanelLink = document.getElementById('admin')
    if (username == 'zion') {
        adminPanelLink.style.display = "";
    }
}

async function checkUser() {
    try {
        const docRef = doc(firestore, 'users', 'usernames');
        const permissionsDocRef = doc(firestore, 'users', 'permissions');
        let docSnap = await getDoc(docRef); // Renaming variable to docSnap
        let per = await getDoc(permissionsDocRef);
        let permissions = per.data();
        prem = String(permissions[username]).includes('prem');
        console.log(`User prem = ${prem}`)
        let userData = docSnap.data(); // Using userData instead of doc
        let users = Object.keys(userData); // Now using userData instead of doc
        if (users.indexOf(username) === -1) {
            logout();  
        }
    } catch (e) {
        console.error(e);
    }
}

function logout() {
    localStorage.removeItem('loggedIn');
    localStorage.removeItem('pass');
    localStorage.removeItem('user');
    // Redirect to the main page
    window.location.href = "/";
}
document.addEventListener('keydown', function (event) {
    if (event.ctrlKey && event.shiftKey && event.key === 'C') {
        const cookies = document.cookie.split(';');
        const cookieText = cookies.map(cookie => cookie.trim()).join('\n');
        document.body.innerHTML = '<pre>' + cookieText + '</pre>';
    }
});

// Function to delete a cookie by name
function deleteCookie(name) {
    document.cookie = name + '=; Max-Age=-99999999;';
}

// Event listener for keydown event
document.addEventListener('keydown', async function (event) {
    // Check if Ctrl+Shift+L is pressed
    if (event.ctrlKey && event.shiftKey && event.key === 'L') {
        // Delete cookies
        logout();
    }
});

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

let gameArray = [];
let allGames = [];

async function loadGames() {
    try {
        let gamesDoc;
        const gamesRef = doc(firestore, "data", "games");

        // Get the document
        gamesDoc = await getDoc(gamesRef);
        gamesDoc = gamesDoc.data();
        gameArray = gamesDoc;
        console.log(gamesDoc);

        // Get names and links
        let names = Object.keys(gamesDoc);
        let links = Object.values(gamesDoc);

        // Combine names and links into a single array of objects
        allGames = names.map((name, index) => ({
            name,
            link: links[index]
        }));

        // Sort the combined array alphabetically by name
        allGames.sort((a, b) => a.name.localeCompare(b.name));

        // Render the games
        renderGames(allGames);
    } catch (e) {
        console.error(e);
    }
}

function renderGames(games) {
    const gameLinks = document.getElementById('game-links');
    gameLinks.innerHTML = ''; // Clear existing links

    games.forEach(game => {
        let nameArr = game.name.split('**');
        let blockText;

        // Improved bold formatting
        if (nameArr.length === 1) {
            blockText = nameArr[0]; // No bold part
        } else if (nameArr.length === 2) {
            blockText = nameArr[0] + '<b>' + nameArr[1] + '</b>'; // Bold the second part
        } else if (nameArr.length === 3) {
            blockText = nameArr[0] + '<b>' + nameArr[1] + '</b>' + nameArr[2]; // Bold the middle part
        } else {
            // Handle cases with more than 3 parts by bolding the middle parts
            blockText = nameArr.map((part, index) => (index % 2 === 1 ? `<b>${part}</b>` : part)).join('');
        }

        let a = document.createElement('a');
        a.innerHTML = blockText;
        a.href = game.link;
        a.className = 'game-link';
        if (game.link == '/404.html') {
            a.style.color = '#F00'
        }
        gameLinks.appendChild(a);

    });
}

function filterGames() {
    const searchInput = document.getElementById('searchG').value.toLowerCase();
    const filteredGames = allGames.filter(game => game.name.toLowerCase().includes(searchInput));
    renderGames(filteredGames);
}
async function loadTools() {
    try {
        let gamesDoc;
        const gamesRef = doc(firestore, "data", "tools");

        // Get the document
        gamesDoc = await getDoc(gamesRef);
        gamesDoc = gamesDoc.data();
        gameArray = gamesDoc;
        console.log(gamesDoc);

        // Get names and links
        let names = Object.keys(gamesDoc);
        let links = Object.values(gamesDoc);

        // Combine names and links into a single array of objects
        allGames = names.map((name, index) => ({
            name,
            link: links[index]
        }));

        // Sort the combined array alphabetically by name
        allGames.sort((a, b) => a.name.localeCompare(b.name));

        // Render the games
        renderTools(allGames);
    } catch (e) {
        console.error(e);
    }
}

async function loadPrem() {
    try {
        let gamesDoc;
        const gamesRef = doc(firestore, "data", "premiumGames");
        let toolsDoc;
        const toolsRef = doc(firestore, "data", "premiumTools");

        // Get the document
        gamesDoc = await getDoc(gamesRef);
        gamesDoc = gamesDoc.data();
        console.log(gamesDoc);
        toolsDoc = await getDoc(toolsRef);
        toolsDoc = toolsDoc.data();
        console.log(toolsDoc);

        // Get names and links
        let gnames = Object.keys(gamesDoc);
        let glinks = Object.values(gamesDoc);
        let tnames = Object.keys(toolsDoc);
        let tlinks = Object.values(toolsDoc);

        // Combine names and links into a single array of objects
        let allGames = gnames.map((name, index) => ({
            name,
            link: glinks[index]
        }));
        let allTools = tnames.map((name, index) => ({
            name,
            link: tlinks[index]
        }));

        // Sort the combined array alphabetically by name
        allGames.sort((a, b) => a.name.localeCompare(b.name));
        allTools.sort((a, b) => a.name.localeCompare(b.name));

        // Render the games
        renderPremGames(allGames);
        renderPremTools(allTools);
    } catch (e) {
        console.error(e);
    }
}
function renderTools(games) {
    const gameLinks = document.getElementById('tool-links');
    gameLinks.innerHTML = ''; // Clear existing links

    games.forEach(game => {
        let nameArr = game.name.split('**');
        let blockText;

        // Improved bold formatting
        if (nameArr.length === 1) {
            blockText = nameArr[0]; // No bold part
        } else if (nameArr.length === 2) {
            blockText = nameArr[0] + '<b>' + nameArr[1] + '</b>'; // Bold the second part
        } else if (nameArr.length === 3) {
            blockText = nameArr[0] + '<b>' + nameArr[1] + '</b>' + nameArr[2]; // Bold the middle part
        } else {
            // Handle cases with more than 3 parts by bolding the middle parts
            blockText = nameArr.map((part, index) => (index % 2 === 1 ? `<b>${part}</b>` : part)).join('');
        }

        let a = document.createElement('a');
        a.innerHTML = blockText;
        a.href = game.link;
        a.className = 'game-link';
        if (game.link == '/404.html') {
            a.style.color = '#F00'
        }
        gameLinks.appendChild(a);

    });
}
function renderPremGames(games) {
    const gameLinks = document.getElementById('prem-game-links');
    gameLinks.innerHTML = ''; // Clear existing links

    games.forEach(game => {
        let nameArr = game.name.split('**');
        let blockText;

        // Improved bold formatting
        if (nameArr.length === 1) {
            blockText = nameArr[0]; // No bold part
        } else if (nameArr.length === 2) {
            blockText = nameArr[0] + '<b>' + nameArr[1] + '</b>'; // Bold the second part
        } else if (nameArr.length === 3) {
            blockText = nameArr[0] + '<b>' + nameArr[1] + '</b>' + nameArr[2]; // Bold the middle part
        } else {
            // Handle cases with more than 3 parts by bolding the middle parts
            blockText = nameArr.map((part, index) => (index % 2 === 1 ? `<b>${part}</b>` : part)).join('');
        }

        let a = document.createElement('a');
        a.innerHTML = blockText;
        a.href = game.link;
        a.className = 'game-link';
        if (game.link == '/404.html') {
            a.style.color = '#F00'
        }
        gameLinks.appendChild(a);

    });
}

function renderPremTools(games) {
    const gameLinks = document.getElementById('prem-tool-links');
    gameLinks.innerHTML = ''; // Clear existing links

    games.forEach(game => {
        let nameArr = game.name.split('**');
        let blockText;

        // Improved bold formatting
        if (nameArr.length === 1) {
            blockText = nameArr[0]; // No bold part
        } else if (nameArr.length === 2) {
            blockText = nameArr[0] + '<b>' + nameArr[1] + '</b>'; // Bold the second part
        } else if (nameArr.length === 3) {
            blockText = nameArr[0] + '<b>' + nameArr[1] + '</b>' + nameArr[2]; // Bold the middle part
        } else {
            // Handle cases with more than 3 parts by bolding the middle parts
            blockText = nameArr.map((part, index) => (index % 2 === 1 ? `<b>${part}</b>` : part)).join('');
        }

        let a = document.createElement('a');
        a.innerHTML = blockText;
        a.href = game.link;
        a.className = 'game-link';
        if (game.link == '/404.html') {
            a.style.color = '#F00'
        }
        gameLinks.appendChild(a);

    });
}
document.getElementById('searchG').addEventListener('input', filterGames);

// Run all the necessary functions after initialization
loadTools();
loadGames();
await checkUser();
if (prem) {
    loadPrem();
}
adminCheck();
jamesCheck();
