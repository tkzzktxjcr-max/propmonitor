/**
 * Appwrite Service Helper
 * 
 * Provides reusable functions for interacting with Appwrite databases.
 */

const sdk = require("node-appwrite");

/**
 * Update job status
 */
async function updateJobStatus(client, databaseId, collectionId, jobId, status, extra = {}) {
  const databases = new sdk.Databases(client);
  
  const updateData = {
    status,
    ...extra,
  };

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
 * Store or update a property
 * Returns { isNew: boolean, isUpdated: boolean }
 */
async function storeProperty(client, databaseId, collectionId, propertyData) {
  const databases = new sdk.Databases(client);
  const Query = sdk.Query;

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
        existingProperty.title !== propertyData.title ||
        existingProperty.is_active !== propertyData.is_active) {
      
      await databases.updateDocument(databaseId, collectionId, existingProperty.$id, {
        price: propertyData.price,
        title: propertyData.title,
        description: propertyData.description,
        photos: JSON.stringify(propertyData.photos || []),
        is_active: propertyData.is_active,
        last_updated: new Date().toISOString(),
      });

      return { isNew: false, isUpdated: true };
    }

    return { isNew: false, isUpdated: false };
  }

  // Create new property
  const requiredFields = [
    "site_id", "source_id", "url", "title", "description",
    "price", "surface_sqm", "bedrooms", "bathrooms", "type",
    "city", "postal_code", "province", "latitude", "longitude",
    "address", "agent_name", "agent_phone", "energy_rating"
  ];

  const document = {};
  for (const field of requiredFields) {
    document[field] = propertyData[field] || null;
  }

  document.photos = JSON.stringify(propertyData.photos || []);
  document.amenities = JSON.stringify(propertyData.amenities || []);
  document.scraped_at = propertyData.scraped_at;
  document.last_updated = propertyData.last_updated;
  document.is_active = propertyData.is_active !== false;

  await databases.createDocument(databaseId, collectionId, "unique()", document);

  return { isNew: true, isUpdated: false };
}

module.exports = {
  updateJobStatus,
  addLog,
  storeProperty,
};