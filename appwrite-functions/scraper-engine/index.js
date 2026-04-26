/**
 * BelRealty - POWERFUL Scraping Engine
 * 
 * Features:
 * - API endpoint discovery and reverse engineering
 * - Multi-page pagination support
 * - Retry logic with exponential backoff
 * - Concurrent request limiting
 * - Comprehensive error handling
 * - Real estate-specific parsing
 */

const sdk = require("node-appwrite");
const axios = require("axios");
const cheerio = require("cheerio");

const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT || "https://backend.071098v2.duckdns.org/v1";
const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID || "propertymonitor";
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY;
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || "belrealty-db";

// Retry helper with exponential backoff
async function retry(fn, maxRetries = 3, delay = 1000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      console.log(`Retry ${i + 1}/${maxRetries} after ${delay}ms:`, error.message);
      await new Promise(r => setTimeout(r, delay));
      delay *= 2;
    }
  }
}

// ─────────────────────────────────────────────
// IMMOWEB SCRAPER - Most Complete
// ─────────────────────────────────────────────
const ImmowebScraper = {
  name: "immoweb",
  
  // Try different URL strategies
  getSearchUrls(filters, page = 1) {
    const base = "https://www.immoweb.be/en/search";
    const params = new URLSearchParams();
    
    if (filters.city) {
      params.append("countries", "BE");
      params.append("query", filters.city);
    }
    if (filters.price_min) params.append("priceMin", filters.price_min);
    if (filters.price_max) params.append("priceMax", filters.price_max);
    if (filters.type === "house") params.append("propertySubtype", "HOUSE");
    if (filters.type === "apartment") params.append("propertySubtype", "APARTMENT");
    if (filters.type === "villa") params.append("propertySubtype", "VILLA");
    
    params.append("isPubliclyVisible", "true");
    params.append("page", page.toString());
    params.append("orderBy", "relevancy");
    
    return `${base}?${params.toString()}`;
  },
  
  // Immoweb uses GraphQL API internally
  async getApiEndpoint(site, filters, page = 1) {
    // Try to get the API URL from search page
    try {
      const searchUrl = this.getSearchUrls(filters, page);
      const response = await axios.get(searchUrl, {
        headers: this.getHeaders(),
        timeout: 30000,
      });
      
      // Look for API URL in page
      const apiMatch = response.data.match(/window\.app\s*=\s*({[^<]+})/);
      if (apiMatch) {
        try {
          const appConfig = JSON.parse(apiMatch[1]);
          if (appConfig.config?.apiUrl) {
            return appConfig.config.apiUrl;
          }
        } catch (e) {}
      }
      
      // Look for GraphQL endpoint
      const graphqlMatch = response.data.match(/https:\/\/api\.immoweb\.be\/[^\s"']+/);
      if (graphqlMatch) {
        return graphqlMatch[0];
      }
      
    } catch (e) {
      console.log("[Immoweb] API discovery failed:", e.message);
    }
    return null;
  },
  
  getHeaders() {
    return {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9,nl;q=0.8,fr;q=0.7",
      "Accept-Encoding": "gzip, deflate, br",
      "Connection": "keep-alive",
      "Upgrade-Insecure-Requests": "1",
      "Cache-Control": "max-age=0",
    };
  },
  
  parseListings(html) {
    const $ = cheerio.load(html);
    const listings = [];
    
    // Immoweb uses article elements with specific classes
    const selectors = [
      "article.search-result",
      "article.property-card",
      "[data-testid='listing']",
      ".listing-item",
      ".search-results__item",
      "article",
    ];
    
    for (const selector of selectors) {
      $(selector).each((i, el) => {
        const $el = $(el);
        
        // Try to find the property link
        let link = $el.find("a").first().attr("href") || "";
        
        // Try data attributes
        if (!link) {
          link = $el.attr("data-url") || "";
        }
        
        // Extract ID from URL or data attribute
        let sourceId = "";
        const idMatch = link.match(/\/property\/(\d+)/);
        if (idMatch) {
          sourceId = idMatch[1];
        }
        
        if (link && sourceId && link.includes("/property/")) {
          // Avoid duplicates
          if (!listings.find(l => l.sourceId === sourceId)) {
            listings.push({
              sourceId,
              url: link.startsWith("http") ? link : `https://www.immoweb.be${link}`,
            });
          }
        }
      });
      
      if (listings.length > 0) break;
    }
    
    // Also try JSON-LD structured data
    $("script[type='application/ld+json']").each((i, el) => {
      try {
        const data = JSON.parse($(el).html() || "");
        if (Array.isArray(data)) {
          for (const item of data) {
            if (item["@type"] === "Product" || item["@type"] === "RealEstateListing") {
              const url = item.url || item.mainEntityOfPage?.["@id"] || "";
              const idMatch = url.match(/\/property\/(\d+)/);
              if (idMatch && !listings.find(l => l.sourceId === idMatch[1])) {
                listings.push({
                  sourceId: idMatch[1],
                  url: url.startsWith("http") ? url : `https://www.immoweb.be${url}`,
                });
              }
            }
          }
        }
      } catch (e) {}
    });
    
    return listings;
  },
  
  hasNextPage(html) {
    const $ = cheerio.load(html);
    // Look for pagination
    const nextButton = $("a[rel='next'], a.next, .pagination .next, [aria-label='Next page']");
    return nextButton.length > 0;
  },
  
  parseProperty(html, url) {
    const $ = cheerio.load(html);
    
    const sourceId = url.match(/\/property\/(\d+)/)?.[1] || "";
    
    // Title
    let title = "";
    const titleSelectors = [
      "h1[data-testid='property-title']",
      "h1.property-title",
      ".property-header h1",
      "h1",
    ];
    for (const sel of titleSelectors) {
      const text = $(sel).first().text().trim();
      if (text) { title = text; break; }
    }
    
    // Price
    let price = 0;
    const priceSelectors = [
      "[data-testid='price']",
      ".price .price--closed",
      ".property-price",
      ".price",
      "[class*='price']",
    ];
    for (const sel of priceSelectors) {
      const text = $(sel).first().text().trim();
      const match = text.match(/[\d\s,]+/);
      if (match) {
        price = parseInt(match[0].replace(/\s/g, ""));
        if (price > 1000) break;
      }
    }
    
    // Description
    let description = "";
    const descSelectors = [
      "[data-testid='description']",
      ".property-description",
      ".description",
      "#description",
    ];
    for (const sel of descSelectors) {
      const text = $(sel).text().trim();
      if (text && text.length > 50) { description = text; break; }
    }
    
    // Specs from attributes
    const specs = { bedrooms: 0, bathrooms: 0, surface: 0 };
    $("[data-testid='property-attribute']").each((i, el) => {
      const $el = $(el);
      const text = $el.text().toLowerCase();
      const val = parseInt($el.find(".value, span").text()) || 0;
      
      if (text.includes("bed")) specs.bedrooms = val || parseInt(text) || specs.bedrooms;
      if (text.includes("bath")) specs.bathrooms = val || parseInt(text) || specs.bathrooms;
      if (text.includes("living") || text.includes("surface")) specs.surface = val || parseInt(text) || specs.surface;
    });
    
    // Fallback specs from page text
    const pageText = $("body").text();
    if (!specs.bedrooms) {
      const bedMatch = pageText.match(/(\d+)\s*(bedroom|bed|chambre|lit)/i);
      if (bedMatch) specs.bedrooms = parseInt(bedMatch[1]);
    }
    if (!specs.bathrooms) {
      const bathMatch = pageText.match(/(\d+)\s*(bath|bathroom|salle)/i);
      if (bathMatch) specs.bathrooms = parseInt(bathMatch[1]);
    }
    if (!specs.surface) {
      const surfMatch = pageText.match(/(\d+)\s*(m²|sqm|m2|surface)/i);
      if (surfMatch) specs.surface = parseInt(surfMatch[1]);
    }
    
    // Location
    let address = "", city = "", postalCode = "";
    const addrSelectors = ["[data-testid='address']", ".address", ".property-address"];
    for (const sel of addrSelectors) {
      address = $(sel).first().text().trim();
      if (address) break;
    }
    
    city = $("[data-testid='city'], .city").first().text().trim() || address.split(",")[0]?.trim() || "";
    postalCode = address.match(/\b\d{4}\b/)?.[0] || "";
    
    // Photos
    const photos = [];
    $("img[data-testid='gallery-image'], .gallery img, .photo img, [class*='photo'] img").each((i, el) => {
      let src = $(el).attr("src") || $(el).attr("data-src") || "";
      if (src && !src.includes("placeholder") && src.startsWith("http") && src.length < 500) {
        // Get high-res version
        src = src.replace(/\/small\//, "/large/").replace(/\/\d+x\d+/, "/1200x800");
        if (!photos.includes(src)) photos.push(src);
      }
    });
    
    // Agent info
    const agentName = $("[data-testid='agent-name']").text().trim() || "";
    const agentPhone = $("[data-testid='agent-phone']").text().trim() || "";
    const agency = $("[data-testid='agency-name']").text().trim() || "";
    
    // Property type
    let type = "apartment";
    const typeText = $("[data-testid='property-type']").text().toLowerCase() + description.toLowerCase();
    if (typeText.includes("house")) type = "house";
    else if (typeText.includes("villa")) type = "villa";
    else if (typeText.includes("studio")) type = "studio";
    else if (typeText.includes("commercial")) type = "commercial";
    
    return {
      sourceId,
      title: title || `Property in ${city}`,
      description,
      price,
      surface_sqm: specs.surface,
      bedrooms: specs.bedrooms,
      bathrooms: specs.bathrooms,
      type,
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
};

// ─────────────────────────────────────────────
// ZIMMO SCRAPER
// ─────────────────────────────────────────────
const ZimmoScraper = {
  name: "zimmo",
  
  getSearchUrls(filters, page = 1) {
    const base = "https://www.zimmo.be/en/";
    const params = new URLSearchParams();
    if (filters.city) params.append("city", filters.city);
    if (filters.price_min) params.append("priceMin", filters.price_min);
    if (filters.price_max) params.append("priceMax", filters.price_max);
    params.append("page", page.toString());
    return `${base}?${params.toString()}`;
  },
  
  getHeaders() {
    return {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml",
      "Accept-Language": "en-US,en;q=0.9",
    };
  },
  
  parseListings(html) {
    const $ = cheerio.load(html);
    const listings = [];
    
    $("[data-property-id], .property-item, .listing-item, article").each((i, el) => {
      const $el = $(el);
      let link = $el.find("a").first().attr("href") || $el.attr("data-url") || "";
      
      const idMatch = link.match(/\/p-(\d+)/) || link.match(/\/property\/(\d+)/);
      if (idMatch) {
        const sourceId = idMatch[1];
        if (!listings.find(l => l.sourceId === sourceId)) {
          listings.push({
            sourceId,
            url: link.startsWith("http") ? link : `https://www.zimmo.be${link}`,
          });
        }
      }
    });
    
    return listings;
  },
  
  hasNextPage(html) {
    return html.includes("next") || html.includes("pagination");
  },
  
  parseProperty(html, url) {
    const $ = cheerio.load(html);
    
    const sourceId = url.match(/\/p-(\d+)/)?.[1] || "";
    const title = $("h1").first().text().trim() || "";
    const priceText = $("[class*='price']").first().text() || "";
    const price = parseInt(priceText.replace(/[^\d]/g, "")) || 0;
    const description = $("[class*='description']").text().trim() || "";
    const city = $("[class*='location']").first().text().trim() || "";
    
    const photos = [];
    $("[class*='gallery'] img, [class*='photo'] img").each((i, el) => {
      const src = $(el).attr("src") || $(el).attr("data-src");
      if (src && src.startsWith("http")) photos.push(src);
    });
    
    return {
      sourceId,
      title: title || `Property in ${city}`,
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
};

// ─────────────────────────────────────────────
// IMMOVLAN SCRAPER
// ─────────────────────────────────────────────
const ImmovlanScraper = {
  name: "immovlan",
  
  getSearchUrls(filters, page = 1) {
    const base = "https://www.immovlan.be/en/properties";
    const params = new URLSearchParams();
    if (filters.city) params.append("q", filters.city);
    if (filters.price_min) params.append("price_min", filters.price_min);
    if (filters.price_max) params.append("price_max", filters.price_max);
    params.append("page", page.toString());
    return `${base}?${params.toString()}`;
  },
  
  getHeaders() {
    return {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml",
      "Accept-Language": "en-US,en;q=0.9",
    };
  },
  
  parseListings(html) {
    const $ = cheerio.load(html);
    const listings = [];
    
    $(".result-item, .listing, .property-result, [data-listing-id], article").each((i, el) => {
      const $el = $(el);
      let link = $el.find("a").first().attr("href") || "";
      
      const idMatch = link.match(/\/property\/(\d+)/) || link.match(/\/listing\/(\d+)/);
      if (idMatch) {
        const sourceId = idMatch[1];
        if (!listings.find(l => l.sourceId === sourceId)) {
          listings.push({
            sourceId,
            url: link.startsWith("http") ? link : `https://www.immovlan.be${link}`,
          });
        }
      }
    });
    
    return listings;
  },
  
  hasNextPage(html) {
    return html.includes("page=") && html.includes("next");
  },
  
  parseProperty(html, url) {
    const $ = cheerio.load(html);
    
    const sourceId = url.match(/\/property\/(\d+)/)?.[1] || "";
    const title = $("h1.title, h1").first().text().trim() || "";
    const priceText = $(".price, [class*='price']").first().text() || "";
    const price = parseInt(priceText.replace(/[^\d]/g, "")) || 0;
    const description = $(".description, [class*='description']").text().trim() || "";
    const address = $("[class*='address']").first().text().trim() || "";
    const city = $("[class*='city']").first().text().trim() || "";
    const postalCode = address.match(/\b\d{4}\b/)?.[0] || "";
    
    const photos = [];
    $("[class*='gallery'] img, [class*='photo'] img").each((i, el) => {
      const src = $(el).attr("src") || $(el).attr("data-src");
      if (src && src.startsWith("http")) photos.push(src);
    });
    
    return {
      sourceId,
      title: title || `Property in ${city}`,
      description,
      price,
      surface_sqm: 0,
      bedrooms: 0,
      bathrooms: 0,
      type: "apartment",
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
};

// Scraper registry
const SCRAPERS = {
  immoweb: ImmowebScraper,
  immovlan: ImmovlanScraper,
  zimmo: ZimmoScraper,
};

module.exports = async (req, res) => {
  console.log("[scraper-engine] 🚀 Starting powerful scrape at", new Date().toISOString());
  
  const sendResponse = (statusCode, body) => {
    if (res) return res.json(body, statusCode);
    return { statusCode, body };
  };

  if (!APPWRITE_API_KEY) {
    return sendResponse(500, { success: false, error: "Missing API key" });
  }

  const client = new sdk.Client()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID)
    .setKey(APPWRITE_API_KEY);

  const databases = new sdk.Databases(client);
  const Query = sdk.Query;

  // Find pending job
  let job;
  try {
    const jobsResponse = await databases.listDocuments(
      DATABASE_ID, "scraping_jobs",
      [Query.equal("status", "pending"), Query.orderAsc("started_at"), Query.limit(1)]
    );
    
    if (jobsResponse.documents.length === 0) {
      console.log("[scraper-engine] No pending jobs");
      return sendResponse(200, { success: true, message: "No pending jobs" });
    }
    job = jobsResponse.documents[0];
    console.log("[scraper-engine] Job:", job.$id);
  } catch (e) {
    return sendResponse(500, { success: false, error: e.message });
  }

  const jobId = job.$id;
  const siteId = job.site_id;
  let filters = {};
  try { filters = JSON.parse(job.filters || "{}"); } catch (e) {}

  // Mark as running
  await databases.updateDocument(DATABASE_ID, "scraping_jobs", jobId, { 
    status: "running",
    started_at: new Date().toISOString()
  }).catch(e => console.error("[scraper-engine] Failed to update:", e.message));

  try {
    // Get site
    const site = await databases.getDocument(DATABASE_ID, "scraping_sites", siteId);
    console.log("[scraper-engine] Site:", site.name, site.slug);
    
    const scraper = SCRAPERS[site.slug] || SCRAPERS.immoweb;
    const stats = { total_found: 0, new_listings: 0, updated: 0, failed: 0 };
    const rateLimit = site.rate_limit_ms || 2000;
    
    // Scrape with pagination (max 5 pages for demo)
    const maxPages = 3;
    let page = 1;
    
    while (page <= maxPages) {
      console.log(`[scraper-engine] Scraping page ${page}/${maxPages}...`);
      
      const searchUrl = scraper.getSearchUrls(filters, page);
      console.log("[scraper-engine] URL:", searchUrl);
      
      let html;
      try {
        const response = await retry(() => axios.get(searchUrl, {
          headers: scraper.getHeaders(),
          timeout: 30000,
        }), 3, 2000);
        html = response.data;
      } catch (e) {
        console.error("[scraper-engine] Failed to fetch page:", e.message);
        break;
      }
      
      const listings = scraper.parseListings(html);
      console.log("[scraper-engine] Found", listings.length, "listings on page", page);
      stats.total_found += listings.length;
      
      if (listings.length === 0) break;
      
      // Process listings
      for (const listing of listings) {
        try {
          await new Promise(r => setTimeout(r, rateLimit));
          
          const detailResponse = await retry(() => axios.get(listing.url, {
            headers: scraper.getHeaders(),
            timeout: 30000,
          }), 2, 1500);
          
          const data = scraper.parseProperty(detailResponse.data, listing.url);
          console.log("[scraper-engine] Scraped:", data.title?.substring(0, 50), "- €" + data.price);
          
          // Check if exists
          const existing = await databases.listDocuments(
            DATABASE_ID, "properties",
            [Query.equal("source_id", data.sourceId), Query.equal("site_id", siteId), Query.limit(1)]
          );

          const postalCode = data.postalCode || "";
          const province = postalCodeToProvince(postalCode);

          if (existing.documents.length > 0) {
            const prop = existing.documents[0];
            if (prop.price !== data.price || prop.title !== data.title) {
              await databases.updateDocument(DATABASE_ID, "properties", prop.$id, {
                price: data.price || prop.price,
                title: data.title || prop.title,
                description: data.description || prop.description || "",
                last_updated: new Date().toISOString(),
              });
              stats.updated++;
            }
          } else {
            await databases.createDocument(DATABASE_ID, "properties", "unique()", {
              site_id: siteId,
              source_id: data.sourceId,
              url: data.url,
              title: data.title || "Untitled",
              description: data.description || "",
              price: data.price || 0,
              surface_sqm: data.surface_sqm || 0,
              bedrooms: data.bedrooms || 0,
              bathrooms: data.bathrooms || 0,
              type: data.type || "apartment",
              city: data.city || "",
              postal_code: postalCode,
              province: province,
              address: data.address || "",
              photos: JSON.stringify(data.photos || []),
              agent_name: data.agentName || "",
              agent_phone: data.agentPhone || "",
              agent_agency: data.agency || "",
              is_active: true,
              scraped_at: new Date().toISOString(),
              last_updated: new Date().toISOString(),
            });
            stats.new_listings++;
          }
        } catch (err) {
          stats.failed++;
          console.error("[scraper-engine] Failed listing:", err.message);
        }
      }
      
      // Check for next page
      if (!scraper.hasNextPage(html) || page >= maxPages) break;
      page++;
    }

    // Update site stats
    try {
      const countResp = await databases.listDocuments(DATABASE_ID, "properties", [Query.equal("site_id", siteId), Query.limit(0)]);
      await databases.updateDocument(DATABASE_ID, "scraping_sites", siteId, {
        properties_count: countResp.total,
        last_scrape_at: new Date().toISOString(),
        last_scrape_status: "success",
      });
    } catch (e) {}

    // Mark completed
    await databases.updateDocument(DATABASE_ID, "scraping_jobs", jobId, {
      status: "completed",
      stats: JSON.stringify(stats),
      completed_at: new Date().toISOString(),
    });

    console.log("[scraper-engine] ✅ Job completed:", JSON.stringify(stats));
    return sendResponse(200, { success: true, jobId, stats });

  } catch (error) {
    console.error("[scraper-engine] ❌ Job failed:", error.message);
    
    await databases.updateDocument(DATABASE_ID, "scraping_jobs", jobId, {
      status: "failed",
      error_message: error.message,
      completed_at: new Date().toISOString(),
    }).catch(e => {});
    
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