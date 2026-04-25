# BelRealty - Appwrite Functions

Ce dossier contient les fonctions serverless pour le scraping de propriétés immobilières.

## Structure

```
appwrite-functions/
├── scraper-trigger/     # Fonction HTTP pour déclencher un scrape
├── scraper-engine/      # Moteur de scraping (parsers + services)
└── scraper-scheduler/   # Cron job pour scraping automatique
```

## Installation

```bash
cd appwrite-functions/scraper-trigger
npm install

cd ../scraper-engine
npm install

cd ../scraper-scheduler
npm install
```

## Déploiement

```bash
# scraper-trigger
appwrite deploy function --functionId=scraper-trigger

# scraper-engine
appwrite deploy function --functionId=scraper-engine

# scraper-scheduler
appwrite deploy function --functionId=scraper-scheduler
```

## Configuration

Définir ces variables dans Appwrite Console > Functions > Settings > Variables :

| Variable | Description |
|----------|-------------|
| `APPWRITE_ENDPOINT` | Endpoint Appwrite |
| `APPWRITE_PROJECT_ID` | ID du projet |
| `APPWRITE_DATABASE_ID` | ID de la database |
| `APPWRITE_API_KEY` | Clé API avec permissions |

## Ordre d'exécution

1. `scraper-scheduler` (cron hourly) → appelle `scraper-trigger`
2. `scraper-trigger` (HTTP POST) → crée un job → appelle `scraper-engine`
3. `scraper-engine` (async) → scrape les sites → stocke les données