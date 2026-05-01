"""products.json → PostgreSQL + Elasticsearch.

Scraper output already matches the required shape (category, subcategory, products[]
with id, name, description, price, currency, images, availability). No separate
transform op: requirement is "transform if required" — not needed here.
"""

from __future__ import annotations

import json
import logging
import os
from pathlib import Path

import psycopg2
from dagster import job, op
from dotenv import load_dotenv
from elasticsearch import Elasticsearch
from elasticsearch.helpers import bulk
from psycopg2.extras import execute_values

load_dotenv()

logger = logging.getLogger(__name__)


def _products_json_path() -> Path:
    if os.environ.get("PRODUCTS_JSON_PATH"):
        return Path(os.environ["PRODUCTS_JSON_PATH"]).expanduser().resolve()
    return Path(__file__).resolve().parent.parent.parent / "data" / "products.json"


def _pg_connect():
    if os.environ.get("DATABASE_URL"):
        return psycopg2.connect(os.environ["DATABASE_URL"])
    return psycopg2.connect(
        dbname=os.environ.get("PGDATABASE", "ecommerce"),
        user=os.environ.get("PGUSER", "postgres"),
        password=os.environ.get("PGPASSWORD", ""),
        host=os.environ.get("PGHOST", "localhost"),
        port=os.environ.get("PGPORT", "5432"),
    )


def _es_client() -> Elasticsearch:
    url = os.environ.get("ELASTICSEARCH_URL", "http://localhost:9200")
    return Elasticsearch(hosts=[url])


@op
def read_json():
    path = _products_json_path()
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    logger.info("Loaded JSON from %s (%s groups)", path, len(data))
    return data


@op
def save_to_postgres(data):
    conn = _pg_connect()
    cur = None
    batch_size = int(os.environ.get("PG_BATCH_SIZE", "1000"))
    try:
        cur = conn.cursor()
        rows = []
        for cat in data:
            for p in cat["products"]:
                rows.append(
                    (
                        p.get("id"),
                        cat.get("category"),
                        cat.get("subcategory"),
                        p.get("name"),
                        p.get("description"),
                        p.get("price"),
                        p.get("currency"),
                        json.dumps(p.get("images", [])),
                        p.get("availability"),
                    )
                )
                if len(rows) >= batch_size:
                    execute_values(
                        cur,
                        """
                        INSERT INTO products
                        (id, category, subcategory, name, description, price, currency, images, availability)
                        VALUES %s
                        ON CONFLICT (id) DO UPDATE SET
                            category = EXCLUDED.category,
                            subcategory = EXCLUDED.subcategory,
                            name = EXCLUDED.name,
                            description = EXCLUDED.description,
                            price = EXCLUDED.price,
                            currency = EXCLUDED.currency,
                            images = EXCLUDED.images,
                            availability = EXCLUDED.availability
                        """,
                        rows,
                        template="(%s, %s, %s, %s, %s, %s, %s, %s::jsonb, %s)",
                        page_size=batch_size,
                    )
                    rows.clear()
        if rows:
            execute_values(
                cur,
                """
                INSERT INTO products
                (id, category, subcategory, name, description, price, currency, images, availability)
                VALUES %s
                ON CONFLICT (id) DO UPDATE SET
                    category = EXCLUDED.category,
                    subcategory = EXCLUDED.subcategory,
                    name = EXCLUDED.name,
                    description = EXCLUDED.description,
                    price = EXCLUDED.price,
                    currency = EXCLUDED.currency,
                    images = EXCLUDED.images,
                    availability = EXCLUDED.availability
                """,
                rows,
                template="(%s, %s, %s, %s, %s, %s, %s, %s::jsonb, %s)",
                page_size=batch_size,
            )
        conn.commit()
        logger.info("Saved to PostgreSQL using batch_size=%s", batch_size)
    except Exception:
        conn.rollback()
        logger.exception("save_to_postgres failed")
        raise
    finally:
        if cur is not None:
            cur.close()
        conn.close()


@op
def save_to_elasticsearch(data):
    es = _es_client()
    batch_size = int(os.environ.get("ES_BATCH_SIZE", "1000"))
    index_name = os.environ.get("ELASTICSEARCH_INDEX", "products")
    try:
        actions = []
        indexed = 0
        for cat in data:
            for p in cat["products"]:
                product_id = p.get("id")
                if not product_id:
                    continue
                actions.append(
                    {
                        "_op_type": "index",
                        "_index": index_name,
                        "_id": product_id,
                        "_source": {
                            "id": product_id,
                            "category": cat.get("category"),
                            "subcategory": cat.get("subcategory"),
                            "name": p.get("name"),
                            "description": p.get("description"),
                            "price": p.get("price"),
                            "currency": p.get("currency"),
                            "images": p.get("images", []),
                            "availability": p.get("availability"),
                        },
                    }
                )
                if len(actions) >= batch_size:
                    success, _ = bulk(es, actions, refresh=False, request_timeout=120)
                    indexed += success
                    actions.clear()

        if actions:
            success, _ = bulk(es, actions, refresh=False, request_timeout=120)
            indexed += success

        logger.info(
            "Indexed %s documents in Elasticsearch (index=%s, batch_size=%s)",
            indexed,
            index_name,
            batch_size,
        )
    except Exception:
        logger.exception("save_to_elasticsearch failed")
        raise


@job
def ecommerce_pipeline():
    data = read_json()
    save_to_postgres(data)
    save_to_elasticsearch(data)
