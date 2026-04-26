/**
 * BelRealty - Scraper Engine
 * For Appwrite self-hosted 1.7.4
 */

const sdk = require("node-appwrite");

const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT || "https://backend.071098v2.duckdns.org/v1";
const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID || "propertymonitor";
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY;
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || "belrealty-db";

module.exports = async (req) => {
  console.log("[scraper-engine] Triggered");
  console.log("[scraper-engine] req keys:", Object.keys(req));
  console.log("[scraper-engine] req.headers:", req.headers);
  console.log("[scraper-engine] req.payload:", req.payload);
  
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

  // Try to get payload from various sources
  let payload = null;
  
  // 1. Try req.payload (standard Appwrite)
  if (req.payload) {
    try {
      payload = typeof req.payload === 'string' ? JSON.parse(req.payload) : req.payload;
    } catch {}
  }
  
  // 2. Try req.headers['x-appwrite-data'] (custom header)
  if (!payload && req.headers) {
    const headerData = req.headers['x-appwrite-data'];
    if (headerData) {
      try {
        payload = JSON.parse(headerData);
      } catch {}
    }
  }
  
  // 3. Try to parse from body if it's a string
  if (!payload && req.body) {
    try {
      payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } catch {}
  }

  console.log("[scraper-engine] Parsed payload:", payload);

  if (!payload) {
    return { success: false, error: "No payload received" };
  }

  const { jobId, siteId, filters = {} } = payload;

  if (!jobId || !siteId) {
    return { success: false, error: "Missing jobId or siteId" };
  }

  console.log(`[scraper-engine] Job: ${jobId}, Site: ${siteId}`);

  try {
    const site = await databases.getDocument(DATABASE_ID, "scraping_sites", siteId);
    console.log("[scraper-engine] Site:", site.name);

    await databases.updateDocument(DATABASE_ID, "scraping_jobs", jobId, { status: "running" });
    
    let Parser;
    try {
      Parser = require("./parsers/" + site.slug);
    } catch {
      Parser = require("./parsers/base");
    }
    const parser = new Parser();

    const listings = await parser.scrapeListings(site, filters);
    console.log("[scraper-engine] Listings:", listings.length);

    const stats = { total_found: listings.length, new_listings: 0, updated: 0, failed: 0 };

    for (const listing of listings) {
      try {
        const data = await parser.scrapePropertyDetail(listing.url);
        
        const existing = await databases.listDocuments(
          DATABASE_ID, "properties",
          [Query.equal("source_id", listing.sourceId), Query.limit(1)]
        );

        if (existing.documents.length > 0) {
          const prop = existing.documents[0];
          if (prop.price !== data.price) {
            await databases.updateDocument(DATABASE_ID, "properties", prop.$id, {
              price: data.price,
              title: data.title,
              last_updated: new Date().toISOString(),
            });
            stats.updated++;
          }
        } else {
          await databases.createDocument(DATABASE_ID, "properties", "unique()", {
            site_id: siteId,
            source_id: listing.sourceId,
            url: listing.url,
            title: data.title || "",
            description: data.description || "",
            price: data.price || 0,
            surface_sqm: data.surface_sqm || 0,
            bedrooms: data.bedrooms || 0,
            bathrooms: data.bathrooms || 0,
            type: data.type || "apartment",
            city: data.city || "",
            address: data.address || "",
            photos: JSON.stringify(data.photos || []),
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

    await databases.updateDocument(DATABASE_ID, "scraping_sites", siteId, {
      properties_count: stats.total_found,
      last_scrape_at: new Date().toISOString(),
      last_scrape_status: "success",
    });

    await databases.updateDocument(DATABASE_ID, "scraping_jobs", jobId, {
      status: "completed",
      stats: JSON.stringify(stats),
      completed_at: new Date().toISOString(),
    });

    console.log("[scraper-engine] Completed:", stats);
    return { success: true, stats };

  } catch (error) {
    console.error("[scraper-engine] Error:", error.message);
    
    try {
      await databases.updateDocument(DATABASE_ID, "scraping_jobs", jobId, {
        status: "failed",
        error_message: error.message,
        completed_at: new Date().toISOString(),
      });
    } catch {}

    return { success: false, error: error.message };
  }
};