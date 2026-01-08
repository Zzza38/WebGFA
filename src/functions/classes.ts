export interface DatabaseSchema {
    messages: {
        [id: number]: {
            id: number;
            content: string;
            user: string;
            timestamp: string;
            edited: boolean;
        };
    };
    gamePopularity: {
        updated?: {
            month: string;  // ISO 8601 date string
            week: string;   // ISO 8601 date string
        };
        [gameName: string]:
            | {
            allTime: number;
            monthly: number;
            weekly: number;
            url: string;
            premium: boolean;
        }
            | {
            month: string;
            week: string;
        }
            | undefined;
    };
    users: {
        [username: string]: {
            // Creating, deleting, and password changing of accounts (DISABLED)
            creationID?: string;
            resetID?: string;
            email?: string;

            // Regular account info
            creationDate?: string;
            permissions: string;
            password: string;
            save: string | Record<string, any>;
            sessionID: string;

            // WebGFA Coins system
            coins?: number;
            coinHistory?: Array<{
                timestamp: string;
                amount: number;
                reason: string;
                balance: number;
            }>;
        };
    };
}
