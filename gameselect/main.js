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
            sleep(100)
            // Redirect to webgfa.com
            window.location.href = "https://webgfa.com";
        }
    });
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
