# BelRealty - Appwrite Functions

## Deployment

### Variables d'environnement
Créer `.env` avec :
```
APPWRITE_ENDPOINT=https://backend.071098v2.duckdns.org/v1
APPWRITE_PROJECT_ID=propertymonitor
APPWRITE_DATABASE_ID=belrealty-db
APPWRITE_API_KEY=ta_cle_api
```

### Functions

1. **scraper-scheduler** - Cron hourly
2. **scraper-trigger** - HTTP POST endpoint
3. **scraper-engine** - Async scraping engine