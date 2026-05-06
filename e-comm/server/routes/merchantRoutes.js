const express = require("express");
const {
  registerMerchant,
  loginMerchant,
  getMe,
  getDashboard,
  listOrders,
  listProducts,
  claimProducts,
  claimAllUnassignedProducts,
  setVerificationStatus,
  connectStripeAccount,
  getStripeStatus,
} = require("../controllers/merchantController");
const { requireMerchantAuth } = require("../middleware/requireMerchantAuth");

const router = express.Router();

router.post("/register", registerMerchant);
router.post("/login", loginMerchant);

router.get("/me", requireMerchantAuth, getMe);
router.get("/me/dashboard", requireMerchantAuth, getDashboard);
router.get("/me/orders", requireMerchantAuth, listOrders);
router.get("/me/products", requireMerchantAuth, listProducts);
router.post("/me/products/claim", requireMerchantAuth, claimProducts);
router.post("/me/products/claim-unassigned", requireMerchantAuth, claimAllUnassignedProducts);

router.get("/me/stripe", requireMerchantAuth, getStripeStatus);
router.post("/me/stripe/connect", requireMerchantAuth, connectStripeAccount);
router.post("/me/verification", requireMerchantAuth, setVerificationStatus);

module.exports = router;

