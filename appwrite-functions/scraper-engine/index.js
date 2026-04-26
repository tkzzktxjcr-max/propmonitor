/**
 * BelRealty - Scraper Engine
 * 
 * Uses Playwright to scrape JS-rendered websites like Immoweb, Zimmo, Immovlan.
 * Falls back to axios if Playwright fails.
 */

const sdk = require("node-appwrite");
let chromium;
let playwrightAvailable = false;

try {
  chromium = require("playwright-core").chromium;
  playwrightAvailable = true;
  console.log("[scraper-engine] Playwright loaded successfully");
} catch (e) {
  console.log("[scraper-engine] Playwright not available, using fallback:", e.message);
}

const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT || "https://backend.071098v2.duckdns.org/v1";
const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID || "propertymonitor";
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY;
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || "belrealty-db";

// Try to load axios as fallback
let axios;
try {
  axios = require("axios");
} catch (e) {
  console.log("[scraper-engine] Axios not available");
}

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
    // Immoweb's API endpoint (might work without JS rendering)
    apiSearch: (filters = {}) => {
      let url = "https://api.immoweb.be/rest/search/v1/search";
      const params = new URLSearchParams();
      if (filters.city) params.append("query", filters.city);
      if (filters.price_min) params.append("priceMin", filters.price_min);
      if (filters.price_max) params.append("priceMax", filters.price_max);
      const qs = params.toString();
      return qs ? `${url}?${qs}` : url;
    },
    parseListings: (html) => {
      const cheerio = require("cheerio");
      const $ = cheerio.load(html);
      const listings = [];
      
      // Try multiple selectors for Immoweb listings
      $("article, .property-card, .search-result, [data-testid='listing']").each((i, el) => {
        const $el = $(el);
        let link = $el.find("a").first().attr("href") || "";
        
        // If no link found, try parent
        if (!link) {
          link = $el.parent().find("a").first().attr("href") || "";
        }
        
        if (link && link.includes("/property/")) {
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
    parseProperty: (html, url) => {
      const cheerio = require("cheerio");
      const $ = cheerio.load(html);
      
      const sourceId = url.match(/\/property\/(\d+)/)?.[1] || "";
      const title = $("h1").first().text().trim() || "";
      
      // Try multiple price selectors
      let price = 0;
      const priceSelectors = ["[data-testid='price']", ".price", ".property-price", "[class*='price']"];
      for (const sel of priceSelectors) {
        const priceText = $(sel).first().text().trim();
        if (priceText) {
          price = parseInt(priceText.replace(/[€\s,.]/g, "")) || 0;
          if (price > 0) break;
        }
      }
      
      const description = $("[data-testid='description'], .description, .property-description").text().trim();
      
      // Try to extract specs from text
      const htmlText = $("body").text();
      const bedroomMatch = htmlText.match(/(\d+)\s*(bedroom|bed|chambre|lit)/i);
      const bathroomMatch = htmlText.match(/(\d+)\s*(bathroom|bath|salle|baignoire)/i);
      const surfaceMatch = htmlText.match(/(\d+)\s*(m²|sqm|surface|m2)/i);
      
      const address = $("[data-testid='address'], .address").text().trim() || "";
      const city = $("[data-testid='city'], .city").first().text().trim() || "";
      
      const photos = [];
      $("img[data-testid='gallery-image'], .gallery img, [class*='photo'] img").each((i, el) => {
        const src = $(el).attr("src") || $(el).attr("data-src");
        if (src && !src.includes("placeholder") && src.startsWith("http") && src.length < 500) {
          photos.push(src);
        }
      });
      
      const postalCode = address.match(/\b\d{4}\b/)?.[0] || "";
      
      return {
        sourceId,
        title: title || "Property in " + city,
        description,
        price,
        surface_sqm: surfaceMatch ? parseInt(surfaceMatch[1]) : 0,
        bedrooms: bedroomMatch ? parseInt(bedroomMatch[1]) : 0,
        bathrooms: bathroomMatch ? parseInt(bathroomMatch[1]) : 0,
        type: description.toLowerCase().includes("apartment") ? "apartment" : "house",
        city,
        postalCode,
        address,
        photos,
        agentName: "",
        agentPhone: "",
        agency: "",
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
    parseListings: (html) => {
      const cheerio = require("cheerio");
      const $ = cheerio.load(html);
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
    parseProperty: (html, url) => {
      const cheerio = require("cheerio");
      const $ = cheerio.load(html);
      
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
  console.log("[scraper-engine] Playwright available:", playwrightAvailable);
  
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
    
    const siteSlug = site.slug || site.name?.toLowerCase().replace(/\s+/g, "").toLowerCase();
    console.log("[scraper-engine] Site slug:", siteSlug);

    // Get site config
    const siteConfig = SITE_URLS[siteSlug] || SITE_URLS.immoweb;
    
    let html;
    
    if (playwrightAvailable && chromium) {
      // Try Playwright
      console.log("[scraper-engine] Using Playwright...");
      try {
        browser = await chromium.launch({ 
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage({
          userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36"
        });
        
        const searchUrl = siteConfig.search(filters);
        console.log("[scraper-engine] Scraping URL:", searchUrl);
        
        await page.goto(searchUrl, { waitUntil: "networkidle", timeout: 60000 });
        await page.waitForTimeout(3000); // Wait for JS
        
        html = await page.content();
        await browser.close();
        browser = null;
      } catch (pwError) {
        console.log("[scraper-engine] Playwright failed, using fallback:", pwError.message);
        if (browser) {
          try { await browser.close(); } catch(e) {}
          browser = null;
        }
      }
    }
    
    // Fallback: Use axios + cheerio
    if (!html) {
      console.log("[scraper-engine] Using axios fallback...");
      if (!axios) {
        throw new Error("No scraping method available (Playwright and axios not available)");
      }
      
      const searchUrl = siteConfig.search(filters);
      console.log("[scraper-engine] Fetching URL:", searchUrl);
      
      const response = await axios.get(searchUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml",
          "Accept-Language": "en-US,en;q=0.9",
        },
        timeout: 30000,
      });
      
      html = response.data;
    }
    
    const listings = siteConfig.parseListings(html);
    console.log("[scraper-engine] Found listings:", listings.length);

    const stats = { total_found: listings.length, new_listings: 0, updated: 0, failed: 0 };
    
    // Process each listing (limit for demo)
    const maxListings = Math.min(listings.length, 5);
    for (let i = 0; i < maxListings; i++) {
      const listing = listings[i];
      console.log("[scraper-engine] Processing listing", i + 1, "of", maxListings);
      
      try {
        let detailHtml;
        
        if (browser) {
          const page = await browser.newPage();
          await page.goto(listing.url, { waitUntil: "networkidle", timeout: 60000 });
          await page.waitForTimeout(1000);
          detailHtml = await page.content();
        } else {
          const response = await axios.get(listing.url, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
            },
            timeout: 30000,
          });
          detailHtml = response.data;
        }
        
        const data = siteConfig.parseProperty(detailHtml, listing.url);
        console.log("[scraper-engine] Scraped:", data.title, "- €" + data.price);
        
        // Check if exists
        const existing = await databases.listDocuments(
          DATABASE_ID, "properties",
          [Query.equal("source_id", data.sourceId), Query.equal("site_id", siteId), Query.limit(1)]
        );

        const postalCode = data.postalCode || "";
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
            url: listing.url,
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
        await new Promise(r => setTimeout(r, site.rate_limit_ms || 2000));
        
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
    if (browser) try { await browser.close(); } catch(e) {}
    return sendResponse(200, { success: true, jobId, stats });

  } catch (error) {
    console.error("[scraper-engine] Job failed:", error.message);
    console.error("[scraper-engine] Stack:", error.stack);
    if (browser) try { await browser.close(); } catch(e) {}
    
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