/////////////////////////////////////////////////////////////
//                   IMPORT STATEMENTS                     //
/////////////////////////////////////////////////////////////
const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const https = require('https');
const http = require('http');
const { exec } = require('child_process');
let db = require("../data/database.json");
const urlUtils = require("./functions/urlUtils.js");
const cookieParser = require('cookie-parser');
const crypto = require("crypto");
const logUtils = require('./functions/logFileUtils.js');

/////////////////////////////////////////////////////////////
//                 CONSTANTS & CONFIGURATION               //
/////////////////////////////////////////////////////////////

// Log file handling
try {
logUtils.copyLogFile('../server.log', '../log/' + logUtils.getLogFileName('../server.log'));
} catch (error) {
    console.error('The copy log code is fucked:', error);
}
console.log("--NAME-START--");
console.log(logUtils.generateLogFileName());
console.log("--NAME-END--");

const app = express();
const HTTPS_PORT = process.env.PORT || 8080;
const HTTP_PORT = 8000;
const DEBUG = true;
const logFilePath = path.resolve(__dirname, '../server.log');

const extraTags = [
    // non module tags
    "<script src='/code/universalCode/aboutblankcloak.js'></script>",
    "<script src='/code/universalCode/dataSender.js'></script>",
    // module tags
    "<script src='/code/universalCode/firestore.js' type='module'></script>",
];

const excludedTags = {};

/////////////////////////////////////////////////////////////
//                  EXPRESS SERVER SETUP                   //
/////////////////////////////////////////////////////////////
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '../static'), {
    index: false,
    extensions: ['html']
}));

app.use(express.json({ type: 'application/json' }));
app.use(express.urlencoded({ extended: true }));

// Authentication middleware
app.use((req, res, next) => {
    let reqPath = urlUtils.normalizePath(req.path);
    const allowedPaths = ['/index.html', '/login', '/register/index.html', '/webhook/github'];
    if (allowedPaths.includes(reqPath)) return next();

    const loggedIn = req.cookies.loggedIn === 'true';
    const username = req.cookies.user;
    const password = req.cookies.pass;

    if (!loggedIn || !username || !password) return res.redirect('/');

    const validPassword = db.users.usernames[username];
    if (validPassword !== password) {
        res.clearCookie('loggedIn');
        res.clearCookie('user');
        res.clearCookie('pass');
        return res.redirect('/');
    }

    next();
});

app.post('/webhook/github', handleGitHubWebhook);
app.post('/webhook/webgfa', handleWebGFAWebhook);
app.post('/login', handleLogin);
app.use(handleMainRequest);

/////////////////////////////////////////////////////////////
//                   SERVER INITIALIZATION                 //
/////////////////////////////////////////////////////////////
(async () => {
    try {
        await clearLogFile(logFilePath);
        console.log('Credentials loaded successfully');
        startServer();
    } catch (error) {
        console.error('Initialization failed:', error);
        process.exit(1);
    }
})();

/////////////////////////////////////////////////////////////
//                     CORE FUNCTIONS                      //
/////////////////////////////////////////////////////////////
async function clearLogFile(filePath) {
    try {
        await fs.writeFile(filePath, '');
        console.log('Cleared log file');
    } catch (err) {
        console.error('Log clear error:', err);
    }
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

async function handleLogin(req, res) {
    const { username, password } = req.body;

    if (db.users.usernames[username] === password) {
        // Set login cookies
        const uid = generateUID()
        res.cookie('loggedIn', 'true', { httpOnly: true, secure: true });
        res.cookie('user', username, { secure: true });
        res.cookie('pass', password, { secure: true });
        res.cookie('uid', uid, { secure: true});
        db.users.sessionID[username] = uid;
        writeDatabaseChanges();
        return res.redirect('/gameselect/');
    }
    
    res.status(401).send('Invalid credentials');
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
        let body = req.body;
        if (typeof body === 'string') body = JSON.parse(body);
        const humanReadableDate = new Date().toLocaleString();
        body['Date'] = humanReadableDate;
        oldTable = await updateTable(body, '/home/zion/WebGFA/webgfa.csv', oldTable);
    } catch (error) {
        console.error('Webhook processing error:', error);
    }
}

