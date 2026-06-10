// controllers/notificationController.js
const { prisma } = require("../prisma/prisma.client");

// Получение всех уведомлений пользователя
const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;

    const notifications = await prisma.notification.findMany({
      where: {
        userId: userId,
      },
      include: {
        contract: {
          include: {
            company: {
              select: {
                id: true,
                name: true,
                inn: true,
              },
            },
            client: {
              select: {
                id: true,
                fullName: true,
                email: true,
                phone: true,
              },
            },
            owner: {
              select: {
                id: true,
                fullName: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.status(200).json(notifications);
  } catch (error) {
    console.error("Error in getNotifications:", error);
    res
      .status(500)
      .json({
        message: "Ошибка при получении уведомлений",
        error: error.message,
      });
  }
};

// Отметка уведомления как прочитанного
const markNotificationAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.id;

    // Проверяем, что уведомление принадлежит пользователю
    const notification = await prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId: userId,
      },
    });

    if (!notification) {
      return res.status(404).json({ message: "Уведомление не найдено" });
    }

    const updatedNotification = await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });

    res.status(200).json(updatedNotification);
  } catch (error) {
    console.error("Error in markNotificationAsRead:", error);
    res
      .status(500)
      .json({
        message: "Ошибка при отметке уведомления",
        error: error.message,
      });
  }
};

// Отметка всех уведомлений как прочитанных
const markAllNotificationsAsRead = async (req, res) => {
  try {
    const userId = req.user.id;

    await prisma.notification.updateMany({
      where: {
        userId: userId,
        isRead: false,
      },
      data: { isRead: true },
    });

    res
      .status(200)
      .json({ message: "Все уведомления отмечены как прочитанные" });
  } catch (error) {
    console.error("Error in markAllNotificationsAsRead:", error);
    res
      .status(500)
      .json({
        message: "Ошибка при отметке уведомлений",
        error: error.message,
      });
  }
};

// Удаление уведомления
const deleteNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.id;

    const notification = await prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId: userId,
      },
    });

    if (!notification) {
      return res.status(404).json({ message: "Уведомление не найдено" });
    }

    await prisma.notification.delete({
      where: { id: notificationId },
    });

    res.status(200).json({ message: "Уведомление удалено" });
  } catch (error) {
    console.error("Error in deleteNotification:", error);
    res
      .status(500)
      .json({
        message: "Ошибка при удалении уведомления",
        error: error.message,
      });
  }
};

// Получение количества непрочитанных уведомлений
const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;

    const count = await prisma.notification.count({
      where: {
        userId: userId,
        isRead: false,
      },
    });

    res.status(200).json({ unreadCount: count });
  } catch (error) {
    console.error("Error in getUnreadCount:", error);
    res
      .status(500)
      .json({
        message: "Ошибка при получении количества уведомлений",
        error: error.message,
      });
  }
};

// Вспомогательная функция для создания уведомления
const createNotification = async (
  userId,
  title,
  message,
  type,
  contractId = null,
) => {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type,
        contractId,
      },
    });
    return notification;
  } catch (error) {
    console.error("Error creating notification:", error);
    return null;
  }
};

module.exports = {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  getUnreadCount,
  createNotification,
};
