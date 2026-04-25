/**
 * Parser Factory
 * 
 * Returns the appropriate parser based on site slug.
 */

const ImmowebParser = require("./immoweb");
const ZimmoParser = require("./zimmo");
const ImmovlanParser = require("./immovlan");
const BaseParser = require("./base");

const parsers = {
  immoweb: ImmowebParser,
  immovlan: ImmovlanParser,
  zimmo: ZimmoParser,
};

/**
 * Get parser for a site
 * @param {string} slug - Site slug (immoweb, zimmo, immovlan)
 * @returns {object|null} Parser instance
 */
function getParser(slug) {
  if (parsers[slug]) {
    return parsers[slug];
  }

  // Return base parser for unknown sites
  console.warn(`No specific parser for ${slug}, using base parser`);
  return BaseParser;
}

module.exports = {
  getParser,
  parsers,
};