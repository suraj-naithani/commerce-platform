const express = require("express");
const { getProducts, getProductById, getProductCategories, searchProducts } = require("../controllers/productController");

const router = express.Router();

router.get("/", getProducts);
router.get("/categories", getProductCategories);
router.get("/search", searchProducts);
router.get("/:id", getProductById);

module.exports = router;
