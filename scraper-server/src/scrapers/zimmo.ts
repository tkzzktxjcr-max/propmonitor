import { Page } from "puppeteer-core";
import { BaseScraper, JobLogger, SearchResultItem, ScraperFilters } from "./base.js";
import { InterceptedResponse } from "../browser/manager.js";
import { RawListing } from "../utils/validation.js";
import { cleanString, cleanNumber, cleanInt, cleanEnergyRating, cleanPhotos, normalizePropertyType } from "../utils/validation.js";
import { PropertyData } from "../appwrite/client.js";

export class ZimmoScraper extends BaseScraper {
  constructor(logger: JobLogger) {
    super("zimmo", "https://www.zimmo.be", logger);
  }

  getApiPattern(): string | RegExp {
    return /zimmo\.be.*\/search/;
  }

  buildSearchUrl(filters?: ScraperFilters): string {
    let url = "https://www.zimmo.be/nl/?pagina=1&transactionType=FOR_SALE";
    
    if (filters?.city) {
      url += `&plaats=${encodeURIComponent(filters.city)}`;
    }
    if (filters?.price_min) {
      url += `&prijsVan=${filters.price_min}`;
    }
    if (filters?.price_max) {
      url += `&prijsTot=${filters.price_max}`;
    }
    
    this.logger.info(`Built Zimmo search URL: ${url}`);
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
              url: item.url || `https://www.zimmo.be/nl/${item.id}`,
              title: item.title || "",
              price: cleanNumber(item.price || 0),
              city: cleanString(item.city || ""),
              type: normalizePropertyType(item.type || ""),
              bedrooms: cleanInt(item.bedrooms || 0),
              surface_sqm: cleanNumber(item.surface || 0),
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
      
      const selectors = [
        '.property-card',
        '.search-result',
        '.listing-item',
        '.result-item',
        '[data-testid="property"]',
      ];
      
      let cards: NodeListOf<Element> | null = null;
      for (const selector of selectors) {
        cards = document.querySelectorAll(selector);
        if (cards.length > 0) break;
      }
      
      if (!cards || cards.length === 0) {
        // Fallback: find any links that look like property links
        const links = document.querySelectorAll('a');
        const seen = new Set<string>();
        links.forEach(link => {
          const href = (link as HTMLAnchorElement).href;
          // Zimmo property URLs typically have numeric IDs
          if (!href.match(/\d{5,}/)) return;
          if (seen.has(href)) return;
          seen.add(href);
          
          const container = link.closest('article, .card, .item, .result') || link.parentElement;
          const title = container?.querySelector('h2, h3, .title')?.textContent?.trim() 
            || link.getAttribute('title') 
            || "";
          
          const priceText = container?.querySelector('.price')?.textContent?.trim() || "";
          const price = parseInt(priceText.replace(/[^\d]/g, '')) || 0;
          
          const idMatch = href.match(/(\d{6,})/);
          const source_id = idMatch ? idMatch[1] : "";
          
          if (source_id && title) {
            listings.push({ source_id, url: href, title, price, city: "", type: "house" });
          }
        });
        return listings;
      }
      
      cards.forEach((card) => {
        try {
          const linkEl = card.querySelector('a') as HTMLAnchorElement | null;
          const url = linkEl?.href || "";
          const idMatch = url.match(/(\d{6,})/);
          const source_id = idMatch ? idMatch[1] : "";
          
          const titleEl = card.querySelector('h2, h3, .title');
          const title = titleEl?.textContent?.trim() || "";
          
          const priceEl = card.querySelector('.price');
          const priceText = priceEl?.textContent?.trim() || "";
          const price = parseInt(priceText.replace(/[^\d]/g, '')) || 0;
          
          const cityEl = card.querySelector('.location, .city');
          const city = cityEl?.textContent?.trim() || "";
          
          if (source_id && title) {
            listings.push({ source_id, url, title, price, city, type: "house" });
          }
        } catch {
          // Skip
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
          return {
            title: cleanString(body.title || ""),
            description: cleanString(body.description || ""),
            price: cleanNumber(body.price || 0),
            surface_sqm: cleanNumber(body.surface || 0),
            bedrooms: cleanInt(body.bedrooms || 0),
            bathrooms: cleanInt(body.bathrooms || 0),
            type: normalizePropertyType(body.type || ""),
            city: cleanString(body.city || ""),
            postal_code: cleanString(body.postalCode || ""),
            province: cleanString(body.province || ""),
            latitude: cleanNumber(body.latitude || 0),
            longitude: cleanNumber(body.longitude || 0),
            address: cleanString(body.address || ""),
            photos: cleanPhotos(body.photos || []),
            agent_name: cleanString(body.agent?.name || ""),
            agent_phone: cleanString(body.agent?.phone || ""),
            agent_agency: cleanString(body.agent?.agency || ""),
            amenities: [],
            energy_rating: cleanEnergyRating(body.energyRating || ""),
            year_built: cleanInt(body.yearBuilt || 0) || null,
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
      
      const titleEl = document.querySelector('h1, .property-title');
      result.title = titleEl?.textContent?.trim() || "";
      
      const priceEl = document.querySelector('.price, .property-price');
      const priceText = priceEl?.textContent?.trim() || "";
      result.price = parseInt(priceText.replace(/[^\d]/g, '')) || 0;
      
      const descEl = document.querySelector('.description, .property-description');
      result.description = descEl?.textContent?.trim() || "";
      
      return result;
    }) as Promise<Partial<PropertyData>>;
  }
}