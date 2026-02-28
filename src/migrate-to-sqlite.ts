/**
 * Migration script: JSON database -> SQLite
 *
 * Run with: npx tsx src/migrate-to-sqlite.ts
 *
 * This script will:
 * 1. Read the existing JSON database
 * 2. Insert all data into SQLite
 * 3. Preserve all existing data
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { users, coinHistory, messages, gamePopularity, metadata, transaction } from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const jsonDbPath = path.resolve(__dirname, '../data/database.json');

interface OldUser {
    permissions: string;
    password: string;
    save: string | Record<string, unknown>;
    sessionID: string;
    email?: string;
    coins?: number;
    coinHistory?: Array<{
        timestamp: string;
        amount: number;
        reason: string;
        balance: number;
    }>;
    creationDate?: string;
    creationID?: string;
    resetID?: string;
}

interface OldMessage {
    id: number;
    content: string;
    user: string;
    timestamp: string;
    edited: boolean;
}

interface OldGamePopularity {
    allTime: number;
    monthly: number;
    weekly: number;
    url: string;
    premium: boolean;
}

interface OldDatabase {
    users: Record<string, OldUser>;
    messages: Record<string, OldMessage>;
    gamePopularity: Record<string, OldGamePopularity | { month: string; week: string }>;
}

function migrate() {
    if (!fs.existsSync(jsonDbPath)) {
        console.log('No existing JSON database found at', jsonDbPath);
        console.log('Creating fresh SQLite database with defaults...');

        // Insert default users
        users.create({
            username: 'admin',
            password: 'admin',
            permissions: 'prem,admin',
            session_id: '',
            save_data: '{}',
            email: '',
            coins: 100,
        });

        users.create({
            username: 'guest',
            password: 'guest',
            permissions: '',
            session_id: 'guests have their own check for sessionIDs',
            save_data: '{}',
            email: '',
            coins: 0,
        });

        console.log('Default admin and guest users created.');
        return;
    }

    console.log('Reading JSON database from', jsonDbPath);
    const jsonDb: OldDatabase = JSON.parse(fs.readFileSync(jsonDbPath, 'utf8'));

    transaction(() => {
        // Migrate users
        console.log('Migrating users...');
        let userCount = 0;
        for (const [username, userData] of Object.entries(jsonDb.users)) {
            const saveData = typeof userData.save === 'string'
                ? userData.save
                : JSON.stringify(userData.save);

            // Check if user already exists
            if (users.exists(username)) {
                console.log(`  Skipping existing user: ${username}`);
                continue;
            }

            users.create({
                username,
                password: userData.password,
                permissions: userData.permissions || '',
                session_id: userData.sessionID || '',
                save_data: saveData,
                email: userData.email || null,
                creation_date: userData.creationDate || null,
                creation_id: userData.creationID || null,
                reset_id: userData.resetID || null,
                coins: userData.coins ?? 0,
            });

            // Migrate coin history
            if (userData.coinHistory && userData.coinHistory.length > 0) {
                for (const entry of userData.coinHistory) {
                    coinHistory.add({
                        username,
                        timestamp: entry.timestamp,
                        amount: entry.amount,
                        reason: entry.reason,
                        balance: entry.balance,
                    });
                }
            }

            userCount++;
            console.log(`  Migrated user: ${username}`);
        }
        console.log(`Migrated ${userCount} users.`);

        // Migrate messages
        console.log('Migrating messages...');
        let messageCount = 0;
        for (const [, msgData] of Object.entries(jsonDb.messages)) {
            if (!msgData || typeof msgData !== 'object') continue;

            messages.create({
                content: msgData.content,
                username: msgData.user,
                timestamp: msgData.timestamp,
                edited: msgData.edited ? 1 : 0,
            });
            messageCount++;
        }
        console.log(`Migrated ${messageCount} messages.`);

        // Migrate game popularity
        console.log('Migrating game popularity...');
        let gameCount = 0;
        for (const [gameName, gameData] of Object.entries(jsonDb.gamePopularity)) {
            // Skip the 'updated' metadata entry
            if (gameName === 'updated') {
                const updatedData = gameData as { month: string; week: string };
                metadata.set('popularity_month_reset', updatedData.month);
                metadata.set('popularity_week_reset', updatedData.week);
                continue;
            }

            const popData = gameData as OldGamePopularity;
            if (!popData.url) continue;

            gamePopularity.upsert({
                game_name: gameName,
                url: popData.url,
                premium: popData.premium ? 1 : 0,
                all_time: popData.allTime || 0,
                monthly: popData.monthly || 0,
                weekly: popData.weekly || 0,
            });
            gameCount++;
        }
        console.log(`Migrated ${gameCount} games.`);
    });

    console.log('\nMigration complete!');
    console.log('SQLite database created at: data/webgfa.db');
    console.log('\nYou can now update server.ts to use the new database module.');
    console.log('The old JSON database has been preserved at:', jsonDbPath);
}

migrate();
