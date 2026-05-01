const pool = require("../db/postgres");
const es = require("../services/elasticsearch");

const getProducts = async (req, res) => {
  const page = Math.max(1, Number.parseInt(req.query.page || "1", 10));
  const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit || "6", 10)));
  const offset = (page - 1) * limit;
  const category = (req.query.category || "").trim();
  const minPrice = Number.parseFloat(req.query.minPrice);
  const maxPrice = Number.parseFloat(req.query.maxPrice);
  const sort = req.query.sort === "desc" ? "DESC" : req.query.sort === "asc" ? "ASC" : null;

  try {
    const whereClauses = [];
    const params = [];
    let paramIndex = 1;

    if (category) {
      whereClauses.push(`LOWER(category) = LOWER($${paramIndex})`);
      params.push(category);
      paramIndex += 1;
    }

    if (!Number.isNaN(minPrice)) {
      whereClauses.push(`price >= $${paramIndex}`);
      params.push(minPrice);
      paramIndex += 1;
    }

    if (!Number.isNaN(maxPrice)) {
      whereClauses.push(`price <= $${paramIndex}`);
      params.push(maxPrice);
      paramIndex += 1;
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";
    const countResult = await pool.query(`SELECT COUNT(*)::int AS total FROM products ${whereSql}`, params);
    const total = countResult.rows[0]?.total || 0;

    const pagedParams = [...params, limit, offset];
    const limitParam = paramIndex;
    const offsetParam = paramIndex + 1;

    const orderBySql = sort ? `ORDER BY price ${sort}, id ASC` : "ORDER BY id ASC";
    const result = await pool.query(
      `SELECT * FROM products ${whereSql} ${orderBySql} LIMIT $${limitParam} OFFSET $${offsetParam}`,
      pagedParams,
    );

    res.json({
      data: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error) {
    console.error("Error fetching products:", error.message);
    res.status(500).json({ message: "Failed to fetch products" });
  }
};

const getProductCategories = async (req, res) => {
  try {
    const categoryTableResult = await pool.query("SELECT to_regclass('public.categories') AS category_table");
    const hasCategoryTable = Boolean(categoryTableResult.rows[0]?.category_table);

    let categories = [];

    if (hasCategoryTable) {
      try {
        const tableCategories = await pool.query(
          "SELECT DISTINCT name FROM categories WHERE name IS NOT NULL AND TRIM(name) <> '' ORDER BY name ASC",
        );
        categories = tableCategories.rows.map((row) => row.name);
      } catch (error) {
        const tableCategories = await pool.query(
          "SELECT DISTINCT category FROM categories WHERE category IS NOT NULL AND TRIM(category) <> '' ORDER BY category ASC",
        );
        categories = tableCategories.rows.map((row) => row.category);
      }
    } else {
      const productCategories = await pool.query(
        "SELECT DISTINCT category FROM products WHERE category IS NOT NULL AND TRIM(category) <> '' ORDER BY category ASC",
      );
      categories = productCategories.rows.map((row) => row.category);
    }

    res.json({ data: categories });
  } catch (error) {
    console.error("Error fetching categories:", error.message);
    res.status(500).json({ message: "Failed to fetch categories" });
  }
};

const getProductById = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query("SELECT * FROM products WHERE id = $1", [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching product:", error.message);
    res.status(500).json({ message: "Failed to fetch product" });
  }
};

const searchProducts = async (req, res) => {
  const query = (req.query.q || "").trim();
  const size = Math.min(20, Math.max(1, Number.parseInt(req.query.size || "8", 10)));

  if (!query || query.length < 2) {
    return res.json({ data: [] });
  }

  try {
    const index = process.env.ELASTICSEARCH_INDEX || "products";
    const shouldQueries = [
      { match_phrase_prefix: { name: { query, boost: 8 } } },
      { match_phrase_prefix: { category: { query, boost: 3 } } },
      { match_phrase_prefix: { subcategory: { query, boost: 3 } } },
      {
        multi_match: {
          query,
          fields: ["name^5", "category^2", "subcategory^2", "description"],
          type: "best_fields",
          operator: "and",
        },
      },
    ];

    const response = await es.search({
      index,
      size,
      query: {
        bool: {
          should: shouldQueries,
          minimum_should_match: 1,
        },
      },
      min_score: 0.5,
    });

    const hits = response?.hits?.hits || [];
    const products = hits.map((hit) => ({
      id: String(hit._source?.id ?? hit._id),
      ...hit._source,
    }));

    res.json({ data: products });
  } catch (error) {
    console.error("Error searching products in Elasticsearch:", error.message);
    res.status(500).json({ message: "Failed to search products" });
  }
};

module.exports = {
  getProducts,
  getProductById,
  getProductCategories,
  searchProducts,
};
