const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const websiteUrl = 'https://www.mathplayground.com/dark-room/index.html';
(async () => {
    const browser = await puppeteer.launch({});
    const page = await browser.newPage();
    const client = await page.createCDPSession();
    await client.send('Network.enable');
    let resources = new Set();
    let activeRequests = 0; // Track number of ongoing requests
    let networkIdleTime = 2000; // Time to wait after last request (2 seconds)
    let requests = {};
    client.on('Network.requestWillBeSent', (event) => {
        activeRequests++;
        const url = event.request.url;
        requests[event.requestId] = url;
        console.log('❌request sent', url);
        if (url.startsWith(websiteUrl)) {
            resources.add(url);
        }
    });
    client.on('Network.loadingFinished', (event) => {
        activeRequests--;
        const id = event.requestId;
        const url = requests[id];
        delete requests[id];
        console.log('✅request finished', url);
    });
    client.on('Network.loadingFailed', (event) => {
        activeRequests--;
        const id = event.requestId;
        const url = requests[id];
        delete requests[id];
        console.log('❌❌❌❌request failed', url);
    });
    await page.goto(websiteUrl);
    // Wait until all network requests have completed
    //console.log("Waiting for network to be idle...");
    while (activeRequests > 0) {
        await new Promise(resolve => setTimeout(resolve, 500)); // Check every 500ms
    }
    // After all requests finish, wait an extra time for safety
    await new Promise(resolve => setTimeout(resolve, networkIdleTime));
    console.log("Resources to Download:", [...resources]);
    // Create a main download folder
    const downloadFolder = path.join(__dirname, 'sites');
    if (!fs.existsSync(downloadFolder)) {
        fs.mkdirSync(downloadFolder, { recursive: true });
    }
    // Download each file while keeping folder structure
    for (let url of resources) {
        try {
            const response = await axios.get(url, { responseType: 'arraybuffer' });
            // Preserve folder structure
            const relativePath = new URL(url).pathname;
            const savePath = path.join(downloadFolder, relativePath);
            // Ensure directories exist before saving
            const dir = path.dirname(savePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(savePath, response.data);
            console.log(`✅ Downloaded: ${savePath}`);
        }
        catch (error) {
            console.error(`❌ Failed to download ${url}:`, error.message);
        }
    }
    await browser.close();
})();
export {};
