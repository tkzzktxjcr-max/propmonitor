/**
 * Appwrite Service Helper
 */

const sdk = require("node-appwrite");

/**
 * Update job status
 */
async function updateJobStatus(client, databaseId, collectionId, jobId, status, extra = {}) {
  const databases = new sdk.Databases(client);
  const updateData = { status, ...extra };

  if (status === "completed" || status === "failed") {
    updateData.completed_at = new Date().toISOString();
  }
  if (extra.stats) {
    updateData.stats = JSON.stringify(extra.stats);
  }
  if (extra.error_message) {
    updateData.error_message = extra.error_message;
  }

  return databases.updateDocument(databaseId, collectionId, jobId, updateData);
}

/**
 * Add a log entry
 */
async function addLog(client, databaseId, collectionId, logData) {
  const databases = new sdk.Databases(client);
  return databases.createDocument(databaseId, collectionId, "unique()", {
    job_id: logData.job_id,
    site_id: logData.site_id,
    level: logData.level,
    message: logData.message,
    metadata: logData.metadata || null,
    created_at: new Date().toISOString(),
  });
}

/**
 * Extract postal code from address
 */
function extractPostalCode(address) {
  if (!address) return "";
  const match = address.match(/\b(\d{4})\b/);
  return match ? match[1] : "";
}

/**
 * Get province from postal code (Belgium)
 */
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

/**
 * Store or update a property
 */
async function storeProperty(client, databaseId, collectionId, propertyData) {
  const databases = new sdk.Databases(client);
  const Query = sdk.Query;

  // Extract postal code from address
  const postalCode = extractPostalCode(propertyData.address || propertyData.city || "");
  const province = postalCodeToProvince(postalCode);

  // Check if property already exists
  const existing = await databases.listDocuments(
    databaseId,
    collectionId,
    [
      new Query().equal("source_id", propertyData.source_id).limit(1),
      new Query().equal("site_id", propertyData.site_id).limit(1),
    ]
  );

  if (existing.documents.length > 0) {
    const existingProperty = existing.documents[0];

    // Check if update is needed
    if (existingProperty.price !== propertyData.price || 
        existingProperty.title !== propertyData.title) {
      
      await databases.updateDocument(databaseId, collectionId, existingProperty.$id, {
        price: propertyData.price,
        title: propertyData.title,
        description: propertyData.description || "",
        photos: JSON.stringify(propertyData.photos || []),
        is_active: propertyData.is_active !== false,
      });

      return { isNew: false, isUpdated: true };
    }

    return { isNew: false, isUpdated: false };
  }

  // Create new property
  // Schema simplifié : pas de postal_code, province, amenities, energy_rating, year_built
  await databases.createDocument(databaseId, collectionId, "unique()", {
    site_id: propertyData.site_id,
    source_id: propertyData.source_id,
    url: propertyData.url,
    title: propertyData.title,
    description: propertyData.description || "",
    price: propertyData.price,
    surface_sqm: propertyData.surface_sqm || 0,
    bedrooms: propertyData.bedrooms || 0,
    bathrooms: propertyData.bathrooms || 0,
    type: propertyData.type || "apartment",
    city: propertyData.city || "",
    province: province, // Dérivé du postal code extrait de l'adresse
    latitude: propertyData.latitude || 0,
    longitude: propertyData.longitude || 0,
    address: propertyData.address || "",
    photos: JSON.stringify(propertyData.photos || []),
    agent_name: propertyData.agent_name || "",
    agent_phone: propertyData.agent_phone || "",
    agent_agency: propertyData.agent_agency || "",
    is_active: propertyData.is_active !== false,
    scraped_at: propertyData.scraped_at,
    last_updated: propertyData.last_updated,
  });

  return { isNew: true, isUpdated: false };
}

module.exports = {
  updateJobStatus,
  addLog,
  storeProperty,
};