const bcrypt = require("bcryptjs");
const pool = require("./postgres");

async function ensureSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL,
      subcategory TEXT NOT NULL,
      name TEXT,
      description TEXT,
      price DOUBLE PRECISION,
      currency TEXT,
      images JSONB,
      availability TEXT
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS merchants (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      stripe_account_id TEXT,
      status TEXT
    );
  `);

  await pool.query("ALTER TABLE merchants ADD COLUMN IF NOT EXISTS email TEXT;");
  await pool.query("ALTER TABLE merchants ADD COLUMN IF NOT EXISTS password_hash TEXT;");
  await pool.query("ALTER TABLE merchants ADD COLUMN IF NOT EXISTS verification_status TEXT;");
  await pool.query("ALTER TABLE merchants ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;");
  await pool.query("ALTER TABLE merchants ALTER COLUMN verification_status SET DEFAULT 'pending';");
  await pool.query("ALTER TABLE merchants ALTER COLUMN created_at SET DEFAULT NOW();");
  await pool.query("UPDATE merchants SET verification_status = COALESCE(verification_status, status, 'pending');");
  await pool.query("UPDATE merchants SET created_at = COALESCE(created_at, NOW());");
  await pool.query(
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_merchants_email_unique ON merchants (LOWER(email)) WHERE email IS NOT NULL;",
  );

  await pool.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      product_id TEXT,
      merchant_id INT REFERENCES merchants(id) ON DELETE SET NULL,
      total_amount DOUBLE PRECISION,
      platform_fee DOUBLE PRECISION,
      merchant_amount DOUBLE PRECISION,
      stripe_payment_intent TEXT,
      stripe_transfer_id TEXT,
      stripe_checkout_session TEXT,
      payment_flow TEXT,
      payment_status TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      payment_intent_id TEXT,
      status TEXT
    );
  `);

  await pool.query(`
    ALTER TABLE products
    ADD COLUMN IF NOT EXISTS merchant_id INT REFERENCES merchants(id);
  `);

  await pool.query(`CREATE INDEX IF NOT EXISTS idx_products_merchant_id ON products(merchant_id);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_orders_merchant_id ON orders(merchant_id);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);`);
}

async function ensureDemoMerchant() {
  const demoEmail = process.env.DEMO_MERCHANT_EMAIL || "seller@demo.com";
  const demoPassword = process.env.DEMO_MERCHANT_PASSWORD || "password123";
  const demoName = process.env.DEMO_MERCHANT_NAME || "Demo Seller";
  const demoStripeAccountId = process.env.DEMO_STRIPE_ACCOUNT_ID || null;
  const demoVerificationStatus = process.env.DEMO_MERCHANT_VERIFICATION_STATUS || "verified";

  const existing = await pool.query("SELECT id FROM merchants WHERE email = $1", [demoEmail]);
  let merchantId = existing.rows[0]?.id;

  if (!merchantId) {
    const passwordHash = await bcrypt.hash(String(demoPassword), 10);
    const created = await pool.query(
      `
      INSERT INTO merchants (name, email, password_hash, stripe_account_id, verification_status, status)
      VALUES ($1, $2, $3, $4, $5, $5)
      RETURNING id
      `,
      [demoName, demoEmail, passwordHash, demoStripeAccountId, demoVerificationStatus],
    );
    merchantId = created.rows[0].id;
  }

  await pool.query("UPDATE products SET merchant_id = $1 WHERE merchant_id IS NULL", [merchantId]);

  const ownedCount = await pool.query("SELECT COUNT(*)::int AS count FROM products WHERE merchant_id = $1", [merchantId]);
  if ((ownedCount.rows[0]?.count || 0) === 0) {
    await pool.query(
      `
      UPDATE products
      SET merchant_id = $1
      WHERE id IN (
        SELECT id FROM products ORDER BY id ASC LIMIT 50
      )
      `,
      [merchantId],
    );
  }
}

async function initDb() {
  await ensureSchema();
  await ensureDemoMerchant();
}

module.exports = { initDb };

