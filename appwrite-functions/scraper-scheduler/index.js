/**
 * BelRealty - Scraper Scheduler
 * 
 * Cron job that runs every hour to trigger scrapes for active sites.
 * 
 * Schedule: "0 * * * *" (every hour at minute 0)
 * 
 * This function:
 * 1. Fetches all active sites
 * 2. Checks if they need scraping (based on last_scrape_at)
 * 3. Triggers scraper-trigger for each site that needs updating
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
  const COLLECTION_SITES = "scraping_sites";
  const SCRAPER_TRIGGER_ID = "scraper-trigger"; // Function ID

  // Configuration
  const MIN_HOURS_BETWEEN_SCRAPES = parseInt(process.env.MIN_HOURS_BETWEEN_SCRAPES) || 6;
  const SCRAPE_HOUR_START = parseInt(process.env.SCRAPE_HOUR_START) || 2; // 2 AM
  const SCRAPE_HOUR_END = parseInt(process.env.SCRAPE_HOUR_END) || 6; // 6 AM

  console.log("Scheduler started");
  console.log(`Min hours between scrapes: ${MIN_HOURS_BETWEEN_SCRAPES}`);
  console.log(`Allowed scrape hours: ${SCRAPE_HOUR_START}:00 - ${SCRAPE_HOUR_END}:00`);

  try {
    // Check if we're in the allowed time window
    const now = new Date();
    const currentHour = now.getUTCHours();
    
    // For demo/testing, allow any hour if env var is set
    const allowAllHours = process.env.ALLOW_ALL_HOURS === "true";
    
    if (!allowAllHours && (currentHour < SCRAPE_HOUR_START || currentHour >= SCRAPE_HOUR_END)) {
      console.log(`Outside allowed hours (${currentHour} UTC). Skipping.`);
      return res.json({
        success: true,
        message: "Outside scheduled hours",
        skipped: 0,
      });
    }

    // Fetch active sites
    const activeSites = await databases.listDocuments(
      DATABASE_ID,
      COLLECTION_SITES,
      [
        new sdk.Query().equal("is_active", true).limit(100),
      ]
    );

    console.log(`Found ${activeSites.documents.length} active sites`);

    const results = [];
    const nowTime = new Date().getTime();

    for (const site of activeSites.documents) {
      // Check if site needs scraping
      let needsScrape = true;

      if (site.last_scrape_at) {
        const lastScrape = new Date(site.last_scrape_at).getTime();
        const hoursSinceLastScrape = (nowTime - lastScrape) / (1000 * 60 * 60);

        if (hoursSinceLastScrape < MIN_HOURS_BETWEEN_SCRAPES) {
          console.log(`Site ${site.name} scraped ${hoursSinceLastScrape.toFixed(1)}h ago. Skipping.`);
          needsScrape = false;
        }
      }

      if (!needsScrape) {
        continue;
      }

      console.log(`Triggering scrape for ${site.name} (last scraped: ${site.last_scrape_at || "never"})`);

      try {
        // Trigger scraper-trigger function
        const execution = await functions.createExecution(
          SCRAPER_TRIGGER_ID,
          JSON.stringify({
            siteId: site.$id,
            trigger: "scheduled",
            filters: {},
          }),
          true // async
        );

        results.push({
          siteId: site.$id,
          siteName: site.name,
          status: "triggered",
          executionId: execution.$id,
        });

      } catch (error) {
        console.error(`Failed to trigger scrape for ${site.name}:`, error.message);

        results.push({
          siteId: site.$id,
          siteName: site.name,
          status: "error",
          error: error.message,
        });
      }

      // Small delay between triggers to avoid rate limiting
      await sleep(1000);
    }

    const triggered = results.filter(r => r.status === "triggered").length;
    const errors = results.filter(r => r.status === "error").length;

    console.log(`Scheduler complete. Triggered: ${triggered}, Errors: ${errors}`);

    return res.json({
      success: true,
      message: `Scheduled scrape complete`,
      totalSites: activeSites.documents.length,
      triggered,
      errors,
      results,
    });

  } catch (error) {
    console.error("Scheduler error:", error);

    return res.json({
      success: false,
      error: error.message,
    });
  }
};

// Helper function
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}