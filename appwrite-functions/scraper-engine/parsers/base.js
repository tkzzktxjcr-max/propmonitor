/**
 * Base Parser
 */

const axios = require("axios");
const cheerio = require("cheerio");

class BaseParser {
  constructor() {
    this.siteName = "Unknown";
    this.baseUrl = "";
    this.headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Accept-Language": "en-US,en;q=0.9",
    };
  }

  /**
   * Extract postal code from address
   */
  extractPostalCode(address) {
    if (!address) return "";
    const match = address.match(/\b(\d{4})\b/);
    return match ? match[1] : "";
  }

  /**
   * Get province from postal code (Belgium)
   */
  postalCodeToProvince(postalCode) {
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

  buildSearchUrl(site, filters = {}) {
    return site.base_url;
  }

  async scrapeListings(site, filters = {}) {
    const url = this.buildSearchUrl(site, filters);
    console.log(`Scraping from: ${url}`);

    try {
      const response = await axios.get(url, {
        headers: this.headers,
        timeout: 30000,
      });

      const $ = cheerio.load(response.data);
      return this.parseListings($);
    } catch (error) {
      console.error(`Failed to fetch: ${error.message}`);
      return [];
    }
  }

  parseListings($) {
    return [];
  }

  async scrapePropertyDetail(url) {
    try {
      const response = await axios.get(url, {
        headers: this.headers,
        timeout: 30000,
      });

      const $ = cheerio.load(response.data);
      return this.parsePropertyDetail($, url);
    } catch (error) {
      console.error(`Failed to fetch: ${error.message}`);
      throw error;
    }
  }

  parsePropertyDetail($, url) {
    const postalCode = this.extractPostalCode($.html());
    
    return {
      title: $("title").text().trim(),
      description: "",
      price: 0,
      surface_sqm: 0,
      bedrooms: 0,
      bathrooms: 0,
      type: "apartment",
      city: "",
      province: this.postalCodeToProvince(postalCode),
      latitude: 0,
      longitude: 0,
      address: "",
      photos: [],
      agent_name: "",
      agent_phone: "",
      agent_agency: "",
      url: url,
    };
  }

  extractNumber(str) {
    if (!str) return 0;
    const match = str.toString().match(/[\d\s]+/);
    if (match) {
      return parseInt(match[0].replace(/\s/g, ""), 10) || 0;
    }
    return 0;
  }

  extractPrice(str) {
    if (!str) return 0;
    const cleaned = str.replace(/[€\s,.€]/g, "");
    return parseInt(cleaned, 10) || 0;
  }
}

module.exports = BaseParser;