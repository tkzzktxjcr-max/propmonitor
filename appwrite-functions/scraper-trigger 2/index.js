/**
 * BelRealty - Scraper Trigger Function
 */

const sdk = require("node-appwrite");

// Configuration
const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT || "https://backend.071098v2.duckdns.org/v1";
const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID || "propertymonitor";
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY;
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || "belrealty-db";
const COLLECTION_JOBS = "scraping_jobs";
const COLLECTION_SITES = "scraping_sites";
const SCRAPER_ENGINE_ID = "scraper-engine";

module.exports = async (req, res) => {
  if (!APPWRITE_API_KEY) {
    return res.json({ success: false, error: "APPWRITE_API_KEY not configured" });
  }

  const client = new sdk.Client();
  client
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID)
    .setKey(APPWRITE_API_KEY);

  const databases = new sdk.Databases(client);
  const functions = new sdk.Functions(client);

  try {
    let payload;
    try {
      payload = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    } catch {
      payload = {};
    }

    const { siteId, trigger = "manual", filters = {} } = payload;

    if (!siteId) {
      return res.json({ success: false, error: "Missing required field: siteId" });
    }

    // Find site by ID or slug
    let site;
    try {
      site = await databases.getDocument(DATABASE_ID, COLLECTION_SITES, siteId);
    } catch {
      const sites = await databases.listDocuments(
        DATABASE_ID,
        COLLECTION_SITES, 
        [new sdk.Query().equal("slug", siteId).limit(1)]
      );
      if (sites.documents.length === 0) {
        return res.json({ success: false, error: `Site not found: ${siteId}` });
      }
      site = sites.documents[0];
    }

    // Create scraping job
    const job = await databases.createDocument(
      DATABASE_ID,
      COLLECTION_JOBS,
      "unique()",
      {
        site_id: site.$id,
        status: "pending",
        trigger: trigger,
        filters: JSON.stringify(filters),
        stats: JSON.stringify({ total_found: 0, new_listings: 0, updated: 0, failed: 0 }),
        started_at: new Date().toISOString(),
        completed_at: "",
        error_message: "",
        created_by: trigger === "agent" ? "hermes-agent" : "admin",
      }
    );

    // Log
    await databases.createDocument(DATABASE_ID, "scraping_logs", "unique()", {
      job_id: job.$id,
      site_id: site.$id,
      level: "INFO",
      message: `Scraping job created for ${site.name}. Trigger: ${trigger}`,
      metadata: JSON.stringify({ filters }),
      created_at: new Date().toISOString(),
    });

    // Trigger scraper-engine
    try {
      await functions.createExecution(
        SCRAPER_ENGINE_ID,
        JSON.stringify({ jobId: job.$id, siteId: site.$id, filters }),
        true
      );
    } catch (e) {
      console.error("Failed to trigger scraper-engine:", e.message);
    }

    return res.json({
      success: true,
      data: {
        jobId: job.$id,
        siteId: site.$id,
        siteName: site.name,
        status: "pending",
      },
    });

  } catch (error) {
    console.error("Error:", error);
    return res.json({ success: false, error: error.message });
  }
};