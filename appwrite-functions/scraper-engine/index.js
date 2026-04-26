/**
 * BelRealty - Scraper Engine
 */

const sdk = require("node-appwrite");
const { getParser } = require("./parsers");
const { updateJobStatus, addLog, storeProperty } = require("./services/appwrite");

// Configuration
const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT || "https://backend.071098v2.duckdns.org/v1";
const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID || "propertymonitor";
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY;
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || "belrealty-db";

module.exports = async (req, res) => {
  console.log("[scraper-engine] Request received");
  
  // Debug: log the entire req object structure
  console.log("[scraper-engine] req keys:", Object.keys(req || {}));
  console.log("[scraper-engine] req.payload:", req.payload);
  
  if (!APPWRITE_API_KEY) {
    return res.json({ success: false, error: "APPWRITE_API_KEY not configured" });
  }

  const client = new sdk.Client();
  client
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID)
    .setKey(APPWRITE_API_KEY);

  const databases = new sdk.Databases(client);
  const COLLECTION_JOBS = "scraping_jobs";
  const COLLECTION_SITES = "scraping_sites";
  const COLLECTION_PROPERTIES = "properties";
  const COLLECTION_LOGS = "scraping_logs";

  // Parse payload - Appwrite SDK v11+ passes payload as a string
  let payload = {};
  
  try {
    if (req.payload && typeof req.payload === "string") {
      payload = JSON.parse(req.payload);
    } else if (req.payload && typeof req.payload === "object") {
      payload = req.payload;
    } else if (req.body && typeof req.body === "string") {
      payload = JSON.parse(req.body);
    } else if (req.body && typeof req.body === "object") {
      payload = req.body;
    }
  } catch (e) {
    console.error("[scraper-engine] Failed to parse payload:", e.message);
  }
  
  console.log("[scraper-engine] Parsed payload:", payload);

  const jobId = payload.jobId;
  const siteId = payload.siteId;
  const filters = payload.filters || {};

  if (!jobId || !siteId) {
    console.error("[scraper-engine] Missing required fields");
    return res.json({ success: false, error: "Missing required fields: jobId and siteId" });
  }

  console.log(`[scraper-engine] Starting scrape job ${jobId} for site ${siteId}`);

  try {
    // Get site
    const site = await databases.getDocument(DATABASE_ID, COLLECTION_SITES, siteId);
    console.log(`[scraper-engine] Found site:`, site.name);

    // Update job status to running
    await updateJobStatus(client, DATABASE_ID, COLLECTION_JOBS, jobId, "running");
    await addLog(client, DATABASE_ID, COLLECTION_LOGS, {
      job_id: jobId, site_id: siteId,
      level: "INFO",
      message: `Starting scrape for ${site.name} (${site.base_url})`,
    });

    // Get parser for this site
    const parser = getParser(site.slug);
    if (!parser) {
      await updateJobStatus(client, DATABASE_ID, COLLECTION_JOBS, jobId, "failed", {
        error_message: `No parser for: ${site.slug}`,
      });
      return res.json({ success: false, error: `No parser for site: ${site.slug}` });
    }

    let stats = { total_found: 0, new_listings: 0, updated: 0, failed: 0 };

    // Scrape listings
    console.log(`[scraper-engine] Scraping listings from ${site.name}...`);
    const listings = await parser.scrapeListings(site, filters);
    console.log(`[scraper-engine] Found ${listings.length} listings`);

    await addLog(client, DATABASE_ID, COLLECTION_LOGS, {
      job_id: jobId, site_id: siteId,
      level: "INFO",
      message: `Found ${listings.length} listings, starting detailed scrape...`,
    });

    stats.total_found = listings.length;

    // Process each listing
    for (const listing of listings) {
      try {
        const propertyData = await parser.scrapePropertyDetail(listing.url, site.slug);
        const result = await storeProperty(client, DATABASE_ID, COLLECTION_PROPERTIES, {
          site_id: siteId,
          source_id: listing.sourceId,
          url: listing.url,
          ...propertyData,
          is_active: true,
          scraped_at: new Date().toISOString(),
          last_updated: new Date().toISOString(),
        });

        if (result.isNew) stats.new_listings++;
        else if (result.isUpdated) stats.updated++;

        // Rate limiting
        await sleep(site.rate_limit_ms || 2000);
      } catch (error) {
        stats.failed++;
        await addLog(client, DATABASE_ID, COLLECTION_LOGS, {
          job_id: jobId, site_id: siteId,
          level: "WARNING",
          message: `Failed to process listing: ${error.message}`,
          metadata: JSON.stringify({ url: listing.url }),
        });
      }
    }

    // Update site stats
    try {
      await databases.updateDocument(DATABASE_ID, COLLECTION_SITES, siteId, {
        properties_count: stats.total_found,
        last_scrape_at: new Date().toISOString(),
        last_scrape_status: "success",
      });
    } catch (e) {
      console.error("[scraper-engine] Failed to update site stats:", e.message);
    }

    // Mark job completed
    await updateJobStatus(client, DATABASE_ID, COLLECTION_JOBS, jobId, "completed", { stats });
    await addLog(client, DATABASE_ID, COLLECTION_LOGS, {
      job_id: jobId, site_id: siteId,
      level: "INFO",
      message: `Scrape completed. New: ${stats.new_listings}, Updated: ${stats.updated}, Failed: ${stats.failed}`,
    });

    console.log(`[scraper-engine] Job ${jobId} completed:`, stats);
    return res.json({ success: true, data: { jobId, siteId, stats } });

  } catch (error) {
    console.error(`[scraper-engine] Job ${jobId} failed:`, error);
    await updateJobStatus(client, DATABASE_ID, COLLECTION_JOBS, jobId, "failed", {
      error_message: error.message,
    });
    await addLog(client, DATABASE_ID, COLLECTION_LOGS, {
      job_id: jobId, site_id: siteId,
      level: "ERROR",
      message: `Job failed: ${error.message}`,
    });
    return res.json({ success: false, error: error.message });
  }
};

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}