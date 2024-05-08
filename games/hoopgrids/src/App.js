  import logo from './logo.svg';
  import './App.css';
  import React, { Component } from 'react';
  import axios from 'axios';

  // Define the getPlayerTeams function separately
  async function getPlayerTeams(playerId) {
    try {
      const currentYear = new Date().getFullYear();
      const startYear = 2000; // Adjust the start year as needed
      const seasons = Array.from({ length: currentYear - startYear + 1 }, (_, index) => startYear + index);
  
      const teamNames = [];
  
      for (const season of seasons) {
        const statsResponse = await fetch(`https://www.balldontlie.io/api/v1/stats?player_ids[]=${playerId}&seasons[]=${season}`);
  
        if (!statsResponse.ok) {
          console.error(`Stats request for season ${season} failed with status: ${statsResponse.status}`);
          continue;
        }
  
        const statsData = await statsResponse.json();
  
        for (const stat of statsData.data) {
          if (stat.team && !teamNames.includes(stat.team.full_name)) {
            teamNames.push(stat.team.full_name);
          }
        }
      }
      console.log(teamNames)
  
      return teamNames;
    } catch (error) {
      console.error('An error occurred:', error);
      return [];
    }
  }
  
  
  

  class App extends Component {
    constructor(props) {
      super(props);
      this.state = {
        playerName: '',
        playerInfo: null,
        seasonDataArray: [],
        teamsPlayedFor: [],
      };
    }

    handleSubmit = async (e) => {
      e.preventDefault();
      await this.getPlayerteams(); // Call getPlayerStats with the appropriate player ID
      console.log(this.state.playerName);
    }

    handleChange = (event) => {
      const replace = event.target.value.split(" ").join("_");
      if (replace.length > 0) {
        this.setState({ playerName: replace });
      } else {
        alert("Please Type Player Name");
      }
    }

    getPlayerStats = async (playerId) => {
      const seasons = Array.from({ length: 2024 - 2000 + 1 }, (_, index) => 2000 + index);
      const seasonDataArray = [];

      const promises = seasons.map(season => {
        return axios.get(`https://www.balldontlie.io/api/v1/season_averages?season=${season}&player_ids[]=${playerId}`);
      });

      try {
        const responses = await Promise.all(promises);

        responses.forEach(response => {
          const seasonData = response.data.data[0];
          if (seasonData) {
            seasonDataArray.push(seasonData);
          }
        });

        console.log("All Season Data:", seasonDataArray);

        this.setState({ seasonDataArray }); // Update the state with seasonDataArray

        // Check if the player ever averaged more than 25 points in any season
        const teams = await getPlayerTeams(playerId); // Get the player's teams
        const hasPlayedforOrlando = teams.includes("Orlando Magic");
        const hasPlayedforRockets = teams.includes("Houston Rockets"); // Check if the player has played for the Houston Rockets
        const myDiv = document.getElementById("HoustanOrlando");

        // Create a new paragraph element
        const paragraph = document.createElement("p");
      
        if (hasPlayedforOrlando && hasPlayedforRockets) {
          console.log("Rockets Orlando");
          const playerNameWithSpaces = this.state.playerName.replace(/_/g, ' ');
          const textNode = document.createTextNode(playerNameWithSpaces);
          paragraph.appendChild(textNode);
          myDiv.appendChild(paragraph);
          this.setState({playerName:""})
        } else {
          console.log("No.");
          this.setState({playerName:""})
        }

        const hasPlayedforWarriors = teams.includes("Golden State Warriors"); // Check if the player has played for the Houston Rockets
        const myDiv2 = document.getElementById("WarriorsOrlando");
        const paragraph2 = document.createElement("p");
        if (hasPlayedforOrlando && hasPlayedforWarriors) {
          console.log("Warriors & Orlando");
          const playerNameWithSpaces = this.state.playerName.replace(/_/g, ' ');
          const textNode = document.createTextNode(playerNameWithSpaces);
          paragraph2.appendChild(textNode);
          myDiv2.appendChild(paragraph2);
          this.setState({playerName:""})
        } else {
          console.log("No.");
          this.setState({playerName:""})
        }

        const overblocks = this.state.seasonDataArray.some(seasonData => seasonData.blk >= 2.5);
        const myDiv3 = document.getElementById("BlocksOrlando");
        const paragraph3 = document.createElement("p");
        if (hasPlayedforOrlando && overblocks) {
          console.log("Blocks & Orlando");
          const playerNameWithSpaces = this.state.playerName.replace(/_/g, ' ');
          const textNode = document.createTextNode(playerNameWithSpaces);
          paragraph3.appendChild(textNode);
          myDiv3.appendChild(paragraph3);
          this.setState({playerName:""})
        } else {
          console.log("No.");
          this.setState({playerName:""})
        }

        const hasplayedforJazz = teams.includes("Utah Jazz")
        const myDiv4 = document.getElementById("JazzHoustan");
        const paragraph4 = document.createElement("p");
        if (hasplayedforJazz && hasPlayedforRockets) {
          console.log("Jazz & Rockets");
          const playerNameWithSpaces = this.state.playerName.replace(/_/g, ' ');
          const textNode = document.createTextNode(playerNameWithSpaces);
          paragraph4.appendChild(textNode);
          myDiv4.appendChild(paragraph4);
          this.setState({playerName:""})
        } else {
          console.log("No.");
          this.setState({playerName:""})
        }

        const myDiv5 = document.getElementById("JazzWarriors");
        const paragraph5 = document.createElement("p");
        if (hasplayedforJazz && hasPlayedforWarriors) {
          console.log("Jazz & Warriors");
          const playerNameWithSpaces = this.state.playerName.replace(/_/g, ' ');
          const textNode = document.createTextNode(playerNameWithSpaces);
          paragraph5.appendChild(textNode);
          myDiv5.appendChild(paragraph5);
          this.setState({playerName:""})
        } else {
          console.log("No.");
          this.setState({playerName:""})
        }

        const myDiv6 = document.getElementById("JazzBlocks");
        const paragraph6 = document.createElement("p");
        if (hasplayedforJazz && overblocks) {
          console.log("Blocks & Jazz");
          const playerNameWithSpaces = this.state.playerName.replace(/_/g, ' ');
          const textNode = document.createTextNode(playerNameWithSpaces);
          paragraph6.appendChild(textNode);
          myDiv6.appendChild(paragraph6);
          this.setState({playerName:""})
        } else {
          console.log("No.");
          this.setState({playerName:""})
        }

        const hasplayedforMiami = teams.includes("Miami Heat")
        const myDiv7 = document.getElementById("HeatHoustan");
        const paragraph7 = document.createElement("p");
        if (hasplayedforMiami && hasPlayedforRockets) {
          console.log("Blocks & Jazz");
          const playerNameWithSpaces = this.state.playerName.replace(/_/g, ' ');
          const textNode = document.createTextNode(playerNameWithSpaces);
          paragraph7.appendChild(textNode);
          myDiv7.appendChild(paragraph7);
          this.setState({playerName:""})
        } else {
          console.log("No.");
          this.setState({playerName:""})
        }

        const myDiv8 = document.getElementById("HeatWarriors");
        const paragraph8 = document.createElement("p");
        if (hasplayedforMiami && hasPlayedforWarriors) {
          console.log("Heat & Warriors");
          const playerNameWithSpaces = this.state.playerName.replace(/_/g, ' ');
          const textNode = document.createTextNode(playerNameWithSpaces);
          paragraph8.appendChild(textNode);
          myDiv8.appendChild(paragraph8);
          this.setState({playerName:""})
        } else {
          console.log("No.");
          this.setState({playerName:""})
        }

        const myDiv9 = document.getElementById("HeatBlocks");
        const paragraph9 = document.createElement("p");
        if (hasplayedforMiami && overblocks) {
          console.log("Heat & Blocks");
          const playerNameWithSpaces = this.state.playerName.replace(/_/g, ' ');
          const textNode = document.createTextNode(playerNameWithSpaces);
          paragraph9.appendChild(textNode);
          myDiv9.appendChild(paragraph9);
          this.setState({playerName:""})
        } else {
          console.log("No.");
          this.setState({playerName:""})
        }
        
      } catch (error) {
        console.log(error);
      }
    }

    getPlayerteams = () => {
      axios.get(`https://www.balldontlie.io/api/v1/players`, {
        params: {
          search: this.state.playerName
        }
      })
        .then(async res => {
          const playerId = res.data.data[0].id;
          console.log("Player ID:", playerId);
          this.setState({ playerInfo: res.data });
          await this.getPlayerStats(playerId); // Call getPlayerStats with the obtained player ID
        })
        .catch(err => {
          console.log(err);
        });
    }

    render() {
      return (
        <div className="App">
          <form onSubmit={this.handleSubmit}>
            <label>
              Name
              <input
                type="text"
                value={this.state.playerName}
                onChange={this.handleChange}
                placeholder="please enter players name"
              />
            </label>
            <input type="submit" value="Submit" />
          </form>
            <div class="grid-container">
              <div id="HoustanOrlando">Played For Houston Rockets and Orlando Magic</div>
              <div id="WarriorsOrlando">Played for Golden State Warriors and Orland Magic</div>
              <div id="BlocksOrlando">Averaged more than 2.5 blocks and played for the Orlando Magic</div>
              <div id="JazzHoustan">Played for Houston Rockets and Utah Jazz</div>
              <div id="JazzWarriors">Played for Golden State Warriors and Utah Jazz</div>
              <div id="JazzBlocks">Averaged more than 2.5 blocks and played for the Utah Jazz</div>
              <div id="HeatHoustan">Played for Houstan Rockets and Miami Heat</div>
              <div id="HeatWarriors">Played for Golden State Warrior and Miami Heat</div>
              <div id="HeatBlocks">Averaged 2.5 blocks and played for the Miami Heat</div>
            </div>
        </div>
      );
    }
    }
    
    export default App;
    
