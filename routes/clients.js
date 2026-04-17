const express = require("express");
const router = express.Router();

const fileMiddleware = require("../middleware/file");
const { auth } = require("../middleware/auth");
const {
  createClient,
  getMyClients,
  editClient,
  deleteClient,
} = require("../controllers/clients");
const { admin } = require("../middleware/admin");

router.post("/", auth, createClient);
router.get("/", auth, getMyClients);
router.put("/:id", auth, editClient);
router.delete("/:id", auth, deleteClient);

module.exports = router;
