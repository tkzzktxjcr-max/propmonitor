/**
 * Base Parser
 * 
 * Template parser with common functionality.
 * Site-specific parsers should extend this.
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
   * Build search URL with filters
   */
  buildSearchUrl(site, filters = {}) {
    return site.base_url;
  }

  /**
   * Scrape listing URLs from search results
   */
  async scrapeListings(site, filters = {}, onProgress) {
    const url = this.buildSearchUrl(site, filters);
    console.log(`Scraping listings from: ${url}`);

    try {
      const response = await axios.get(url, {
        headers: this.headers,
        timeout: 30000,
      });

      const $ = cheerio.load(response.data);
      const listings = this.parseListings($);

      return listings;
    } catch (error) {
      console.error(`Failed to fetch listings: ${error.message}`);
      return [];
    }
  }

  /**
   * Parse listings from search page (to be overridden)
   */
  parseListings($) {
    return [];
  }

  /**
   * Scrape detailed property info from listing page
   */
  async scrapePropertyDetail(url, siteSlug) {
    try {
      const response = await axios.get(url, {
        headers: this.headers,
        timeout: 30000,
      });

      const $ = cheerio.load(response.data);
      return this.parsePropertyDetail($, url);
    } catch (error) {
      console.error(`Failed to fetch property: ${error.message}`);
      throw error;
    }
  }

  /**
   * Parse property details (to be overridden)
   */
  parsePropertyDetail($, url) {
    return {
      title: $("title").text().trim(),
      description: "",
      price: 0,
      surface_sqm: 0,
      bedrooms: 0,
      bathrooms: 0,
      type: "apartment",
      city: "",
      postal_code: "",
      province: "",
      latitude: 0,
      longitude: 0,
      address: "",
      photos: [],
      agent_name: "",
      agent_phone: "",
      agent_agency: "",
      amenities: [],
      energy_rating: "F",
      year_built: null,
      url: url,
    };
  }

  /**
   * Extract number from string
   */
  extractNumber(str) {
    if (!str) return 0;
    const match = str.toString().match(/[\d\s]+/);
    if (match) {
      return parseInt(match[0].replace(/\s/g, ""), 10) || 0;
    }
    return 0;
  }

  /**
   * Extract price from string
   */
  extractPrice(str) {
    if (!str) return 0;
    const cleaned = str.replace(/[€\s,.€]/g, "");
    return parseInt(cleaned, 10) || 0;
  }
}

module.exports = BaseParser;