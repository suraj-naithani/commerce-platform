const jwt = require("jsonwebtoken");

function getMerchantJwtSecret() {
  return process.env.MERCHANT_JWT_SECRET || process.env.JWT_SECRET || "dev_merchant_secret_change_me";
}

function requireMerchantAuth(req, res, next) {
  const header = String(req.headers.authorization || "");
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ message: "Missing merchant auth token" });
  }

  try {
    const payload = jwt.verify(token, getMerchantJwtSecret());
    if (!payload || !payload.merchantId) {
      return res.status(401).json({ message: "Invalid merchant auth token" });
    }
    req.merchant = { id: payload.merchantId, email: payload.email || "" };
    return next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid merchant auth token" });
  }
}

module.exports = { requireMerchantAuth, getMerchantJwtSecret };

