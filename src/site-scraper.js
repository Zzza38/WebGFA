const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');

const websiteUrl = 'https://paperio.site';

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    let resources = new Set();

    // Capture dynamic resources (CSS, JS, images, fonts, etc.)
    page.on('request', (request) => {
        const url = request.url();
        if (url.startsWith(websiteUrl)) {
            resources.add(url);
        }
    });

    await page.goto(websiteUrl, { waitUntil: 'networkidle2' });

    // Scrape static resources (CSS, JS, images) using axios + cheerio
    try {
        const { data } = await axios.get(websiteUrl);
        const $ = cheerio.load(data);

        $('link[rel="stylesheet"], script[src], img[src]').each((_, element) => {
            const src = $(element).attr('href') || $(element).attr('src');
            if (src) {
                const absoluteUrl = new URL(src, websiteUrl).href;
                resources.add(absoluteUrl);
            }
        });
    } catch (error) {
        console.error("❌ Failed to fetch static resources:", error.message);
    }

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
        } catch (error) {
            console.error(`❌ Failed to download ${url}:`, error.message);
        }
    }

    await browser.close();
})();
