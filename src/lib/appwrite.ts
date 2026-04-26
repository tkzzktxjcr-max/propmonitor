import { Client, Account, Databases, Functions, Storage, Teams, ID, Query } from "appwrite";

// ─────────────────────────────────────────────
// APPWRITE SELF-HOSTED CONFIGURATION
// ─────────────────────────────────────────────
const APPWRITE_ENDPOINT = import.meta.env.VITE_APPWRITE_ENDPOINT || "https://backend.071098v2.duckdns.org/v1";
const APPWRITE_PROJECT_ID = import.meta.env.VITE_APPWRITE_PROJECT_ID || "propertymonitor";
const APPWRITE_DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID || "belrealty-db";

// ─────────────────────────────────────────────
// COLLECTIONS IDs
// ─────────────────────────────────────────────
export const COLLECTION_PROPERTIES = "properties";
export const COLLECTION_SITES = "scraping_sites";
export const COLLECTION_JOBS = "scraping_jobs";
export const COLLECTION_LOGS = "scraping_logs";
export const COLLECTION_USERS = "users";

// ─────────────────────────────────────────────
// INITIALIZE CLIENT
// ─────────────────────────────────────────────
export const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID);

// ─────────────────────────────────────────────
// SET API KEY FOR SERVER OPERATIONS
// ─────────────────────────────────────────────
const API_KEY = import.meta.env.VITE_APPWRITE_API_KEY;
if (API_KEY) {
  // Cast to any to bypass TypeScript strict typing for this SDK method
  (client as unknown as { setKey: (key: string) => void }).setKey(API_KEY);
}

// ─────────────────────────────────────────────
// SERVICES
// ─────────────────────────────────────────────
export const account = new Account(client);
export const databases = new Databases(client);
export const functions = new Functions(client);
export const storage = new Storage(client);
export const teams = new Teams(client);

// ─────────────────────────────────────────────
// DATABASE ID
// ─────────────────────────────────────────────
export const DATABASE_ID = APPWRITE_DATABASE_ID;

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

/**
 * Check if we're using demo mode (mock data)
 */
export const isDemoMode = (): boolean => {
  return import.meta.env.VITE_DEMO_MODE === "true";
};

/**
 * Check if Appwrite is properly configured
 */
export const isAppwriteConfigured = (): boolean => {
  return !!API_KEY;
};

// ─────────────────────────────────────────────
// RE-EXPORTS
// ─────────────────────────────────────────────
export { ID, Query };