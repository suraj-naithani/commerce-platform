const pool = require("../db/postgres");

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

module.exports = {
  getProducts,
  getProductById,
  getProductCategories,
};
