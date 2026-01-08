let username = localStorage.getItem("username");
let hasEmail = localStorage.getItem("hasEmail");
let premium = localStorage.getItem("isPremium");
let premCount = localStorage.getItem("premCount");
(async () => {
    username = await fetchUsername();
    hasEmail = await fetchHasEmail();
    premium = await fetchPremiumStatus();
    premCount = await fetchPremiumGameCount();

    // Keep the username in localStorage, to not wait until the request finishes
    localStorage.setItem("username", username);
    localStorage.setItem("hasEmail", hasEmail);
    localStorage.setItem("isPremium", premium);
    localStorage.setItem("premCount", premCount);
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
async function fetchPremiumGameCount() {
    try {
        const response = await fetch("/api/premium-game-count");
        if (response.status === 403) {
            return true;
        }
        const data = await response.json();
        return data.premiumGameCount;
    } catch (error) {
        console.error("Error fetching premiumGameCount:", error);
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
            premium: gamesJSON.prem.hasOwnProperty(name), // Check if the game exists in `prem`
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

        const a = document.createElement('a');
        const div = document.createElement('div');
        div.className = game.premium ? "rainbow-text" : "";
        div.setAttribute("data-text", blockText);
        div.innerHTML = blockText;
        div.style.animationDelay = Math.round(Math.random() * 10 * 1000) + "ms";
        a.appendChild(div);
        a.href = game.link;
        a.className = 'game-link';
        a.addEventListener("mouseenter", () => {
            gameStats.style.display = "block";
            gameStats.innerHTML = `
                ${game.premium ? '<div class="rainbow-text" data-text="PREMIUM!">PREMIUM!</div>' : ""}
                <div>Monthly Plays: ${game.monthly}</div>
                <div>Weekly Plays: ${game.weekly}</div>
                <div>All Time Plays: ${game.allTime}</div>
            `;
        });
        a.addEventListener("mouseleave", () => {
            gameStats.style.display = "none";
        });
        if (game.link != '/404.html') {
            gameLinks.appendChild(a);
        }
    });
    reloadCustomization();
    if (premium !== "true" && premCount > 0) document.getElementById("missing-prem-games").innerHTML = ` <br>
        You are missing out on ${premCount} games because you don't have premium. <br>
        Join today, just ask Zion!
    `
}
function renderTools(tools) {
    const toolLinks = document.getElementById('tool-links');
    toolLinks.innerHTML = ''; // Clear existing links

    tools.forEach(tool => {
        let nameArr = tool.name.split('**');
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

        const a = document.createElement('a');
        const div = document.createElement('div');
        div.className = tool.premium ? "rainbow-text" : "";
        div.innerHTML = blockText;
        div.style.animationDelay = Math.round(Math.random() * 10 * 1000) + "ms";
        a.appendChild(div);
        a.innerHTML = blockText;
        a.href = tool.link;
        a.className = 'game-link';
        if (tool.link === '/404.html') {
            a.style.display = 'none'
        }
        toolLinks.appendChild(a);

    });
    reloadCustomization();
}
function renderPopGames(games, sortBy = "monthly") {
    console.log(games)
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

        const a = document.createElement('a');
        const div = document.createElement('div');
        div.className = game.premium ? "rainbow-text" : "";
        div.innerHTML = blockText;
        div.style.animationDelay = Math.round(Math.random() * 10 * 1000) + "ms";
        a.appendChild(div);
        a.href = game.link;
        a.className = 'game-link';
        a.addEventListener("mouseenter", () => {
            gameStats.style.display = "block";
            gameStats.innerHTML = `
                ${game.premium ? '<div class="rainbow-text" data-text="PREMIUM!">PREMIUM!</div>' : ""}
                <div>Monthly Plays: ${game.monthly}</div>
                <div>Weekly Plays: ${game.weekly}</div>
                <div>All Time Plays: ${game.allTime}</div>
            `;
        });
        a.addEventListener("mouseleave", () => {
            gameStats.style.display = "none";
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

function encodeUV(url) {
    return encodeURIComponent(
        url.split("")
            .map((char, index) => index % 2 === 1 ? String.fromCharCode(2 ^ char.charCodeAt()) : char)
            .join("")
    );
}

function decodeUV(encodedUrl) {
    return decodeURIComponent(encodedUrl)
        .split("")
        .map((char, index) => index % 2 === 1 ? String.fromCharCode(2 ^ char.charCodeAt()) : char)
        .join("");
}

function proxyLink(link) {
    return `${config.interstellarURL}/a/${encodeUV(link)}`;
}
document.querySelectorAll('.proxyLink').forEach(a => {
    const url = a.href;
    a.href = proxyLink(url);
});
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

const gameStats = document.getElementById("gameStats");
document.addEventListener("mousemove", (event) => {
    if (gameStats.style.display === "block") {
        gameStats.style.left = `${event.pageX + 5}px`;
        gameStats.style.top = `${event.pageY}px`;
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