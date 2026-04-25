/**
 * BelRealty - Scraper Scheduler
 * 
 * Cron job to trigger scrapes for active sites.
 * Schedule: "0 * * * *" (every hour)
 */

const sdk = require("node-appwrite");

// Configuration
const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT || "http://localhost:80/v1";
const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID || "propertymonitor";
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY;
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || "belrealty-db";
const SCRAPER_TRIGGER_ID = "scraper-trigger";

const MIN_HOURS_BETWEEN_SCRAPES = parseInt(process.env.MIN_HOURS_BETWEEN_SCRAPES) || 6;
const ALLOW_ALL_HOURS = process.env.ALLOW_ALL_HOURS === "true";
const SCRAPE_HOUR_START = parseInt(process.env.SCRAPE_HOUR_START) || 2;
const SCRAPE_HOUR_END = parseInt(process.env.SCRAPE_HOUR_END) || 6;

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

  console.log("Scheduler started");

  try {
    // Check time window
    const currentHour = new Date().getUTCHours();
    if (!ALLOW_ALL_HOURS && (currentHour < SCRAPE_HOUR_START || currentHour >= SCRAPE_HOUR_END)) {
      console.log(`Outside allowed hours (${currentHour} UTC). Skipping.`);
      return res.json({ success: true, message: "Outside scheduled hours", skipped: 0 });
    }

    // Get active sites
    const activeSites = await databases.listDocuments(
      DATABASE_ID,
      "scraping_sites",
      [new sdk.Query().equal("is_active", true).limit(100)]
    );

    console.log(`Found ${activeSites.documents.length} active sites`);

    const results = [];
    const nowTime = Date.now();

    for (const site of activeSites.documents) {
      // Check if needs scraping
      if (site.last_scrape_at) {
        const hoursSinceLastScrape = (nowTime - new Date(site.last_scrape_at).getTime()) / (1000 * 60 * 60);
        if (hoursSinceLastScrape < MIN_HOURS_BETWEEN_SCRAPES) {
          console.log(`Site ${site.name} scraped ${hoursSinceLastScrape.toFixed(1)}h ago. Skipping.`);
          continue;
        }
      }

      console.log(`Triggering scrape for ${site.name}`);

      try {
        const execution = await functions.createExecution(
          SCRAPER_TRIGGER_ID,
          JSON.stringify({ siteId: site.$id, trigger: "scheduled", filters: {} }),
          true
        );
        results.push({ siteId: site.$id, siteName: site.name, status: "triggered" });
      } catch (error) {
        console.error(`Failed to trigger ${site.name}:`, error.message);
        results.push({ siteId: site.$id, siteName: site.name, status: "error", error: error.message });
      }

      await sleep(1000);
    }

    const triggered = results.filter(r => r.status === "triggered").length;
    console.log(`Scheduler complete. Triggered: ${triggered}, Errors: ${results.length - triggered}`);

    return res.json({
      success: true,
      totalSites: activeSites.documents.length,
      triggered,
      errors: results.length - triggered,
      results,
    });

  } catch (error) {
    console.error("Scheduler error:", error);
    return res.json({ success: false, error: error.message });
  }
};

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}