import { Client, Account, Databases, Functions, Storage, Teams, ID, Query } from "appwrite";

// ─────────────────────────────────────────────
// APPWRITE CONFIGURATION
// ─────────────────────────────────────────────
const APPWRITE_ENDPOINT = import.meta.env.VITE_APPWRITE_ENDPOINT || "https://cloud.appwrite.io/v1";
const APPWRITE_PROJECT_ID = import.meta.env.VITE_APPWRITE_PROJECT_ID || "propertymonitor";
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
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID);

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
 * Check if Appwrite is properly configured
 */
export const isAppwriteConfigured = (): boolean => {
  // Si on utilise le project "propertymonitor" par défaut, on considère que c'est configuré
  // (en mode dev/demo, on utilise les mocks)
  const hasProject = APPWRITE_PROJECT_ID !== "" && APPWRITE_PROJECT_ID !== "belrealty";
  return hasProject;
};

/**
 * Check if we're using demo mode (mock data)
 */
export const isDemoMode = (): boolean => {
  // Demo mode tant que l'utilisateur n'a pas configuré ses propres variables
  const usingDefaultProject = APPWRITE_PROJECT_ID === "propertymonitor" && !import.meta.env.VITE_APPWRITE_PROJECT_ID;
  return usingDefaultProject;
};

// ─────────────────────────────────────────────
// RE-EXPORTS
// ─────────────────────────────────────────────
export { ID, Query };