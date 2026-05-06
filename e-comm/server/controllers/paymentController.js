const Stripe = require("stripe");
const { calculateFeeCents } = require("../utils/revenueShare");
const pool = require("../db/postgres");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

function isStripeConnectNotEnabledError(message) {
  const msg = String(message || "").toLowerCase();
  return msg.includes("signed up for connect") || msg.includes("connect platform onboarding");
}

function isStripeConnectedAccountError(message) {
  const msg = String(message || "").toLowerCase();
  return msg.includes("no such account") || msg.includes("no such stripe account") || msg.includes("connected account");
}

function isStripeDestinationCapabilityError(message) {
  const msg = String(message || "").toLowerCase();
  return msg.includes("destination account needs to have at least one of the following capabilities enabled");
}

const createCheckoutSession = async (req, res) => {
  const { items = [], email = "", flow = "auto" } = req.body || {};

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
    const connectedAccountId =
      merchant.stripe_account_id && String(merchant.stripe_account_id).startsWith("acct_")
        ? String(merchant.stripe_account_id)
        : "";

    const destinationAccount = isVerified ? connectedAccountId : "";
    const payoutBlocked = Boolean(connectedAccountId) && !destinationAccount;
    let finalPayoutBlocked = payoutBlocked;
    let payoutBlockedReason = payoutBlocked ? "merchant_not_verified" : "";

    const requestedFlow = String(flow || "auto").toLowerCase();
    const hasDestination = Boolean(destinationAccount);
    const canTransferLater = Boolean(destinationAccount);

    const resolvedFlow =
      requestedFlow === "destination"
        ? hasDestination
          ? "destination_charge"
          : "platform_charge"
        : requestedFlow === "separate"
          ? canTransferLater
            ? "separate_charges_transfers"
            : "platform_charge"
          : requestedFlow === "direct"
            ? hasDestination
              ? "direct_charge"
              : "platform_charge"
            : hasDestination
              ? "destination_charge"
              : "platform_charge";

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
        payment_flow: resolvedFlow,
        payout_blocked_reason: payoutBlockedReason,
      },
      payment_intent_data: {
        metadata: {
          merchant_id: String(merchantId),
          order_amount_cents: String(orderAmountCents),
          platform_fee_cents: String(platformFeeCents),
          merchant_net_cents: String(merchantNetCents),
          payout_blocked: payoutBlocked ? "true" : "false",
          payment_flow: resolvedFlow,
          payout_blocked_reason: payoutBlockedReason,
        },
      },
    };

    const basePaymentIntentData = { ...sessionCreateParams.payment_intent_data };

    const createPlatformSession = async () => {
      const params = {
        ...sessionCreateParams,
        payment_intent_data: { ...basePaymentIntentData },
      };
      delete params.payment_intent_data.application_fee_amount;
      delete params.payment_intent_data.transfer_data;
      return stripe.checkout.sessions.create(params);
    };

    // Create session based on requested Connect flow.
    let session;
    let finalFlow = resolvedFlow;

    try {
      // Flow 1: Destination charges (platform charge + automatic transfer)
      if (resolvedFlow === "destination_charge" && destinationAccount) {
        sessionCreateParams.payment_intent_data.application_fee_amount = platformFeeCents;
        sessionCreateParams.payment_intent_data.transfer_data = { destination: destinationAccount };
        session = await stripe.checkout.sessions.create(sessionCreateParams);
      } else if (resolvedFlow === "direct_charge" && destinationAccount) {
        // Flow 3: Direct charges (charge created on connected account; platform collects application fee)
        sessionCreateParams.payment_intent_data.application_fee_amount = platformFeeCents;
        session = await stripe.checkout.sessions.create(sessionCreateParams, { stripeAccount: destinationAccount });
      } else {
        // Flow 2 (separate) starts with a platform charge; transfer happens post-payment.
        session = await stripe.checkout.sessions.create(sessionCreateParams);
      }
    } catch (stripeError) {
      const message = String(stripeError?.message || "");

      // If Connect isn't enabled / connected account is invalid, fall back to a plain platform checkout
      // so the customer can still pay (demo can still show fees/revenue split).
      if (
        (resolvedFlow === "destination_charge" || resolvedFlow === "direct_charge" || resolvedFlow === "separate_charges_transfers") &&
        (isStripeConnectNotEnabledError(message) ||
          isStripeConnectedAccountError(message) ||
          isStripeDestinationCapabilityError(message))
      ) {
        finalFlow = "platform_charge";
        finalPayoutBlocked = Boolean(connectedAccountId);
        payoutBlockedReason = isStripeDestinationCapabilityError(message)
          ? "destination_missing_transfers_capability"
          : isStripeConnectNotEnabledError(message)
            ? "connect_not_enabled"
            : "connected_account_invalid";

        sessionCreateParams.metadata.payout_blocked = finalPayoutBlocked ? "true" : "false";
        sessionCreateParams.metadata.payout_blocked_reason = payoutBlockedReason;
        sessionCreateParams.payment_intent_data.metadata.payout_blocked = finalPayoutBlocked ? "true" : "false";
        sessionCreateParams.payment_intent_data.metadata.payout_blocked_reason = payoutBlockedReason;

        session = await createPlatformSession();
      } else {
        throw stripeError;
      }
    }

    const orderAmount = orderAmountCents / 100;
    const platformFeeAmount = platformFeeCents / 100;
    const merchantNetAmount = merchantNetCents / 100;
    const orderProductIds = normalizedItems.map((item) => item.id);
    const primaryProductId = orderProductIds[0] || null;
    const productIdList = orderProductIds.join(",");
    const paymentFlow = finalFlow;

    const orderInsert = await pool.query(
      `
      INSERT INTO orders (
        product_id,
        product_ids,
        merchant_id,
        total_amount,
        platform_fee,
        merchant_amount,
        stripe_checkout_session,
        payment_flow,
        payment_status,
        status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id
      `,
      [
        primaryProductId,
        productIdList,
        merchantId,
        orderAmount,
        platformFeeAmount,
        merchantNetAmount,
        session.id,
        paymentFlow,
        "created",
        finalPayoutBlocked ? "payout_blocked" : "created",
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
        payout_blocked: finalPayoutBlocked,
        payout_blocked_reason: finalPayoutBlocked ? payoutBlockedReason : "",
      },
      payment_flow: paymentFlow,
      revenue_share: {
        order_amount_cents: orderAmountCents,
        platform_fee_cents: platformFeeCents,
        merchant_net_cents: merchantNetCents,
      },
    });
  } catch (error) {
    const message = String(error?.message || "");
    console.error("Error creating Stripe checkout session:", message);

    if (isStripeConnectNotEnabledError(message)) {
      return res.status(400).json({
        message:
          "Stripe Connect is not enabled for this Stripe account. Enable Connect in the Stripe dashboard, or remove the merchant stripe_account_id to use platform-only checkout.",
      });
    }

    return res.status(500).json({ message: message || "Failed to create checkout session" });
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
    let orderRow = null;
    let merchantRow = null;
    try {
      const orderResult = await pool.query(
        "SELECT id, merchant_id, merchant_amount, payment_flow, stripe_transfer_id, stripe_checkout_session FROM orders WHERE stripe_checkout_session = $1",
        [String(sessionId)],
      );
      orderRow = orderResult.rows[0] || null;

      if (orderRow?.merchant_id) {
        const merchantResult = await pool.query(
          `
          SELECT
            id,
            stripe_account_id,
            COALESCE(verification_status, status, 'pending') AS verification_status
          FROM merchants
          WHERE id = $1
          `,
          [orderRow.merchant_id],
        );
        merchantRow = merchantResult.rows[0] || null;
      }
    } catch {
      orderRow = null;
      merchantRow = null;
    }

    const connectedAccountId =
      merchantRow?.stripe_account_id && String(merchantRow.stripe_account_id).startsWith("acct_")
        ? String(merchantRow.stripe_account_id)
        : "";

    const shouldRetrieveFromConnected = orderRow?.payment_flow === "direct_charge" && connectedAccountId;

    const session = shouldRetrieveFromConnected
      ? await stripe.checkout.sessions.retrieve(sessionId, {}, { stripeAccount: connectedAccountId })
      : await stripe.checkout.sessions.retrieve(sessionId);
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
        RETURNING id, merchant_id, status, payment_flow, stripe_transfer_id
        `,
        [session.payment_intent ? String(session.payment_intent) : null, String(session.payment_status || ""), String(sessionId)],
      );
      order = updated.rows[0] || null;
    } catch (error) {
      // If schema isn't initialized yet, don't fail customer status page.
      order = null;
    }

    // Flow 2: Separate charges & transfers (create transfer after successful payment).
    try {
      const isPaid = String(session.payment_status || "").toLowerCase() === "paid";
      const paymentFlow = order?.payment_flow || orderRow?.payment_flow || "";

      const isVerified = String(merchantRow?.verification_status || "").toLowerCase() === "verified";
      const shouldTransfer =
        isPaid &&
        paymentFlow === "separate_charges_transfers" &&
        isVerified &&
        connectedAccountId &&
        !(order?.stripe_transfer_id || orderRow?.stripe_transfer_id);

      if (shouldTransfer) {
        const merchantNetCents = Number(session.metadata?.merchant_net_cents || 0);
        const transferAmount = Math.max(0, Math.round(merchantNetCents));

        let chargeId = null;
        if (session.payment_intent) {
          const pi = await stripe.paymentIntents.retrieve(
            String(session.payment_intent),
            { expand: ["latest_charge"] },
          );
          if (typeof pi.latest_charge === "string") chargeId = pi.latest_charge;
          else if (pi.latest_charge?.id) chargeId = pi.latest_charge.id;
        }

        const transfer = await stripe.transfers.create(
          {
            amount: transferAmount,
            currency: String(session.currency || "usd"),
            destination: connectedAccountId,
            ...(chargeId ? { source_transaction: chargeId } : {}),
          },
          { idempotencyKey: order?.id ? `order_${order.id}_transfer` : `session_${sessionId}_transfer` },
        );

        await pool.query(
          `
          UPDATE orders
          SET
            stripe_transfer_id = $1,
            status = CASE WHEN status = 'paid' THEN 'paid_transferred' ELSE status END
          WHERE stripe_checkout_session = $2
          `,
          [transfer.id, String(sessionId)],
        );
        order.stripe_transfer_id = transfer.id;
      }
    } catch (error) {
      // Transfers are best-effort for demo; mark payout blocked but don't fail success page.
      try {
        const msg = String(error?.message || "");
        if (orderRow?.stripe_checkout_session) {
          await pool.query(
            `
            UPDATE orders
            SET status = 'payout_blocked'
            WHERE stripe_checkout_session = $1
            `,
            [String(sessionId)],
          );
        }
      } catch {
        // ignore
      }
    }

    res.json({
      order_id: order?.id || null,
      payment_status: session.payment_status,
      customer_email: session.customer_email,
      amount_total: session.amount_total,
      currency: session.currency,
      payment_flow: order?.payment_flow || orderRow?.payment_flow || session.metadata?.payment_flow || null,
      stripe_transfer_id: order?.stripe_transfer_id || orderRow?.stripe_transfer_id || null,
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
