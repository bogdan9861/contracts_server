const express = require("express");
const router = express.Router();

const fileMiddleware = require("../middleware/file");
const { auth } = require("../middleware/auth");
const {
  create,
  edit,
  getContracts,
  getMyContracts,
  getPendingRequests,
  approveContract,
  rejectContract,
  createContractRequest,
} = require("../controllers/contracts");
const { admin } = require("../middleware/admin");

router.post("/", auth, fileMiddleware.single("file"), create);
router.put("/:id", auth, fileMiddleware.single("file"), edit);
router.get("/", auth, fileMiddleware.single("file"), getContracts);
router.get("/my", auth, fileMiddleware.single("file"), getMyContracts);
router.get("/pending", auth, getPendingRequests);
router.patch("/:contractId/approve", auth, approveContract);
router.patch("/:contractId/reject", auth, rejectContract);
router.post(
  "/create-request",
  auth,
  fileMiddleware.single("file"),
  createContractRequest,
);

module.exports = router;
