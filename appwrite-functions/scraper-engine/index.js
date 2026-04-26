/**
 * BelRealty - Scraper Engine
 * For Appwrite self-hosted 1.7.4
 */

const sdk = require("node-appwrite");

// Configuration
const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT || "https://backend.071098v2.duckdns.org/v1";
const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID || "propertymonitor";
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY;
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || "belrealty-db";

module.exports = async (req, res) => {
  console.log("[scraper-engine] Function triggered");
  
  if (!APPWRITE_API_KEY) {
    console.error("[scraper-engine] Missing APPWRITE_API_KEY");
    return res.json({ success: false, error: "APPWRITE_API_KEY not configured" }, 500);
  }

  const client = new sdk.Client();
  client
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID)
    .setKey(APPWRITE_API_KEY);

  const databases = new sdk.Databases(client);
  const Query = sdk.Query;

  // Parse payload
  let payload;
  try {
    payload = req.payload ? JSON.parse(req.payload) : {};
  } catch (e) {
    payload = {};
  }

  const jobId = payload.jobId;
  const siteId = payload.siteId;
  const filters = payload.filters || {};

  if (!jobId || !siteId) {
    return res.json({ success: false, error: "Missing jobId or siteId" }, 400);
  }

  console.log(`[scraper-engine] Processing job ${jobId} for site ${siteId}`);

  const COLLECTION_JOBS = "scraping_jobs";
  const COLLECTION_SITES = "scraping_sites";
  const COLLECTION_PROPERTIES = "properties";
  const COLLECTION_LOGS = "scraping_logs";

  async function updateJobStatus(status, stats, error_message) {
    const updateData = { status };
    if (stats) updateData.stats = JSON.stringify(stats);
    if (error_message) updateData.error_message = error_message;
    if (status === "completed" || status === "failed") {
      updateData.completed_at = new Date().toISOString();
    }
    await databases.updateDocument(DATABASE_ID, COLLECTION_JOBS, jobId, updateData);
  }

  async function addLog(level, message, metadata) {
    try {
      await databases.createDocument(DATABASE_ID, COLLECTION_LOGS, "unique()", {
        job_id: jobId,
        site_id: siteId,
        level,
        message,
        metadata: metadata ? JSON.stringify(metadata) : null,
        created_at: new Date().toISOString(),
      });
    } catch (e) {
      console.error("[scraper-engine] addLog error:", e.message);
    }
  }

  try {
    // Get site
    const site = await databases.getDocument(DATABASE_ID, COLLECTION_SITES, siteId);
    console.log("[scraper-engine] Site:", site.name);

    await updateJobStatus("running");
    await addLog("INFO", `Starting scrape for ${site.name}`);

    // Get parser
    let ParserClass;
    try {
      ParserClass = require("./parsers/" + site.slug);
    } catch {
      ParserClass = require("./parsers/base");
    }
    const parser = new ParserClass();

    let stats = { total_found: 0, new_listings: 0, updated: 0, failed: 0 };

    // Scrape listings
    const listings = await parser.scrapeListings(site, filters);
    console.log("[scraper-engine] Found:", listings.length);
    stats.total_found = listings.length;

    await addLog("INFO", `Found ${listings.length} listings`);

    // Process listings
    for (const listing of listings) {
      try {
        const propertyData = await parser.scrapePropertyDetail(listing.url);
        
        const existing = await databases.listDocuments(
          DATABASE_ID, COLLECTION_PROPERTIES,
          [Query.equal("source_id", listing.sourceId), Query.limit(1)]
        );

        if (existing.documents.length > 0) {
          const prop = existing.documents[0];
          if (prop.price !== propertyData.price) {
            await databases.updateDocument(DATABASE_ID, COLLECTION_PROPERTIES, prop.$id, {
              price: propertyData.price,
              title: propertyData.title,
              last_updated: new Date().toISOString(),
            });
            stats.updated++;
          }
        } else {
          await databases.createDocument(DATABASE_ID, COLLECTION_PROPERTIES, "unique()", {
            site_id: siteId,
            source_id: listing.sourceId,
            url: listing.url,
            title: propertyData.title || "",
            description: propertyData.description || "",
            price: propertyData.price || 0,
            surface_sqm: propertyData.surface_sqm || 0,
            bedrooms: propertyData.bedrooms || 0,
            bathrooms: propertyData.bathrooms || 0,
            type: propertyData.type || "apartment",
            city: propertyData.city || "",
            address: propertyData.address || "",
            photos: JSON.stringify(propertyData.photos || []),
            is_active: true,
            scraped_at: new Date().toISOString(),
            last_updated: new Date().toISOString(),
          });
          stats.new_listings++;
        }

        await new Promise(r => setTimeout(r, site.rate_limit_ms || 2000));
      } catch (err) {
        stats.failed++;
      }
    }

    // Update site
    await databases.updateDocument(DATABASE_ID, COLLECTION_SITES, siteId, {
      properties_count: stats.total_found,
      last_scrape_at: new Date().toISOString(),
      last_scrape_status: "success",
    });

    await updateJobStatus("completed", stats);
    await addLog("INFO", `Done. New: ${stats.new_listings}, Updated: ${stats.updated}`);

    console.log("[scraper-engine] Completed:", stats);
    return res.json({ success: true, stats });

  } catch (error) {
    console.error("[scraper-engine] Error:", error.message);
    await updateJobStatus("failed", null, error.message);
    await addLog("ERROR", error.message);
    return res.json({ success: false, error: error.message }, 500);
  }
};