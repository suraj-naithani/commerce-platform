const Stripe = require("stripe");
const { calculateFeeCents } = require("../utils/revenueShare");
const pool = require("../db/postgres");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

const createCheckoutSession = async (req, res) => {
  const { items = [], email = "" } = req.body || {};

  if (!process.env.STRIPE_SECRET_KEY) {
    return res.status(500).json({ message: "Stripe secret key is not configured" });
  }

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: "Cart is empty" });
  }

  if (!email || !String(email).includes("@")) {
    return res.status(400).json({ message: "Valid email is required" });
  }

  try {
    const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
    const normalizedCart = items
      .map((item) => ({
        id: String(item?.id ?? ""),
        quantity: Math.max(1, Math.floor(Number(item?.quantity || 1))),
      }))
      .filter((entry) => entry.id);

    if (normalizedCart.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    const productIds = [...new Set(normalizedCart.map((entry) => entry.id))];
    const productsResult = await pool.query(
      `
      SELECT id, name, price, currency, images, merchant_id
      FROM products
      WHERE id = ANY($1::text[])
      `,
      [productIds],
    );
    const products = productsResult.rows || [];
    const productById = new Map(products.map((p) => [String(p.id), p]));

    const missingIds = productIds.filter((id) => !productById.has(String(id)));
    if (missingIds.length > 0) {
      return res.status(400).json({ message: "Some products no longer exist", missing_product_ids: missingIds });
    }

    const merchantIds = new Set(
      normalizedCart
        .map((entry) => productById.get(String(entry.id))?.merchant_id)
        .filter((value) => typeof value === "number"),
    );

    if (merchantIds.size !== 1) {
      return res.status(400).json({
        message: "This demo checkout supports one merchant per order",
        merchant_ids: Array.from(merchantIds),
      });
    }

    const merchantId = Array.from(merchantIds)[0];
    const merchantResult = await pool.query(
      `
      SELECT
        id,
        stripe_account_id,
        COALESCE(verification_status, status, 'pending') AS verification_status
      FROM merchants
      WHERE id = $1
      `,
      [merchantId],
    );
    const merchant = merchantResult.rows[0];
    if (!merchant) return res.status(400).json({ message: "Merchant not found for cart items" });

    const normalizedItems = normalizedCart.map((entry) => {
      const product = productById.get(String(entry.id));
      const unitAmount = Math.round(Math.max(0, Number(product.price || 0)) * 100);
      const images = Array.isArray(product.images) ? product.images : product.images ? [product.images] : [];
      const image = images.find((src) => typeof src === "string" && src) || "";
      return {
        id: String(product.id),
        name: product.name || `Product ${product.id}`,
        image,
        unitAmount,
        quantity: entry.quantity,
      };
    });

    const lineItems = normalizedItems.map((item) => ({
      price_data: {
        currency: "usd",
        product_data: {
          name: item.name,
          images: item.image ? [item.image] : [],
        },
        unit_amount: item.unitAmount,
      },
      quantity: item.quantity,
    }));

    const orderAmountCents = normalizedItems.reduce((sum, item) => sum + item.unitAmount * item.quantity, 0);
    const platformFeeCents = calculateFeeCents(orderAmountCents);
    const merchantNetCents = Math.max(0, orderAmountCents - platformFeeCents);
    const isVerified = String(merchant.verification_status || "").toLowerCase() === "verified";
    const destinationAccount =
      isVerified && merchant.stripe_account_id && String(merchant.stripe_account_id).startsWith("acct_")
        ? String(merchant.stripe_account_id)
        : "";
    const payoutBlocked = Boolean(merchant.stripe_account_id) && !destinationAccount;

    const sessionCreateParams = {
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: email,
      line_items: lineItems,
      success_url: `${clientUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${clientUrl}/checkout?canceled=true`,
      metadata: {
        merchant_id: String(merchantId),
        order_amount_cents: String(orderAmountCents),
        platform_fee_cents: String(platformFeeCents),
        merchant_net_cents: String(merchantNetCents),
        payout_blocked: payoutBlocked ? "true" : "false",
      },
      payment_intent_data: {
        metadata: {
          merchant_id: String(merchantId),
          order_amount_cents: String(orderAmountCents),
          platform_fee_cents: String(platformFeeCents),
          merchant_net_cents: String(merchantNetCents),
          payout_blocked: payoutBlocked ? "true" : "false",
        },
      },
    };

    if (destinationAccount) {
      sessionCreateParams.payment_intent_data.application_fee_amount = platformFeeCents;
      sessionCreateParams.payment_intent_data.transfer_data = { destination: destinationAccount };
    }

    const session = await stripe.checkout.sessions.create(sessionCreateParams);

    const orderAmount = orderAmountCents / 100;
    const platformFeeAmount = platformFeeCents / 100;
    const merchantNetAmount = merchantNetCents / 100;
    const productIdList = normalizedItems.map((item) => item.id).join(",");
    const paymentFlow = destinationAccount ? "destination_charge" : "platform_charge";

    const orderInsert = await pool.query(
      `
      INSERT INTO orders (
        product_id,
        merchant_id,
        total_amount,
        platform_fee,
        merchant_amount,
        stripe_checkout_session,
        payment_flow,
        payment_status,
        status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id
      `,
      [
        productIdList,
        merchantId,
        orderAmount,
        platformFeeAmount,
        merchantNetAmount,
        session.id,
        paymentFlow,
        "created",
        payoutBlocked ? "payout_blocked" : "created",
      ],
    );

    return res.json({
      order_id: orderInsert.rows[0]?.id,
      id: session.id,
      url: session.url,
      merchant: {
        id: merchantId,
        stripe_account_id: merchant.stripe_account_id,
        verification_status: merchant.verification_status,
        payout_blocked: payoutBlocked,
      },
      revenue_share: {
        order_amount_cents: orderAmountCents,
        platform_fee_cents: platformFeeCents,
        merchant_net_cents: merchantNetCents,
      },
    });
  } catch (error) {
    console.error("Error creating Stripe checkout session:", error.message);
    return res.status(500).json({ message: "Failed to create checkout session" });
  }
};

