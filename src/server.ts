/////////////////////////////////////////////////////////////
//                   IMPORT STATEMENTS                     //
/////////////////////////////////////////////////////////////

// Server
import Fastify, { FastifyReply, FastifyRequest } from "fastify";
import fastifyStatic from "@fastify/static";
import fastifyCookie from "@fastify/cookie";
import fastifyFormbody from "@fastify/formbody";
import fastifyMultipart from "@fastify/multipart";

// Node Built-ins
import path from "path";
import fs from "fs";
import { exec } from "child_process";
import crypto from "crypto";
import { EventEmitter } from "events";
import { fileURLToPath } from "url";

// Database
import {
  users,
  gamePopularity,
  metadata
} from "./database.js";

// API
import { handleApiRequest } from "./api.js";

// Dotenv
import { config } from "dotenv";

config();

// needed to have the directory be at /src, not / (relative to the package.json)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
process.chdir(__dirname);

// custom imports

if (!fs.existsSync("../config.json")) {
  fs.copyFileSync("../default-config.json", "../config.json");
  console.log("Created config file at '../config.json'");
}

const webgfaConfig = (
  await import(`../config.json`, { with: { type: "json" } })
).default;
import games from "../games.json" with { type: "json" };

/////////////////////////////////////////////////////////////
//                 CONSTANTS & CONFIGURATION               //
/////////////////////////////////////////////////////////////

// Make logs directory
fs.mkdirSync(path.join(__dirname, "../logs"), { recursive: true });

const dev = process.argv.includes("--dev");
const fastify = Fastify({
  logger: {
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "HH:MM:ss Z",
        ignore: "pid,hostname",
      },
    },
    level: "warn",
  },
});
const HTTP_PORT: number = Number(
  process.env.PORT
    ? process.env.PORT
    : dev
      ? webgfaConfig.ports.development
      : webgfaConfig.ports.main,
);

const extraTags = [
  // autoload scripts for cloaking, saving, and particles
  "<script src='/assets/js/aboutblankcloak.js' type='module'></script>",
  "<script src='/assets/js/autoSave.js' type='module'></script>",
  "<script src='/assets/js/particles.js'></script>",

  // client config
  `<script> const config = JSON.parse('${JSON.stringify(webgfaConfig["client-config"])}')</script>`,

  // particles div
  "<div id='particles-js' style='position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: -1;'></div>",
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
  index: false,
});

// Parsers
fastify.register(fastifyCookie);
fastify.register(fastifyFormbody);
fastify.register(fastifyMultipart, {
  limits: {
    fileSize: webgfaConfig.features.openai?.fileUpload?.maxFileSize ?? 5242880,
    files: webgfaConfig.features.openai?.fileUpload?.maxFiles ?? 10,
  },
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
  (games.tools as Record<string, string>)["Interstellar"] =
    webgfaConfig.features.interstellarURL;
}
// Force Disable email for now
webgfaConfig["client-config"].email.enabled = false;
try {
  await startServer();
} catch (error) {
  console.error("Initialization failed:", error);
  process.exit(1);
}

/////////////////////////////////////////////////////////////
//                     FUNCTIONS                           //
/////////////////////////////////////////////////////////////
async function handleMainRequest(request: FastifyRequest, reply: FastifyReply) {
  const reqPath = normalizePath(request.url.split("?")[0]);
  const sessionId = request.cookies.uid
    ? request.cookies.uid
    : "GUEST-ACCOUNT-" + generateUID();
  if (!sessionId) {
    reply.cookie("uid", sessionId, { httpOnly: true, secure: true });
  }
  const foundUser = users.getBySessionId(sessionId);
  const user = foundUser?.username || "guest";

  const prefixesToIgnore = ["/api/", "/webhook/"];

  if (
    prefixesToIgnore.some((prefix) => reqPath.startsWith(prefix)) ||
    request.method !== "GET"
  ) {
    return;
  }

  if (isHtmlRequest(reqPath)) {
    // Check if this is a directory-like path without trailing slash
    const originalPath = request.url.split("?")[0];
    const lastSegment = originalPath.split("/").pop() || "";
    const hasExtension = /\.[a-zA-Z0-9]+$/.test(lastSegment);

    if (!hasExtension && !originalPath.endsWith("/") && originalPath !== "/") {
      // Redirect to version with trailing slash to fix relative URL resolution
      const queryString = request.url.split("?")[1];
      const redirectUrl =
        originalPath + "/" + (queryString ? "?" + queryString : "");
      return reply.code(301).redirect(redirectUrl);
    }

    serveHtmlFile(reqPath, request, reply);
    await handleStatistics(request, reply, user as string, sessionId as string); // TODO: actually fix it
  }
}

async function handleLogin(request: FastifyRequest, reply: FastifyReply) {
  const { username, password } = request.body as LoginRequest;

  const dbUser = users.get(username);
  if (!dbUser) return reply.code(403).send("User doesn't exist");
  if (dbUser.password === password) {
    // Set login cookies
    const uid =
      username === "guest" ? "GUEST-ACCOUNT-" + generateUID() : generateUID();
    users.setSessionId(username, uid);
    // Only set cookie after DB write succeeds
    reply.cookie("uid", uid, { httpOnly: true, secure: true });
    return reply.code(200).send("Login successful");
  }

  return reply.code(401).send("Invalid credentials");
}

async function handleGuestSession(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const sessionID = String(request.cookies?.uid || "NO-SESSION-ID");
  const isGuest = sessionID.includes("GUEST-ACCOUNT-");
  const isUser = users.sessionExists(sessionID);

  if (isGuest || isUser) return; // already fine, continue chain
  // Create a new guest ID
  const newUID = "GUEST-ACCOUNT-" + generateUID();

  reply.setCookie("uid", newUID, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
  });
}
async function handleGitHubWebhook(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  reply.code(202).send("Accepted");

  if (webgfaConfig.features.githubAutoPull.pull === false) return;

  const event = request.headers["x-github-event"];
  if (event === "push") {
    exec(
      `cd ${path.join(__dirname, "../")} && git pull`,
      (error, stdout, stderr) => {
        if (error) {
          console.error("Git pull failed:", error.message);
          console.error("stderr:", stderr);
          return;
        }
        console.log("Git pull successful:", stdout);

        // Only run restart command if git pull succeeded
        if (webgfaConfig.features.githubAutoPull.restartCommand?.trim()) {
          exec(
            webgfaConfig.features.githubAutoPull.restartCommand,
            (error, stdout, stderr) => {
              if (error) {
                console.error("Restart command failed:", error.message);
                console.error("stderr:", stderr);
                return;
              }
              console.log("Restart command successful:", stdout);
            },
          );
        }
      },
    );
  }
}

