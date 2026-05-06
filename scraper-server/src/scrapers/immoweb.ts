import { Page } from "puppeteer-core";
import { BaseScraper, JobLogger, SearchResultItem, ScraperFilters } from "./base.js";
import { InterceptedResponse } from "../browser/manager.js";
import { RawListing } from "../utils/validation.js";
import { cleanString, cleanNumber, cleanInt, cleanEnergyRating, cleanPhotos, normalizePropertyType } from "../utils/validation.js";
import { PropertyData } from "../appwrite/client.js";

export class ImmowebScraper extends BaseScraper {
  constructor(logger: JobLogger) {
    super("immoweb", "https://www.immoweb.be", logger);
  }

  getApiPattern(): string | RegExp {
    return /immoweb\.be.*\/search/;
  }

  buildSearchUrl(filters?: ScraperFilters): string {
    let url = "https://www.immoweb.be/en/search/house-and-apartment/for-sale?countries=BE&page=1&orderBy=relevance";
    
    if (filters?.city) {
      url += `&searchRadius=0&towns=${encodeURIComponent(filters.city)}`;
    }
    if (filters?.price_min) {
      url += `&minPrice=${filters.price_min}`;
    }
    if (filters?.price_max) {
      url += `&maxPrice=${filters.price_max}`;
    }
    if (filters?.type) {
      const typeMap: Record<string, string> = {
        apartment: "APARTMENT",
        house: "HOUSE",
        villa: "HOUSE",
        studio: "APARTMENT",
        commercial: "COMMERCIAL",
      };
      url += `&propertyTypes=${typeMap[filters.type] || "HOUSE,APARTMENT"}`;
    }
    
    this.logger.info(`Built Immoweb search URL: ${url}`);
    return url;
  }

  parseSearchResults(responses: InterceptedResponse[]): SearchResultItem[] {
    const listings: SearchResultItem[] = [];
    
    for (const response of responses) {
      try {
        const body = response.body as any;
        if (body?.results?.length) {
          for (const item of body.results) {
            listings.push({
              source_id: String(item.id || ""),
              url: item.url || `https://www.immoweb.be/en/classified/${item.id}`,
              title: item.title || item.property?.title || "",
              price: cleanNumber(item.price || item.transaction?.sale?.price || 0),
              city: cleanString(item.property?.location?.city || ""),
              type: normalizePropertyType(item.property?.type || ""),
              bedrooms: cleanInt(item.property?.bedroomCount || 0),
              surface_sqm: cleanNumber(item.property?.netHabitableSurface || 0),
            });
          }
        }
      } catch {
        // Skip invalid responses
      }
    }
    
    return listings;
  }

  async extractFromDom(page: Page): Promise<SearchResultItem[]> {
    return page.evaluate(() => {
      const listings: SearchResultItem[] = [];
      
      // Try multiple selectors for property cards
      const selectors = [
        '.card--result',
        '.search-results__item',
        '[data-testid="property-card"]',
        '.property-card',
        '.classified',
        '.iw-search-list',
        '.listing-item',
      ];
      
      let cards: NodeListOf<Element> | null = null;
      for (const selector of selectors) {
        cards = document.querySelectorAll(selector);
        if (cards.length > 0) break;
      }
      
      if (!cards || cards.length === 0) {
        // Last resort: find any links to classified pages
        const links = document.querySelectorAll('a[href*="/classified/"]');
        const seen = new Set<string>();
        links.forEach(link => {
          const href = (link as HTMLAnchorElement).href;
          if (seen.has(href)) return;
          seen.add(href);
          
          const titleEl = link.querySelector('h2, h3, .title, [data-testid="title"]') 
            || link.closest('article, .card, .item')?.querySelector('h2, h3, .title');
          const priceEl = link.closest('article, .card, .item')?.querySelector('.price, [data-testid="price"], .sr-only');
          
          const title = titleEl?.textContent?.trim() || "";
          const priceText = priceEl?.textContent?.trim() || "";
          const price = parseInt(priceText.replace(/[^\d]/g, '')) || 0;
          
          // Extract ID from URL
          const idMatch = href.match(/\/classified\/(\d+)/);
          const source_id = idMatch ? idMatch[1] : "";
          
          if (source_id && title) {
            listings.push({
              source_id,
              url: href,
              title,
              price,
              city: "",
              type: "house",
            });
          }
        });
        return listings;
      }
      
      cards.forEach((card) => {
        try {
          // Try to find link
          const linkEl = card.querySelector('a[href*="/classified/"]') as HTMLAnchorElement | null;
          const url = linkEl?.href || "";
          
          // Extract ID from URL
          const idMatch = url.match(/\/classified\/(\d+)/);
          const source_id = idMatch ? idMatch[1] : "";
          
          // Title
          const titleEl = card.querySelector('h2, h3, .title, .card__title, [data-testid="title"]');
          const title = titleEl?.textContent?.trim() || "";
          
          // Price
          const priceEl = card.querySelector('.price, .card__price, [data-testid="price"], .sr-only');
          const priceText = priceEl?.textContent?.trim() || "";
          const price = parseInt(priceText.replace(/[^\d]/g, '')) || 0;
          
          // City
          const cityEl = card.querySelector('.location, .city, .address, [data-testid="location"]');
          const city = cityEl?.textContent?.trim() || "";
          
          // Type
          const typeText = card.textContent?.toLowerCase() || "";
          let type = "house";
          if (typeText.includes("apartment") || typeText.includes("flat")) type = "apartment";
          else if (typeText.includes("studio")) type = "studio";
          else if (typeText.includes("villa")) type = "villa";
          else if (typeText.includes("commercial") || typeText.includes("office")) type = "commercial";
          
          if (source_id && title) {
            listings.push({
              source_id,
              url,
              title,
              price,
              city,
              type,
            });
          }
        } catch {
          // Skip invalid cards
        }
      });
      
      return listings;
    }) as Promise<SearchResultItem[]>;
  }

