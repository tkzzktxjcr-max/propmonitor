/**
 * Zimmo Parser
 * 
 * Specific parser for zimmo.be
 */

const axios = require("axios");
const cheerio = require("cheerio");
const BaseParser = require("./base");

class ZimmoParser extends BaseParser {
  constructor() {
    super();
    this.siteName = "Zimmo";
    this.baseUrl = "https://www.zimmo.be";
  }

  buildSearchUrl(site, filters = {}) {
    let url = `${site.base_url}/en/`;

    const params = new URLSearchParams();

    if (filters.city) {
      params.append("city", filters.city);
    }
    if (filters.price_min) {
      params.append("priceMin", filters.price_min);
    }
    if (filters.price_max) {
      params.append("priceMax", filters.price_max);
    }
    if (filters.type) {
      params.append("propertyType", filters.type);
    }

    const queryString = params.toString();
    return queryString ? `${url}?${queryString}` : url;
  }

  parseListings($) {
    const listings = [];

    // Zimmo listing selectors
    $(".property-item, .listing-item, [data-property-id]").each((i, el) => {
      const $el = $(el);

      let url = $el.find("a").first().attr("href") ||
                $el.attr("data-url");

      // Extract source ID
      let sourceId = "";
      if (url) {
        const match = url.match(/\/p-(\d+)/);
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
    const urlMatch = url.match(/\/p-(\d+)/);
    const sourceId = urlMatch ? urlMatch[1] : "";

    // Title
    const title = $("h1.PropertyInfo address, h1").first().text().trim();

    // Price
    const priceText = $("[class*='price']").first().text().trim();
    const price = this.extractPrice(priceText);

    // Description
    const description = $("[class*='description'], .description").text().trim();

    // Specs
    const specs = {};
    $("[class*='characteristic'], .spec").each((i, el) => {
      const text = $(el).text().toLowerCase();
      if (text.includes("bed")) specs.bedrooms = this.extractNumber(text);
      if (text.includes("bath")) specs.bathrooms = this.extractNumber(text);
      if (text.includes("m²")) specs.surface = this.extractNumber(text);
    });

    // Type
    let type = "apartment";
    const typeText = $("[class*='type']").first().text().toLowerCase();
    if (typeText.includes("house")) type = "house";
    else if (typeText.includes("villa")) type = "villa";
    else if (typeText.includes("studio")) type = "studio";

    // Location
    const city = $("[class*='location']").first().text().trim();

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
      postal_code: "",
      province: "",
      address: "",
      latitude: 0,
      longitude: 0,
      photos,
      agent_name: agentName,
      agent_phone: agentPhone,
      agent_agency: "",
      amenities: [],
      energy_rating: energyRating,
      year_built: null,
      url,
    };
  }
}

module.exports = ZimmoParser;