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
