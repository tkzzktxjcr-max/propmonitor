/**
 * BelRealty - Scraper Engine
 * 
 * Uses Playwright to scrape JS-rendered websites like Immoweb, Zimmo, Immovlan.
 */

const sdk = require("node-appwrite");
const { chromium } = require("playwright");

const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT || "https://backend.071098v2.duckdns.org/v1";
const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID || "propertymonitor";
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY;
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || "belrealty-db";

// Site-specific URL builders
const SITE_URLS = {
  immoweb: {
    search: (filters = {}) => {
      let url = "https://www.immoweb.be/en/search";
      const params = new URLSearchParams();
      if (filters.city) {
        params.append("countries", "BE");
        params.append("query", filters.city);
      }
      if (filters.price_min) params.append("priceMin", filters.price_min);
      if (filters.price_max) params.append("priceMax", filters.price_max);
      if (filters.type && filters.type !== "apartment") {
        params.append("propertySubtype", filters.type);
      }
      params.append("isPubliclyVisible", "true");
      const qs = params.toString();
      return qs ? `${url}?${qs}` : url;
    },
    parseListings: ($) => {
      const listings = [];
      // Immoweb listing selectors
      $(".search-results__item, article[data-testid='listing'], .property-card").each((i, el) => {
        const $el = $(el);
        const link = $el.find("a").first().attr("href") || "";
        if (link.includes("/property/")) {
          const match = link.match(/\/property\/(\d+)/);
          const sourceId = match ? match[1] : "";
          if (sourceId) {
            listings.push({
              sourceId,
              url: link.startsWith("http") ? link : "https://www.immoweb.be" + link,
            });
          }
        }
      });
      return listings;
    },
    parseProperty: ($, url) => {
      const sourceId = url.match(/\/property\/(\d+)/)?.[1] || "";
      const title = $("h1[data-testid='property-title']").text().trim() || 
                   $("h1.property-title").text().trim() || "";
      const priceText = $("[data-testid='price']").first().text().trim() || 
                       $(".price").first().text().trim() || "";
      const price = parseInt(priceText.replace(/[€\s,.]/g, "")) || 0;
      
      const description = $("[data-testid='description']").text().trim() ||
                        $(".property-description").text().trim() || "";
      
      const specs = {};
      $("[data-testid='property-attribute'], .specs-item").each((i, el) => {
        const text = $(el).text().toLowerCase();
        if (text.includes("bedroom")) specs.bedrooms = parseInt(text.match(/\d+/)?.[0]) || 0;
        if (text.includes("bathroom")) specs.bathrooms = parseInt(text.match(/\d+/)?.[0]) || 0;
        if (text.includes("living")) specs.surface = parseInt(text.match(/\d+/)?.[0]) || 0;
      });
      
      // Fallback: get surface from first spec if not found
      if (!specs.surface) {
        const surfaceText = $("[data-testid='property-attribute']").first().text();
        specs.surface = parseInt(surfaceText.match(/\d+/)?.[0]) || 0;
      }
      
      const address = $("[data-testid='address']").text().trim() || "";
      const city = $("[data-testid='city']").text().trim() || 
                   $(".city").first().text().trim() || "";
      const postalCode = address.match(/\b\d{4}\b/)?.[0] || "";
      
      const photos = [];
      $("[data-testid='gallery-image'], .gallery img, .photo img").each((i, el) => {
        const src = $(el).attr("src") || $(el).attr("data-src");
        if (src && !src.includes("placeholder") && src.startsWith("http")) {
          photos.push(src);
        }
      });
      
      const agentName = $("[data-testid='agent-name']").text().trim() ||
                       $(".agent-name").text().trim() || "";
      const agentPhone = $("[data-testid='agent-phone']").text().trim() ||
                        $(".agent-phone").text().trim() || "";
      const agency = $("[data-testid='agency-name']").text().trim() ||
                   $(".agency-name").text().trim() || "";
      
      return {
        sourceId,
        title: title || "Property in " + city,
        description,
        price,
        surface_sqm: specs.surface || 0,
        bedrooms: specs.bedrooms || 0,
        bathrooms: specs.bathrooms || 0,
        type: description.toLowerCase().includes("apartment") ? "apartment" : "house",
        city,
        postalCode,
        address,
        photos,
        agentName,
        agentPhone,
        agency,
        url,
      };
    }
  },
  zimmo: {
    search: (filters = {}) => {
      let url = "https://www.zimmo.be/en/";
      const params = new URLSearchParams();
      if (filters.city) params.append("city", filters.city);
      if (filters.price_min) params.append("priceMin", filters.price_min);
      if (filters.price_max) params.append("priceMax", filters.price_max);
      const qs = params.toString();
      return qs ? `${url}?${qs}` : url;
    },
    parseListings: ($) => {
      const listings = [];
      $("[data-property-id], .property-item, .listing-item").each((i, el) => {
        const $el = $(el);
        const link = $el.find("a").first().attr("href") || "";
        const match = link.match(/\/p-(\d+)/);
        const sourceId = match ? match[1] : "";
        if (sourceId) {
          listings.push({
            sourceId,
            url: link.startsWith("http") ? link : "https://www.zimmo.be" + link,
          });
        }
      });
      return listings;
    },
    parseProperty: ($, url) => {
      const sourceId = url.match(/\/p-(\d+)/)?.[1] || "";
      const title = $("h1").first().text().trim() || "";
      const priceText = $("[class*='price']").first().text().trim() || "";
      const price = parseInt(priceText.replace(/[€\s,.]/g, "")) || 0;
      const description = $("[class*='description']").text().trim() || "";
      const city = $("[class*='location']").first().text().trim() || "";
      
      const photos = [];
      $("[class*='gallery'] img, [class*='photo'] img").each((i, el) => {
        const src = $(el).attr("src") || $(el).attr("data-src");
        if (src && src.startsWith("http")) photos.push(src);
      });
      
      return {
        sourceId,
        title: title || "Property in " + city,
        description,
        price,
        surface_sqm: 0,
        bedrooms: 0,
        bathrooms: 0,
        type: "apartment",
        city,
        postalCode: "",
        address: "",
        photos,
        agentName: "",
        agentPhone: "",
        agency: "",
        url,
      };
    }
  }
};

