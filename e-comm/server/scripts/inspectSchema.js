require("dotenv").config();
const pool = require("../db/postgres");

async function main() {
  const tables = await pool.query(
    "select table_name from information_schema.tables where table_schema = 'public' order by table_name asc",
  );
  console.log("tables:", tables.rows.map((r) => r.table_name));

  const columns = await pool.query(
    "select column_name, data_type from information_schema.columns where table_schema = 'public' and table_name = 'merchants' order by ordinal_position",
  );
  console.log("merchants columns:", columns.rows);

  const orderColumns = await pool.query(
    "select column_name, data_type from information_schema.columns where table_schema = 'public' and table_name = 'orders' order by ordinal_position",
  );
  console.log("orders columns:", orderColumns.rows);

  const productColumns = await pool.query(
    "select column_name, data_type from information_schema.columns where table_schema = 'public' and table_name = 'products' order by ordinal_position",
  );
  console.log("products columns:", productColumns.rows);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => pool.end());

