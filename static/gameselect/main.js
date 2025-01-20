

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

// Keydown Function
document.addEventListener('keydown', function (event) {
    if (event.ctrlKey && event.shiftKey && event.key === 'C') {
        const cookies = document.cookie.split(';');
        const cookieText = cookies.map(cookie => cookie.trim()).join('\n');
        document.body.innerHTML = '<pre>' + cookieText + '</pre>';
    }
    if (event.ctrlKey && event.shiftKey && event.key === 'L') {
        logout();
    }
});

function jamesCheck() {
    if (username == 'james' || username == 'zion') {
        const jamesAddUser = document.getElementById("jamesAddUser");
        if (jamesAddUser) {
            jamesAddUser.style.display = "block";
        }
    }
}

function adminCheck() {
    if (username == 'zion') {
        let admin = document.getElementsByClassName('admin');
        for (let i = 0; i < admin.length; i++) {
            const element = admin[i];
            element.style.display = ''

        }
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


// Game Link Loading Code
let allGames = [];
function localStorageLoadGames() {
    if (!localStorage.getItem('gameLinks-games')) return;
    const games = JSON.parse(localStorage.getItem('gameLinks-games'));
    const tools = JSON.parse(localStorage.getItem('gameLinks-tools'));
    const premGames = JSON.parse(localStorage.getItem('gameLinks-premGames'));
    const premTools = JSON.parse(localStorage.getItem('gameLinks-premTools'));
    renderGames(games);
    renderTools(tools);
    renderPremGames(premGames);
    renderPremTools(premTools);
}
async function loadGames() {
    try {
        let gamesDoc;
        const gamesRef = doc(firestore, "data", "games");

        // Get the document
        gamesDoc = await getDoc(gamesRef);
        gamesDoc = gamesDoc.data();
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
        localStorage.setItem('gameLinks-games', JSON.stringify(allGames));
        renderGames(allGames);
    } catch (e) {
        console.error(e);
    }
}
async function loadTools() {
    try {
        let gamesDoc;
        const gamesRef = doc(firestore, "data", "tools");

        // Get the document
        gamesDoc = await getDoc(gamesRef);
        gamesDoc = gamesDoc.data();
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
        localStorage.setItem('gameLinks-tools', JSON.stringify(allGames));
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
        localStorage.setItem('gameLinks-premGames', JSON.stringify(allGames));
        localStorage.setItem('gameLinks-premTools', JSON.stringify(allTools));
        renderPremGames(allGames);
        renderPremTools(allTools);
    } catch (e) {
        console.error(e);
    }
}
function filterGames() {
    const searchInput = document.getElementById('searchG').value.toLowerCase();
    const filteredGames = allGames.filter(game => game.name.toLowerCase().includes(searchInput));
    renderGames(filteredGames);
}
// Game Link Rendering Code
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
        if (game.link != '/404.html') {
            gameLinks.appendChild(a);
        }
    });
    reloadCustomization();
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
            a.style.display = 'none'
        }
        gameLinks.appendChild(a);

    });
    reloadCustomization();
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
            a.style.display = 'none'
        }
        gameLinks.appendChild(a);

    });
    reloadCustomization();
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
    reloadCustomization();
}

// Customization Tools Code
let isCusMenuOpen = false;
function handleCustomization() {
    isCusMenuOpen = !isCusMenuOpen; // Toggle the menu state
    let button = document.getElementById('cus-toggleMenu');
    let menu = document.getElementById('cus-menu');
    let colorPickers = {
        main: document.getElementById('cus-mainColor'),
        mainText: document.getElementById('cus-mainTextColor'),
        buttonText: document.getElementById('cus-buttonTextColor'),
        bg: document.getElementById('cus-bgColor')
    };
    let defaultColors = {
        main: "#007bff",
        mainText: "#ffffff",
        buttonText: "#ffffff",
        bg: "#000000"
    }
    if (!localStorage.getItem('cus-mainColor')) {
        Object.values(defaultColors).forEach((color, i) => {
            const keyName = Object.keys(defaultColors)[i]
            localStorage.setItem(`cus-${keyName}Color`, color)
        })
    }
    if (isCusMenuOpen) {
        menu.style.display = ''; // Show menu
        button.innerText = 'Close Customization Menu';
        Object.keys(colorPickers).forEach((key) => {
            let picker = colorPickers[key];
            picker.value = localStorage.getItem(`cus-${key}Color`);
            handleColorChange({ target: picker });
        });
        document.getElementById('cus-resetDefault').addEventListener('click', () => {
            Object.keys(colorPickers).forEach((key) => {
                let picker = colorPickers[key];
                picker.value = defaultColors[key];
                handleColorChange({ target: picker });
            });
        })
        // Set picker values and add event listeners
        Object.keys(colorPickers).forEach((key) => {
            let picker = colorPickers[key];
            console.log(`cus-${key}Color`)
            picker.value = localStorage.getItem(`cus-${key}Color`);
            picker.addEventListener('input', handleColorChange);
        });
    } else {
        menu.style.display = 'none'; // Hide menu
        button.innerText = 'Open Customization Menu';

        // Remove event listeners
        Object.keys(colorPickers).forEach((key) => {
            let picker = colorPickers[key];
            picker.removeEventListener('input', handleColorChange);
        });
    }
}
function handleColorChange(event) {
    let picker = event.target; // Get the triggering input element
    let color = picker.value;

    // Save color to localStorage
    localStorage.setItem(`cus-${picker.id.split('-')[1]}`, color);

    // Apply changes based on picker ID
    switch (picker.id) {
        case 'cus-mainColor':
            let buttons = document.getElementsByClassName('game-link');
            for (let i = 0; i < buttons.length; i++) {
                buttons[i].style.backgroundColor = color;
            }
            break;
        case 'cus-mainTextColor':
            document.body.style.color = color;
            break;
        case 'cus-buttonTextColor':
            let buttons1 = document.getElementsByClassName('game-link');
            for (let i = 0; i < buttons1.length; i++) {
                buttons1[i].style.color = color;
            }
            break;
        case 'cus-bgColor':
            document.body.style.backgroundColor = color;
            break;
        default:
            break;
    }
}
function reloadCustomization(){
    let colorPickers = {
        main: document.getElementById('cus-mainColor'),
        mainText: document.getElementById('cus-mainTextColor'),
        buttonText: document.getElementById('cus-buttonTextColor'),
        bg: document.getElementById('cus-bgColor')
    };
    Object.keys(colorPickers).forEach((key) => {
        let picker = colorPickers[key];
        picker.value = localStorage.getItem(`cus-${key}Color`);
        handleColorChange({ target: picker });
    });
}
document.getElementById('cus-toggleMenu').addEventListener('click', handleCustomization);
document.getElementById('searchG').addEventListener('input', filterGames);
reloadCustomization();

// Run all the necessary functions to initialize
localStorageLoadGames();
loadTools();
loadGames();
await checkUser();
if (prem) {
    loadPrem();
} else {
    const element = document.getElementById('prem')
    element.style.display = 'none'
}
adminCheck();
jamesCheck();
