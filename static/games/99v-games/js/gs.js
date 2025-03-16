let allGames = []; // Global variable to hold all game data from both JSON files

// Function to fetch game data from a specified JSON file
function fetchGameData(jsonFile) {
    return fetch(jsonFile)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok: ' + response.statusText);
            }
            return response.json();
        });
}

// Fetch data from both JSON files
Promise.all([
    fetchGameData("json/gs.json").then(data => {
        allGames = allGames.concat(data); // Add gs.json data to allGames
    }),
    fetchGameData("json/dog.json").then(data => {
        allGames = allGames.concat(data); // Add dog.json data to allGames
    })
]).then(() => {
    displayAllGames(); // Display all games after both fetches are complete
}).catch(err => {
    console.error("Fetch error: ", err);
});

// Function to display all games
function displayAllGames() {
    const gamesData = {};

    allGames.forEach(game => {
        Object.assign(gamesData, appendGameToList(game));
    });

    console.log(gamesData); // Display the games data in the console
}

// Function to append a game to the list
function appendGameToList(game) {    
    const gameHref = `/games/99v-games/go.html?id=${game.id}`; // Redirect to go.html with game ID
    const gameName = game.name;

    return {
        [gameName]: gameHref
    };
}
