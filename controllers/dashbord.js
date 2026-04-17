const { prisma } = require("../prisma/prisma.client");

const getDashboard = async (req, res) => {
  try {
    const [activeStatuses, expiredStatuses, closedStatuses] = await Promise.all(
      [
        prisma.contract.count({
          where: {
            userId: req.user.id,
            status: "ACTIVE",
          },
        }),
        prisma.contract.count({
          where: {
            userId: req.user.id,
            status: "EXPIRED",
          },
        }),
        prisma.contract.count({
          where: {
            userId: req.user.id,
            status: "CLOSED",
          },
        }),
      ]
    );

    const clientsByMonthRaw = await prisma.$queryRaw`
        SELECT 
        DATE_FORMAT(createDate, '%Y-%m') as month,
        COUNT(*) as count
        FROM Client
        WHERE userId = ${req.user.id}
        GROUP BY month
        ORDER BY month ASC
    `;

    const clientsByMonth = clientsByMonthRaw.map((item) => ({
      month: item.month,
      count: Number(item.count),
    }));

    const clinetsCount = await prisma.client.count({
      where: {
        userId: req.user.id,
      },
    });

    const contractsCount = await prisma.contract.count({
      where: {
        userId: req.user.id,
      },
    });

    res.status(200).json({
      statuses: {
        active: activeStatuses,
        expired: expiredStatuses,
        closed: closedStatuses,
      },
      clientsByMonth,
      clinetsCount,
      contractsCount,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  getDashboard,
};
