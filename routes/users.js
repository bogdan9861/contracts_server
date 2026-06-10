const express = require("express");
const router = express.Router();

const fileMiddleware = require("../middleware/file");
const { auth } = require("../middleware/auth");

const {
  register,
  login,
  current,
  edit,
  getAllUsers,
  removeUser,
} = require("../controllers/users");
const { admin } = require("../middleware/admin");

router.post("/register", fileMiddleware.single("image"), register);
router.post("/login", fileMiddleware.single("image"), login);
router.get("/", auth, current);

router.get("/all", auth, admin, getAllUsers);
router.delete("/:id", auth, admin, removeUser);

router.put("/", auth, edit);

module.exports = router;
