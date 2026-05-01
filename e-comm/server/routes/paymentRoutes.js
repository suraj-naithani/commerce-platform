const express = require("express");
const { createCheckoutSession, getCheckoutSessionStatus } = require("../controllers/paymentController");

const router = express.Router();

router.post("/create-checkout-session", createCheckoutSession);
router.get("/session/:sessionId", getCheckoutSessionStatus);

module.exports = router;
