// routes/companies.js
const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/auth");
const companyController = require("../controllers/companyController");

router.get("/", auth, companyController.getCompanies);

router.get("/:id", auth, companyController.getCompanyById);

module.exports = router;
