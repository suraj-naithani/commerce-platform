# Scraper Pipeline (Dagster)

This folder contains the ETL pipeline that reads `../data/products.json`, then loads data into PostgreSQL and Elasticsearch.

## Prerequisites

- Python `3.10+`
- Docker Desktop (or Docker Engine with Compose)
- PostgreSQL running locally or remotely

## 1) Install dependencies

From `scrapper/pipeline`:

```bash
pip install -e .
```

Create a `.env` file in this folder:

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/ecommerce
ELASTICSEARCH_URL=http://localhost:9200
PRODUCTS_JSON_PATH=../data/products.json
```

Create the PostgreSQL table once:

```bash
psql "$DATABASE_URL" -f schema.sql
```

## 2) Start Docker (Elasticsearch)

From `scrapper/pipeline`:

```bash
docker compose up -d
```

Check that Elasticsearch is up:

```bash
curl http://localhost:9200
```

Stop Elasticsearch when needed:

```bash
docker compose down
```

## 3) Run Dagster

From `scrapper/pipeline`:

```bash
dagster dev
```

Then open the Dagster UI (usually `http://localhost:3000`) and run job:

- `ecommerce_pipeline`

## Optional: run pipeline without UI

```bash
dagster job execute -m etl.definitions -j ecommerce_pipeline
```
