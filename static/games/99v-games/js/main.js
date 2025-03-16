// Fetch the data from the twothree.json file
fetch("json/twothree.json")
    .then(response => {
        // Parse the JSON response
        return response.json();
    })
    .then(hotGamesData => {
        // Call the displayHotGames function with the parsed data
        displayHotGames(hotGamesData);
    })
    .catch(err => {
        // Log any errors that occur during the fetch
        console.error("Error fetching data:", err);
    });

// Function to display the hottest games
function displayHotGames(hotGamesData) {
    
    
}