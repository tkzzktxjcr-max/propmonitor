/**
 * BelRealty - Scraper Trigger Function
 * 
 * HTTP POST endpoint to trigger a new scraping job.
 * 
 * Input payload:
 * {
 *   "siteId": "immoweb",
 *   "trigger": "manual" | "scheduled" | "agent",
 *   "filters": {
 *     "city": "Brussels",
 *     "price_min": 100000,
 *     "price_max": 500000,
 *     "type": "apartment"
 *   }
 * }
 */

const sdk = require("node-appwrite");

module.exports = async (req, res) => {
  const client = new sdk.Client();

  // Initialize Appwrite client
  client
    .setEndpoint(process.env.APPWRITE_ENDPOINT || "https://cloud.appwrite.io/v1")
    .setProject(process.env.APPWRITE_PROJECT_ID || "propertymonitor")
    .setKey(req.headers["x-appwrite-key"] || process.env.APPWRITE_API_KEY);

  const databases = new sdk.Databases(client);
  const functions = new sdk.Functions(client);

  const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || "belrealty-db";
  const COLLECTION_JOBS = "scraping_jobs";
  const COLLECTION_SITES = "scraping_sites";
  const SCRAPER_ENGINE_ID = "scraper-engine"; // Function ID

  try {
    // Parse request body
    let payload;
    try {
      payload = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    } catch {
      payload = {};
    }

    const { siteId, trigger = "manual", filters = {} } = payload;

    if (!siteId) {
      return res.json({
        success: false,
        error: "Missing required field: siteId",
      });
    }

    // Verify site exists
    let site;
    try {
      site = await databases.getDocument(
        DATABASE_ID,
        COLLECTION_SITES,
        siteId
      );
    } catch (e) {
      // Try finding by slug instead
      const sites = await databases.listDocuments(
        DATABASE_ID,
        COLLECTION_SITES,
        [new sdk.Query().equal("slug", siteId).limit(1)]
      );
      if (sites.documents.length === 0) {
        return res.json({
          success: false,
          error: `Site not found: ${siteId}`,
        });
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
        stats: JSON.stringify({
          total_found: 0,
          new_listings: 0,
          updated: 0,
          failed: 0,
        }),
        started_at: new Date().toISOString(),
        completed_at: "",
        error_message: "",
        created_by: trigger === "agent" ? "hermes-agent" : "admin",
      }
    );

    // Log job creation
    await databases.createDocument(
      DATABASE_ID,
      "scraping_logs",
      "unique()",
      {
        job_id: job.$id,
        site_id: site.$id,
        level: "INFO",
        message: `Scraping job created for ${site.name}. Trigger: ${trigger}`,
        metadata: JSON.stringify({ filters }),
        created_at: new Date().toISOString(),
      }
    );

    // Trigger scraper-engine async
    try {
      await functions.createExecution(
        SCRAPER_ENGINE_ID,
        JSON.stringify({
          jobId: job.$id,
          siteId: site.$id,
          filters,
        }),
        true // async execution
      );
    } catch (e) {
      console.error("Failed to trigger scraper-engine:", e.message);
      // Job is created, engine can be triggered separately
    }

    return res.json({
      success: true,
      data: {
        jobId: job.$id,
        siteId: site.$id,
        siteName: site.name,
        status: "pending",
        trigger,
        filters,
      },
    });
  } catch (error) {
    console.error("Error triggering scrape:", error);

    return res.json({
      success: false,
      error: error.message || "Failed to trigger scrape",
    });
  }
};