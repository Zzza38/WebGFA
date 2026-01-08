/////////////////////////////////////////////////////////////
//                   IMPORT STATEMENTS                     //
/////////////////////////////////////////////////////////////

// Server
import Fastify, {FastifyReply, FastifyRequest} from "fastify";
import fastifyStatic from "@fastify/static";
import fastifyCookie from "@fastify/cookie";
import fastifyFormbody from "@fastify/formbody";
import fastifyMultipart from "@fastify/multipart";
import pdfParse from "pdf-parse";

// Node Built-ins
import path from "path";
import fs from "fs";
import {exec} from "child_process";
import crypto from "crypto";
import {EventEmitter} from "events";
import { fileURLToPath } from "url";

// Classes
import {DatabaseSchema} from "./functions/classes.js";

// OpenAI
import OpenAI from "openai";

// Dotenv
import {config} from "dotenv";

config()


// needed to have the directory be at /src, not / (relative to the package.json)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
process.chdir(__dirname);

// custom imports

if (!fs.existsSync("../data/database.json")) {
    fs.copyFileSync("../data/default-database.json", "../data/database.json");
    console.log("Created database at '../data/database.json'");
}

if (!fs.existsSync("../config.json")) {
    fs.copyFileSync("../default-config.json", "../config.json");
    console.log("Created config file at '../config.json'");
}

const db: DatabaseSchema = (await import(`../data/database.json`, { with: { type: "json" } })).default;
const webgfaConfig = (await import(`../config.json`, { with: { type: "json" } })).default;
import games from "../games.json" with {type: "json"};

/////////////////////////////////////////////////////////////
//                 CONSTANTS & CONFIGURATION               //
/////////////////////////////////////////////////////////////

// Make logs directory
fs.mkdirSync(path.join(__dirname, '../logs'), {recursive: true});

const dev = process.argv.includes("--dev");
const fastify = Fastify({
    logger: {
        transport: {
            target: "pino-pretty",
            options: {
                colorize: true,
                translateTime: "HH:MM:ss Z",
                ignore: "pid,hostname"
            }
        },
        level: "warn"
    }
});
const HTTP_PORT: number = Number(process.env.PORT ? process.env.PORT : dev ? webgfaConfig.ports.development : webgfaConfig.ports.main);
const messageEmitter = new EventEmitter();

const extraTags = [
    // module tags to prevent variable definitions overlapping
    "<script src='/assets/js/aboutblankcloak.js' type='module'></script>",
    "<script src='/assets/js/autoSave.js' type='module'></script>",
    "<script src='/assets/js/particles.js'></script>",

    `<script> const config = JSON.parse('${JSON.stringify(webgfaConfig['client-config'])}')</script>`,
    "<div id='particles-js' style='position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: -1;'></div>"
];

const excludedTags = {};

/////////////////////////////////////////////////////////////
//                  Fastify Server Setup                   //
/////////////////////////////////////////////////////////////

// Static file serving for non html files
fastify.register(fastifyStatic, {
    root: path.join(__dirname, "../static"),
    prefix: "/",
    decorateReply: true,
    index: false
});

// Parsers
fastify.register(fastifyCookie);
fastify.register(fastifyFormbody);
fastify.register(fastifyMultipart, {
    limits: {
        fileSize: webgfaConfig.features.openai?.fileUpload?.maxFileSize ?? 5242880,
        files: webgfaConfig.features.openai?.fileUpload?.maxFiles ?? 10
    }
});

// Handlers
fastify.addHook("onRequest", handleGuestSession);

// Post Requests
fastify.post("/webhook/github", handleGitHubWebhook);
fastify.post("/login", handleLogin);

// API
fastify.all("/api/*", handleApiRequest);

// HTML
fastify.addHook("onRequest", handleMainRequest);


/////////////////////////////////////////////////////////////
//                   SERVER INITIALIZATION                 //
/////////////////////////////////////////////////////////////
// If Interstellar is installed, then put it into the tools category
if (webgfaConfig.installed.interstellar) {
    // Dynamic assignment of Interstellar proxy URL to tools catalog
    (games.tools as Record<string, string>)["Interstellar"] = webgfaConfig.features.interstellarURL;
}
// Force Disable email for now
webgfaConfig["client-config"].email.enabled = false
try {
    await startServer();

} catch (error) {
    console.error('Initialization failed:', error);
    process.exit(1);
}

/////////////////////////////////////////////////////////////
//                     FUNCTIONS                           //
/////////////////////////////////////////////////////////////
async function handleMainRequest(request: FastifyRequest, reply: FastifyReply) {
    const reqPath = normalizePath(request.url.split("?")[0]);
    const sessionId = request.cookies.uid;
    if (!sessionId) return console.error("No session ID on a user. Please open a GitHub issue, this shouldn't be possible");
    const foundUser = Object.keys(db.users).find(user => db.users[user].sessionID === sessionId);
    const user = foundUser || 'guest';

    const prefixesToIgnore = [
        "/api/",
        "/webhook/"
    ];

    if (prefixesToIgnore.some(prefix => reqPath.startsWith(prefix)) || request.method !== "GET") {
        return;
    }

    if (isHtmlRequest(reqPath)) {
        // Check if this is a directory-like path without trailing slash
        const originalPath = request.url.split("?")[0];
        const lastSegment = originalPath.split('/').pop() || '';
        const hasExtension = /\.[a-zA-Z0-9]+$/.test(lastSegment);

        if (!hasExtension && !originalPath.endsWith('/') && originalPath !== '/') {
            // Redirect to version with trailing slash to fix relative URL resolution
            const queryString = request.url.split('?')[1];
            const redirectUrl = originalPath + '/' + (queryString ? '?' + queryString : '');
            return reply.code(301).redirect(redirectUrl);
        }

        serveHtmlFile(reqPath, request, reply);
        await handleStatistics(request, reply, user as string, sessionId as string); // TODO: actually fix it
    }
}

async function handleLogin(request: FastifyRequest, reply: FastifyReply) {
    const {username, password} = request.body as LoginRequest;

    if (!db.users[username]) return reply.code(403).send("User doesn't exist");
    if (db.users[username]?.password === password) {
        // Set login cookies
        const uid = username === 'guest' ? 'GUEST-ACCOUNT-' + generateUID() : generateUID();
        db.users[username].sessionID = uid;
        await writeJSONChanges(db);
        // Only set cookie after DB write succeeds
        reply.cookie('uid', uid, {httpOnly: true, secure: true});
        return reply.code(200).send('Login successful');
    }

    return reply.code(401).send('Invalid credentials');
}

