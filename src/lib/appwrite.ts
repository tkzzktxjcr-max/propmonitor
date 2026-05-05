import { Client, Account, Databases, Functions, Storage, Teams, ID, Query } from "appwrite";

// ─────────────────────────────────────────────
// APPWRITE SELF-HOSTED CONFIGURATION
// ─────────────────────────────────────────────
const APPWRITE_ENDPOINT = import.meta.env.VITE_APPWRITE_ENDPOINT || "https://backend.071098v2.duckdns.org/v1";
const APPWRITE_PROJECT_ID = import.meta.env.VITE_APPWRITE_PROJECT_ID || "propertymonitor";
const APPWRITE_DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID || "belrealty-db";
const APPWRITE_API_KEY = import.meta.env.VITE_APPWRITE_API_KEY || "";

// ─────────────────────────────────────────────
// COLLECTIONS IDs
// ─────────────────────────────────────────────
export const COLLECTION_PROPERTIES = "properties";
export const COLLECTION_SITES = "scraping_sites";
export const COLLECTION_JOBS = "scraping_jobs";
export const COLLECTION_LOGS = "scraping_logs";
export const COLLECTION_USERS = "users";
export const COLLECTION_SCHEDULES = "schedules";

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
// HTTP HELPER for Function Execution
// ─────────────────────────────────────────────
export async function executeFunction(functionId: string, payload: unknown, async = false): Promise<{ status: string; response: string }> {
  const url = `${APPWRITE_ENDPOINT}/functions/${functionId}/executions`;
  
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Appwrite-Project": APPWRITE_PROJECT_ID,
      ...(APPWRITE_API_KEY && { "X-Appwrite-Key": APPWRITE_API_KEY }),
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Function execution failed: ${response.status} - ${error}`);
  }

  const result = await response.json();
  return {
    status: result.status,
    response: result.response || "",
  };
}

// ─────────────────────────────────────────────
// ERROR HANDLING HELPERS
// ─────────────────────────────────────────────
export function parseAppwriteError(error: unknown): { message: string; code?: number; type?: string; details?: unknown } {
  if (error && typeof error === 'object') {
    const err = error as Record<string, unknown>;
    
    if (err.response) {
      const response = err.response as Record<string, unknown>;
      return {
        message: (response.message as string) || 'Unknown error',
        code: err.code as number,
        type: err.type as string,
        details: response,
      };
    }
    
    if (err.message) {
      return {
        message: err.message as string,
        code: err.code as number,
      };
    }
  }
  
  return { message: String(error) };
}

export function logAppwriteError(context: string, error: unknown, data?: unknown): void {
  const parsed = parseAppwriteError(error);
  
  console.error(`[Appwrite Error] ${context}`);
  console.error(`  Message: ${parsed.message}`);
  console.error(`  Code: ${parsed.code || 'N/A'}`);
  console.error(`  Type: ${parsed.type || 'N/A'}`);
  
  if (data) {
    console.error(`  Data sent:`, data);
  }
  
  if (parsed.details) {
    console.error(`  Details:`, parsed.details);
  }
}

// ─────────────────────────────────────────────
// RE-EXPORTS
// ─────────────────────────────────────────────
export { ID, Query };