async function handleStatistics(
  request: FastifyRequest,
  reply: FastifyReply,
  user: string,
  sessionID: string,
) {
  const reqPath = normalizePath(request.url.split("?")[0]);
  const fullURL =
    reqPath +
    (request.url.split("?")[1] ? "?" + request.url.split("?")[1] : "");
  // Add to CSV file
  const humanReadableDate = new Date().toLocaleString();
  let body = {
    Path: fullURL,
    Username: user,
    UID: sessionID,
    Date: humanReadableDate,
  };
  const csvFilePath = path.resolve(__dirname, "../logs/webgfa.csv");
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

  // Check if we need to reset monthly/weekly counts
  const lastMonthReset = metadata.get("popularity_month_reset");
  const lastWeekReset = metadata.get("popularity_week_reset");
  const currentMonth = getStartOfMonth().toISOString();
  const currentWeek = getStartOfWeek().toISOString();

  if (!lastMonthReset) {
    metadata.set("popularity_month_reset", currentMonth);
    metadata.set("popularity_week_reset", currentWeek);
  } else {
    if (lastMonthReset !== currentMonth) {
      // Reset monthly and weekly counts
      gamePopularity.resetMonthly();
      gamePopularity.resetWeekly();
      metadata.set("popularity_month_reset", currentMonth);
      metadata.set("popularity_week_reset", currentWeek);
    } else if (lastWeekReset !== currentWeek) {
      // Reset only weekly counts
      gamePopularity.resetWeekly();
      metadata.set("popularity_week_reset", currentWeek);
    }
  }

  if (reqPath.includes("/games")) {
    const allGames = Object.assign({}, games.games, games.premiumGames);
    const game = Object.entries(allGames).find(([_, v]) => v === fullURL);
    if (!game) return;
    const [name, url] = game;
    const existingPop = gamePopularity.get(name);

    if (existingPop) {
      // Increment existing game
      gamePopularity.increment(name);
    } else {
      // Create new game entry
      gamePopularity.upsert({
        game_name: name,
        url: url,
        premium: name in games.premiumGames ? 1 : 0,
        all_time: 1,
        monthly: 1,
        weekly: 1,
      });
    }
  }
}