const getCheckoutSessionStatus = async (req, res) => {
  const sessionId = req.params.sessionId;

  if (!process.env.STRIPE_SECRET_KEY) {
    return res.status(500).json({ message: "Stripe secret key is not configured" });
  }

  if (!sessionId) {
    return res.status(400).json({ message: "Session id is required" });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const amountTotalCents = Number(session.amount_total || 0);
    const platformFeeCents = calculateFeeCents(amountTotalCents);

    let order = null;
    try {
      const updated = await pool.query(
        `
        UPDATE orders
        SET
          stripe_payment_intent = COALESCE($1, stripe_payment_intent),
          payment_intent_id = COALESCE($1, payment_intent_id),
          payment_status = COALESCE($2, payment_status),
          status = CASE
            WHEN $2 = 'paid' THEN 'paid'
            ELSE status
          END
        WHERE stripe_checkout_session = $3
        RETURNING id, merchant_id, status
        `,
        [session.payment_intent ? String(session.payment_intent) : null, String(session.payment_status || ""), String(sessionId)],
      );
      order = updated.rows[0] || null;
    } catch (error) {
      // If schema isn't initialized yet, don't fail customer status page.
      order = null;
    }

    res.json({
      order_id: order?.id || null,
      payment_status: session.payment_status,
      customer_email: session.customer_email,
      amount_total: session.amount_total,
      currency: session.currency,
      revenue_share: {
        order_amount_cents: amountTotalCents,
        platform_fee_cents: platformFeeCents,
        merchant_net_cents: Math.max(0, amountTotalCents - platformFeeCents),
      },
    });
  } catch (error) {
    console.error("Error retrieving Stripe checkout session:", error.message);
    res.status(500).json({ message: "Failed to fetch checkout session status" });
  }
};

module.exports = {
  createCheckoutSession,
  getCheckoutSessionStatus,
};
