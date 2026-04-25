import { Client, Account, Databases, Functions, Storage, Teams, ID, Query } from "appwrite";

// Appwrite Configuration
const APPWRITE_ENDPOINT = import.meta.env.VITE_APPWRITE_ENDPOINT || "https://backend.071098v2.duckdns.org/v1";
const APPWRITE_PROJECT_ID = import.meta.env.VITE_APPWRITE_PROJECT_ID || "propertymonitor";
const APPWRITE_DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID || "real-estate-db";

// Collections
const APPWRITE_COLLECTION_PROPERTIES = import.meta.env.VITE_APPWRITE_COLLECTION_PROPERTIES || "properties";
const APPWRITE_COLLECTION_SCRAPING_JOBS = import.meta.env.VITE_APPWRITE_COLLECTION_SCRAPING_JOBS || "scraping-jobs";
const APPWRITE_COLLECTION_USERS = import.meta.env.VITE_APPWRITE_COLLECTION_USERS || "users";

// Initialize Appwrite client
export const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID);

// Initialize services
export const account = new Account(client);
export const databases = new Databases(client);
export const functions = new Functions(client);
export const storage = new Storage(client);
export const teams = new Teams(client);

// Collection & Database IDs
export const DATABASE_ID = APPWRITE_DATABASE_ID;
export const COLLECTION_PROPERTIES = APPWRITE_COLLECTION_PROPERTIES;
export const COLLECTION_JOBS = APPWRITE_COLLECTION_SCRAPING_JOBS;
export const COLLECTION_USERS = APPWRITE_COLLECTION_USERS;

// Helper to check if Appwrite is configured
export const isAppwriteConfigured = () => {
  return APPWRITE_PROJECT_ID !== "propertymonitor";
};

// Re-export helpers
export { ID, Query };