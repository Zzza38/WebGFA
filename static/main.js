let username = localStorage.getItem("username");
let hasEmail = localStorage.getItem("hasEmail");
let premium = localStorage.getItem("isPremium");
(async () => {
    username = await fetchUsername();
    hasEmail = await fetchHasEmail();
    premium = await fetchPremiumStatus();

    // Keep the username in localStorage, to not wait until the request finishes
    localStorage.setItem("username", username);
    localStorage.setItem("hasEmail", hasEmail);
})();

// Keydown Function (Put any events that happen on a key press here)
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


// Fetch stuff from the server
async function logout() {
    localStorage.removeItem('loggedIn');
    await fetch('/api/logout', {
        method: 'POST'
    });
    window.location.href = "/login";
}

async function fetchUsername() {
    try {
        const response = await fetch("/api/get-user", {
            method: "POST",
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

async function fetchHasEmail() {
    try {
        const response = await fetch("/api/has-email");
        if (response.status === 403) {
            return true;
        }
        const data = await response.text();
        return data === "true" ? true : false;
    } catch (error) {
        console.error("Error fetching hasEmail:", error);
    }
}
async function fetchPremiumStatus() {
    try {
        const response = await fetch("/api/is-premium");
        if (response.status === 403) {
            return true;
        }
        const data = await response.json();
        return data.premium;
    } catch (error) {
        console.error("Error fetching isPremium:", error);
    }
}
// Game Link Loading Code
let allGames = [];
function localStorageLoad() {
    if (!localStorage.getItem('gameLinks-games')) return;
    if (!localStorage.getItem('gameLinks-tools')) return;
    if (!localStorage.getItem('gameLinks-popGames')) return;
    const games = JSON.parse(localStorage.getItem('gameLinks-games'));
    const tools = JSON.parse(localStorage.getItem('gameLinks-tools'));
    const popularGames = JSON.parse(localStorage.getItem('gameLinks-popGames'));

    renderGames(games);
    renderTools(tools);
    renderPopGames(popularGames);
}
async function loadGames() {
    try {
        const gamesJSON = await fetch('/api/getGames').then(res => res.json());
        const gamePopularity = await fetch('/api/getPopGames').then(res => res.json());
        const games = { ...gamesJSON.base, ...gamesJSON.prem }
        let names = Object.keys(games);
        allGames = names.map(name => ({
            name,
            link: games[name],
            allTime: gamePopularity[name] ? gamePopularity[name].allTime : 0,
            monthly: gamePopularity[name] ? gamePopularity[name].monthly : 0,
            weekly: gamePopularity[name] ? gamePopularity[name].weekly : 0,
            premium: gamesJSON.prem.hasOwnProperty(name) // Check if the game exists in `prem`
        }));
        allGames.sort((a, b) => a.name.localeCompare(b.name));
        localStorage.setItem('gameLinks-games', JSON.stringify(allGames));
        renderGames(allGames);
    } catch (e) {
        console.error(e);
    }
}
async function loadTools() {
    try {
        const response = await fetch('/api/getTools');
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        const toolsJSON = await response.json();
        const tools = { ...toolsJSON.base, ...toolsJSON.prem }
        let names = Object.keys(tools);
        let links = Object.values(tools);
        let allTools = names.map((name, index) => ({
            name,
            link: links[index],
            premium: toolsJSON.prem.hasOwnProperty(name) // Check if the tool exists in `prem`
        }));
        allTools.sort((a, b) => a.name.localeCompare(b.name));
        localStorage.setItem('gameLinks-tools', JSON.stringify(allTools));
        renderTools(allTools);
    } catch (e) {
        console.error(e);
    }
}
async function loadPopGames() {
    try {
        const response = await fetch('/api/getPopGames');
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        const games = await response.json();

        let names = Object.keys(games);
        let links = names.map(name => games[name].url);
        let allTime = names.map(name => games[name].allTime);
        let monthly = names.map(name => games[name].monthly);
        let weekly = names.map(name => games[name].weekly);
        let premium = names.map(name => games[name].premium);

        let allPopGames = names.map((name, index) => ({
            name,
            link: links[index],
            allTime: allTime[index],
            monthly: monthly[index],
            weekly: weekly[index],
            premium: premium[index] 
        }));
        localStorage.setItem('gameLinks-popGames', JSON.stringify(allPopGames));
        renderPopGames(allPopGames);
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
function renderGames(games, sortBy = "alphabetical") {
    const gameLinks = document.getElementById('game-links');
    gameLinks.innerHTML = ''; // Clear existing links

    if (sortBy == "alphabetical") games.sort((a, b) => a.name.localeCompare(b.name));
    else games.sort((a, b) => b[sortBy] - a[sortBy]);

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
        a.addEventListener("mouseenter", () => {
            popGameStats.style.display = "block";
            popGameStats.innerHTML = `
                ${game.premium ? '<div class="rainbow-text" data-text="PREMIUM!">PREMIUM!</div>' : ""}
                <div>Monthly Plays: ${game.monthly}</div>
                <div>Weekly Plays: ${game.weekly}</div>
                <div>All Time Plays: ${game.allTime}</div>
            `;
        });
        a.addEventListener("mouseleave", () => {
            popGameStats.style.display = "none";
        });
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
        if (game.link === '/404.html') {
            a.style.display = 'none'
        }
        gameLinks.appendChild(a);

    });
    reloadCustomization();
}
function renderPopGames(games, sortBy = "monthly") {
    const gameLinks = document.getElementById('pop-game-links');
    gameLinks.innerHTML = ''; // Clear existing links

    if (sortBy == "alphabetical") games.sort((a, b) => a.name.localeCompare(b.name));
    else games.sort((a, b) => b[sortBy] - a[sortBy]);

    if (games.length === 0) document.getElementById('popGames').style.display = 'none';
    else document.getElementById('popGames').style.display = 'block';

    games.forEach((game, i) => {
        if (i >= 10) return; // Only show the top 10 games
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
        a.addEventListener("mouseenter", () => {
            popGameStats.style.display = "block";
            popGameStats.innerHTML = `
                <div>Monthly Plays: ${game.monthly}</div>
                <div>Weekly Plays: ${game.weekly}</div>
                <div>All Time Plays: ${game.allTime}</div>
            `;
        });
        a.addEventListener("mouseleave", () => {
            popGameStats.style.display = "none";
        });
        if (game.link != '/404.html') {
            gameLinks.appendChild(a);
        }
    });
}

function reloadCustomization() {
    let defaultColors = config.defaultColors;
    // glitch occurred where all colors were set to 000, so to reset them we need to check if they are the same
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
let rainbowInterval;

function rainbowText() {
    let hue = 0;
    function updateColors() {
        const elements = document.querySelectorAll('.rainbow-text');
        elements.forEach(element => {
            element.style.color = `hsl(${hue}, 100%, 50%)`;
        });
        hue = (hue + 1) % 360;
    }
    if (rainbowInterval) clearInterval(rainbowInterval);
    rainbowInterval = setInterval(updateColors, 1);
}
//rainbowText();

document.querySelectorAll('.popup').forEach(popup => {
    popup.addEventListener('click', () => {
        popup.style.display = 'none';
    });
});
document.getElementById('sortMonth').addEventListener('click', () => {
    renderGames(JSON.parse(localStorage.getItem('gameLinks-games')), "monthly");
    renderPopGames(JSON.parse(localStorage.getItem('gameLinks-popGames')), "monthly");
});
document.getElementById('sortWeek').addEventListener('click', () => {
    renderGames(JSON.parse(localStorage.getItem('gameLinks-games')), "weekly");
    renderPopGames(JSON.parse(localStorage.getItem('gameLinks-popGames')), "weekly");
});
document.getElementById('sortAllTime').addEventListener('click', () => {
    renderGames(JSON.parse(localStorage.getItem('gameLinks-games')), "allTime");
    renderPopGames(JSON.parse(localStorage.getItem('gameLinks-popGames')), "allTime");
});
document.getElementById('sortAlpha').addEventListener('click', () => {
    renderGames(JSON.parse(localStorage.getItem('gameLinks-games')), "alphabetical");
    renderPopGames(JSON.parse(localStorage.getItem('gameLinks-popGames')), "alphabetical");
});

const popGameStats = document.getElementById("popGameStats");
document.addEventListener("mousemove", (event) => {
    if (popGameStats.style.display === "block") {
        popGameStats.style.left = `${event.pageX + 5}px`;
        popGameStats.style.top = `${event.pageY}px`;
    }
});

// Run all the necessary functions to initialize
if (username === "guest") document.getElementById('guestPopup').style.display = "";
if (!hasEmail) document.getElementById('emailPopup').style.display = "";
document.getElementById('searchG').addEventListener('input', filterGames);
reloadCustomization();
localStorageLoad();
loadTools();
loadGames();
loadPopGames();