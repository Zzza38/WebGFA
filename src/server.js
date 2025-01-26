/////////////////////////////////////////////////////////////
//                   IMPORT STATEMENTS                     //
/////////////////////////////////////////////////////////////
const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const https = require('https');
const http = require('http');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { exec } = require('child_process');
const db = require("../data/database.json");
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
const PASSWORD = db.users.usernames[USERNAME];

const extraTags = [
    // non module tags
    "<script src='/code/universalCode/aboutblankcloak.js'></script>",
    "<script src='/code/universalCode/maincheck.js'></script>",
    "<script src='/code/universalCode/dataSender.js'></script>",
    // module tags
    "<script src='/code/universalCode/autoSave.js' type='module'></script>",
    "<script src='/code/universalCode/firestore.js' type='module'></script>",
];

const excludedTags = {
    "/index.html": "<script src='/code/universalCode/maincheck.js'></script>",
    "/register/index.html": "<script src='/code/universalCode/maincheck.js'></script>"
};

const sshProxy = createProxyMiddleware({ target: 'http://127.0.0.1:2222/ssh' });
const interstellarProxy = createProxyMiddleware({
    target: 'http://127.0.0.1:3000',
    changeOrigin: true,
    router: (req) => {
        if (req.headers.host === 'inter.learnis.site') {
            return 'http://127.0.0.1:3000';
        }
        return null;
    },
    pathFilter: (pathname, req) => req.headers.host === 'inter.learnis.site'
});

/////////////////////////////////////////////////////////////
//                  EXPRESS SERVER SETUP                   //
/////////////////////////////////////////////////////////////
app.use(express.static(path.join(__dirname, '../static'), {
    index: false,
    extensions: ['html']
}));

app.use(express.json({ type: 'application/json' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use(interstellarProxy);
app.get('/ssh/', basicAuth);
app.use('/ssh/', sshProxy);
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

async function handleLogin(req, res) {
    const { username, password } = req.body;
    
    if (db.users.usernames[username] === password || (username === 'guest' && password === 'guest')) {
        // Set login cookies
        res.cookie('loggedIn', 'true', { httpOnly: true, secure: true });
        res.cookie('user', username, { secure: true });
        res.cookie('pass', password, { secure: true });
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
    // HTTP to HTTPS redirect
    const httpApp = express();
    httpApp.get('*', (req, res) => {
        res.redirect(301, `https://${req.headers.host}${req.url}`);
    });
    http.createServer(httpApp).listen(HTTP_PORT, () => console.log(`HTTP redirecting to HTTPS on ${HTTP_PORT}`));

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
function sendAuthChallenge(res) {
    res.set('WWW-Authenticate', 'Basic realm="Secure Area"').status(401).send('Authentication required');
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
