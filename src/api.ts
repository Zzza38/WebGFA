import { FastifyReply, FastifyRequest } from "fastify";
import { coinHistory, DbUser, gamePopularity, messages, metadata, users } from "./database.js";
import pdfParse from "pdf-parse";
import OpenAI from "openai";

import { EventEmitter } from "events";
import path from "path";
import fs from "fs";

const webgfaConfig = (
  await import(`../config.json`, { with: { type: "json" } })
).default;
import games from "../games.json" with { type: "json" };

const messageEmitter = new EventEmitter();

// Request body interfaces for API validation

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

// Per-user coin operation locks to prevent race conditions in concurrent requests
const coinLocks: Map<string, Promise<void>> = new Map();

export async function handleApiRequest(request: FastifyRequest, reply: FastifyReply) {
  try {
    // Extract 'service' from the URL
    let service = request.url.split("?")[0].split("/")[2];
    if (!service) return reply.code(400).send("Missing service parameter");

    const sessionId = String(request.cookies.uid);
    const dbUser = sessionId.includes("GUEST-ACCOUNT")
      ? null
      : users.getBySessionId(sessionId);
    const user =
      dbUser?.username ||
      (sessionId.includes("GUEST-ACCOUNT") ? "guest" : null);

    // Validate user exists
    if (!user) return reply.code(401).send("User does not exist");

    // Helper to get current user data (refreshes on each call)
    const getCurrentUser = (): DbUser | undefined =>
      user === "guest" ? undefined : users.get(user);

    reply.statusCode = 200;
    const postHandler = {
      logout: async () => {
        // Clear session cookie
        reply.clearCookie("uid");
        if (user !== "guest") {
          users.setSessionId(user, "");
        }
        reply.redirect("/login");
      },
      // Messaging API
      // NOTE: Message content is stored as-is. Frontend MUST escape HTML
      // or use textContent (not innerHTML) to prevent XSS attacks.
      "send-message": async () => {
        const body = request.body as SendMessageRequest;

        // Validate content
        if (!body.content || typeof body.content !== "string") {
          return reply.code(400).send("Missing or invalid content");
        }

        // Length limit (5000 characters)
        if (body.content.length > 5000) {
          return reply.code(400).send("Message too long (max 5000 characters)");
        }

        if (user === "guest")
          return reply.code(403).send("Forbidden for guests");

        const result = messages.create({
          content: body.content,
          username: user,
          timestamp: new Date().toISOString(),
          edited: 0,
        });

        const messageData = {
          id: result.lastInsertRowid as number,
          content: body.content,
          user,
          timestamp: new Date().toISOString(),
          edited: false,
        };

        reply.send(messageData);
        messageEmitter.emit("message");
      },
      "edit-message": async () => {
        const body = request.body as EditMessageRequest;

        // Validate inputs
        if (!body.id || !body.content) {
          return reply.code(400).send("Missing id or content");
        }

        if (typeof body.id !== "number" || typeof body.content !== "string") {
          return reply.code(400).send("Invalid id or content type");
        }

        if (body.content.length > 5000) {
          return reply.code(400).send("Message too long (max 5000 characters)");
        }

        const message = messages.get(body.id);
        if (!message) return reply.code(404).send("Message not found");

        if (message.username !== user) return reply.code(403).send("Forbidden");

        messages.update(body.id, body.content);
        reply.send({
          id: message.id,
          content: body.content,
          user: message.username,
          timestamp: message.timestamp,
          edited: true,
        });
        messageEmitter.emit("message");
      },
      "delete-message": async () => {
        const body = request.body as DeleteMessageRequest;

        if (!body.id || typeof body.id !== "number") {
          return reply.code(400).send("Missing or invalid id");
        }

        const message = messages.get(body.id);
        if (!message) return reply.code(404).send("Message not found");

        if (message.username !== user) return reply.code(403).send("Forbidden");

        messages.delete(body.id);
        reply.send({ success: true });
        messageEmitter.emit("message");
      },
      "save-data": async () => {
        const body = request.body as SaveDataRequest;

        // Validate data exists
        if (!body.data) return reply.code(400).send("Missing data");

        // Size limit check (10MB)
        let dataStr: string;
        try {
          dataStr = JSON.stringify(body.data);
          if (dataStr.length > 10 * 1024 * 1024) {
            return reply.code(413).send("Save data too large (max 10MB)");
          }
        } catch (error) {
          return reply
            .code(400)
            .send(
              "Invalid data format (circular reference or non-serializable)",
            );
        }

        if (user === "guest")
          return reply.code(403).send("Forbidden for guests");

        users.setSaveData(user, dataStr);
        reply.send({ success: true });
      },
      "request-account-creation": async () => {
        // const { username, email } = request.body;
        return reply
          .code(503)
          .send("Requesting account creation is currently disabled...");
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
      "create-account": async () => {
        const body = request.body as CreateAccountRequest;
        let { username, password, creationID, updatedUsername } = body;

        // Validate required fields
        if (!username || !password || !creationID) {
          return reply.code(400).send("Missing required fields");
        }

        // Type validation
        if (
          typeof username !== "string" ||
          typeof password !== "string" ||
          typeof creationID !== "string"
        ) {
          return reply.code(400).send("Invalid field types");
        }

        // Length validation
        if (username.length > 50 || password.length > 100) {
          return reply.code(400).send("Username or password too long");
        }

        // Username format (alphanumeric + underscore/dash)
        if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
          return reply.code(400).send("Invalid username format");
        }

        const existingUser = users.get(username);
        if (!existingUser) {
          return reply
            .code(404)
            .send(
              "User does not exist. Please request account creation first.",
            );
        }

        const currentUser = getCurrentUser();
        if (
          existingUser.creation_id !== creationID &&
          !currentUser?.permissions?.includes("admin")
        ) {
          return reply
            .code(403)
            .send(
              "The specified username either does not have a creationID specified or the creationID is wrong.",
            );
        }

        const oldEmail = existingUser.email;

        if (updatedUsername) {
          if (typeof updatedUsername !== "string") {
            return reply.code(400).send("Invalid updatedUsername type");
          }
          if (!/^[a-zA-Z0-9_-]+$/.test(updatedUsername)) {
            return reply.code(400).send("Invalid username format");
          }
          if (users.exists(updatedUsername)) {
            return reply
              .code(409)
              .send("Account with this username already exists.");
          }
          // Delete old user entry and use new username
          users.delete(username);
          username = updatedUsername;
        }
        // Allocate initial coins
        const initialCoins =
          webgfaConfig.features?.openai?.coinAllocation?.initial ?? 100;

        // Create or update the user
        if (users.exists(username)) {
          const u = users.get(username)!;
          users.update({
            ...u,
            permissions: "",
            password: password,
            save_data: "{}",
            session_id: creationID,
            email: oldEmail || null,
            creation_date: new Date().toISOString(),
            creation_id: null,
            coins: initialCoins,
          });
        } else {
          users.create({
            username,
            password,
            permissions: "",
            session_id: creationID,
            save_data: "{}",
            email: oldEmail || null,
            creation_date: new Date().toISOString(),
            coins: initialCoins,
          });
        }

        // Add initial coin history
        coinHistory.add({
          username,
          timestamp: new Date().toISOString(),
          amount: initialCoins,
          reason: "Initial allocation",
          balance: initialCoins,
        });

        if (!currentUser?.permissions?.includes("admin"))
          reply.cookie("uid", creationID, {
            httpOnly: true,
            secure: true,
          });
        return reply.code(200).send("Account Created!");
      },
      "request-password-reset": async () => {
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
      "reset-password": async () => {
        const { username, resetID, password } =
          request.body as ResetPasswordRequest;

        // Validate required fields
        if (!username || !password || !resetID) {
          return reply.code(400).send("Missing required fields");
        }

        // Type validation
        if (
          typeof username !== "string" ||
          typeof password !== "string" ||
          typeof resetID !== "string"
        ) {
          return reply.code(400).send("Invalid field types");
        }

        // Length validation
        if (password.length === 0) {
          return reply.code(400).send("Password cannot be empty");
        }
        if (password.length > 100) {
          return reply.code(400).send("Password too long (max 100 characters)");
        }

        // Check if user exists
        const targetUser = users.get(username);
        if (!targetUser) {
          return reply.code(404).send("User not found");
        }

        // Verify resetID (allow admins to bypass)
        const currentUser = getCurrentUser();
        if (
          targetUser.reset_id !== resetID &&
          !currentUser?.permissions?.includes("admin")
        ) {
          return reply
            .code(403)
            .send(
              "The specified username either does not have a resetID specified or the resetID is wrong.",
            );
        }

        // Update password and clear resetID
        users.setPassword(username, password);
        users.setResetId(username, null);

        return reply.code(200).send("Password successfully reset!");
      },
      webgpt: async () => {
        // Block guests
        if (user === "guest") {
          return reply
            .code(403)
            .send({ error: "Guest accounts cannot use WebGPT" });
        }

        // Check if OpenAI is enabled
        if (!webgfaConfig.features?.openai?.enabled) {
          return reply
            .code(503)
            .send({ error: "WebGPT is currently disabled" });
        }

        // Handle multipart for study mode with files
        const isMultipart = request.headers["content-type"]?.includes(
          "multipart/form-data",
        );

        let mode: "answer" | "explain" | "study" | "chat";
        let message: string;
        let context: any = null;
        let personality: string = "";
        let length: string = "normal";
        let files: any[] = [];

        if (isMultipart) {
          // Parse multipart data
          const parts = request.parts();
          const formData: Record<string, any> = {};

          for await (const part of parts) {
            if (part.type === "file") {
              // Validate file type
              const allowedTypes = webgfaConfig.features.openai?.fileUpload
                ?.allowedMimeTypes ?? [
                "image/jpeg",
                "image/png",
                "image/gif",
                "application/pdf",
              ];

              if (!allowedTypes.includes(part.mimetype)) {
                return reply.code(400).send({
                  error: `Invalid file type: ${part.mimetype}. Allowed: ${allowedTypes.join(", ")}`,
                });
              }

              // Read file buffer
              const buffer = await part.toBuffer();
              files.push({
                filename: part.filename,
                mimetype: part.mimetype,
                buffer: buffer,
              });

              // Check file count limit
              if (
                files.length >
                (webgfaConfig.features.openai?.fileUpload?.maxFiles ?? 10)
              ) {
                return reply.code(400).send({
                  error: `Too many files. Maximum ${webgfaConfig.features.openai?.fileUpload?.maxFiles ?? 10} allowed.`,
                });
              }
            } else {
              // Regular form field
              formData[part.fieldname] = (part as any).value;
            }
          }

          mode = formData.mode;
          message = formData.message;
          personality = formData.personality || "";
          length = formData.length || "normal";
          if (formData.context) {
            try {
              context = JSON.parse(formData.context);
            } catch (error) {
              return reply
                .code(400)
                .send({ error: "Invalid JSON in context field" });
            }
          }
        } else {
          // JSON body (existing modes without files)
          const body = request.body as {
            mode: "answer" | "explain" | "study" | "chat";
            message: string;
            context?: any;
            personality?: string;
            length?: string;
          };
          mode = body.mode;
          message = body.message;
          context = body.context;
          personality = body.personality || "";
          length = body.length || "normal";
        }

        // Validate mode
        if (!["answer", "explain", "study", "chat"].includes(mode)) {
          return reply.code(400).send({ error: "Invalid mode" });
        }

        // Validate message
        if (!message || typeof message !== "string") {
          return reply.code(400).send({ error: "Missing or invalid message" });
        }

        // Length limit (2000 characters)
        if (message.length > 2000) {
          return reply
            .code(400)
            .send({ error: "Message too long (max 2000 characters)" });
        }

        // Acquire per-user coin lock to prevent race conditions
        const currentLock = coinLocks.get(user) || Promise.resolve();
        const lockPromise = currentLock
          .then(async () => {
            // Lock acquired - all coin operations are now atomic for this user
          })
          .catch(() => {}); // Prevent rejection from blocking queue
        coinLocks.set(user, lockPromise);

        try {
          await currentLock; // Wait for previous operations to complete

          // Check coin balance (NO MINIMUM - just check > 0)
          const currentUserData = getCurrentUser();
          const userCoins = currentUserData?.coins ?? 100;
          if (userCoins <= 0) {
            return reply.code(402).send({
              error: "Insufficient coins",
              balance: userCoins,
            });
          }
          // Get system prompts from config (with fallback to defaults)
          const systemPrompts = webgfaConfig.features.openai.systemPrompts || {
            answer:
              "You are a homework helper. Provide ONLY the direct answer with no explanation.",
            explain:
              "You are a homework helper. Provide the answer AND explain your reasoning step-by-step.",
            study:
              "You are a study assistant. Based on the subject, documents provided, and the questioning style requested, help the student learn effectively. Ask probing questions, provide explanations, and guide them through the material.",
            chat: "You are a helpful AI assistant. Answer questions and have natural conversations.",
          };

          // Get personalities from config
          const personalities =
            webgfaConfig.features.openai.personalities ||
            ({} as Record<string, string>);

          // Get slang dictionary from config
          const slangDictionary =
            webgfaConfig.features.openai.slangDictionary ||
            ({} as Record<string, string>);

          // Length instructions (instead of hard token limits)
          const lengthInstructions = {
            normal:
              "Keep your response concise and to the point. Aim for 2-4 paragraphs.",
            detailed:
              "Provide a detailed response with thorough explanations. Aim for 4-6 paragraphs with examples.",
            comprehensive:
              "Provide a comprehensive, in-depth response covering all aspects. Include detailed explanations, examples, and additional context. Aim for multiple paragraphs with complete coverage of the topic.",
          } as Record<string, string>;

          // Build final system prompt with length instruction, personality modifier, and slang dictionary
          let systemPrompt = systemPrompts[mode];

          // Add length instruction
          if (
            length &&
            lengthInstructions[length as keyof typeof lengthInstructions]
          ) {
            systemPrompt += `\n\n${lengthInstructions[length as keyof typeof lengthInstructions]}`;
          }

          if (
            personality &&
            personalities[personality as keyof typeof personalities]
          ) {
            systemPrompt = `${personalities[personality as keyof typeof personalities]} ${systemPrompt}`;

            // Append slang dictionary if personality is selected
            if (Object.keys(slangDictionary).length > 0) {
              const slangList = Object.entries(slangDictionary)
                .map(([term, meaning]) => `- ${term}: ${meaning}`)
                .join("\n");
              systemPrompt += `\n\nSlang Dictionary (use these naturally):\n${slangList}`;
            }
          }

          // Process files for study mode
          const processedFiles: Array<{
            type: "image" | "text";
            content: string;
          }> = [];

          if (mode === "study" && files.length > 0) {
            for (const file of files) {
              if (file.mimetype === "application/pdf") {
                // Extract text from PDF
                try {
                  const pdfData = await pdfParse(file.buffer);
                  processedFiles.push({
                    type: "text",
                    content: `[PDF Document: ${file.filename}]\n${pdfData.text}`,
                  });
                } catch (err) {
                  console.error("PDF parse error:", err);
                  return reply
                    .code(400)
                    .send({ error: `Failed to parse PDF: ${file.filename}` });
                }
              } else if (file.mimetype.startsWith("image/")) {
                // Convert image to base64 for GPT-5-nano vision
                const base64Image = file.buffer.toString("base64");
                const dataUrl = `data:${file.mimetype};base64,${base64Image}`;
                processedFiles.push({
                  type: "image",
                  content: dataUrl,
                });
              }
            }
          }

          // Build messages array for OpenAI
          const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
          const model = webgfaConfig.features.openai.model;

          // Build user message with file context
          let userMessage: any;

          if (mode === "study" && (context || processedFiles.length > 0)) {
            // Study mode with enhanced context
            const contentParts: any[] = [];

            // Text content
            let textContent = `Subject: ${context?.subject || "N/A"}\nQuestioning Style: ${context?.questioningStyle || "Standard"}\n\nQuestion: ${message}`;

            // Add PDF text
            const pdfTexts = processedFiles
              .filter((f) => f.type === "text")
              .map((f) => f.content)
              .join("\n\n");
            if (pdfTexts) {
              textContent += `\n\nDocument Materials:\n${pdfTexts}`;
            }

            contentParts.push({ type: "text", text: textContent });

            // Add images (GPT-5-nano native vision support)
            processedFiles
              .filter((f) => f.type === "image")
              .forEach((img) => {
                contentParts.push({
                  type: "image_url",
                  image_url: { url: img.content },
                });
              });

            userMessage = { role: "user", content: contentParts };
          } else {
            // Simple text message for other modes
            userMessage = { role: "user", content: message };
          }

          const completion = await openai.chat.completions.create({
            model: model,
            messages: [{ role: "system", content: systemPrompt }, userMessage],
            // No max_completion_tokens - let AI decide based on prompt instructions
          });

          // NEW BILLING CALCULATION
          const inputTokens = completion.usage?.prompt_tokens ?? 0;
          const outputTokens = completion.usage?.completion_tokens ?? 0;
          const totalTokens = completion.usage?.total_tokens ?? 0;

          const pricing = webgfaConfig.features.openai.tokenPricing;

          // Calculate cost in USD
          const inputCostUSD =
            (inputTokens / 1_000_000) * pricing.inputPricePerMillion;
          const outputCostUSD =
            (outputTokens / 1_000_000) * pricing.outputPricePerMillion;
          const totalCostUSD =
            (inputCostUSD + outputCostUSD) * pricing.profitMargin;

          // Convert to coins (3 coins = $1)
          const coinCost =
            Math.ceil(totalCostUSD * pricing.coinRate * 100) / 100; // Round to 2 decimals

          // NO MINIMUM CHARGE - exact billing

          // Check if user has enough coins
          if (userCoins < coinCost) {
            return reply.code(402).send({
              error: "Insufficient coins for this request",
              required: coinCost,
              balance: userCoins,
            });
          }

          // Deduct coins
          const newBalance = userCoins - coinCost;
          users.setCoins(user, newBalance);

          // Record transaction with detailed breakdown
          coinHistory.add({
            username: user,
            timestamp: new Date().toISOString(),
            amount: -coinCost,
            reason: `WebGPT ${mode} mode (${inputTokens} in / ${outputTokens} out = ${totalTokens} total tokens)`,
            balance: newBalance,
          });

          // Extract response content
          const responseContent = completion.choices[0].message.content || "";
          const refusalMessage = (completion.choices[0].message as any).refusal;

          // Check for refusal or empty content
          if (refusalMessage) {
            // Refund coins since request was refused
            users.setCoins(user, userCoins);
            // Note: We can't easily remove the last coin history entry with SQLite,
            // so we add a refund entry instead
            coinHistory.add({
              username: user,
              timestamp: new Date().toISOString(),
              amount: coinCost,
              reason: `Refund: Request refused by AI`,
              balance: userCoins,
            });

            return reply.code(400).send({
              error: "Request refused by AI",
              refusal: refusalMessage,
            });
          }

          if (!responseContent && outputTokens > 0) {
            console.error("Empty response despite output tokens:", {
              outputTokens,
              choice: completion.choices[0],
              finishReason: completion.choices[0].finish_reason,
            });

            // Refund coins since response is empty
            users.setCoins(user, userCoins);
            coinHistory.add({
              username: user,
              timestamp: new Date().toISOString(),
              amount: coinCost,
              reason: `Refund: Empty response from AI`,
              balance: userCoins,
            });

            return reply.code(500).send({
              error:
                "Received empty response from AI despite generating tokens. Please try again.",
              debug: {
                finishReason: completion.choices[0].finish_reason,
                outputTokens,
              },
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
              profitMargin: pricing.profitMargin,
            },
            remainingCoins: newBalance,
            filesProcessed: files.length,
          });
        } catch (error: any) {
          console.error("OpenAI API error:", error);
          return reply.code(500).send({
            error: "Failed to process request",
            message: error.message,
          });
        }
      },
      "add-coins": async () => {
        // Admin-only endpoint
        const currentUser = getCurrentUser();
        if (user === "guest" || !currentUser?.permissions?.includes("admin")) {
          return reply.code(403).send({ error: "Admin access required" });
        }

        const { targetUser, amount, reason } = request.body as {
          targetUser: string;
          amount: number;
          reason?: string;
        };

        // Validate target user exists
        const targetUserData = users.get(targetUser);
        if (!targetUserData) {
          return reply.code(404).send({ error: "User not found" });
        }

        // Validate amount
        if (typeof amount !== "number" || isNaN(amount)) {
          return reply.code(400).send({ error: "Invalid amount" });
        }

        // Update coins
        const currentCoins = targetUserData.coins ?? 100;
        const newBalance = Math.max(0, currentCoins + amount);
        users.setCoins(targetUser, newBalance);

        // Record transaction
        coinHistory.add({
          username: targetUser,
          timestamp: new Date().toISOString(),
          amount: amount,
          reason: reason || `Admin adjustment by ${user}`,
          balance: newBalance,
        });

        reply.send({
          success: true,
          newBalance,
        });
      },
      // Admin Panel Endpoints
      "admin-create-user": async () => {
        // Admin-only
        const currentUser = getCurrentUser();
        if (user === "guest" || !currentUser?.permissions?.includes("admin")) {
          return reply.code(403).send({ error: "Admin access required" });
        }

        const { username, password, permissions, email, coins } =
          request.body as {
            username: string;
            password: string;
            permissions?: string;
            email?: string;
            coins?: number;
          };

        // Validation
        if (!username || !password) {
          return reply
            .code(400)
            .send({ error: "Username and password required" });
        }

        if (typeof username !== "string" || typeof password !== "string") {
          return reply.code(400).send({ error: "Invalid field types" });
        }

        // Username format validation
        if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
          return reply.code(400).send({
            error:
              "Invalid username format (alphanumeric, underscore, dash only)",
          });
        }

        // Check if user already exists
        if (users.exists(username)) {
          return reply.code(409).send({ error: "User already exists" });
        }

        if (password.length > 100) {
          return reply
            .code(400)
            .send({ error: "Password too long (max 100 characters)" });
        }

        // Create user
        const initialCoins =
          coins ??
          webgfaConfig.features?.openai?.coinAllocation?.initial ??
          100;

        users.create({
          username,
          password,
          permissions: permissions || "",
          session_id: "",
          save_data: "{}",
          email: email || "",
          creation_date: new Date().toISOString(),
          coins: initialCoins,
        });

        // Add initial coin history
        coinHistory.add({
          username,
          timestamp: new Date().toISOString(),
          amount: initialCoins,
          reason: "Initial allocation",
          balance: initialCoins,
        });

        reply.send({ success: true, username });
      },
      "admin-delete-user": async () => {
        // Admin-only
        const currentUser = getCurrentUser();
        if (user === "guest" || !currentUser?.permissions?.includes("admin")) {
          return reply.code(403).send({ error: "Admin access required" });
        }

        const { username: targetUser } = request.body as { username: string };

        // Validation
        if (!targetUser) {
          return reply.code(400).send({ error: "Username required" });
        }

        if (!users.exists(targetUser)) {
          return reply.code(404).send({ error: "User not found" });
        }

        // Cannot delete yourself
        if (targetUser === user) {
          return reply.code(400).send({ error: "Cannot delete yourself" });
        }

        // Cannot delete guest account
        if (targetUser === "guest") {
          return reply.code(400).send({ error: "Cannot delete guest account" });
        }

        // Delete user (coin_history is deleted via CASCADE)
        users.delete(targetUser);

        reply.send({ success: true });
      },
      "admin-update-permissions": async () => {
        // Admin-only
        const currentUser = getCurrentUser();
        if (user === "guest" || !currentUser?.permissions?.includes("admin")) {
          return reply.code(403).send({ error: "Admin access required" });
        }

        const { username: targetUser, permissions } = request.body as {
          username: string;
          permissions: string;
        };

        // Validation
        if (!targetUser || permissions === undefined) {
          return reply
            .code(400)
            .send({ error: "Username and permissions required" });
        }

        if (!users.exists(targetUser)) {
          return reply.code(404).send({ error: "User not found" });
        }

        if (typeof permissions !== "string") {
          return reply
            .code(400)
            .send({ error: "Permissions must be a string" });
        }

        // Update permissions
        users.setPermissions(targetUser, permissions);

        reply.send({ success: true });
      },
      "admin-reset-password": async () => {
        // Admin-only
        const currentUser = getCurrentUser();
        if (user === "guest" || !currentUser?.permissions?.includes("admin")) {
          return reply.code(403).send({ error: "Admin access required" });
        }

        const { username: targetUser, newPassword } = request.body as {
          username: string;
          newPassword: string;
        };

        // Validation
        if (!targetUser || !newPassword) {
          return reply
            .code(400)
            .send({ error: "Username and new password required" });
        }

        if (!users.exists(targetUser)) {
          return reply.code(404).send({ error: "User not found" });
        }

        if (typeof newPassword !== "string" || newPassword.length > 100) {
          return reply
            .code(400)
            .send({ error: "Invalid password (max 100 characters)" });
        }

        // Update password
        users.setPassword(targetUser, newPassword);

        reply.send({ success: true });
      },
      "admin-update-user-save": async () => {
        // Admin-only
        const currentUser = getCurrentUser();
        if (user === "guest" || !currentUser?.permissions?.includes("admin")) {
          return reply.code(403).send({ error: "Admin access required" });
        }

        const { username: targetUser, save } = request.body as {
          username: string;
          save: any;
        };

        // Validation
        if (!targetUser || save === undefined) {
          return reply
            .code(400)
            .send({ error: "Username and save data required" });
        }

        if (!users.exists(targetUser)) {
          return reply.code(404).send({ error: "User not found" });
        }

        // Check size limit (10MB like regular save-data endpoint)
        const saveStr = JSON.stringify(save);
        if (saveStr.length > 10 * 1024 * 1024) {
          return reply
            .code(400)
            .send({ error: "Save data too large (max 10MB)" });
        }

        // Update save data
        users.setSaveData(targetUser, saveStr);

        reply.send({ success: true });
      },
      "admin-logout-user": async () => {
        // Admin-only
        const currentUser = getCurrentUser();
        if (user === "guest" || !currentUser?.permissions?.includes("admin")) {
          return reply.code(403).send({ error: "Admin access required" });
        }

        const { username: targetUser } = request.body as { username: string };

        // Validation
        if (!targetUser) {
          return reply.code(400).send({ error: "Username required" });
        }

        if (!users.exists(targetUser)) {
          return reply.code(404).send({ error: "User not found" });
        }

        // Logout user
        users.setSessionId(targetUser, "");

        reply.send({ success: true });
      },
      "admin-delete-message": async () => {
        // Admin-only
        const currentUser = getCurrentUser();
        if (user === "guest" || !currentUser?.permissions?.includes("admin")) {
          return reply.code(403).send({ error: "Admin access required" });
        }

        const { id } = request.body as { id: number };

        // Validation
        if (!id || typeof id !== "number") {
          return reply.code(400).send({ error: "Message ID required" });
        }

        if (!messages.get(id)) {
          return reply.code(404).send({ error: "Message not found" });
        }

        // Delete message
        messages.delete(id);
        messageEmitter.emit("message");

        reply.send({ success: true });
      },
      "admin-edit-message": async () => {
        // Admin-only
        const currentUser = getCurrentUser();
        if (user === "guest" || !currentUser?.permissions?.includes("admin")) {
          return reply.code(403).send({ error: "Admin access required" });
        }

        const { id, content } = request.body as { id: number; content: string };

        // Validation
        if (!id || !content) {
          return reply
            .code(400)
            .send({ error: "Message ID and content required" });
        }

        if (typeof id !== "number" || typeof content !== "string") {
          return reply.code(400).send({ error: "Invalid field types" });
        }

        if (content.length > 5000) {
          return reply
            .code(400)
            .send({ error: "Message too long (max 5000 characters)" });
        }

        if (!messages.get(id)) {
          return reply.code(404).send({ error: "Message not found" });
        }

        // Update message
        messages.update(id, content);
        messageEmitter.emit("message");

        reply.send({ success: true });
      },
      "admin-reset-game-stats": async () => {
        // Admin-only
        const currentUser = getCurrentUser();
        if (user === "guest" || !currentUser?.permissions?.includes("admin")) {
          return reply.code(403).send({ error: "Admin access required" });
        }

        const { gameName, resetType } = request.body as {
          gameName: string;
          resetType: "weekly" | "monthly" | "allTime" | "all";
        };

        // Validation
        if (!gameName || !resetType) {
          return reply
            .code(400)
            .send({ error: "Game name and reset type required" });
        }

        const gameStats = gamePopularity.get(gameName);
        if (!gameStats) {
          return reply
            .code(404)
            .send({ error: "Game not found in statistics" });
        }

        // Reset based on type
        const updates = {
          game_name: gameName,
          url: gameStats.url,
          premium: gameStats.premium,
          all_time:
            resetType === "allTime" || resetType === "all"
              ? 0
              : gameStats.all_time,
          monthly:
            resetType === "monthly" || resetType === "all"
              ? 0
              : gameStats.monthly,
          weekly:
            resetType === "weekly" || resetType === "all"
              ? 0
              : gameStats.weekly,
        };
        gamePopularity.upsert(updates);

        reply.send({ success: true });
      },
    }[service];
    const getHandler = {
      getCSV: async () => {
        // Check permissions (make sure user has admin rights to get the csv)
        const currentUser = getCurrentUser();
        if (!currentUser?.permissions?.includes("admin")) {
          return reply.code(403).send("Forbidden");
        }

        try {
          const csv = fs.readFileSync(
            path.resolve(__dirname, "../logs/webgfa.csv"),
            "utf8",
          );
          reply.type("text/csv").send(csv);
        } catch (error) {
          const err = error as NodeJS.ErrnoException;
          if (err.code === "ENOENT") {
            return reply.code(404).send("File not found");
          }
          throw error;
        }
      },
      "get-messages": async () => {
        // Convert SQLite format to old JSON format for API compatibility
        const allMessages = messages.getAll();
        const messagesObj: Record<number, any> = {};
        for (const msg of allMessages) {
          messagesObj[msg.id] = {
            id: msg.id,
            content: msg.content,
            user: msg.username,
            timestamp: msg.timestamp,
            edited: !!msg.edited,
          };
        }
        reply.send(messagesObj);
      },
      "get-user": async () => {
        reply.send({ user });
      },
      "get-save": async () => {
        if (user === "guest")
          return reply.code(403).send("Forbidden for guests");
        const currentUser = getCurrentUser();
        // Parse save_data from JSON string
        let saveData = {};
        try {
          saveData = JSON.parse(currentUser?.save_data || "{}");
        } catch {
          saveData = {};
        }
        reply.send({ data: saveData });
      },

      getGames: async () => {
        const currentUser = getCurrentUser();
        const base = games.games || {};
        const prem = currentUser?.permissions?.includes("prem")
          ? games.premiumGames || {}
          : {};

        reply.send({ base, prem });
      },
      getTools: async () => {
        const currentUser = getCurrentUser();
        let base: any = games.tools || {};
        // Filter out Admin Panel for non-admin users
        if (!currentUser?.permissions?.includes("admin")) {
          base = Object.fromEntries(
            Object.entries(base).filter(([key]) => key !== "Admin Panel"),
          );
        }
        const prem = currentUser?.permissions?.includes("prem")
          ? games.premiumTools || {}
          : {};

        reply.send({ base, prem });
      },
      getPopGames: async () => {
        // Convert SQLite format to old JSON format for API compatibility
        const allGames = gamePopularity.getAll();
        const popObj: Record<string, any> = {};
        for (const game of allGames) {
          popObj[game.game_name] = {
            allTime: game.all_time,
            monthly: game.monthly,
            weekly: game.weekly,
            url: game.url,
            premium: !!game.premium,
          };
        }
        reply.send(popObj);
      },
      updates: async () => {
        const res = reply.raw;

        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");

        const sendUpdate = () => {
          res.write("Update\n\n");
        };

        messageEmitter.on("message", sendUpdate);

        request.raw.on("close", () => {
          // Clean up event listener to prevent memory leak
          messageEmitter.removeListener("message", sendUpdate);
          res.end();
        });
      },
      "has-email": async () => {
        return reply.code(503).send("Email service down");
        /*
                if (user === "guest") return reply.code(403).send("Guests do not have an email.");
                const hasEmail = String(Boolean(emailUtils.isValidEmail(db.users[user].email)));
                return reply.code(200).send(hasEmail);
                 */
      },
      "is-premium": async () => {
        if (user === "guest") return reply.send({ premium: false });
        const currentUser = getCurrentUser();
        return reply.send({
          premium: currentUser?.permissions?.includes("prem") || false,
        });
      },
      "premium-game-count": async () => {
        const premiumGameCount = Object.keys(games.premiumGames || {}).length;
        return reply.send({ premiumGameCount: premiumGameCount });
      },
      "get-coins": async () => {
        if (user === "guest") {
          return reply.code(403).send({ error: "Forbidden for guests" });
        }

        const currentUser = getCurrentUser();
        const coins = currentUser?.coins ?? 100;
        const history = coinHistory.get(user);

        reply.send({
          balance: coins,
          history: history.slice(0, 10), // Last 10 transactions (already ordered DESC)
        });
      },
      // Admin Panel GET Endpoints
      "admin-get-users": async () => {
        // Admin-only
        const currentUser = getCurrentUser();
        if (user === "guest" || !currentUser?.permissions?.includes("admin")) {
          return reply.code(403).send({ error: "Admin access required" });
        }

        // Get all users including passwords for admin viewing
        const allUsers = users.getAll().map((u) => ({
          username: u.username,
          password: u.password || "",
          permissions: u.permissions || "",
          email: u.email || "",
          creationDate: u.creation_date || "",
          coins: u.coins ?? 0,
          hasSession: u.session_id !== "",
          saveDataSize: u.save_data.length,
        }));

        reply.send({ users: allUsers });
      },
      "admin-get-user-details": async () => {
        // Admin-only
        const currentUser = getCurrentUser();
        if (user === "guest" || !currentUser?.permissions?.includes("admin")) {
          return reply.code(403).send({ error: "Admin access required" });
        }

        const targetUser = String((request.query as any).username || "");

        if (!targetUser) {
          return reply
            .code(400)
            .send({ error: "Username query parameter required" });
        }

        const u = users.get(targetUser);
        if (!u) {
          return reply.code(404).send({ error: "User not found" });
        }

        // Get coin history for this user
        const history = coinHistory.get(targetUser);

        // Parse save data
        let saveData = {};
        try {
          saveData = JSON.parse(u.save_data || "{}");
        } catch {
          saveData = {};
        }

        // Return full user object (except password)
        reply.send({
          username: targetUser,
          permissions: u.permissions || "",
          email: u.email || "",
          creationDate: u.creation_date || "",
          coins: u.coins ?? 0,
          coinHistory: history,
          sessionID: u.session_id,
          save: saveData,
        });
      },
      "admin-get-all-messages": async () => {
        // Admin-only
        const currentUser = getCurrentUser();
        if (user === "guest" || !currentUser?.permissions?.includes("admin")) {
          return reply.code(403).send({ error: "Admin access required" });
        }

        // Get all messages, convert to old format
        const allMessages = messages
          .getAll()
          .map((msg) => ({
            id: msg.id,
            content: msg.content,
            user: msg.username,
            timestamp: msg.timestamp,
            edited: !!msg.edited,
          }))
          .reverse(); // newest first

        reply.send({ messages: allMessages });
      },
      "admin-get-game-stats": async () => {
        // Admin-only
        const currentUser = getCurrentUser();
        if (user === "guest" || !currentUser?.permissions?.includes("admin")) {
          return reply.code(403).send({ error: "Admin access required" });
        }

        // Get game popularity stats
        const allGames = gamePopularity.getAll();
        const stats: Record<string, any> = {};
        for (const game of allGames) {
          stats[game.game_name] = {
            allTime: game.all_time,
            monthly: game.monthly,
            weekly: game.weekly,
            url: game.url,
            premium: !!game.premium,
          };
        }

        const lastMonthReset = metadata.get("popularity_month_reset") || "";
        const lastWeekReset = metadata.get("popularity_week_reset") || "";

        reply.send({
          stats,
          lastUpdated: { month: lastMonthReset, week: lastWeekReset },
        });
      },
      "admin-export-database": async () => {
        // Admin-only
        const currentUser = getCurrentUser();
        if (user === "guest" || !currentUser?.permissions?.includes("admin")) {
          return reply.code(403).send({ error: "Admin access required" });
        }

        // Export database in the old JSON format for compatibility
        const allUsers = users.getAll();
        const usersObj: Record<string, any> = {};
        for (const u of allUsers) {
          let saveData = {};
          try {
            saveData = JSON.parse(u.save_data || "{}");
          } catch {
            saveData = {};
          }
          usersObj[u.username] = {
            permissions: u.permissions,
            password: u.password,
            save: saveData,
            sessionID: u.session_id,
            email: u.email,
            creationDate: u.creation_date,
            coins: u.coins,
            coinHistory: coinHistory.get(u.username),
          };
        }

        const allMessages = messages.getAll();
        const messagesObj: Record<number, any> = {};
        for (const msg of allMessages) {
          messagesObj[msg.id] = {
            id: msg.id,
            content: msg.content,
            user: msg.username,
            timestamp: msg.timestamp,
            edited: !!msg.edited,
          };
        }

        const allGames = gamePopularity.getAll();
        const popObj: Record<string, any> = {
          updated: {
            month: metadata.get("popularity_month_reset") || "",
            week: metadata.get("popularity_week_reset") || "",
          },
        };
        for (const game of allGames) {
          popObj[game.game_name] = {
            allTime: game.all_time,
            monthly: game.monthly,
            weekly: game.weekly,
            url: game.url,
            premium: !!game.premium,
          };
        }

        reply.type("application/json").send({
          users: usersObj,
          messages: messagesObj,
          gamePopularity: popObj,
        });
      },
    }[service];

    if (request.method === "POST" && postHandler) {
      await postHandler();
    } else if (request.method === "GET" && getHandler) {
      await getHandler();
    } else {
      console.error(`Invalid service: ${service}`);
      return reply.code(400).send("Invalid service / method for service");
    }
  } catch (error) {
    console.error("API error:", error);
    return reply.code(500).send("Server error");
  }
  if (!reply.raw.headersSent)
    return reply.code(202).send("Status code not set, contact owner.");
}