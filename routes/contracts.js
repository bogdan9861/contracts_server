const express = require("express");
const router = express.Router();

const fileMiddleware = require("../middleware/file");
const { auth } = require("../middleware/auth");
const { create, edit, getContracts } = require("../controllers/contracts");
const { admin } = require("../middleware/admin");

router.post("/", auth, fileMiddleware.single("file"), create);
router.put("/:id", auth, fileMiddleware.single("file"), edit);
router.get("/", auth, fileMiddleware.single("file"), getContracts);

module.exports = router;