module.exports = async (req, res) => {
  console.log("[scraper-engine] Function triggered at", new Date().toISOString());
  
  const sendResponse = (statusCode, body) => {
    if (res) return res.json(body, statusCode);
    return { statusCode, body };
  };

  if (!APPWRITE_API_KEY) {
    console.error("[scraper-engine] Missing API key");
    return sendResponse(500, { success: false, error: "Missing API key" });
  }

  const client = new sdk.Client()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID)
    .setKey(APPWRITE_API_KEY);

  const databases = new sdk.Databases(client);
  const Query = sdk.Query;

  // Find pending job
  let job = null;
  try {
    const jobsResponse = await databases.listDocuments(
      DATABASE_ID, "scraping_jobs",
      [Query.equal("status", "pending"), Query.orderAsc("started_at"), Query.limit(1)]
    );
    
    if (jobsResponse.documents.length > 0) {
      job = jobsResponse.documents[0];
      console.log("[scraper-engine] Found pending job:", job.$id);
    } else {
      console.log("[scraper-engine] No pending jobs found");
      return sendResponse(200, { success: true, message: "No pending jobs" });
    }
  } catch (e) {
    console.error("[scraper-engine] Failed to find pending job:", e.message);
    return sendResponse(500, { success: false, error: e.message });
  }

  const jobId = job.$id;
  const siteId = job.site_id;
  let filters = {};
  try { filters = job.filters ? JSON.parse(job.filters) : {}; } catch (e) {}

  // Update job to running
  try {
    await databases.updateDocument(DATABASE_ID, "scraping_jobs", jobId, { 
      status: "running",
      started_at: new Date().toISOString()
    });
  } catch (e) { console.error("[scraper-engine] Failed to update job:", e.message); }

  let browser;
  try {
    // Get site
    const site = await databases.getDocument(DATABASE_ID, "scraping_sites", siteId);
    console.log("[scraper-engine] Site:", site.name, site.base_url);
    
    const siteSlug = site.slug || site.name?.toLowerCase().replace(/\s+/g, "");
    console.log("[scraper-engine] Site slug:", siteSlug);

    // Get site config
    const siteConfig = SITE_URLS[siteSlug] || SITE_URLS.immoweb;
    
    // Launch browser
    console.log("[scraper-engine] Launching browser...");
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
    });
    const page = await context.newPage();
    
    // Scrape listings page
    const searchUrl = siteConfig.search(filters);
    console.log("[scraper-engine] Scraping URL:", searchUrl);
    
    await page.goto(searchUrl, { waitUntil: "networkidle", timeout: 60000 });
    await page.waitForTimeout(2000); // Wait for JS to render
    
    // Get page content and parse with cheerio-like selectors via page.evaluate
    const html = await page.content();
    const cheerio = require("cheerio");
    const $ = cheerio.load(html);
    
    const listings = siteConfig.parseListings($);
    console.log("[scraper-engine] Found listings:", listings.length);

    const stats = { total_found: listings.length, new_listings: 0, updated: 0, failed: 0 };
    
    // Process each listing (limit for demo)
    const maxListings = Math.min(listings.length, 5);
    for (let i = 0; i < maxListings; i++) {
      const listing = listings[i];
      console.log("[scraper-engine] Processing listing", i + 1, "of", maxListings);
      
      try {
        await page.goto(listing.url, { waitUntil: "networkidle", timeout: 60000 });
        await page.waitForTimeout(1000);
        
        const detailHtml = await page.content();
        const $$ = cheerio.load(detailHtml);
        const data = siteConfig.parseProperty($$, listing.url);
        
        console.log("[scraper-engine] Scraped:", data.title, "- €" + data.price);
        
        // Check if exists
        const existing = await databases.listDocuments(
          DATABASE_ID, "properties",
          [Query.equal("source_id", data.sourceId), Query.equal("site_id", siteId), Query.limit(1)]
        );

        const postalCode = data.postalCode || data.address?.match(/\b\d{4}\b/)?.[0] || "";
        const province = postalCodeToProvince(postalCode);

        if (existing.documents.length > 0) {
          const prop = existing.documents[0];
          if (prop.price !== data.price) {
            await databases.updateDocument(DATABASE_ID, "properties", prop.$id, {
              price: data.price,
              title: data.title,
              description: data.description,
              last_updated: new Date().toISOString(),
            });
            stats.updated++;
            console.log("[scraper-engine] Updated:", prop.$id);
          }
        } else {
          await databases.createDocument(DATABASE_ID, "properties", "unique()", {
            site_id: siteId,
            source_id: data.sourceId,
            url: data.url,
            title: data.title,
            description: data.description,
            price: data.price,
            surface_sqm: data.surface_sqm,
            bedrooms: data.bedrooms,
            bathrooms: data.bathrooms,
            type: data.type,
            city: data.city,
            postal_code: postalCode,
            province: province,
            address: data.address,
            photos: JSON.stringify(data.photos),
            agent_name: data.agentName,
            agent_phone: data.agentPhone,
            agent_agency: data.agency,
            is_active: true,
            scraped_at: new Date().toISOString(),
            last_updated: new Date().toISOString(),
          });
          stats.new_listings++;
          console.log("[scraper-engine] Created new property");
        }
        
        // Rate limit
        await page.waitForTimeout(site.rate_limit_ms || 2000);
        
      } catch (err) {
        stats.failed++;
        console.error("[scraper-engine] Failed listing:", err.message);
      }
    }

    // Update site stats
    try {
      const countResp = await databases.listDocuments(
        DATABASE_ID, "properties", [Query.equal("site_id", siteId), Query.limit(0)]
      );
      await databases.updateDocument(DATABASE_ID, "scraping_sites", siteId, {
        properties_count: countResp.total,
        last_scrape_at: new Date().toISOString(),
        last_scrape_status: "success",
      });
    } catch (e) { console.error("[scraper-engine] Failed to update site:", e.message); }

    // Mark job completed
    await databases.updateDocument(DATABASE_ID, "scraping_jobs", jobId, {
      status: "completed",
      stats: JSON.stringify(stats),
      completed_at: new Date().toISOString(),
    });

    console.log("[scraper-engine] Job completed:", JSON.stringify(stats));
    await browser.close();
    return sendResponse(200, { success: true, jobId, stats });

  } catch (error) {
    console.error("[scraper-engine] Job failed:", error.message);
    await browser?.close();
    
    try {
      await databases.updateDocument(DATABASE_ID, "scraping_jobs", jobId, {
        status: "failed",
        error_message: error.message,
        completed_at: new Date().toISOString(),
      });
    } catch (e) {}
    
    return sendResponse(500, { success: false, jobId, error: error.message });
  }
};

function postalCodeToProvince(postalCode) {
  if (!postalCode) return "Unknown";
  const code = parseInt(postalCode.toString().substring(0, 2));
  if (code >= 10 && code <= 12) return "Brussels-Capital";
  if (code >= 13 && code <= 14) return "Walloon Brabant";
  if (code >= 15 && code <= 19) return "Flemish Brabant";
  if (code >= 20 && code <= 29) return "Antwerp";
  if (code >= 30 && code <= 39) return "Flemish Brabant";
  if (code >= 40 && code <= 49) return "Liège";
  if (code >= 50 && code <= 59) return "Namur";
  if (code >= 60 && code <= 65) return "Hainaut";
  if (code >= 66 && code <= 69) return "Luxembourg";
  if (code >= 70 && code <= 79) return "Hainaut";
  if (code >= 80 && code <= 89) return "West Flanders";
  if (code >= 90 && code <= 99) return "East Flanders";
  return "Unknown";
}