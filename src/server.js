/////////////////////////////////////////////////////////////
//                   IMPORT STATEMENTS                     //
/////////////////////////////////////////////////////////////
const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const https = require('https');
const http = require('http');
const { createProxyMiddleware } = require('http-proxy-middleware');
const admin = require("firebase-admin");
const { exec } = require('child_process');
const firestoreUtils = require("./functions/firestoreUtils.js");
const urlUtils = require("./functions/urlUtils.js");

/////////////////////////////////////////////////////////////
//                 CONSTANTS & CONFIGURATION               //
/////////////////////////////////////////////////////////////
const app = express();
const HTTPS_PORT = process.env.PORT || 8080;
const HTTP_PORT = 8000;
const DEBUG = true;
const logFilePath = path.resolve(__dirname, '../server.log');
const USERNAME = 'zion';
let PASSWORD;

const extraTags = [
    "<script src='/code/universalCode/aboutblankcloak.js'></script>",
    "<script src='/code/universalCode/maincheck.js'></script>",
    "<script src='/code/universalCode/firestore.js' type='module'></script>",
    "<script src='/code/universalCode/autoSave.js' type='module'></script>",
    "<script src='/code/universalCode/dataSender.js'></script>", // Fixed extra quote
];

const excludedTags = {
    "/": "<script src='/code/universalCode/maincheck.js'></script>" // Changed to root path
};

const sshProxy = createProxyMiddleware({ target: 'http://127.0.0.1:2222/ssh' });

/////////////////////////////////////////////////////////////
//                  EXPRESS SERVER SETUP                   //
/////////////////////////////////////////////////////////////
// Configure static middleware to NOT serve HTML files
app.use(express.static(path.join(__dirname, '../static'), {
    index: false,
    extensions: ['html']
}));

app.use(express.json({ type: 'application/json' }));

// Routes
app.get('/ssh/', basicAuth);
app.use('/ssh/', sshProxy);
app.post('/webhook/github', handleGitHubWebhook);
app.post('/webhook/webgfa', handleWebGFAWebhook);
app.use('/webgfa.csv', handleCSV)
app.use(handleMainRequest);  // This will now handle all HTML requests

/////////////////////////////////////////////////////////////
//                   SERVER INITIALIZATION                 //
/////////////////////////////////////////////////////////////
(async () => {
    try {
        clearLogFile(logFilePath);

        // Initialize Firebase
        await initializeFirebase();
        console.log('Firebase initialized successfully');

        // Set up Firestore
        firestoreUtils.setDB(admin.firestore());

        // Load credentials
        const passwordDoc = await firestoreUtils.getDocument('users', 'usernames');
        PASSWORD = passwordDoc[USERNAME];
        console.log('Credentials loaded successfully');

        // Start servers
        startServer();
    } catch (error) {
        console.error('Initialization failed:', error);
        process.exit(1);
    }
})();

/////////////////////////////////////////////////////////////
//                     CORE FUNCTIONS                      //
/////////////////////////////////////////////////////////////
async function initializeFirebase() {
    try {
        if (process.env.FIREBASE_PRIVATE_KEY_1 && process.env.FIREBASE_PRIVATE_KEY_2) {
            const serviceAccount = JSON.parse(
                process.env.FIREBASE_PRIVATE_KEY_1 + process.env.FIREBASE_PRIVATE_KEY_2
            );
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                databaseURL: "https://webgfa-games-default-rtdb.firebaseio.com"
            });
            console.log("Firebase initialized with environment variables");
            return true;
        }

        if (process.env.FIREBASE_PRIVATE_KEY) {
            const serviceAccount = JSON.parse(process.env.FIREBASE_PRIVATE_KEY);
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                databaseURL: "https://webgfa-games-default-rtdb.firebaseio.com"
            });
            console.log("Firebase initialized with single environment variable");
            return true;
        }

        const filePath = path.resolve(__dirname, '../data/firebasePrivateKey.json');
        try {
            await fs.access(filePath, fs.constants.F_OK);
            const data = await fs.readFile(filePath, 'utf8');
            const serviceAccount = JSON.parse(data);
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                databaseURL: "https://webgfa-games-default-rtdb.firebaseio.com"
            });
            console.log("Firebase initialized with local file");
            return true;
        } catch (fileError) {
            console.error("Firebase initialization failed - no valid credentials found");
            return false;
        }
    } catch (error) {
        console.error("Firebase initialization error:", error);
        return false;
    }
}

function clearLogFile(filePath) {
    fs.writeFile(filePath, '').then(() => console.log('Cleared log file')).catch(err => console.error('Log clear error:', err));
}

function basicAuth(req, res, next) {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Basic ')) return sendAuthChallenge(res);
    
    const encoded = authHeader.split(' ')[1];
    if (!encoded) return sendAuthChallenge(res);

    const decoded = Buffer.from(encoded, 'base64').toString();
    const [username, password] = decoded.split(':');
    (username === USERNAME && password === PASSWORD) ? next() : sendAuthChallenge(res);
}

