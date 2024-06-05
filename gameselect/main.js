const username = getCookie('user');

function jamesCheck() {
    if (username == 'james' || username == 'zion') {
        document.getElementById("jamesAddUser").style = "display: block;";
    }
}

async function getCCFS() {
    try {
        const ccfsRef = doc(firestore, "data", "ccfs");
        const dataRef = doc(firestore, "data", "cookieclicker");

        // Get the document
        let ccfs = await getDoc(ccfsRef);
        let data = await getDoc(dataRef);
        ccfs = ccfs.data();
        data = data.data();
        console.log(ccfs, ' ', data);
        if (ccfs[username]) {
            localStorage.setItem("CookieClickerGame", data[username]);
            console.log("Save is forced, loaded.");
            ccfs[username] = false;
            await setDoc(ccfsRef, ccfs);
        } else {
            console.log("Save is not forced.");
        }
    } catch (e) {
        console.error(e);
    }
}

async function checkGuest() {
    let docRef = doc(firestore, 'users', 'usernames');
    let doc = await getDoc(docRef);
    doc = doc.data();
    let users = Object.keys(doc);
    if (users.indexOf(username) === -1) {
        deleteCookie('loggedIn');
        deleteCookie('pass');
        deleteCookie('user');
        // Redirect to webgfa.com
        window.location.href = "/";
    }
}

document.addEventListener('keydown', function(event) {
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
document.addEventListener('keydown', async function(event) {
    // Check if Ctrl+Shift+L is pressed
    if (event.ctrlKey && event.shiftKey && event.key === 'L') {
        // Delete cookies
        deleteCookie('loggedIn');
        deleteCookie('pass');
        deleteCookie('user');
        await sleep(100);
        // Redirect to webgfa.com
        window.location.href = "https://webgfa.com";
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
        if (typeof games === 'undefined'){
            const gamesRef = doc(firestore, "data", "games");

            // Get the document
            gamesDoc = await getDoc(gamesRef);
            gamesDoc = gamesDoc.data();
            gameArray = gamesDoc;
            console.log(gamesDoc);
        } else {
            gamesDoc = gameArray;
        }

        // Get names and links
        let names = Object.keys(gamesDoc);
        let links = Object.values(gamesDoc);

        // Combine names and links into a single array of objects
        allGames = names.map((name, index) => ({ name, link: links[index] }));

        // Sort the combined array alphabetically by name
        allGames.sort((a, b) => a.name.localeCompare(b.name));

        // Render the games
        renderGames(allGames);
    } catch (e) {
        console.error(e);
    }
}

function renderGames(games) {
    const gameLinks = document.getElementsByClassName('game-links')[0];
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

        gameLinks.appendChild(a);
    });
}

function filterGames() {
    const searchInput = document.getElementById('searchG').value.toLowerCase();
    const filteredGames = allGames.filter(game => game.name.toLowerCase().includes(searchInput));
    renderGames(filteredGames);
}

document.getElementById('searchG').addEventListener('input', filterGames);
document.addEventListener('DOMContentLoaded', function() {
	checkGuest();
	getCCFS();
	jamesCheck();
	loadGames();
});