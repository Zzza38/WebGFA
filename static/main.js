const username = localStorage.getItem('user');

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

async function logout() {
    localStorage.removeItem('loggedIn');
    await fetch('/api/logout', {
        method: 'POST'
    });
    window.location.href = "/login";
}


// Game Link Loading Code
let allGames = [];
function localStorageLoad() {
    if (!localStorage.getItem('gameLinks-games')) return;
    const games = JSON.parse(localStorage.getItem('gameLinks-games'));
    const tools = JSON.parse(localStorage.getItem('gameLinks-tools'));
    renderGames(games);
    renderTools(tools);
}
async function loadGames() {
    try {
        const response = await fetch('/api/getGames', {
            method: 'POST'
        });

        if (!response.ok) {  // Check if the response status is OK (2xx)
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        // Assuming the server returns a JSON response
        const gamesDoc = await response.json();

        // Do something with the games data
        console.log(gamesDoc); // Or whatever processing you need

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
        const response = await fetch('/api/getTools', {
            method: 'POST'
        });

        if (!response.ok) {  // Check if the response status is OK (2xx)
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        // Assuming the server returns a JSON response
        const toolsDoc = await response.json();

        // Get names and links
        let names = Object.keys(toolsDoc);
        let links = Object.values(toolsDoc);

        // Combine names and links into a single array of objects
        let allTools = names.map((name, index) => ({
            name,
            link: links[index]
        }));

        // Sort the combined array alphabetically by name
        allTools.sort((a, b) => a.name.localeCompare(b.name));

        // Render the tools
        localStorage.setItem('gameLinks-tools', JSON.stringify(allTools));
        renderTools(allTools);
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

function reloadCustomization() {
    let defaultColors = {
        main: "#007bff",
        mainText: "#ffffff",
        buttonText: "#ffffff",
        bg: "#000000"
    }
    // glitch occured where all colors were set to 000, so to reset them we need to check if they are the same
    if (!localStorage.getItem('cus-mainColor') || localStorage.getItem('cus-mainColor') === localStorage.getItem('cus-bgColor')) {
        Object.values(defaultColors).forEach((color, i) => {
            const keyName = Object.keys(defaultColors)[i]
            localStorage.setItem(`cus-${keyName}Color`, color)
        })
    }
    Object.keys(defaultColors).forEach((key) => {
        const colorValue = localStorage.getItem(`cus-${key}Color`);
        switch (key) {
            case 'main':
                let buttons = document.getElementsByClassName('game-link');
                for (let i = 0; i < buttons.length; i++) {
                    buttons[i].style.backgroundColor = colorValue;
                }
                break;
            case 'mainText':
                document.body.style.color = colorValue;
                break;
            case 'buttonText':
                let buttons1 = document.getElementsByClassName('game-link');
                for (let i = 0; i < buttons1.length; i++) {
                    buttons1[i].style.color = colorValue;
                }
                break;
            case 'bg':
                document.body.style.backgroundColor = colorValue;
                break;
            default:
                break;
        }
    });
}

// Run all the necessary functions to initialize
setTimeout(() => { document.getElementById('searchG').addEventListener('input', filterGames); reloadCustomization(); }, 1);
localStorageLoad();
loadTools();
loadGames();