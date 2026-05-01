from dagster import Definitions

from etl.jobs import ecommerce_pipeline

defs = Definitions(jobs=[ecommerce_pipeline])
