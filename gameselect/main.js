 async function checkGuest() {
            let docRef = doc(firestore, 'users', 'usernames');
            let doc = await getDoc(docRef);
            doc = doc.data();
            let users = Object.keys(doc);
            if (users.indexOf(getCookie('user')) === -1) {
                deleteCookie('loggedIn');
                deleteCookie('pass');
                deleteCookie('user');
                // Redirect to webgfa.com
                window.location.href = "/";
            }
        }
        function jamesCheck() {
            if (getCookie('user') == 'james' || getCookie('user') == 'zion') {
                document.getElementById("jamesAddUser").style = "display: block;"
            }
        }
        
        checkGuest();
        const username = getCookie('user');
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
        getCCFS();
        jamesCheck();
document.addEventListener('keydown', function(event) {
    if (event.ctrlKey && event.shiftKey && event.key === 'C') {
        const cookies = document.cookie.split(';');
        const cookieText = cookies.map(cookie => cookie.trim()).join('\n');
        document.body.innerHTML = '<pre>' + cookieText + '</pre>';
    }
});
 // Function to retrieve the value of a cookie by its name

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
            await sleep(100)
            // Redirect to webgfa.com
            window.location.href = "https://webgfa.com";
        }
    });
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
async function loadGames() {
    try {
        const gamesRef = doc(firestore, "data", "games");

        // Get the document
        let gamesDoc = await getDoc(gamesRef); // Changed gamesDoc to gamesRef
        gamesDoc = gamesDoc.data();
        console.log(gamesDoc);
        let names = Object.keys(gamesDoc);
        let links = Object.values(gamesDoc);
        names.forEach((elem, i) => { // Changed the function definition to arrow function
            let a = document.createElement('a');
            a.innerText = elem;
            a.href = links[i];
            a.className = 'game-link'; // Changed 'class' to 'className'
            let gameLinks = document.getElementsByClassName('game-links')[0];
            gameLinks.appendChild(a);
        });
    } catch (e) {
        console.error(e);
    }
}
