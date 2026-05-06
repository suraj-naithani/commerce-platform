const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Stripe = require("stripe");
const pool = require("../db/postgres");
const { getMerchantJwtSecret } = require("../middleware/requireMerchantAuth");

function getStripeClient() {
  const key = process.env.STRIPE_SECRET_KEY || "";
  if (!key) return null;
  return new Stripe(key);
}

function signMerchantToken(merchant) {
  return jwt.sign(
    { merchantId: merchant.id, email: merchant.email },
    getMerchantJwtSecret(),
    { expiresIn: "7d" },
  );
}

const registerMerchant = async (req, res) => {
  const { name = "", email = "", password = "", country = "CA" } = req.body || {};

  const normalizedEmail = String(email || "").trim().toLowerCase();
  const normalizedName = String(name || "").trim() || "My Store";
  const rawPassword = String(password || "");

  if (!normalizedEmail || !normalizedEmail.includes("@")) {
    return res.status(400).json({ message: "Valid email is required" });
  }

  if (rawPassword.length < 6) {
    return res.status(400).json({ message: "Password must be at least 6 characters" });
  }

  try {
    const passwordHash = await bcrypt.hash(rawPassword, 10);

    let stripeAccountId = null;
    const stripe = getStripeClient();
    if (stripe) {
      try {
        const account = await stripe.accounts.create({
          type: "custom",
          country: String(country || "CA"),
          email: normalizedEmail,
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
          },
        });
        stripeAccountId = account.id;
      } catch (stripeError) {
        // If the Stripe account isn't Connect-enabled, still allow creating a merchant record.
        stripeAccountId = null;
      }
    }

    const result = await pool.query(
      `
      INSERT INTO merchants (name, email, password_hash, stripe_account_id, verification_status, status)
      VALUES ($1, $2, $3, $4, $5, $5)
      RETURNING id, name, email, stripe_account_id, COALESCE(verification_status, status, 'pending') AS verification_status, created_at
      `,
      [normalizedName, normalizedEmail, passwordHash, stripeAccountId, "pending"],
    );

    const merchant = result.rows[0];
    const token = signMerchantToken(merchant);
    return res.status(201).json({ token, merchant });
  } catch (error) {
    if (String(error.message || "").includes("duplicate key")) {
      return res.status(409).json({ message: "Email is already registered" });
    }
    console.error("Error registering merchant:", error.message);
    return res.status(500).json({ message: "Failed to register merchant" });
  }
};

const loginMerchant = async (req, res) => {
  const { email = "", password = "" } = req.body || {};
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const rawPassword = String(password || "");

  if (!normalizedEmail || !rawPassword) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  try {
    const result = await pool.query(
      `
      SELECT
        id,
        name,
        email,
        password_hash,
        stripe_account_id,
        COALESCE(verification_status, status, 'pending') AS verification_status,
        created_at
      FROM merchants
      WHERE email = $1
      `,
      [normalizedEmail],
    );
    const merchant = result.rows[0];
    if (!merchant) return res.status(401).json({ message: "Invalid email or password" });

    const ok = await bcrypt.compare(rawPassword, merchant.password_hash);
    if (!ok) return res.status(401).json({ message: "Invalid email or password" });

    const token = signMerchantToken(merchant);
    delete merchant.password_hash;
    return res.json({ token, merchant });
  } catch (error) {
    console.error("Error logging in merchant:", error.message);
    return res.status(500).json({ message: "Failed to login" });
  }
};