  async extractDetailData(responses: InterceptedResponse[], url: string): Promise<Partial<PropertyData>> {
    for (const response of responses) {
      try {
        const body = response.body as any;
        if (body?.id || body?.property) {
          const prop = body.property || body;
          return {
            title: cleanString(body.title || prop.title || ""),
            description: cleanString(body.description || prop.description || ""),
            price: cleanNumber(body.price || body.transaction?.sale?.price || 0),
            surface_sqm: cleanNumber(prop.netHabitableSurface || 0),
            bedrooms: cleanInt(prop.bedroomCount || 0),
            bathrooms: cleanInt(prop.bathroomCount || 0),
            type: normalizePropertyType(prop.type || ""),
            city: cleanString(prop.location?.city || ""),
            postal_code: cleanString(prop.location?.postalCode || ""),
            province: cleanString(prop.location?.province || ""),
            latitude: cleanNumber(prop.location?.latitude || 0),
            longitude: cleanNumber(prop.location?.longitude || 0),
            address: cleanString(prop.location?.street || prop.location?.address || ""),
            photos: cleanPhotos(prop.media?.pictures?.map((p: any) => p.largeUrl || p.mediumUrl) || []),
            agent_name: cleanString(body.contact?.name || ""),
            agent_phone: cleanString(body.contact?.phone || ""),
            agent_agency: cleanString(body.contact?.companyName || ""),
            amenities: [],
            energy_rating: cleanEnergyRating(prop.certificates?.primaryEnergyConsumptionLevel || ""),
            year_built: cleanInt(prop.building?.constructionYear || 0) || null,
          };
        }
      } catch {
        // Continue to next response
      }
    }

    return {};
  }

  async extractDetailFromDom(page: Page): Promise<Partial<PropertyData>> {
    return page.evaluate(() => {
      const result: Partial<PropertyData> = {};
      
      // Title
      const titleEl = document.querySelector('h1, .classified__title, [data-testid="title"]');
      result.title = titleEl?.textContent?.trim() || "";
      
      // Price
      const priceEl = document.querySelector('.classified__price, [data-testid="price"], .price');
      const priceText = priceEl?.textContent?.trim() || "";
      result.price = parseInt(priceText.replace(/[^\d]/g, '')) || 0;
      
      // Description
      const descEl = document.querySelector('.classified__description, .description, [data-testid="description"]');
      result.description = descEl?.textContent?.trim() || "";
      
      // City
      const cityEl = document.querySelector('.classified__address, .address, [data-testid="address"]');
      const addressText = cityEl?.textContent?.trim() || "";
      result.city = addressText.split(',')[0]?.trim() || "";
      result.address = addressText;
      
      return result;
    }) as Promise<Partial<PropertyData>>;
  }
}