async function handleGuestSession(request: FastifyRequest, reply: FastifyReply) {
    const sessionID = String(request.cookies?.uid || "NO-SESSION-ID");
    const isGuest = sessionID.includes("GUEST-ACCOUNT-");
    const isUser = Object.values(db.users).some(
        (user) => user.sessionID === sessionID
    );

    if (isGuest || isUser) return; // already fine, continue chain
    // Create a new guest ID
    const newUID = "GUEST-ACCOUNT-" + generateUID();

    reply.setCookie("uid", newUID, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/"
    });
}
async function handleGitHubWebhook(request: FastifyRequest, reply: FastifyReply) {
    reply.code(202).send("Accepted");

    if (webgfaConfig.features.githubAutoPull.pull === false) return;

    const event = request.headers["x-github-event"];
    if (event === "push") {
        exec(`cd ${path.join(__dirname, "../")} && git pull`, (error, stdout, stderr) => {
            if (error) {
                console.error('Git pull failed:', error.message);
                console.error('stderr:', stderr);
                return;
            }
            console.log('Git pull successful:', stdout);

            // Only run restart command if git pull succeeded
            if (webgfaConfig.features.githubAutoPull.restartCommand?.trim()) {
                exec(webgfaConfig.features.githubAutoPull.restartCommand, (error, stdout, stderr) => {
                    if (error) {
                        console.error('Restart command failed:', error.message);
                        console.error('stderr:', stderr);
                        return;
                    }
                    console.log('Restart command successful:', stdout);
                });
            }
        });
    }
}

async function handleStatistics(request: FastifyRequest, reply: FastifyReply, user: string, sessionID: string) {
    const reqPath = normalizePath(request.url.split("?")[0]);
    const fullURL = reqPath + (request.url.split('?')[1] ? '?' + request.url.split('?')[1] : "")
    // Add to CSV file
    const humanReadableDate = new Date().toLocaleString();
    let body = {
        Path: fullURL,
        Username: user,
        UID: sessionID,
        Date: humanReadableDate
    };
    const csvFilePath = path.resolve(__dirname, '../logs/webgfa.csv');
    oldTable = await updateTable(body, csvFilePath, oldTable);
    // Most popular games
    const getStartOfMonth = () => {
        let now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    };

    const getStartOfWeek = () => {
        let now = new Date();
        let startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay()); // Move to Sunday
        startOfWeek.setHours(0, 0, 0, 0); // Set to 12:00 AM
        return startOfWeek;
    };

    // Initialize gamePopularity object if it doesn't exist
    if (!db.gamePopularity) {
        db.gamePopularity = {};
    }

    // Then initialize updated if needed
    if (!db.gamePopularity.updated) {
        db.gamePopularity.updated = {
            month: getStartOfMonth().toISOString(),
            week: getStartOfWeek().toISOString()
        };
        await writeJSONChanges(db);
    } else {
        if (db.gamePopularity.updated.month !== getStartOfMonth().toISOString()) {
            // Reset monthly and weekly counts
            for (const [key, value] of Object.entries(db.gamePopularity)) {
                if (key === "updated" || typeof value !== "object" || value === null) continue;
                if ("monthly" in value) value.monthly = 0;
            }
            db.gamePopularity.updated.month = getStartOfMonth().toISOString();
        }

        if (db.gamePopularity.updated.week !== getStartOfWeek().toISOString()) {
            // Reset only weekly counts
            for (const [key, value] of Object.entries(db.gamePopularity)) {
                if (key === "updated" || typeof value !== "object" || value === null) continue;
                if ("weekly" in value) value.weekly = 0;
            }
            db.gamePopularity.updated.week = getStartOfWeek().toISOString();
        }
    }

    if (reqPath.includes("/games")) {
        const allGames = Object.assign({}, games.games, games.premiumGames);
        const game = Object.entries(allGames).find(([_, v]) => v === fullURL);
        if (!game) return;
        const [name, url] = game;
        const existingPop = db.gamePopularity[name];
        let gamePop: {
            allTime: number;
            monthly: number;
            weekly: number;
            url: string;
            premium: boolean;
        } = (existingPop && 'allTime' in existingPop) ? existingPop : {
            allTime: 0,
            monthly: 0,
            weekly: 0,
            url: url,
            premium: name in games.premiumGames
        };
        gamePop.allTime += 1;
        gamePop.monthly += 1;
        gamePop.weekly += 1;
        gamePop.premium = name in games.premiumGames

        db.gamePopularity[name] = gamePop;
        await writeJSONChanges(db);
    }

}

