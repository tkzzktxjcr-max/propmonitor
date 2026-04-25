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

  let payload;
  try {
    payload = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  } catch {
    payload = {};
  }

  const { jobId, siteId, filters = {} } = payload;

  if (!jobId || !siteId) {
    return res.json({ success: false, error: "Missing required fields: jobId and siteId" });
  }

  console.log(`Starting scrape job ${jobId} for site ${siteId}`);

  try {
    // Get site
    const site = await databases.getDocument(DATABASE_ID, COLLECTION_SITES, siteId);

    // Update job status
    await updateJobStatus(client, DATABASE_ID, COLLECTION_JOBS, jobId, "running");
    await addLog(client, DATABASE_ID, COLLECTION_LOGS, {
      job_id: jobId, site_id: siteId,
      level: "INFO",
      message: `Starting scrape for ${site.name} (${site.base_url})`,
    });

    // Get parser
    const parser = getParser(site.slug);
    if (!parser) {
      await updateJobStatus(client, DATABASE_ID, COLLECTION_JOBS, jobId, "failed", {
        error_message: `No parser for: ${site.slug}`,
      });
      return res.json({ success: false, error: `No parser for site: ${site.slug}` });
    }

    let stats = { total_found: 0, new_listings: 0, updated: 0, failed: 0 };

    // Scrape listings
    const listings = await parser.scrapeListings(site, filters);

    await addLog(client, DATABASE_ID, COLLECTION_LOGS, {
      job_id: jobId, site_id: siteId,
      level: "INFO",
      message: `Found ${listings.length} listings, starting detailed scrape...`,
    });

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
    const propertiesCount = await databases.listDocuments(
      DATABASE_ID, COLLECTION_PROPERTIES,
      [new sdk.Query().equal("site_id", siteId).limit(0)]
    );

    await databases.updateDocument(DATABASE_ID, COLLECTION_SITES, siteId, {
      properties_count: propertiesCount.total,
      last_scrape_at: new Date().toISOString(),
      last_scrape_status: "success",
    });

    // Mark job completed
    await updateJobStatus(client, DATABASE_ID, COLLECTION_JOBS, jobId, "completed", { stats });
    await addLog(client, DATABASE_ID, COLLECTION_LOGS, {
      job_id: jobId, site_id: siteId,
      level: "INFO",
      message: `Scrape completed. New: ${stats.new_listings}, Updated: ${stats.updated}, Failed: ${stats.failed}`,
    });

    console.log(`Job ${jobId} completed:`, stats);
    return res.json({ success: true, data: { jobId, siteId, stats } });

  } catch (error) {
    console.error(`Job ${jobId} failed:`, error);
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