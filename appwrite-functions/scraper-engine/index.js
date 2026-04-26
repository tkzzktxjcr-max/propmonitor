/**
 * BelRealty - Scraper Engine
 * 
 * Architecture: Function reads job data from database instead of receiving payload.
 * This is more reliable and creates a proper audit trail.
 */

const sdk = require("node-appwrite");

const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT || "https://backend.071098v2.duckdns.org/v1";
const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID || "propertymonitor";
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY;
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || "belrealty-db";

module.exports = async (req) => {
  console.log("[scraper-engine] Function triggered");
  
  if (!APPWRITE_API_KEY) {
    console.error("[scraper-engine] Missing API key");
    return { success: false, error: "Missing API key" };
  }

  const client = new sdk.Client()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID)
    .setKey(APPWRITE_API_KEY);

  const databases = new sdk.Databases(client);
  const Query = sdk.Query;

  // FIND PENDING JOB
  // Find the oldest pending job to process
  let job = null;
  try {
    const jobsResponse = await databases.listDocuments(
      DATABASE_ID, 
      "scraping_jobs",
      [
        Query.equal("status", "pending"),
        Query.orderAsc("started_at"),
        Query.limit(1)
      ]
    );
    
    if (jobsResponse.documents.length > 0) {
      job = jobsResponse.documents[0];
    }
  } catch (e) {
    console.error("[scraper-engine] Failed to find pending job:", e.message);
    return { success: false, error: "Failed to find pending job" };
  }

  if (!job) {
    console.log("[scraper-engine] No pending jobs found");
    return { success: false, error: "No pending jobs" };
  }

  const jobId = job.$id;
  const siteId = job.site_id;
  
  // Parse filters
  let filters = {};
  try {
    filters = job.filters ? JSON.parse(job.filters) : {};
  } catch {}

  console.log("[scraper-engine] Processing job:", jobId, "site:", siteId);

  try {
    // Get site
    const site = await databases.getDocument(DATABASE_ID, "scraping_sites", siteId);
    console.log("[scraper-engine] Site:", site.name, site.base_url);

    // Update job to running
    await databases.updateDocument(DATABASE_ID, "scraping_jobs", jobId, { 
      status: "running" 
    });

    // Get parser based on site slug
    let Parser;
    try {
      Parser = require("./parsers/" + site.slug);
    } catch {
      Parser = require("./parsers/base");
    }
    const parser = new Parser();

    // Scrape listings
    console.log("[scraper-engine] Scraping from:", site.base_url);
    const listings = await parser.scrapeListings(site, filters);
    console.log("[scraper-engine] Found listings:", listings.length);

    const stats = { 
      total_found: listings.length, 
      new_listings: 0, 
      updated: 0, 
      failed: 0 
    };

    // Process each listing
    for (let i = 0; i < listings.length; i++) {
      const listing = listings[i];
      try {
        const data = await parser.scrapePropertyDetail(listing.url);
        
        // Check if property exists
        const existing = await databases.listDocuments(
          DATABASE_ID, 
          "properties",
          [
            Query.equal("source_id", listing.sourceId),
            Query.equal("site_id", siteId),
            Query.limit(1)
          ]
        );

        if (existing.documents.length > 0) {
          // Update existing
          const prop = existing.documents[0];
          if (prop.price !== data.price || prop.title !== data.title) {
            await databases.updateDocument(DATABASE_ID, "properties", prop.$id, {
              price: data.price || prop.price,
              title: data.title || prop.title,
              description: data.description || prop.description || "",
              photos: data.photos ? JSON.stringify(data.photos) : prop.photos,
              last_updated: new Date().toISOString(),
            });
            stats.updated++;
          }
        } else {
          // Create new
          await databases.createDocument(DATABASE_ID, "properties", "unique()", {
            site_id: siteId,
            source_id: listing.sourceId,
            url: listing.url,
            title: data.title || "Untitled",
            description: data.description || "",
            price: data.price || 0,
            surface_sqm: data.surface_sqm || 0,
            bedrooms: data.bedrooms || 0,
            bathrooms: data.bathrooms || 0,
            type: data.type || "apartment",
            city: data.city || "",
            address: data.address || "",
            photos: data.photos ? JSON.stringify(data.photos) : "[]",
            agent_name: data.agent_name || "",
            agent_phone: data.agent_phone || "",
            agent_agency: data.agent_agency || "",
            is_active: true,
            scraped_at: new Date().toISOString(),
            last_updated: new Date().toISOString(),
          });
          stats.new_listings++;
        }

        // Rate limiting
        if (site.rate_limit_ms) {
          await new Promise(r => setTimeout(r, site.rate_limit_ms));
        }
      } catch (err) {
        stats.failed++;
        console.error("[scraper-engine] Failed listing:", err.message);
      }
    }

    // Update site stats
    const countResp = await databases.listDocuments(
      DATABASE_ID, "properties",
      [Query.equal("site_id", siteId), Query.limit(0)]
    );
    
    await databases.updateDocument(DATABASE_ID, "scraping_sites", siteId, {
      properties_count: countResp.total,
      last_scrape_at: new Date().toISOString(),
      last_scrape_status: "success",
    });

    // Mark job completed
    await databases.updateDocument(DATABASE_ID, "scraping_jobs", jobId, {
      status: "completed",
      stats: JSON.stringify(stats),
      completed_at: new Date().toISOString(),
    });

    console.log("[scraper-engine] Job completed:", stats);
    return { success: true, jobId, stats };

  } catch (error) {
    console.error("[scraper-engine] Job failed:", error.message);
    
    await databases.updateDocument(DATABASE_ID, "scraping_jobs", jobId, {
      status: "failed",
      error_message: error.message,
      completed_at: new Date().toISOString(),
    });
    
    return { success: false, jobId, error: error.message };
  }
};