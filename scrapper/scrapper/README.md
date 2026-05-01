# Bombay Grocers Product Scraper

## Overview

This scraper collects product data from `https://bombaygrocers.ca/` using Puppeteer and writes grouped JSON to `./data/products.json`.

## Data Captured

- Product name
- Description
- Price (numeric)
- Currency (`CAD`)
- Images (absolute URLs)
- Availability (`in_stock`, `out_of_stock`, `unknown`)
- Category
- Subcategory
- SKU (used as id when present)

## Setup

From the `scraper` directory:

```bash
npm install
```

## Run

From the `scraper` directory:

```bash
node scrape.js
```

Output file:

- `./data/products.json`

## Dagster pipeline (Postgres + Elasticsearch)

Code lives in `./pipeline/`. From `./pipeline`:

```bash
pip install -e .
cp .env.example .env   # set DATABASE_URL, ELASTICSEARCH_URL
psql "$DATABASE_URL" -f schema.sql
```

### Elasticsearch (Docker — required for local ES)

Elasticsearch is defined in [`pipeline/docker-compose.yml`](./pipeline/docker-compose.yml). From **`scraper/pipeline`**:

```bash
docker compose up -d
```

Wait until `http://localhost:9200` responds (single-node, security disabled for local HTTP). Keep `ELASTICSEARCH_URL=http://localhost:9200` in `.env`.

To stop: `docker compose down`.

Create the `products` index once (Kibana DevTools, or `curl` against `http://localhost:9200`):

```http
PUT /products
Content-Type: application/json

{
  "mappings": {
    "properties": {
      "name": { "type": "text" },
      "description": { "type": "text" },
      "price": { "type": "float" },
      "category": { "type": "keyword" }
    }
  }
}
```

### Run Dagster

```bash
dagster dev
```

Open the UI → run job **`ecommerce_pipeline`**. By default it reads `../data/products.json`.

### Verify (after a successful run)

**PostgreSQL**

```sql
SELECT * FROM products LIMIT 20;
```

**Elasticsearch**

```http
GET /products/_search?q=chips
```

Full-text by name (use `POST` when sending a JSON body, e.g. from curl or DevTools):

```json
POST /products/_search
{ "query": { "match": { "name": "chips" } } }
```

Filter by category (`keyword` — use the exact stored category string):

```json
POST /products/_search
{ "query": { "term": { "category": "Snacks" } } }
```

Sort by price:

```json
POST /products/_search
{ "sort": [ { "price": "asc" } ], "query": { "match_all": {} } }
```

## Assumptions

- Product and category pages are publicly accessible without authentication.
- Some products may not expose SKU or explicit availability text; fallback values are used.
- Category/subcategory are inferred from navigation discovery and product breadcrumb context.
- Currency is treated as CAD unless the site explicitly indicates a different currency.

## Reliability Notes

- Includes retry logic with backoff for navigation and scraping calls.
- Pagination is handled via next-page link detection.
- Lazy-loaded images are collected via `src`, `data-src`, and `srcset`.
- Errors on individual products/categories are logged and skipped without stopping the run.