async function startServer() {
  try {
    await fastify.listen({ port: HTTP_PORT, host: "0.0.0.0" });
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

// Mutex lock for CSV writes to prevent race conditions
let csvWriteLock: Promise<void> = Promise.resolve();

function isHtmlRequest(path: string) {
  return (
    path === "/" ||
    Boolean(path.match(/^\/([^\/?.#]+\/)*([^\/?.#]+\.html|[^\/?.#]+\/?)$/))
  );
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

function serveHtmlFile(
  reqPath: string,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const staticDir = path.resolve(__dirname, "../static");
  try {
    const normalizedPath = normalizePath(reqPath);
    const fullPath = path.resolve(staticDir, normalizedPath.slice(1));

    const sessionId = String(request.cookies.uid);
    const dbUser = sessionId.includes("GUEST-ACCOUNT")
      ? null
      : users.getBySessionId(sessionId);
    const user =
      dbUser?.username ||
      (sessionId.includes("GUEST-ACCOUNT") ? "guest" : null);

    if (!user) {
      throw new Error(
        "somehow, the user does not exist. either the user manually edited the cookies or i fucked something up. the latter is obviously more likely",
      );
    }
    // Security check
    if (!fullPath.startsWith(staticDir)) {
      console.log(fullPath);
      console.log(normalizedPath);
      throw new Error("Invalid path");
    }

    // Admin page protection
    if (
      normalizedPath.startsWith("/admin/") &&
      (user === "guest" || !dbUser?.permissions?.includes("admin"))
    ) {
      return reply.code(403).sendFile(path.resolve(staticDir, "403.html"));
    }

    const fullURL =
      normalizedPath +
      (request.url.split("?")[1] ? "?" + request.url.split("?")[1] : "");
    const allGames = Object.assign({}, games.games, games.premiumGames);
    const game = Object.entries(allGames).find(([_, v]) => v === fullURL);

    let html: string;
    let statusCode = 200;
    if (!game) {
      // If it isn't a game read the file in
      html = fs.readFileSync(fullPath, "utf8");
    } else if (
      game[0] in games.premiumGames &&
      !dbUser?.permissions?.includes("prem")
    ) {
      html = fs.readFileSync(path.resolve(staticDir, "403.html"), "utf8");
      statusCode = 403;
    } else {
      html = fs.readFileSync(fullPath, "utf8");
    }

    const filteredTags = extraTags.filter((tag) => {
      return !Object.entries(excludedTags).some(([pathKey, excludedTag]) => {
        const isMatchingPath =
          reqPath === pathKey || normalizedPath === pathKey;
        return isMatchingPath && tag === excludedTag;
      });
    });

    if (!html.includes("<body>")) {
      html += filteredTags.join("");
    } else {
      html = html.replace("<body>", "<body>" + filteredTags.join(""));
    }

    reply.code(statusCode).header("Content-Type", "text/html").send(html);
  } catch (error) {
    const err = error as NodeJS.ErrnoException;

    // Don't send response if headers already sent
    if (reply.raw.headersSent) {
      return;
    }

    // Classify error types
    if (err.code === "ENOENT") {
      // File not found - serve 404
      if (fs.existsSync(path.join(staticDir, "404.html"))) {
        return reply.code(404).sendFile(path.join(staticDir, "404.html"));
      } else {
        return reply
          .code(404)
          .type("txt")
          .send("HTTP ERROR 404: Page not found");
      }
    } else if (err.code === "EACCES") {
      // Permission denied
      console.error("Permission denied accessing file:", reqPath, err);
      return reply.code(403).send("Forbidden");
    } else {
      // Other errors (read errors, etc.)
      console.error("File serve error:", reqPath, err);
      return reply.code(500).send("Internal Server Error");
    }
  }
}

interface CSVRow {
  [key: string]: string | number | Date;
}

let oldTable: string[][] = [];

async function updateTable(
  jsonObject: CSVRow,
  filePath: string,
  oldTable: string[][] = [],
): Promise<string[][]> {
  let table = oldTable || [];
  let headers = table.length > 0 ? table[0] : [];

  // Check for new keys
  const newKeys = Object.keys(jsonObject).filter(
    (key) => !headers.includes(key),
  );
  if (newKeys.length > 0) {
    headers.push(...newKeys);
    if (table.length > 0) {
      table.slice(1).forEach((row) => {
        newKeys.forEach(() => row.push(""));
      });
    }
    table[0] = headers;
  }

  // Create new row with CSV escaping
  const newRow = headers.map((header) => {
    const value = jsonObject[header] ?? "";
    return `"${value.toString().replace(/"/g, '""')}"`;
  });

  table.push(newRow);

  // Write file asynchronously with mutex lock
  const csvContent = table.map((row) => row.join(",")).join("\n");

  const currentWrite = csvWriteLock.then(async () => {
    try {
      await fs.promises.writeFile(filePath, csvContent, "utf8");
    } catch (error) {
      console.error("Error writing CSV file:", error);
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
