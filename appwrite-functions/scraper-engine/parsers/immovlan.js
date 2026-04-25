/**
 * Immovlan Parser
 * 
 * Specific parser for immovlan.be
 */

const axios = require("axios");
const cheerio = require("cheerio");
const BaseParser = require("./base");

class ImmovlanParser extends BaseParser {
  constructor() {
    super();
    this.siteName = "Immovlan";
    this.baseUrl = "https://www.immovlan.be";
  }

  buildSearchUrl(site, filters = {}) {
    let url = `${site.base_url}/en/properties`;

    const params = new URLSearchParams();

    if (filters.city) {
      params.append("q", filters.city);
    }
    if (filters.price_min) {
      params.append("price_min", filters.price_min);
    }
    if (filters.price_max) {
      params.append("price_max", filters.price_max);
    }
    if (filters.type) {
      params.append("type", filters.type);
    }

    const queryString = params.toString();
    return queryString ? `${url}?${queryString}` : url;
  }

  parseListings($) {
    const listings = [];

    // Immovlan listing selectors
    $(".result-item, .listing, .property-result, [data-listing-id]").each((i, el) => {
      const $el = $(el);

      let url = $el.find("a").first().attr("href") ||
                $el.attr("data-url");

      // Extract source ID
      let sourceId = "";
      if (url) {
        const match = url.match(/\/property\/(\d+)/);
        if (match) {
          sourceId = match[1];
        }
      }

      if (url && sourceId) {
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
    const urlMatch = url.match(/\/property\/(\d+)/);
    const sourceId = urlMatch ? urlMatch[1] : "";

    // Title
    const title = $("h1.title, h1").first().text().trim();

    // Price
    const priceText = $(".price, [class*='price']").first().text().trim();
    const price = this.extractPrice(priceText);

    // Description
    const description = $(".description, [class*='description']").text().trim();

    // Specs
    const specs = {};
    $(".spec, [class*='spec'], .detail-item").each((i, el) => {
      const text = $(el).text().toLowerCase();
      if (text.includes("bed")) specs.bedrooms = this.extractNumber(text);
      if (text.includes("bath")) specs.bathrooms = this.extractNumber(text);
      if (text.includes("m²") || text.includes("sqm")) specs.surface = this.extractNumber(text);
    });

    // Type
    let type = "apartment";
    const typeText = $("[class*='type']").first().text().toLowerCase();
    if (typeText.includes("house")) type = "house";
    else if (typeText.includes("villa")) type = "villa";
    else if (typeText.includes("studio")) type = "studio";
    else if (typeText.includes("commercial")) type = "commercial";

    // Location
    const address = $("[class*='address']").first().text().trim();
    const city = $("[class*='city']").first().text().trim();
    const postalCode = $("[class*='postal'], [class*='zip']").first().text().trim();

    // Photos
    const photos = [];
    $("[class*='gallery'] img, [class*='photo'] img").each((i, el) => {
      const src = $(el).attr("src") || $(el).attr("data-src");
      if (src) {
        photos.push(src);
      }
    });

    // Energy rating
    let energyRating = "F";
    const epcMatch = description.match(/EPC\s*([A-G])/i);
    if (epcMatch) {
      energyRating = epcMatch[1].toUpperCase();
    }

    // Agent
    const agentName = $("[class*='agent-name']").text().trim();
    const agentPhone = $("[class*='agent-phone']").text().trim();
    const agency = $("[class*='agency']").text().trim();

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
      province: "",
      address,
      latitude: 0,
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

module.exports = ImmovlanParser;