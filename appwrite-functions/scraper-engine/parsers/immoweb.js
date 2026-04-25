/**
 * Immoweb Parser
 * 
 * Specific parser for immoweb.be
 */

const axios = require("axios");
const cheerio = require("cheerio");
const BaseParser = require("./base");

class ImmowebParser extends BaseParser {
  constructor() {
    super();
    this.siteName = "ImmoWeb";
    this.baseUrl = "https://www.immoweb.be";
  }

  buildSearchUrl(site, filters = {}) {
    let url = `${site.base_url}/en/search`;

    const params = new URLSearchParams();

    if (filters.city) {
      params.append("countries", "BE"); // Simplified
    }
    if (filters.price_min) {
      params.append("priceMin", filters.price_min);
    }
    if (filters.price_max) {
      params.append("priceMax", filters.price_max);
    }
    if (filters.type) {
      params.append("propertySubtype", filters.type);
    }

    const queryString = params.toString();
    return queryString ? `${url}?${queryString}` : url;
  }

  parseListings($) {
    const listings = [];

    // Immoweb uses various selectors for listings
    $(".search-results__item, .property-card, article.listing").each((i, el) => {
      const $el = $(el);

      // Try different selectors
      let url = $el.find("a").first().attr("href") ||
                $el.find(".property-card__title a").attr("href") ||
                $el.attr("data-url");

      // Extract source ID from URL
      let sourceId = "";
      if (url) {
        const match = url.match(/\/property\/(\d+)/);
        if (match) {
          sourceId = match[1];
        }
      }

      if (url && sourceId) {
        // Ensure absolute URL
        if (!url.startsWith("http")) {
          url = this.baseUrl + url;
        }

        listings.push({
          sourceId,
          url,
        });
      }
    });

    return listings;
  }

  parsePropertyDetail($, url) {
    // Extract property ID
    const urlMatch = url.match(/\/property\/(\d+)/);
    const sourceId = urlMatch ? urlMatch[1] : "";

    // Title
    const title = $("h1.property-title, h1[data-testid='property-title']").text().trim() ||
                  $("h1").first().text().trim();

    // Price
    let priceText = $("[data-testid='price'], .price").first().text().trim();
    const price = this.extractPrice(priceText);

    // Description
    const description = $("[data-testid='description'], .property-description").text().trim();

    // Specs (bedrooms, bathrooms, surface)
    const specs = {};
    $("[data-testid='property-attribute'], .specs-item").each((i, el) => {
      const label = $(el).find(".label, .specs-label").text().trim().toLowerCase();
      const value = $(el).find(".value, .specs-value").text().trim();

      if (label.includes("bedroom")) specs.bedrooms = this.extractNumber(value);
      if (label.includes("bathroom")) specs.bathrooms = this.extractNumber(value);
      if (label.includes("surface") || label.includes("living")) specs.surface = this.extractNumber(value);
    });

    // Type
    let type = "apartment";
    const typeText = $("[data-testid='property-type'], .property-type").text().toLowerCase();
    if (typeText.includes("house")) type = "house";
    else if (typeText.includes("villa")) type = "villa";
    else if (typeText.includes("studio")) type = "studio";
    else if (typeText.includes("commercial")) type = "commercial";

    // Location
    const address = $("[data-testid='address'], .address").first().text().trim();
    const city = $("[data-testid='city'], .city").first().text().trim();
    const postalCode = $("[data-testid='postal-code'], .postal-code").first().text().trim();

    // Province mapping for Belgium
    const provinceMap = {
      "1000": "Brussels-Capital",
      "1050": "Brussels-Capital",
      "2000": "Antwerp",
      "3000": "Flemish Brabant",
      "9000": "East Flanders",
      "4000": "Liège",
      "5000": "Namur",
      "6000": "Hainaut",
      "6600": "Luxembourg",
      "1300": "Walloon Brabant",
    };
    const province = provinceMap[postalCode] || "Unknown";

    // Photos
    const photos = [];
    $("[data-testid='gallery-image'], .gallery img, .photo img").each((i, el) => {
      const src = $(el).attr("src") || $(el).attr("data-src");
      if (src && !src.includes("placeholder")) {
        photos.push(src);
      }
    });

    // Energy rating
    let energyRating = "F";
    const epcMatch = description.match(/([A-G])\s*[-–]?\s*EPC/);
    if (epcMatch) {
      energyRating = epcMatch[1].toUpperCase();
    }

    // Agent info
    const agentName = $("[data-testid='agent-name'], .agent-name").text().trim();
    const agentPhone = $("[data-testid='agent-phone'], .agent-phone").text().trim();
    const agency = $("[data-testid='agency-name'], .agency-name").text().trim();

    return {
      source_id: sourceId,
      title,
      description,
      price,
      surface_sqm: specs.surface || 0,
      bedrooms: specs.bedrooms || 0,
      bathrooms: specs.bathrooms || 0,
      type,
      city,
      postal_code: postalCode,
      province,
      address,
      latitude: 0, // Would need geocoding
      longitude: 0,
      photos,
      agent_name: agentName,
      agent_phone: agentPhone,
      agent_agency: agency,
      amenities: [],
      energy_rating: energyRating,
      year_built: null,
      url,
    };
  }
}

module.exports = ImmowebParser;