async function startServer() {
    try {
        await fastify.listen({port: HTTP_PORT, host: "0.0.0.0"});
        console.log(`WebGFA running at port ${HTTP_PORT}`);
        console.log(`http://localhost:${HTTP_PORT}`);
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
}

function generateUID() {
    const hex1 = crypto.randomBytes(2).toString("hex"); // 4 chars
    const hex2 = crypto.randomBytes(2).toString("hex"); // 4 chars
    const hex3 = crypto.randomBytes(1).toString("hex"); // 2 chars
    const hex4 = crypto.randomBytes(2).toString("hex"); // 4 chars
    const hex5 = crypto.randomBytes(3).toString("hex"); // 6 chars

    return `${hex1}-${hex2}-${hex3}-${hex4}-${hex5}`.toUpperCase();
}

// Mutex lock to serialize database writes and prevent race conditions
let writeLock: Promise<void> = Promise.resolve();

// Mutex lock for CSV writes to prevent race conditions
let csvWriteLock: Promise<void> = Promise.resolve();

// Per-user coin operation locks to prevent race conditions in concurrent requests
const coinLocks: Map<string, Promise<void>> = new Map();

async function writeJSONChanges(json: Object, JSONpath = "../data/database.json") {
    const currentWrite = writeLock.then(async () => {
        try {
            await fs.promises.writeFile(
                path.resolve(__dirname, JSONpath),
                JSON.stringify(json, null, 2),
                'utf8'
            );
        } catch (error) {
            console.error('Error writing database changes:', error);
            throw error;
        }
    });

    writeLock = currentWrite.catch(() => {}); // Prevent rejection from blocking queue
    return currentWrite;
}

function isHtmlRequest(path: string) {
    return path === '/' || Boolean(path.match(/^\/([^\/?.#]+\/)*([^\/?.#]+\.html|[^\/?.#]+\/?)$/));
}

function normalizePath(reqPath: string): string {
    // Remove query strings, hashes, etc.
    const cleanPath = reqPath.split(/[?#]/)[0];
    // Trim trailing slashes (except if it's just "/")
    const trimmedPath = cleanPath.replace(/\/+$/, "") || "/";

    // Split into parts
    const pathSegments = trimmedPath.split("/").filter(Boolean);
    const lastSegment = pathSegments[pathSegments.length - 1] || "";

    // Detect if last segment looks like a file
    const hasExtension = /\.[a-zA-Z0-9]+$/.test(lastSegment);

    if (trimmedPath === "/") {
        // Root path → /index.html
        return "/index.html";
    } else if (!hasExtension) {
        // Directory-like → append /index.html
        return `${trimmedPath}/index.html`;
    } else {
        // Already looks like a file → return as-is
        return trimmedPath;
    }
}

// Request body interfaces for API validation
interface LoginRequest {
    username: string;
    password: string;
}

interface SendMessageRequest {
    content: string;
}

interface EditMessageRequest {
    id: number;
    content: string;
}

interface DeleteMessageRequest {
    id: number;
}

interface SaveDataRequest {
    data: string | Record<string, any>;
}

interface CreateAccountRequest {
    username: string;
    password: string;
    creationID: string;
    updatedUsername?: string;
}

interface ResetPasswordRequest {
    username: string;
    resetID: string;
    password: string;
}

async function handleApiRequest(request: FastifyRequest, reply: FastifyReply) {
    try {
        // Extract 'service' from the URL
        let service = request.url.split("?")[0].split("/")[2];
        if (!service) return reply.code(400).send('Missing service parameter');

        const sessionId = String(request.cookies.uid);
        const user = sessionId.includes('GUEST-ACCOUNT') ? 'guest' : Object.keys(db.users).find(user => db.users[user].sessionID === sessionId);

        // Validate user exists
        if (!user) return reply.code(401).send('User does not exist');
        reply.statusCode = 200;
        const postHandler = {
            'logout': async () => {
                // Clear session cookie
                reply.clearCookie('uid');
                db.users[user].sessionID = "";
                await writeJSONChanges(db);
                reply.redirect('/login');
            },
            // Messaging API
            // NOTE: Message content is stored as-is. Frontend MUST escape HTML
            // or use textContent (not innerHTML) to prevent XSS attacks.
            'send-message': async () => {
                const body = request.body as SendMessageRequest;

                // Validate content
                if (!body.content || typeof body.content !== 'string') {
                    return reply.code(400).send('Missing or invalid content');
                }

                // Length limit (5000 characters)
                if (body.content.length > 5000) {
                    return reply.code(400).send('Message too long (max 5000 characters)');
                }

                if (user === 'guest') return reply.code(403).send('Forbidden for guests');

                const id = Math.max(0, ...Object.keys(db.messages).map(Number)) + 1;
                const messageData = {
                    id,
                    content: body.content,
                    user,
                    timestamp: new Date().toISOString(),
                    edited: false
                };

                db.messages[id] = messageData;
                await writeJSONChanges(db);
                reply.send(messageData);
                messageEmitter.emit('message');
            },
            'edit-message': async () => {
                const body = request.body as EditMessageRequest;

                // Validate inputs
                if (!body.id || !body.content) {
                    return reply.code(400).send('Missing id or content');
                }

                if (typeof body.id !== 'number' || typeof body.content !== 'string') {
                    return reply.code(400).send('Invalid id or content type');
                }

                if (body.content.length > 5000) {
                    return reply.code(400).send('Message too long (max 5000 characters)');
                }

                const message = db.messages[body.id];
                if (!message) return reply.code(404).send('Message not found');

                if (message.user !== user) return reply.code(403).send('Forbidden');

                message.content = body.content;
                message.edited = true;
                await writeJSONChanges(db);
                reply.send(message);
                messageEmitter.emit('message');
            },
            'delete-message': async () => {
                const body = request.body as DeleteMessageRequest;

                if (!body.id || typeof body.id !== 'number') {
                    return reply.code(400).send('Missing or invalid id');
                }

                const message = db.messages[body.id];
                if (!message) return reply.code(404).send('Message not found');

                if (message.user !== user) return reply.code(403).send('Forbidden');

                delete db.messages[body.id];
                await writeJSONChanges(db);
                reply.send({success: true});
                messageEmitter.emit('message');
            },
            'save-data': async () => {
                const body = request.body as SaveDataRequest;

                // Validate data exists
                if (!body.data) return reply.code(400).send('Missing data');

                // Size limit check (10MB)
                try {
                    const dataStr = JSON.stringify(body.data);
                    if (dataStr.length > 10 * 1024 * 1024) {
                        return reply.code(413).send('Save data too large (max 10MB)');
                    }
                } catch (error) {
                    return reply.code(400).send('Invalid data format (circular reference or non-serializable)');
                }

                if (user === 'guest') return reply.code(403).send('Forbidden for guests');

                db.users[user].save = body.data;
                await writeJSONChanges(db);
                reply.send({success: true});
            },
            'request-account-creation': async () => {
                // const { username, email } = request.body;
                return reply.code(503).send("Requesting account creation is currently disabled...");
                /*
                if (Object.keys(db.users).some(user => db.users[user].email === email)) return reply.code(409).send("Account with this email already exists.");
                if (db.users.hasOwnProperty(username)) return res.status(409).send("Account with this username already exists.");
                if (false) return res.status(403).send("This email is blacklisted.");
                if (!emailUtils.isValidEmail(email)) return res.status(400).send("Invalid email format.");
                db.users[username] = {
                    password: "deactivated-account",
                    email: email,
                    creationID: generateUID()
                };
                await writeJSONChanges(db);
                const link = encodeURI(`https://${webgfaConfig.features.login.url}/account/create/?creationID=${db.users[username].creationID}&username=${username}`);

                if (webgfaConfig["client-config"].email.enabled) {
                    emailUtils.sendEmail(email, 'Create Account with WebGFA', `
                    Hello ${email}! You have decided to create a WebGFA account.
                    To proceed, click on the link below!
                    ${link}
                `);
                }
                */
            },
            'create-account': async () => {
                const body = request.body as CreateAccountRequest;
                let {username, password, creationID, updatedUsername} = body;

                // Validate required fields
                if (!username || !password || !creationID) {
                    return reply.code(400).send('Missing required fields');
                }

                // Type validation
                if (typeof username !== 'string' || typeof password !== 'string' || typeof creationID !== 'string') {
                    return reply.code(400).send('Invalid field types');
                }

                // Length validation
                if (username.length > 50 || password.length > 100) {
                    return reply.code(400).send('Username or password too long');
                }

                // Username format (alphanumeric + underscore/dash)
                if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
                    return reply.code(400).send('Invalid username format');
                }

                if (!db.users[username]) {
                    return reply.code(404).send("User does not exist. Please request account creation first.");
                }

                if (db.users[username].creationID !== creationID && !db.users[user].permissions?.includes('admin')) {
                    return reply.code(403).send("The specified username either does not have a creationID specified or the creationID is wrong.");
                }

                const oldUserEntry = db.users[username];

                if (updatedUsername) {
                    if (typeof updatedUsername !== 'string') {
                        return reply.code(400).send('Invalid updatedUsername type');
                    }
                    if (!/^[a-zA-Z0-9_-]+$/.test(updatedUsername)) {
                        return reply.code(400).send('Invalid username format');
                    }
                    if (db.users[updatedUsername]) {
                        return reply.code(409).send("Account with this username already exists.");
                    }
                    username = updatedUsername;
                }
                // Allocate initial coins
                const initialCoins = webgfaConfig.features?.openai?.coinAllocation?.initial ?? 100;

                db.users[username] = {
                    permissions: '',
                    password: password,
                    save: {},
                    sessionID: creationID,
                    email: oldUserEntry.email,
                    creationDate: new Date().toISOString(),
                    coins: initialCoins,
                    coinHistory: [{
                        timestamp: new Date().toISOString(),
                        amount: initialCoins,
                        reason: 'Initial allocation',
                        balance: initialCoins
                    }]
                };

                // Persist account to database
                await writeJSONChanges(db);

                if (!db.users[user].permissions?.includes('admin')) reply.cookie('uid', creationID, {
                    httpOnly: true,
                    secure: true
                });
                return reply.code(200).send('Account Created!')
            },
            'request-password-reset': async () => {
                return reply.code(503).send("Password reset is disabled currently...");
                /*
                const { username } = request.body;

                const email = db.users[username]?.email;
                if (!email) return reply.code(404).send('Email not found');

                const resetID = generateUID();
                db.users[username].resetID = resetID;

                const link = encodeURI(`https://${webgfaConfig.features.login.url}/account/reset/?resetID=${resetID}&username=${username}`);

                if (webgfaConfig["client-config"].email.enabled) {
                    emailUtils.sendEmail(email, "Change WebGFA Password", `
                    Hello ${username}! The password reset button was clicked for your username.
                    To proceed, click on the link below. If you didn't ask for this, then just ignore it.
                    ${link}
                `);
                }
                return res.status(200).send('Password reset email sent.');
                 */
            },
            'reset-password': async () => {
                const {username, resetID, password} = request.body as ResetPasswordRequest;

                // Validate required fields
                if (!username || !password || !resetID) {
                    return reply.code(400).send('Missing required fields');
                }

                // Type validation
                if (typeof username !== 'string' || typeof password !== 'string' || typeof resetID !== 'string') {
                    return reply.code(400).send('Invalid field types');
                }

                // Length validation
                if (password.length === 0) {
                    return reply.code(400).send('Password cannot be empty');
                }
                if (password.length > 100) {
                    return reply.code(400).send('Password too long (max 100 characters)');
                }

                // Check if user exists
                if (!db.users[username]) {
                    return reply.code(404).send('User not found');
                }

                // Verify resetID (allow admins to bypass)
                if (db.users[username].resetID !== resetID && !db.users[user].permissions?.includes('admin')) {
                    return reply.code(403).send("The specified username either does not have a resetID specified or the resetID is wrong.");
                }

                // Update password
                db.users[username].password = password;

                // Clear resetID after use (security best practice)
                delete db.users[username].resetID;

                // Persist changes to database
                await writeJSONChanges(db);

                return reply.code(200).send('Password successfully reset!');
            },
            'webgpt': async () => {
                // Block guests
                if (user === 'guest') {
                    return reply.code(403).send({ error: 'Guest accounts cannot use WebGPT' });
                }

                // Check if OpenAI is enabled
                if (!webgfaConfig.features?.openai?.enabled) {
                    return reply.code(503).send({ error: 'WebGPT is currently disabled' });
                }

                // Handle multipart for study mode with files
                const isMultipart = request.headers['content-type']?.includes('multipart/form-data');

                let mode: 'answer' | 'explain' | 'study' | 'chat';
                let message: string;
                let context: any = null;
                let personality: string = '';
                let length: string = 'normal';
                let files: any[] = [];

                if (isMultipart) {
                    // Parse multipart data
                    const parts = request.parts();
                    const formData: Record<string, any> = {};

                    for await (const part of parts) {
                        if (part.type === 'file') {
                            // Validate file type
                            const allowedTypes = webgfaConfig.features.openai?.fileUpload?.allowedMimeTypes ??
                                ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];

                            if (!allowedTypes.includes(part.mimetype)) {
                                return reply.code(400).send({
                                    error: `Invalid file type: ${part.mimetype}. Allowed: ${allowedTypes.join(', ')}`
                                });
                            }

                            // Read file buffer
                            const buffer = await part.toBuffer();
                            files.push({
                                filename: part.filename,
                                mimetype: part.mimetype,
                                buffer: buffer
                            });

                            // Check file count limit
                            if (files.length > (webgfaConfig.features.openai?.fileUpload?.maxFiles ?? 10)) {
                                return reply.code(400).send({
                                    error: `Too many files. Maximum ${webgfaConfig.features.openai?.fileUpload?.maxFiles ?? 10} allowed.`
                                });
                            }
                        } else {
                            // Regular form field
                            formData[part.fieldname] = (part as any).value;
                        }
                    }

                    mode = formData.mode;
                    message = formData.message;
                    personality = formData.personality || '';
                    length = formData.length || 'normal';
                    if (formData.context) {
                        try {
                            context = JSON.parse(formData.context);
                        } catch (error) {
                            return reply.code(400).send({ error: 'Invalid JSON in context field' });
                        }
                    }
                } else {
                    // JSON body (existing modes without files)
                    const body = request.body as {
                        mode: 'answer' | 'explain' | 'study' | 'chat';
                        message: string;
                        context?: any;
                        personality?: string;
                        length?: string;
                    };
                    mode = body.mode;
                    message = body.message;
                    context = body.context;
                    personality = body.personality || '';
                    length = body.length || 'normal';
                }

                // Validate mode
                if (!['answer', 'explain', 'study', 'chat'].includes(mode)) {
                    return reply.code(400).send({ error: 'Invalid mode' });
                }

                // Validate message
                if (!message || typeof message !== 'string') {
                    return reply.code(400).send({ error: 'Missing or invalid message' });
                }

                // Length limit (2000 characters)
                if (message.length > 2000) {
                    return reply.code(400).send({ error: 'Message too long (max 2000 characters)' });
                }

                // Acquire per-user coin lock to prevent race conditions
                const currentLock = coinLocks.get(user) || Promise.resolve();
                const lockPromise = currentLock.then(async () => {
                    // Lock acquired - all coin operations are now atomic for this user
                }).catch(() => {}); // Prevent rejection from blocking queue
                coinLocks.set(user, lockPromise);

                try {
                    await currentLock; // Wait for previous operations to complete

                    // Check coin balance (NO MINIMUM - just check > 0)
                    const userCoins = db.users[user].coins ?? 100;
                    if (userCoins <= 0) {
                        return reply.code(402).send({
                            error: 'Insufficient coins',
                            balance: userCoins
                        });
                    }
                    // Get system prompts from config (with fallback to defaults)
                    const systemPrompts = webgfaConfig.features.openai.systemPrompts || {
                        answer: 'You are a homework helper. Provide ONLY the direct answer with no explanation.',
                        explain: 'You are a homework helper. Provide the answer AND explain your reasoning step-by-step.',
                        study: 'You are a study assistant. Based on the subject, documents provided, and the questioning style requested, help the student learn effectively. Ask probing questions, provide explanations, and guide them through the material.',
                        chat: 'You are a helpful AI assistant. Answer questions and have natural conversations.'
                    };

                    // Get personalities from config
                    const personalities = webgfaConfig.features.openai.personalities || {} as Record<string, string>;

                    // Get slang dictionary from config
                    const slangDictionary = webgfaConfig.features.openai.slangDictionary || {} as Record<string, string>;

                    // Length instructions (instead of hard token limits)
                    const lengthInstructions = {
                        normal: 'Keep your response concise and to the point. Aim for 2-4 paragraphs.',
                        detailed: 'Provide a detailed response with thorough explanations. Aim for 4-6 paragraphs with examples.',
                        comprehensive: 'Provide a comprehensive, in-depth response covering all aspects. Include detailed explanations, examples, and additional context. Aim for multiple paragraphs with complete coverage of the topic.'
                    } as Record<string, string>;

                    // Build final system prompt with length instruction, personality modifier, and slang dictionary
                    let systemPrompt = systemPrompts[mode];

                    // Add length instruction
                    if (length && lengthInstructions[length as keyof typeof lengthInstructions]) {
                        systemPrompt += `\n\n${lengthInstructions[length as keyof typeof lengthInstructions]}`;
                    }

                    if (personality && personalities[personality as keyof typeof personalities]) {
                        systemPrompt = `${personalities[personality as keyof typeof personalities]} ${systemPrompt}`;

                        // Append slang dictionary if personality is selected
                        if (Object.keys(slangDictionary).length > 0) {
                            const slangList = Object.entries(slangDictionary)
                                .map(([term, meaning]) => `- ${term}: ${meaning}`)
                                .join('\n');
                            systemPrompt += `\n\nSlang Dictionary (use these naturally):\n${slangList}`;
                        }
                    }

                    // Process files for study mode
                    const processedFiles: Array<{type: 'image' | 'text', content: string}> = [];

                    if (mode === 'study' && files.length > 0) {
                        for (const file of files) {
                            if (file.mimetype === 'application/pdf') {
                                // Extract text from PDF
                                try {
                                    const pdfData = await pdfParse(file.buffer);
                                    processedFiles.push({
                                        type: 'text',
                                        content: `[PDF Document: ${file.filename}]\n${pdfData.text}`
                                    });
                                } catch (err) {
                                    console.error('PDF parse error:', err);
                                    return reply.code(400).send({ error: `Failed to parse PDF: ${file.filename}` });
                                }
                            } else if (file.mimetype.startsWith('image/')) {
                                // Convert image to base64 for GPT-5-nano vision
                                const base64Image = file.buffer.toString('base64');
                                const dataUrl = `data:${file.mimetype};base64,${base64Image}`;
                                processedFiles.push({
                                    type: 'image',
                                    content: dataUrl
                                });
                            }
                        }
                    }

                    // Build messages array for OpenAI
                    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
                    const model = webgfaConfig.features.openai.model;

                    // Build user message with file context
                    let userMessage: any;

                    if (mode === 'study' && (context || processedFiles.length > 0)) {
                        // Study mode with enhanced context
                        const contentParts: any[] = [];

                        // Text content
                        let textContent = `Subject: ${context?.subject || 'N/A'}\nQuestioning Style: ${context?.questioningStyle || 'Standard'}\n\nQuestion: ${message}`;

                        // Add PDF text
                        const pdfTexts = processedFiles.filter(f => f.type === 'text').map(f => f.content).join('\n\n');
                        if (pdfTexts) {
                            textContent += `\n\nDocument Materials:\n${pdfTexts}`;
                        }

                        contentParts.push({ type: 'text', text: textContent });

                        // Add images (GPT-5-nano native vision support)
                        processedFiles.filter(f => f.type === 'image').forEach(img => {
                            contentParts.push({
                                type: 'image_url',
                                image_url: { url: img.content }
                            });
                        });

                        userMessage = { role: 'user', content: contentParts };
                    } else {
                        // Simple text message for other modes
                        userMessage = { role: 'user', content: message };
                    }

                    const completion = await openai.chat.completions.create({
                        model: model,
                        messages: [
                            { role: 'system', content: systemPrompt },
                            userMessage
                        ]
                        // No max_completion_tokens - let AI decide based on prompt instructions
                    });

                    // NEW BILLING CALCULATION
                    const inputTokens = completion.usage?.prompt_tokens ?? 0;
                    const outputTokens = completion.usage?.completion_tokens ?? 0;
                    const totalTokens = completion.usage?.total_tokens ?? 0;

                    const pricing = webgfaConfig.features.openai.tokenPricing;

                    // Calculate cost in USD
                    const inputCostUSD = (inputTokens / 1_000_000) * pricing.inputPricePerMillion;
                    const outputCostUSD = (outputTokens / 1_000_000) * pricing.outputPricePerMillion;
                    const totalCostUSD = (inputCostUSD + outputCostUSD) * pricing.profitMargin;

                    // Convert to coins (3 coins = $1)
                    const coinCost = Math.ceil(totalCostUSD * pricing.coinRate * 100) / 100; // Round to 2 decimals

                    // NO MINIMUM CHARGE - exact billing

                    // Check if user has enough coins
                    if (userCoins < coinCost) {
                        return reply.code(402).send({
                            error: 'Insufficient coins for this request',
                            required: coinCost,
                            balance: userCoins
                        });
                    }

                    // Deduct coins
                    db.users[user].coins = userCoins - coinCost;

                    // Record transaction with detailed breakdown
                    if (!db.users[user].coinHistory) db.users[user].coinHistory = [];
                    db.users[user].coinHistory.push({
                        timestamp: new Date().toISOString(),
                        amount: -coinCost,
                        reason: `WebGPT ${mode} mode (${inputTokens} in / ${outputTokens} out = ${totalTokens} total tokens)`,
                        balance: db.users[user].coins
                    });

                    // Save database
                    await writeJSONChanges(db);

                    // Extract response content
                    const responseContent = completion.choices[0].message.content || '';
                    const refusalMessage = (completion.choices[0].message as any).refusal;

                    // Check for refusal or empty content
                    if (refusalMessage) {
                        // Refund coins since request was refused
                        db.users[user].coins = userCoins;
                        db.users[user].coinHistory.pop(); // Remove the transaction
                        await writeJSONChanges(db);

                        return reply.code(400).send({
                            error: 'Request refused by AI',
                            refusal: refusalMessage
                        });
                    }

                    if (!responseContent && outputTokens > 0) {
                        console.error('Empty response despite output tokens:', {
                            outputTokens,
                            choice: completion.choices[0],
                            finishReason: completion.choices[0].finish_reason
                        });

                        // Refund coins since response is empty
                        db.users[user].coins = userCoins;
                        db.users[user].coinHistory.pop(); // Remove the transaction
                        await writeJSONChanges(db);

                        return reply.code(500).send({
                            error: 'Received empty response from AI despite generating tokens. Please try again.',
                            debug: {
                                finishReason: completion.choices[0].finish_reason,
                                outputTokens
                            }
                        });
                    }

                    // Return response with detailed billing info
                    reply.send({
                        response: responseContent,
                        billing: {
                            inputTokens,
                            outputTokens,
                            totalTokens,
                            inputCostUSD: inputCostUSD.toFixed(6),
                            outputCostUSD: outputCostUSD.toFixed(6),
                            totalCostUSD: totalCostUSD.toFixed(6),
                            coinCost,
                            profitMargin: pricing.profitMargin
                        },
                        remainingCoins: db.users[user].coins,
                        filesProcessed: files.length
                    });

                } catch (error: any) {
                    console.error('OpenAI API error:', error);
                    return reply.code(500).send({
                        error: 'Failed to process request',
                        message: error.message
                    });
                }
            },
            'add-coins': async () => {
                // Admin-only endpoint
                if (user === 'guest' || !db.users[user].permissions?.includes('admin')) {
                    return reply.code(403).send({ error: 'Admin access required' });
                }

                const { targetUser, amount, reason } = request.body as {
                    targetUser: string;
                    amount: number;
                    reason?: string;
                };

                // Validate target user exists
                if (!db.users[targetUser]) {
                    return reply.code(404).send({ error: 'User not found' });
                }

                // Validate amount
                if (typeof amount !== 'number' || isNaN(amount)) {
                    return reply.code(400).send({ error: 'Invalid amount' });
                }

                // Update coins
                const currentCoins = db.users[targetUser].coins ?? 100;
                db.users[targetUser].coins = Math.max(0, currentCoins + amount);

                // Record transaction
                if (!db.users[targetUser].coinHistory) db.users[targetUser].coinHistory = [];
                db.users[targetUser].coinHistory.push({
                    timestamp: new Date().toISOString(),
                    amount: amount,
                    reason: reason || `Admin adjustment by ${user}`,
                    balance: db.users[targetUser].coins
                });

                await writeJSONChanges(db);

                reply.send({
                    success: true,
                    newBalance: db.users[targetUser].coins
                });
            },
            // Admin Panel Endpoints
            'admin-create-user': async () => {
                // Admin-only
                if (user === 'guest' || !db.users[user].permissions?.includes('admin')) {
                    return reply.code(403).send({ error: 'Admin access required' });
                }

                const { username, password, permissions, email, coins } = request.body as {
                    username: string;
                    password: string;
                    permissions?: string;
                    email?: string;
                    coins?: number;
                };

                // Validation
                if (!username || !password) {
                    return reply.code(400).send({ error: 'Username and password required' });
                }

                if (typeof username !== 'string' || typeof password !== 'string') {
                    return reply.code(400).send({ error: 'Invalid field types' });
                }

                // Username format validation
                if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
                    return reply.code(400).send({ error: 'Invalid username format (alphanumeric, underscore, dash only)' });
                }

                // Check if user already exists
                if (db.users[username]) {
                    return reply.code(409).send({ error: 'User already exists' });
                }

                if (password.length > 100) {
                    return reply.code(400).send({ error: 'Password too long (max 100 characters)' });
                }

                // Create user
                const initialCoins = coins ?? webgfaConfig.features?.openai?.coinAllocation?.initial ?? 100;

                db.users[username] = {
                    permissions: permissions || '',
                    password: password,
                    save: {},
                    sessionID: '',
                    email: email || '',
                    creationDate: new Date().toISOString(),
                    coins: initialCoins,
                    coinHistory: [{
                        timestamp: new Date().toISOString(),
                        amount: initialCoins,
                        reason: 'Initial allocation',
                        balance: initialCoins
                    }]
                };

                await writeJSONChanges(db);

                reply.send({ success: true, username });
            },
            'admin-delete-user': async () => {
                // Admin-only
                if (user === 'guest' || !db.users[user].permissions?.includes('admin')) {
                    return reply.code(403).send({ error: 'Admin access required' });
                }

                const { username: targetUser } = request.body as { username: string };

                // Validation
                if (!targetUser) {
                    return reply.code(400).send({ error: 'Username required' });
                }

                if (!db.users[targetUser]) {
                    return reply.code(404).send({ error: 'User not found' });
                }

                // Cannot delete yourself
                if (targetUser === user) {
                    return reply.code(400).send({ error: 'Cannot delete yourself' });
                }

                // Cannot delete guest account
                if (targetUser === 'guest') {
                    return reply.code(400).send({ error: 'Cannot delete guest account' });
                }

                // Delete user
                delete db.users[targetUser];
                await writeJSONChanges(db);

                reply.send({ success: true });
            },
            'admin-update-permissions': async () => {
                // Admin-only
                if (user === 'guest' || !db.users[user].permissions?.includes('admin')) {
                    return reply.code(403).send({ error: 'Admin access required' });
                }

                const { username: targetUser, permissions } = request.body as {
                    username: string;
                    permissions: string;
                };

                // Validation
                if (!targetUser || permissions === undefined) {
                    return reply.code(400).send({ error: 'Username and permissions required' });
                }

                if (!db.users[targetUser]) {
                    return reply.code(404).send({ error: 'User not found' });
                }

                if (typeof permissions !== 'string') {
                    return reply.code(400).send({ error: 'Permissions must be a string' });
                }

                // Update permissions
                db.users[targetUser].permissions = permissions;
                await writeJSONChanges(db);

                reply.send({ success: true });
            },
            'admin-reset-password': async () => {
                // Admin-only
                if (user === 'guest' || !db.users[user].permissions?.includes('admin')) {
                    return reply.code(403).send({ error: 'Admin access required' });
                }

                const { username: targetUser, newPassword } = request.body as {
                    username: string;
                    newPassword: string;
                };

                // Validation
                if (!targetUser || !newPassword) {
                    return reply.code(400).send({ error: 'Username and new password required' });
                }

                if (!db.users[targetUser]) {
                    return reply.code(404).send({ error: 'User not found' });
                }

                if (typeof newPassword !== 'string' || newPassword.length > 100) {
                    return reply.code(400).send({ error: 'Invalid password (max 100 characters)' });
                }

                // Update password
                db.users[targetUser].password = newPassword;
                await writeJSONChanges(db);

                reply.send({ success: true });
            },
            'admin-update-user-save': async () => {
                // Admin-only
                if (user === 'guest' || !db.users[user].permissions?.includes('admin')) {
                    return reply.code(403).send({ error: 'Admin access required' });
                }

                const { username: targetUser, save } = request.body as {
                    username: string;
                    save: any;
                };

                // Validation
                if (!targetUser || save === undefined) {
                    return reply.code(400).send({ error: 'Username and save data required' });
                }

                if (!db.users[targetUser]) {
                    return reply.code(404).send({ error: 'User not found' });
                }

                // Check size limit (10MB like regular save-data endpoint)
                const saveStr = JSON.stringify(save);
                if (saveStr.length > 10 * 1024 * 1024) {
                    return reply.code(400).send({ error: 'Save data too large (max 10MB)' });
                }

                // Update save data
                db.users[targetUser].save = save;
                await writeJSONChanges(db);

                reply.send({ success: true });
            },
            'admin-logout-user': async () => {
                // Admin-only
                if (user === 'guest' || !db.users[user].permissions?.includes('admin')) {
                    return reply.code(403).send({ error: 'Admin access required' });
                }

                const { username: targetUser } = request.body as { username: string };

                // Validation
                if (!targetUser) {
                    return reply.code(400).send({ error: 'Username required' });
                }

                if (!db.users[targetUser]) {
                    return reply.code(404).send({ error: 'User not found' });
                }

                // Logout user
                db.users[targetUser].sessionID = '';
                await writeJSONChanges(db);

                reply.send({ success: true });
            },
            'admin-delete-message': async () => {
                // Admin-only
                if (user === 'guest' || !db.users[user].permissions?.includes('admin')) {
                    return reply.code(403).send({ error: 'Admin access required' });
                }

                const { id } = request.body as { id: number };

                // Validation
                if (!id || typeof id !== 'number') {
                    return reply.code(400).send({ error: 'Message ID required' });
                }

                if (!db.messages[id]) {
                    return reply.code(404).send({ error: 'Message not found' });
                }

                // Delete message
                delete db.messages[id];
                await writeJSONChanges(db);
                messageEmitter.emit('message');

                reply.send({ success: true });
            },
            'admin-edit-message': async () => {
                // Admin-only
                if (user === 'guest' || !db.users[user].permissions?.includes('admin')) {
                    return reply.code(403).send({ error: 'Admin access required' });
                }

                const { id, content } = request.body as { id: number; content: string };

                // Validation
                if (!id || !content) {
                    return reply.code(400).send({ error: 'Message ID and content required' });
                }

                if (typeof id !== 'number' || typeof content !== 'string') {
                    return reply.code(400).send({ error: 'Invalid field types' });
                }

                if (content.length > 5000) {
                    return reply.code(400).send({ error: 'Message too long (max 5000 characters)' });
                }

                if (!db.messages[id]) {
                    return reply.code(404).send({ error: 'Message not found' });
                }

                // Update message
                db.messages[id].content = content;
                db.messages[id].edited = true;
                await writeJSONChanges(db);
                messageEmitter.emit('message');

                reply.send({ success: true });
            },
            'admin-reset-game-stats': async () => {
                // Admin-only
                if (user === 'guest' || !db.users[user].permissions?.includes('admin')) {
                    return reply.code(403).send({ error: 'Admin access required' });
                }

                const { gameName, resetType } = request.body as {
                    gameName: string;
                    resetType: 'weekly' | 'monthly' | 'allTime' | 'all';
                };

                // Validation
                if (!gameName || !resetType) {
                    return reply.code(400).send({ error: 'Game name and reset type required' });
                }

                if (!db.gamePopularity[gameName]) {
                    return reply.code(404).send({ error: 'Game not found in statistics' });
                }

                const gameStats = db.gamePopularity[gameName] as any;

                // Reset based on type
                if (resetType === 'weekly' || resetType === 'all') {
                    gameStats.weekly = 0;
                }
                if (resetType === 'monthly' || resetType === 'all') {
                    gameStats.monthly = 0;
                }
                if (resetType === 'allTime' || resetType === 'all') {
                    gameStats.allTime = 0;
                }

                await writeJSONChanges(db);

                reply.send({ success: true });
            }
        }[service];
        const getHandler = {
            'getCSV': async () => {
                // Check permissions (make sure user has admin rights to get the csv)
                if (!db.users[user].permissions?.includes('admin')) {
                    return reply.code(403).send('Forbidden');
                }

                try {
                    const csv = fs.readFileSync(path.resolve(__dirname, '../logs/webgfa.csv'), 'utf8');
                    reply.type('text/csv').send(csv);
                } catch (error) {
                    const err = error as NodeJS.ErrnoException;
                    if (err.code === 'ENOENT') {
                        return reply.code(404).send('File not found');
                    }
                    throw error;
                }
            },
            'get-messages': async () => {
                reply.send(db.messages);
            },
            'get-user': async () => {
                reply.send({user});
            },
            'get-save': async () => {
                if (user === 'guest') return reply.code(403).send('Forbidden for guests');
                reply.send({data: db.users[user].save});
            },

            'getGames': async () => {
                const base = games.games || {};
                const prem = db.users[user].permissions?.includes('prem')
                    ? games.premiumGames || {}
                    : {};

                reply.send({base, prem});

            },
            'getTools': async () => {
                let base: any = games.tools || {};
                // Filter out Admin Panel for non-admin users
                if (!db.users[user].permissions?.includes('admin')) {
                    base = Object.fromEntries(
                        Object.entries(base).filter(([key]) => key !== 'Admin Panel')
                    );
                }
                const prem = db.users[user].permissions?.includes('prem')
                    ? games.premiumTools || {}
                    : {};

                reply.send({base, prem});

            },
            'getPopGames': async () => {
                const {updated, ...gamePopularity} = db.gamePopularity;
                reply.send(gamePopularity);
            },
            'updates': async () => {
                const res = reply.raw;

                res.setHeader('Content-Type', 'text/event-stream');
                res.setHeader('Cache-Control', 'no-cache');
                res.setHeader('Connection', 'keep-alive');

                const sendUpdate = () => {
                    res.write("Update\n\n");
                }

                messageEmitter.on('message', sendUpdate);

                request.raw.on('close', () => {
                    // Clean up event listener to prevent memory leak
                    messageEmitter.removeListener('message', sendUpdate);
                    res.end();
                });
            },
            'has-email': async () => {
                return reply.code(503).send("Email service down");
                /*
                if (user === "guest") return reply.code(403).send("Guests do not have an email.");
                const hasEmail = String(Boolean(emailUtils.isValidEmail(db.users[user].email)));
                return reply.code(200).send(hasEmail);
                 */
            },
            'is-premium': async () => {
                if (user === "guest") return reply.send({premium: false});
                return reply.send({premium: db.users[user].permissions?.includes('prem')});
            },
            'premium-game-count': async () => {
                const premiumGameCount = Object.keys(games.premiumGames || {}).length;
                return reply.send({premiumGameCount: premiumGameCount});
            },
            'get-coins': async () => {
                if (user === 'guest') {
                    return reply.code(403).send({ error: 'Forbidden for guests' });
                }

                const coins = db.users[user].coins ?? 100;
                const history = db.users[user].coinHistory ?? [];

                reply.send({
                    balance: coins,
                    history: history.slice(-10)  // Last 10 transactions
                });
            },
            // Admin Panel GET Endpoints
            'admin-get-users': async () => {
                // Admin-only
                if (user === 'guest' || !db.users[user].permissions?.includes('admin')) {
                    return reply.code(403).send({ error: 'Admin access required' });
                }

                // Get all users including passwords for admin viewing
                const users = Object.keys(db.users).map(username => {
                    const u = db.users[username];
                    return {
                        username,
                        password: u.password || '',
                        permissions: u.permissions || '',
                        email: u.email || '',
                        creationDate: u.creationDate || '',
                        coins: u.coins ?? 0,
                        hasSession: u.sessionID !== '',
                        saveDataSize: JSON.stringify(u.save).length
                    };
                });

                reply.send({ users });
            },
            'admin-get-user-details': async () => {
                // Admin-only
                if (user === 'guest' || !db.users[user].permissions?.includes('admin')) {
                    return reply.code(403).send({ error: 'Admin access required' });
                }

                const targetUser = String((request.query as any).username || '');

                if (!targetUser) {
                    return reply.code(400).send({ error: 'Username query parameter required' });
                }

                if (!db.users[targetUser]) {
                    return reply.code(404).send({ error: 'User not found' });
                }

                const u = db.users[targetUser];

                // Return full user object (except password)
                reply.send({
                    username: targetUser,
                    permissions: u.permissions || '',
                    email: u.email || '',
                    creationDate: u.creationDate || '',
                    coins: u.coins ?? 0,
                    coinHistory: u.coinHistory || [],
                    sessionID: u.sessionID,
                    save: u.save
                });
            },
            'admin-get-all-messages': async () => {
                // Admin-only
                if (user === 'guest' || !db.users[user].permissions?.includes('admin')) {
                    return reply.code(403).send({ error: 'Admin access required' });
                }

                // Get all messages, sorted by ID descending (newest first)
                const messages = Object.keys(db.messages)
                    .map(id => db.messages[Number(id)])
                    .sort((a, b) => b.id - a.id);

                reply.send({ messages });
            },
            'admin-get-game-stats': async () => {
                // Admin-only
                if (user === 'guest' || !db.users[user].permissions?.includes('admin')) {
                    return reply.code(403).send({ error: 'Admin access required' });
                }

                // Get game popularity stats
                const stats: any = {};
                const updated = db.gamePopularity.updated || { month: '', week: '' };

                Object.keys(db.gamePopularity).forEach(key => {
                    if (key !== 'updated') {
                        stats[key] = db.gamePopularity[key];
                    }
                });

                reply.send({
                    stats,
                    lastUpdated: updated
                });
            },
            'admin-export-database': async () => {
                // Admin-only
                if (user === 'guest' || !db.users[user].permissions?.includes('admin')) {
                    return reply.code(403).send({ error: 'Admin access required' });
                }

                // Export entire database as JSON
                reply.type('application/json').send(db);
            }
        }[service];

        if (request.method === 'POST' && postHandler) {
            await postHandler();
        } else if (request.method === 'GET' && getHandler) {
            await getHandler();
        } else {
            if (dev) console.info(`Invalid service: ${service}`);
            return reply.code(400).send('Invalid service / method for service');
        }
    } catch (error) {
        console.error('API error:', error);
        return reply.code(500).send('Server error');
    }
    if (!reply.raw.headersSent) return reply.code(202).send('Status code not set, contact owner.');
}

function serveHtmlFile(reqPath: string, request: FastifyRequest, reply: FastifyReply) {
    const staticDir = path.resolve(__dirname, '../static');
    try {
        const normalizedPath = normalizePath(reqPath);
        const fullPath = path.resolve(staticDir, normalizedPath.slice(1));

        const sessionId = String(request.cookies.uid);
        const user = sessionId.includes('GUEST-ACCOUNT') ? 'guest' : Object.keys(db.users).find(user => db.users[user].sessionID === sessionId);

        if (!user) {
            throw new Error("somehow, the user does not exist. either the user manually edited the cookies or i fucked something up. the latter is obviously more likely")
        }
        // Security check
        if (!fullPath.startsWith(staticDir)) {
            console.log(fullPath);
            console.log(normalizedPath)
            throw new Error('Invalid path');
        }

        // Admin page protection
        if (normalizedPath.startsWith('/admin/') &&
            (user === 'guest' || !db.users[user].permissions?.includes('admin'))) {
            return reply.code(403).sendFile(path.resolve(staticDir, "403.html"));
        }

        const fullURL = normalizedPath + (request.url.split('?')[1] ? '?' + request.url.split('?')[1] : "")
        const allGames = Object.assign({}, games.games, games.premiumGames);
        const game = Object.entries(allGames).find(([_, v]) => v === fullURL);

        let html: string;
        if (!game) {
            // If it isn't a game read the file in
            html = fs.readFileSync(fullPath, 'utf8');
        } else if (game[0] in games.premiumGames && !db.users[user].permissions?.includes('prem')) {
            html = fs.readFileSync(path.resolve(staticDir, "403.html"), 'utf8');
        } else {
            html = fs.readFileSync(fullPath, 'utf8');
        }

        const filteredTags = extraTags.filter(tag => {
            return !Object.entries(excludedTags).some(([pathKey, excludedTag]) => {
                const isMatchingPath = reqPath === pathKey || normalizedPath === pathKey;
                return isMatchingPath && tag === excludedTag;
            });
        });

        if (!html.includes('<body>')) {
            html += filteredTags.join('');
        } else {
            html = html.replace('<body>', '<body>' + filteredTags.join(''));
        }

        reply.code(200).header('Content-Type', 'text/html').send(html);
    } catch (error) {
        const err = error as NodeJS.ErrnoException;

        // Don't send response if headers already sent
        if (reply.raw.headersSent) {
            return;
        }

        // Classify error types
        if (err.code === 'ENOENT') {
            // File not found - serve 404
            if (fs.existsSync(path.join(staticDir, "404.html"))) {
                return reply.code(404).sendFile(path.join(staticDir, '404.html'));
            } else {
                return reply.code(404).type('txt').send('HTTP ERROR 404: Page not found');
            }
        } else if (err.code === 'EACCES') {
            // Permission denied
            console.error('Permission denied accessing file:', reqPath, err);
            return reply.code(403).send('Forbidden');
        } else {
            // Other errors (read errors, etc.)
            console.error('File serve error:', reqPath, err);
            return reply.code(500).send('Internal Server Error');
        }
    }
}

interface CSVRow {
    [key: string]: string | number | Date;
}

let oldTable: string[][] = [];

async function updateTable(jsonObject: CSVRow, filePath: string, oldTable: string[][] = []): Promise<string[][]> {
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
        const value = jsonObject[header] ?? '';
        return `"${value.toString().replace(/"/g, '""')}"`;
    });

    table.push(newRow);

    // Write file asynchronously with mutex lock
    const csvContent = table.map(row => row.join(',')).join('\n');

    const currentWrite = csvWriteLock.then(async () => {
        try {
            await fs.promises.writeFile(filePath, csvContent, 'utf8');
        } catch (error) {
            console.error('Error writing CSV file:', error);
            throw error;
        }
    });

    csvWriteLock = currentWrite.catch(() => {}); // Prevent rejection from blocking queue
    await currentWrite;

    return table;
}

process.on("SIGINT", async () => {
    console.log("🛑 Trying to shut down gracefully...");

    const forceTimeout = setTimeout(() => {
        console.error("❌ Forcing shutdown (took too long)");
        process.exit(1);
    }, 5000);

    try {
        await fastify.close();
        clearTimeout(forceTimeout);
        console.log("✅ Server closed cleanly");
        process.exit(0);
    } catch (err) {
        console.error("⚠️ Error during shutdown:", err);
        process.exit(1);
    }
});