async function handleMainRequest(req, res, next) {
    const reqPath = urlUtils.normalizePath(req.path);

    if (reqPath.includes('/api')) {
        await handleApiRequest(req, res);
    } else if (isHtmlRequest(reqPath)) {
        await serveHtmlFile(reqPath, res);
    } else {
        next();
    }
}

async function handleGitHubWebhook(req, res) {
    res.status(202).send('Accepted');
    if (req.headers['x-github-event'] === 'push') {
        exec('su - zion -c "cd /home/zion/WebGFA && git pull" && sudo systemctl restart webgfa.service',
            (error, stdout, stderr) => console.log(error ? `Exec error: ${error}` : `Output: ${stdout}${stderr}`));
    }
}

let oldTable = null;
async function handleWebGFAWebhook(req, res) {
    res.status(202).send('Accepted');
    try {
        let body = req.body; // Fixed req.body usage
        if (typeof body === 'string') body = JSON.parse(body);
        const humanReadableDate = new Date().toLocaleString();
        body['Date'] = humanReadableDate;
        oldTable = await updateTable(body, '/home/zion/WebGFA/webgfa.csv', oldTable); // Added await
    } catch (error) {
        console.error('Webhook processing error:', error);
    }
}
async function sendCSV(req, res) {
    await fs.access(fullPath, fs.constants.F_OK);
    let csv = await fs.readFile(fullPath, 'utf8');
    res.set('Content-Type', 'text/text').send(csv)
}

async function startServer() {
    try {
        http.createServer(app).listen(HTTP_PORT, () => console.log(`HTTP on ${HTTP_PORT}`));
        const sslOptions = {
            key: await fs.readFile('/etc/letsencrypt/live/learnis.site/privkey.pem'),
            cert: await fs.readFile('/etc/letsencrypt/live/learnis.site/fullchain.pem')
        };
        https.createServer(sslOptions, app).listen(HTTPS_PORT, () => console.log(`HTTPS on ${HTTPS_PORT}${DEBUG ? ' (DEBUG)' : ''}`));
    } catch (err) {
        console.error('HTTPS startup failed:', err);
    }
}

/////////////////////////////////////////////////////////////
//                  HELPER FUNCTIONS                       //
/////////////////////////////////////////////////////////////
function sendAuthChallenge(res) {
    res.set('WWW-Authenticate', 'Basic realm="Secure Area"').status(401).send('Authentication required');
}

function isHtmlRequest(path) {
    return path === '/' || Boolean(path.match(/^\/(.*\.html$|.*\/$|[^\/\.]+\/?$)/));
}

async function handleApiRequest(req, res) {
    try {
        const { service, col, doc, data } = req.query;
        const handler = {
            'firestoreGetDoc': () => firestoreUtils.getDocument(col, doc),
            'firestoreSetDoc': () => firestoreUtils.setDocument(col, doc, data),
            'firestoreUpdateDoc': () => firestoreUtils.updateDocument(col, doc, data),
            'firestoreDeleteDoc': () => firestoreUtils.deleteDocument(col, doc)
        }[service];

        handler ? res.send(await handler()) : res.status(400).send('Invalid service');
    } catch (error) {
        console.error('API error:', error);
        res.status(500).send('Server error');
    }
}

async function serveHtmlFile(reqPath, res) {
    try {
        // 1. Handle path normalization consistently
        const normalizedPath = reqPath.endsWith('/') ? reqPath : `${reqPath}/`;
        const fullPath = path.join(
            __dirname, 
            '../static', 
            reqPath.endsWith('.html') ? reqPath : `${normalizedPath}index.html`
        );

        // 2. Verify file existence first
        await fs.access(fullPath, fs.constants.F_OK);
        let html = await fs.readFile(fullPath, 'utf8');
        
        // 4. Improved exclusion logic
        const filteredTags = extraTags.filter(tag => {
            const shouldExclude = Object.entries(excludedTags).some(([pathKey, excludedTag]) => {
                const isMatchingPath = reqPath === pathKey || normalizedPath === pathKey;
                return isMatchingPath && tag === excludedTag;
            });
            return !shouldExclude;
        });

        // 5. Handle cases where </body> tag might be missing
        if (!html.includes('</body>')) {
            html += filteredTags.join('');
        } else {
            html = html.replace('</body>', filteredTags.join('') + '</body>');
        }

        res.set('Content-Type', 'text/html').send(html);
    } catch (error) {
        console.error('File serve error:', error);
        res.status(404).sendFile(path.join(__dirname, '../static/404.html'));
    }
}

async function updateTable(jsonObject, filePath, oldTable = null) {
    let table = oldTable || [];
    let headers = table.length > 0 ? table[0] : [];

    // Check for new keys
    const newKeys = Object.keys(jsonObject).filter(key => !headers.includes(key));
    if (newKeys.length > 0) {
        headers.push(...newKeys);
        if (table.length > 0) {
            table.slice(1).forEach(row => {
                newKeys.forEach(() => row.push(''));
            });
        }
        table[0] = headers;
    }

    // Create new row
    const newRow = headers.map(header => jsonObject[header] || '');
    table.push(newRow);

    // Write file asynchronously
    const csvContent = table.map(row => row.join(',')).join('\n');
    await fs.writeFile(filePath, csvContent, 'utf8'); // Changed to async write
    return table;
}
