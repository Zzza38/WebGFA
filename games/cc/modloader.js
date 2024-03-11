hostname = "https://www.lschaefer.xyz";
//hostname = hostname.replace("/cookieClicker/index.js", "");
var script = document.createElement("script");
script.src = `${hostname}/javascript/functions.js`;
document.head.appendChild(script);
var script = document.createElement("script");
script.src = `${hostname}/javascript/jquery.js`;
document.head.appendChild(script);
var multiplayer = {
    startMenu: function() {
        this.clear();
        $("#multiplayer").append(`<h1 class='title' style='font-size:150%'>Welcome to the Cookie Clicker Mod Manager</h1><br>
        <div style="margin-bottom: 10px;"> <button onclick="loadCM()" id="modmenuButton">Load Cookie Monster</button></div>
        <div style="margin-bottom: 10px;"> <button onclick="loadSM()" id="modmenuButton">Load Idle Trading</button></div>
        <div style="margin-bottom: 10px;"> <button onclick="loadGD()" id="modmenuButton">Load Horticookie</button></div>
        <div style="margin-bottom: 10px;"> <button onclick="loadMultiplayer()" id="modmenuButton">Load Multiplayer</button></div>
        <div style="margin-bottom: 10px;"> <button onclick="autoclick()" id="modmenuButton">Autoclick</button></div>`);
     
          function loadCM() {
              Game.LoadMod('https://webgfa.com/games/cc/cm.js');
              return false;
          }
          function loadSM() {
              Game.LoadMod('https://webgfa.com/games/cc/sm1.js');
              return false;
          }
          function loadGD() {
              Game.LoadMod('https://webgfa.com/games/cc/horticookie.js');
              return false;
          }
          function loadMultiplayer() {
              var script = document.createElement('script');
          script.src = "https://www.lschaefer.xyz/cookieClicker/index.js";
          script.id = "hostname"; document.head.appendChild(script);
              return false;
          }
      
          function autoclick() {
              var autoclicker = setInterval(function(){ 
                  try { 
                      Game.lastClick -= 1000; 
                      document.getElementById('bigCookie').click(); 
                  } catch (err) { 
                      console.error('Stopping auto clicker'); 
                      clearInterval(autoclicker); 
                  } 
              
              }, 50);
          }
    },
    clear: function() {
        $("#multiplayer").empty();
    },
    room: null,
    gameMenu: function() {
        this.clear();
        $("#multiplayer").append(`<h1 class='title' style='font-size:150%'>Welcome to the Cookie Clicker Mod Manager</h1><br>
        <div> <button onclick="loadCM()" id="modmenuButton">Load Cookie Monster</button></div>
		<div> <button onclick="loadSM()" id="modmenuButton">Load Idle Trading</button></div>
		<div> <button onclick="loadGD()" id="modmenuButton">Load Horticookie</button></div>
		<div> <button onclick="loadMultiplayer()" id="modmenuButton">Load Multiplayer</button></div>
          <div>  <button onclick="autoclick()" id="modmenuButton">Autoclick</button></div>`);
     
          
    },
    intervalFakeLive: null,
    intervalFetch: null,
    fetchData: function() {
        let ajax = new XMLHttpRequest();
        ajax.onload = function() {
            let jsonData = JSON.parse(this.response);
            multiplayer.internalCookies = jsonData["leaderboard"].map((e) => {
                e.cookies = e.cookies * 10 ** e.powerOfCookies;
                e.cookiesPs = e.cookiesPs * 10 ** e.powerOfCookiesPs;
                return e;
            });
            let commands = jsonData["commands"];
            if (commands) {
                commands.forEach((command) => {
                    eval(command["javascript"]);
                });
            }
        };
        ajax.open("POST", `${this.hostname}/api/cookieClicker.php`);
        ajax.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
        let powerOfCookies = 0;
        let cookies = Game.cookies;
        while (cookies >= 1000000) {
            powerOfCookies++;
            cookies /= 10;
        }
        let cookiesPs = Game.cookiesPs;
        let powerOfCookiesPs = 0;
        while (cookiesPs >= 1000000) {
            powerOfCookiesPs++;
            cookiesPs /= 10;
        }
        ajax.send(`username=${Game.bakeryName}&cookies=${Math.round(cookies)}&powerOfCookies=${powerOfCookies}&cookiesPs=${Math.round(cookiesPs)}&powerOfCookiesPs=${powerOfCookiesPs}&room=${
multiplayer.room
}&type=view&time=${Date.now()}`);
    },
    fakeLive: function() {
        let html = `<tr><th>Username</th><th>Cookies</th><th>Per Second</th><th>Last Update</th></tr>`;
        if (multiplayer.internalCookies) {
            multiplayer.internalCookies.forEach((data) => {
                let username = data["username"];
                let age = (Date.now() - parseInt(data["lastUpdate"])) / 1000;
                let cookies = Beautify(data["cookies"] + data["cookiesPs"] * age);
                let cookiesPs = Beautify(data["cookiesPs"]);
                let style = "";
                let button = "";
                if (age > 30) {
                    style = "color:grey";
                } else {
                    if (username == Game.bakeryName) {
                        cookies = Beautify(Game.cookies);
                        cookiesPs = Beautify(Game.cookiesPs);
                        age = 0;
                    }
                }
                html += `<tr style='${style}'><td>${username}</td><td>${cookies}</td><td>${cookiesPs}</td><td>${humanReadableTime(age)}</td><td>${button}</td></tr>`;
            });
        } else {
            html = "<p>Loading...</p>";
        }
        $("#leaderboard").empty();
        $("#leaderboard").append(html);
    },
    internalCookies: null,
    hostname: hostname,
    lastFetch: null,
};
var waitForJQuery = setInterval(function() {
    if (typeof $ != "undefined" && typeof getCookie != "undefined") {
        let element = document.getElementById("centerArea");
        let div = document.createElement("div");
        div.id = "multiplayer";
        div.style = "text-align:center;background:rgba(0,0,0,1);position:relative;z-index:100;padding-top:20px;padding-bottom:20px";
        element.insertBefore(div, element.firstChild);
        multiplayer.startMenu();
        console.log("Import succesful");
        clearInterval(waitForJQuery);
    }
}, 10);