import { Client, Account, Databases, Functions, Storage, Teams, ID, Query } from "appwrite";

// ─────────────────────────────────────────────
// APPWRITE CONFIGURATION
// ─────────────────────────────────────────────
const APPWRITE_ENDPOINT = import.meta.env.VITE_APPWRITE_ENDPOINT || "https://cloud.appwrite.io/v1/project/propertymonitor";
const APPWRITE_DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID || "belrealty-db";

// ─────────────────────────────────────────────
// COLLECTIONS IDs
// ─────────────────────────────────────────────

// Properties
export const COLLECTION_PROPERTIES = import.meta.env.VITE_APPWRITE_COLLECTION_PROPERTIES || "properties";

// Scraper
export const COLLECTION_SITES = import.meta.env.VITE_APPWRITE_COLLECTION_SITES || "scraping_sites";
export const COLLECTION_JOBS = import.meta.env.VITE_APPWRITE_COLLECTION_JOBS || "scraping_jobs";
export const COLLECTION_LOGS = import.meta.env.VITE_APPWRITE_COLLECTION_LOGS || "scraping_logs";

// Users
export const COLLECTION_USERS = import.meta.env.VITE_APPWRITE_COLLECTION_USERS || "users";

// ─────────────────────────────────────────────
// INITIALIZE CLIENT
// ─────────────────────────────────────────────
export const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT);

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
 * Returns true if no real Appwrite endpoint is configured
 */
export const isDemoMode = (): boolean => {
  // Check if using the default/mock endpoint
  return APPWRITE_ENDPOINT.includes("propertymonitor") && !import.meta.env.VITE_APPWRITE_ENDPOINT;
};

/**
 * Check if Appwrite is properly configured
 */
export const isAppwriteConfigured = (): boolean => {
  return !!import.meta.env.VITE_APPWRITE_ENDPOINT || !isDemoMode();
};

// ─────────────────────────────────────────────
// RE-EXPORTS
// ─────────────────────────────────────────────
export { ID, Query };