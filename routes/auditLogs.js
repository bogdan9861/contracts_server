const express = require("express");
const router = express.Router();

const { auth } = require("../middleware/auth");
const { getAudit } = require("../controllers/auditLog");

router.get("/", auth, getAudit);

module.exports = router;