function startServer() {
    // HTTP traffic to be same as HTTPS
    http.createServer(app).listen(HTTP_PORT, () => 
        console.log(`HTTP server running on port ${HTTP_PORT}`)
    );

    // HTTPS server
    (async () => {
        try {
            const sslOptions = {
                key: await fs.readFile('/etc/letsencrypt/live/learnis.site/privkey.pem'),
                cert: await fs.readFile('/etc/letsencrypt/live/learnis.site/fullchain.pem')
            };
            https.createServer(sslOptions, app).listen(HTTPS_PORT, () => 
                console.log(`HTTPS on ${HTTPS_PORT}${DEBUG ? ' (DEBUG)' : ''}`));
        } catch (err) {
            console.error('HTTPS startup failed:', err);
        }
    })();
}

/////////////////////////////////////////////////////////////
//                  HELPER FUNCTIONS                       //
/////////////////////////////////////////////////////////////
function generateUID() {
    const hex1 = crypto.randomBytes(2).toString("hex"); // 4 chars
    const hex2 = crypto.randomBytes(2).toString("hex"); // 4 chars
    const hex3 = crypto.randomBytes(1).toString("hex"); // 2 chars
    const hex4 = crypto.randomBytes(2).toString("hex"); // 4 chars
    const hex5 = crypto.randomBytes(3).toString("hex"); // 6 chars
    
    return `${hex1}-${hex2}-${hex3}-${hex4}-${hex5}`.toUpperCase();
}
async function writeDatabaseChanges() {
    try {
        await fs.writeFile(path.resolve(__dirname, '../data/database.json'), JSON.stringify(db, null, 2));
    } catch (error) {
        console.error('Error writing database changes:', error);
    }
}
function isHtmlRequest(path) {
    return path === '/' || Boolean(path.match(/^\/(.*\.html$|.*\/$|[^\/\.]+\/?$)/));
}

async function handleApiRequest(req, res) {
    try {
        const service = req.query.service; 
        const handler = {
            'getCSV': async () => {
                await fs.access('/home/zion/WebGFA/webgfa.csv', fs.constants.F_OK);
                let csv = await fs.readFile('/home/zion/WebGFA/webgfa.csv', 'utf8');
                res.set('Content-Type', 'text/csv').send(csv);
            },
            'checkLogin': async () => {
                const { username, password } = req.query;
                if (db['users']['usernames'][username] === password) {
                    res.send('success');
                } else {
                    res.status(401).send('failure');
                }
            }
        }[service];

        handler ? res.send(await handler()) : res.status(400).send('Invalid service');
    } catch (error) {
        console.error('API error:', error);
        res.status(500).send('Server error');
    }
}

async function serveHtmlFile(reqPath, res) {
    const staticDir = path.resolve(__dirname, '../static');
    try {
        // Remove leading slash and handle root path
        const safePath = reqPath === '/' ? '' : reqPath.replace(/^\//, '');
        const normalizedPath = safePath.endsWith('/') ? safePath : `${safePath}/`;
        
        const file = reqPath.endsWith('.html') 
            ? safePath 
            : path.join(normalizedPath, 'index.html');

        const fullPath = path.resolve(staticDir, file);

        // Security check
        if (!fullPath.startsWith(staticDir)) {
            throw new Error('Invalid path');
        }

        await fs.access(fullPath, fs.constants.F_OK);
        let html = await fs.readFile(fullPath, 'utf8');

        const filteredTags = extraTags.filter(tag => {
            return !Object.entries(excludedTags).some(([pathKey, excludedTag]) => {
                const isMatchingPath = reqPath === pathKey || normalizedPath === pathKey;
                return isMatchingPath && tag === excludedTag;
            });
        });

        if (!html.includes('</body>')) {
            html += filteredTags.join('');
        } else {
            html = html.replace('</body>', filteredTags.join('') + '</body>');
        }

        res.set('Content-Type', 'text/html').send(html);
    } catch (error) {
        console.error('File serve error:', error);
        res.status(404);
        try {
            await fs.access(path.join(staticDir, '404.html'), fs.constants.F_OK);
            res.sendFile(path.join(staticDir, '404.html'));
        } catch {
            res.type('txt').send('Not found');
        }
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

    // Create new row with CSV escaping
    const newRow = headers.map(header => {
        const value = jsonObject[header] || '';
        return `"${value.toString().replace(/"/g, '""')}"`;
    });

    table.push(newRow);

    // Write file
    const csvContent = table.map(row => row.join(',')).join('\n');
    await fs.writeFile(filePath, csvContent, 'utf8');
    return table;
}