const getMe = async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        id,
        name,
        email,
        stripe_account_id,
        COALESCE(verification_status, status, 'pending') AS verification_status,
        created_at
      FROM merchants
      WHERE id = $1
      `,
      [req.merchant.id],
    );
    const merchant = result.rows[0];
    if (!merchant) return res.status(404).json({ message: "Merchant not found" });
    return res.json({ merchant });
  } catch (error) {
    console.error("Error fetching merchant:", error.message);
    return res.status(500).json({ message: "Failed to fetch merchant" });
  }
};

const setVerificationStatus = async (req, res) => {
  const { status = "" } = req.body || {};
  const nextStatus = String(status || "").trim().toLowerCase();
  const allowed = new Set(["pending", "verified", "restricted", "failed"]);
  if (!allowed.has(nextStatus)) {
    return res.status(400).json({ message: "Invalid verification status" });
  }

  try {
    const result = await pool.query(
      `
      UPDATE merchants
      SET verification_status = $1, status = $1
      WHERE id = $2
      RETURNING id, name, email, stripe_account_id, COALESCE(verification_status, status, 'pending') AS verification_status, created_at
      `,
      [nextStatus, req.merchant.id],
    );
    return res.json({ merchant: result.rows[0] });
  } catch (error) {
    console.error("Error updating verification status:", error.message);
    return res.status(500).json({ message: "Failed to update verification status" });
  }
};

const getStripeStatus = async (req, res) => {
  try {
    const merchantResult = await pool.query(
      `
      SELECT
        id,
        stripe_account_id,
        COALESCE(verification_status, status, 'pending') AS verification_status
      FROM merchants
      WHERE id = $1
      `,
      [req.merchant.id],
    );
    const merchant = merchantResult.rows[0];
    if (!merchant) return res.status(404).json({ message: "Merchant not found" });

    const stripe = getStripeClient();
    if (!stripe || !merchant.stripe_account_id) {
      return res.json({
        stripe_account_id: merchant.stripe_account_id,
        verification_status: merchant.verification_status,
        stripe: null,
      });
    }

    const account = await stripe.accounts.retrieve(merchant.stripe_account_id);
    return res.json({
      stripe_account_id: merchant.stripe_account_id,
      verification_status: merchant.verification_status,
      stripe: {
        charges_enabled: Boolean(account.charges_enabled),
        payouts_enabled: Boolean(account.payouts_enabled),
        requirements: account.requirements || null,
      },
    });
  } catch (error) {
    console.error("Error fetching stripe status:", error.message);
    return res.status(500).json({ message: "Failed to fetch stripe status" });
  }
};

const connectStripeAccount = async (req, res) => {
  const stripe = getStripeClient();
  if (!stripe) return res.status(500).json({ message: "Stripe secret key is not configured" });

  const { country = "CA" } = req.body || {};
  const merchantId = req.merchant.id;

  try {
    const existing = await pool.query("SELECT id, email, stripe_account_id FROM merchants WHERE id = $1", [merchantId]);
    const merchant = existing.rows[0];
    if (!merchant) return res.status(404).json({ message: "Merchant not found" });
    if (merchant.stripe_account_id) {
      return res.json({ stripe_account_id: merchant.stripe_account_id });
    }

    const account = await stripe.accounts.create({
      type: "custom",
      country: String(country || "CA"),
      email: merchant.email || undefined,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    });

    const updated = await pool.query(
      `
      UPDATE merchants
      SET stripe_account_id = $1
      WHERE id = $2
      RETURNING id, name, email, stripe_account_id, COALESCE(verification_status, status, 'pending') AS verification_status
      `,
      [account.id, merchantId],
    );

    return res.json({ merchant: updated.rows[0] });
  } catch (error) {
    const message = String(error?.message || "");
    console.error("Error connecting stripe account:", message);

    if (message.toLowerCase().includes("signed up for connect")) {
      return res.status(400).json({
        message:
          "Stripe Connect is not enabled for this Stripe account. Enable Connect in the Stripe dashboard, or set DEMO_STRIPE_ACCOUNT_ID in `e-comm/server/.env` to an existing connected account id.",
      });
    }

    return res.status(500).json({ message: message || "Failed to connect Stripe account" });
  }
};

const getDashboard = async (req, res) => {
  const merchantId = req.merchant.id;
  try {
    const [merchantResult, summaryResult, ordersResult, productsCountResult] = await Promise.all([
      pool.query(
        `
        SELECT
          id,
          name,
          email,
          stripe_account_id,
          COALESCE(verification_status, status, 'pending') AS verification_status
        FROM merchants
        WHERE id = $1
        `,
        [merchantId],
      ),
      pool.query(
        `
        SELECT
          COUNT(*)::int AS total_orders,
          ROUND(COALESCE(SUM(total_amount), 0) * 100)::bigint AS total_revenue_cents,
          ROUND(COALESCE(SUM(platform_fee), 0) * 100)::bigint AS platform_fee_cents,
          ROUND(COALESCE(SUM(merchant_amount), 0) * 100)::bigint AS net_earnings_cents
        FROM orders
        WHERE merchant_id = $1
        `,
        [merchantId],
      ),
      pool.query(
        `
        SELECT
          id,
          ROUND(COALESCE(total_amount, 0) * 100)::int AS total_amount_cents,
          ROUND(COALESCE(platform_fee, 0) * 100)::int AS platform_fee_cents,
          ROUND(COALESCE(merchant_amount, 0) * 100)::int AS merchant_amount_cents,
          status,
          created_at
        FROM orders
        WHERE merchant_id = $1
        ORDER BY created_at DESC
        LIMIT 25
        `,
        [merchantId],
      ),
      pool.query("SELECT COUNT(*)::int AS total_products FROM products WHERE merchant_id = $1", [merchantId]),
    ]);

    const merchant = merchantResult.rows[0];
    if (!merchant) return res.status(404).json({ message: "Merchant not found" });

    const summary = summaryResult.rows[0] || {
      total_orders: 0,
      total_revenue_cents: 0,
      platform_fee_cents: 0,
      net_earnings_cents: 0,
    };

    return res.json({
      merchant,
      summary: {
        total_orders: summary.total_orders,
        total_products: productsCountResult.rows[0]?.total_products || 0,
        total_revenue_cents: Number(summary.total_revenue_cents || 0),
        platform_fee_cents: Number(summary.platform_fee_cents || 0),
        net_earnings_cents: Number(summary.net_earnings_cents || 0),
      },
      recent_orders: ordersResult.rows,
    });
  } catch (error) {
    console.error("Error fetching merchant dashboard:", error.message);
    return res.status(500).json({ message: "Failed to fetch dashboard" });
  }
};

const listOrders = async (req, res) => {
  const merchantId = req.merchant.id;
  const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit || "50", 10)));
  const offset = Math.max(0, Number.parseInt(req.query.offset || "0", 10));

  try {
    const result = await pool.query(
      `
      SELECT
        id,
        ROUND(COALESCE(total_amount, 0) * 100)::int AS total_amount_cents,
        ROUND(COALESCE(platform_fee, 0) * 100)::int AS platform_fee_cents,
        ROUND(COALESCE(merchant_amount, 0) * 100)::int AS merchant_amount_cents,
        stripe_checkout_session AS stripe_checkout_session_id,
        stripe_payment_intent AS stripe_payment_intent_id,
        status,
        created_at
      FROM orders
      WHERE merchant_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
      `,
      [merchantId, limit, offset],
    );
    return res.json({ data: result.rows, pagination: { limit, offset } });
  } catch (error) {
    console.error("Error listing orders:", error.message);
    return res.status(500).json({ message: "Failed to list orders" });
  }
};

const listProducts = async (req, res) => {
  const merchantId = req.merchant.id;
  const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit || "50", 10)));
  const offset = Math.max(0, Number.parseInt(req.query.offset || "0", 10));

  try {
    const [countResult, result] = await Promise.all([
      pool.query("SELECT COUNT(*)::int AS total FROM products WHERE merchant_id = $1", [merchantId]),
      pool.query(
        `
        SELECT id, name, category, subcategory, price, currency, images, availability
        FROM products
        WHERE merchant_id = $1
        ORDER BY name ASC NULLS LAST, id ASC
        LIMIT $2 OFFSET $3
        `,
        [merchantId, limit, offset],
      ),
    ]);

    return res.json({
      data: result.rows,
      pagination: { limit, offset, total: countResult.rows[0]?.total || 0 },
    });
  } catch (error) {
    console.error("Error listing products:", error.message);
    return res.status(500).json({ message: "Failed to list products" });
  }
};

const claimProducts = async (req, res) => {
  const merchantId = req.merchant.id;
  const { productIds = [] } = req.body || {};

  const ids = Array.isArray(productIds) ? productIds.map((id) => String(id)).filter(Boolean) : [];
  if (ids.length === 0) return res.status(400).json({ message: "productIds is required" });

  try {
    const result = await pool.query(
      `
      UPDATE products
      SET merchant_id = $1
      WHERE id = ANY($2::text[])
      RETURNING id
      `,
      [merchantId, ids],
    );
    return res.json({ updated: result.rowCount, productIds: result.rows.map((r) => r.id) });
  } catch (error) {
    console.error("Error claiming products:", error.message);
    return res.status(500).json({ message: "Failed to claim products" });
  }
};

const claimAllUnassignedProducts = async (req, res) => {
  const merchantId = req.merchant.id;

  try {
    const result = await pool.query(
      `
      UPDATE products
      SET merchant_id = $1
      WHERE merchant_id IS NULL
      `,
      [merchantId],
    );

    return res.json({ updated: result.rowCount });
  } catch (error) {
    console.error("Error claiming all unassigned products:", error.message);
    return res.status(500).json({ message: "Failed to claim unassigned products" });
  }
};

module.exports = {
  registerMerchant,
  loginMerchant,
  getMe,
  getDashboard,
  listOrders,
  listProducts,
  claimProducts,
  claimAllUnassignedProducts,
  connectStripeAccount,
  setVerificationStatus,
  getStripeStatus,
};

