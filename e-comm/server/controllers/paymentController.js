const Stripe = require("stripe");

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
    const lineItems = items.map((item) => ({
      price_data: {
        currency: "usd",
        product_data: {
          name: item.name,
          images: item.image ? [item.image] : [],
        },
        unit_amount: Math.round(Number(item.price || 0) * 100),
      },
      quantity: Number(item.quantity || 1),
    }));

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: email,
      line_items: lineItems,
      success_url: `${clientUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${clientUrl}/checkout?canceled=true`,
    });

    res.json({ id: session.id, url: session.url });
  } catch (error) {
    console.error("Error creating Stripe checkout session:", error.message);
    res.status(500).json({ message: "Failed to create checkout session" });
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
    res.json({
      payment_status: session.payment_status,
      customer_email: session.customer_email,
      amount_total: session.amount_total,
      currency: session.currency,
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
