let dependencyUrls = []
const maxLoadTimesTrys = 4;

//Main Libraries
dependencyUrls.push("https://www.googletagmanager.com/gtag/js?id=UA-118283036-6", "https://cdn.jsdelivr.net/npm/jquery@3.5.1/dist/jquery.min.js");
//Ads Libraries
dependencyUrls.push("https://cdn.jsdelivr.net/gh/mind4ur/debugactions@1cd04396b7754d3a4068c62afdac46104371e70c/package/adsController.js", "https://cdn.jsdelivr.net/gh/mind4ur/debugactions@1cd04396b7754d3a4068c62afdac46104371e70c/package/cpmstar.js", "https://cdn.jsdelivr.net/gh/mind4ur/debugactions@1cd04396b7754d3a4068c62afdac46104371e70c/package/moneyController.js");
//Firebase/Google Libraries
dependencyUrls.push("https://cdn.jsdelivr.net/gh/mind4ur/debugactions@1cd04396b7754d3a4068c62afdac46104371e70c/package/googleAnalytics.js", "https://cdn.jsdelivr.net/gh/mind4ur/debugactions@1cd04396b7754d3a4068c62afdac46104371e70c/package/firebase-init.js?v=2", "https://cdn.jsdelivr.net/gh/mind4ur/debugactions@1cd04396b7754d3a4068c62afdac46104371e70c/package/firebase-login.js?v=2", "https://cdn.jsdelivr.net/gh/mind4ur/debugactions@1cd04396b7754d3a4068c62afdac46104371e70c/package/firebase-config.js?v=2", "https://cdn.jsdelivr.net/gh/mind4ur/debugactions@1cd04396b7754d3a4068c62afdac46104371e70c/package/firebase-firestore.js?v=2")
//Game Libraries
dependencyUrls.push("https://cdn.jsdelivr.net/gh/mind4ur/debugactions@7e62dbe4056f7622634c6d9d84f646198ba7b977/package/unityUrls.js?v=2", "https://cdn.jsdelivr.net/gh/mind4ur/debugactions@1cd04396b7754d3a4068c62afdac46104371e70c/package/unityGame.js?v=2", "https://cdn.jsdelivr.net/gh/mind4ur/debugactions@1cd04396b7754d3a4068c62afdac46104371e70c/package/mobileRedirect.js", "https://cdn.jsdelivr.net/gh/mind4ur/debugactions@1cd04396b7754d3a4068c62afdac46104371e70c/package/fullscreen.js")
//etc. Libraries
dependencyUrls.push("https://cdn.jsdelivr.net/gh/mind4ur/debugactions@1cd04396b7754d3a4068c62afdac46104371e70c/package/windowResize.js", "https://cdn.jsdelivr.net/gh/mind4ur/debugactions@1cd04396b7754d3a4068c62afdac46104371e70c/package/blockManager.js", "https://cdn.jsdelivr.net/gh/mind4ur/debugactions@1cd04396b7754d3a4068c62afdac46104371e70c/package/macUserAgent.js", "https://cdn.jsdelivr.net/gh/mind4ur/debugactions@1cd04396b7754d3a4068c62afdac46104371e70c/package/visibilityChangeListener.js", "https://cdn.jsdelivr.net/gh/mind4ur/debugactions@1cd04396b7754d3a4068c62afdac46104371e70c/package/xsolla.js")

dynamicallyLoadScripts();

async function dynamicallyLoadScripts() {
    for (let i = 0; i < dependencyUrls.length; i++) {
        let url = dependencyUrls[i];
        let script = document.createElement("script");
        script.src = url;

        document.head.appendChild(script);
    }

    let trys = 0;
    while (window.loadedUrls === undefined || window.firebaseLoaded === undefined || window.adsLoaded === undefined
    || window.gameScriptLoaded === undefined || window.configInit === undefined || window.adsControllerLoaded === undefined) {
        await sleep(500)
        trys++;
        if(trys >= maxLoadTimesTrys) {
            break;
        }
    }

    isGameLoaded();
    initAds();
    loadGame();
    initFirebaseLibraries();
    fixMacUserAgent();
}

function loadGame() {
    let gameLoader = document.createElement("script")
    gameLoader.src = getGameLoaderUrl();
    gameLoader.id = "unity-loader"
    gameLoader.onload = function () {
        showGame();
    };

    let gameLoadDiv = document.getElementById("unity-loader-div");
    gameLoadDiv.innerHTML = "";
    gameLoadDiv.appendChild(gameLoader);
}

async function isGameLoaded() {
    await sleep(5000);
    if(window.gameStartLoading === undefined) {
        location.reload();
    }
}

function initFirebaseLibraries() {
    initializeFireBase();
    initRemoteConfig();
}

function onUnityReady() {
    checkAdBlock();
    sendConfig();
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
