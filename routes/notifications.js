// routes/notifications.js
const express = require("express");
const router = express.Router();

const {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  getUnreadCount,
} = require("../controllers/notificationController");
const { auth } = require("../middleware/auth");

// Получить все уведомления пользователя
router.get("/", auth, getNotifications);

// Получить количество непрочитанных уведомлений
router.get("/unread-count", auth, getUnreadCount);

// Отметить уведомление как прочитанное
router.patch("/:notificationId/read", auth, markNotificationAsRead);

// Отметить все уведомления как прочитанные
router.patch("/read-all", auth, markAllNotificationsAsRead);

// Удалить уведомление
router.delete("/:notificationId", auth, deleteNotification);

module.exports = router;
