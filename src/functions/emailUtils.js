const puppeteer = require("puppeteer");
require("dotenv").config();

let browser;
let page;
(async () => {
    if (process.arch == 'x64' || process.platform == 'win32') browser = await puppeteer.launch();
    if (process.arch == 'arm64' && process.platform == 'linux') browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium-browser' });
    page = await browser.newPage();

    await startEmail();
})();


// using puppeteer, a non-2FA account is logged into and goes to mail.google.com

async function startEmail() {
    try {
        await page.goto("https://mail.google.com/", { waitUntil: "networkidle2" });

        // **Login**
        await page.type("input[type='email']", process.env.email, { delay: 10 });
        await page.click("#identifierNext");

        await page.waitForSelector("input[type='password']", { visible: true });
        await page.type("input[type='password']", process.env.emailPassword, { delay: 10 });
        await page.click("#passwordNext");
    } catch (error) {
        console.error("❌ Error setting up email:", error);

    }
}

// when needed, an email is sent by clicking compose
async function sendEmail(sendTo, subject, message) {
    try {
        await page.waitForSelector(".T-I.T-I-KE.L3", { visible: true });
        await new Promise(resolve => setTimeout(resolve, 500));
        await page.click(".T-I.T-I-KE.L3"); // Click "Compose" button

        await page.waitForSelector("input[aria-label='To recipients']", { visible: true });
        await page.type("input[aria-label='To recipients']", sendTo, { delay: 10 });
        await page.type("input[name='subjectbox']", subject, { delay: 10 });
        await page.type("div[aria-label='Message Body']", message, { delay: 10 });

        await page.click("div.T-I.J-J5-Ji.aoO.v7.T-I-atl.L3");
    } catch (error) {
        console.error("❌ Error sending email:", error);
    }
}

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

module.exports = {
    sendEmail,
    isValidEmail
}