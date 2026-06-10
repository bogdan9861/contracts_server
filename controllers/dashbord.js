const { prisma } = require("../prisma/prisma.client");

const getDashboard = async (req, res) => {
  try {
    const user = req.user;
    const userRole = user.role;

    // Базовые статистики для всех пользователей
    let activeContracts = 0;
    let expiredContracts = 0;
    let terminatedContracts = 0;
    let totalContracts = 0;
    let clientsCount = 0;
    let companiesCount = 0;

    // Данные для графика (по умолчанию пустые)
    let contractsByMonth = [];
    let clientsByMonth = [];

    if (userRole === "COMPANY_OWNER") {
      // ВЛАДЕЛЕЦ КОМПАНИИ
      // Получаем компанию пользователя
      const userWithCompany = await prisma.user.findUnique({
        where: { id: user.id },
        include: {
          ownedCompany: true,
        },
      });

      if (!userWithCompany?.ownedCompany) {
        return res.status(200).json({
          statuses: {
            active: 0,
            expired: 0,
            terminated: 0,
          },
          contractsByMonth: [],
          clientsByMonth: [],
          clientsCount: 0,
          contractsCount: 0,
          companiesCount: 0,
        });
      }

      const companyId = userWithCompany.ownedCompany.id;

      // Статистика по договорам компании
      const contractsStats = await prisma.contract.aggregate({
        where: {
          companyId: companyId,
        },
        _count: {
          id: true,
        },
        _sum: {
          sum: true,
        },
      });

      totalContracts = contractsStats._count.id;

      // Подсчет договоров по статусам
      const [active, expired, terminated] = await Promise.all([
        prisma.contract.count({
          where: {
            companyId: companyId,
            contractStatus: "ACTIVE",
            requestStatus: "APPROVED", // Только подтвержденные договоры
          },
        }),
        prisma.contract.count({
          where: {
            companyId: companyId,
            contractStatus: "EXPIRED",
            requestStatus: "APPROVED",
          },
        }),
        prisma.contract.count({
          where: {
            companyId: companyId,
            contractStatus: "TERMINATED",
            requestStatus: "APPROVED",
          },
        }),
      ]);

      activeContracts = active;
      expiredContracts = expired;
      terminatedContracts = terminated;

      // Количество уникальных клиентов компании
      const uniqueClients = await prisma.contract.groupBy({
        by: ["clientId"],
        where: {
          companyId: companyId,
          requestStatus: "APPROVED",
        },
      });
      clientsCount = uniqueClients.length;

      // Количество договоров по месяцам для компании
      const contractsByMonthRaw = await prisma.$queryRaw`
        SELECT 
          DATE_FORMAT(date, '%Y-%m') as month,
          COUNT(*) as count,
          SUM(sum) as total_sum
        FROM contracts
        WHERE companyId = ${companyId}
          AND requestStatus = 'APPROVED'
        GROUP BY month
        ORDER BY month ASC
        LIMIT 12
      `;

      contractsByMonth = contractsByMonthRaw.map((item) => ({
        month: item.month,
        count: Number(item.count),
        totalSum: Number(item.total_sum),
      }));

      // Количество новых клиентов по месяцам
      const clientsByMonthRaw = await prisma.$queryRaw`
        SELECT 
          DATE_FORMAT(c.date, '%Y-%m') as month,
          COUNT(DISTINCT c.clientId) as count
        FROM contracts c
        WHERE c.companyId = ${companyId}
          AND c.requestStatus = 'APPROVED'
        GROUP BY month
        ORDER BY month ASC
        LIMIT 12
      `;

      clientsByMonth = clientsByMonthRaw.map((item) => ({
        month: item.month,
        count: Number(item.count),
      }));
    } else if (userRole === "CLIENT") {
      // КЛИЕНТ КОМПАНИИ
      // Статистика по договорам клиента
      const contractsStats = await prisma.contract.aggregate({
        where: {
          clientId: user.id,
        },
        _count: {
          id: true,
        },
        _sum: {
          sum: true,
        },
      });

      totalContracts = contractsStats._count.id;

      // Подсчет договоров по статусам запроса и статусам договора
      const [active, expired, terminated, pending, rejected] =
        await Promise.all([
          prisma.contract.count({
            where: {
              clientId: user.id,
              contractStatus: "ACTIVE",
              requestStatus: "APPROVED",
            },
          }),
          prisma.contract.count({
            where: {
              clientId: user.id,
              contractStatus: "EXPIRED",
              requestStatus: "APPROVED",
            },
          }),
          prisma.contract.count({
            where: {
              clientId: user.id,
              contractStatus: "TERMINATED",
              requestStatus: "APPROVED",
            },
          }),
          prisma.contract.count({
            where: {
              clientId: user.id,
              requestStatus: "PENDING",
            },
          }),
          prisma.contract.count({
            where: {
              clientId: user.id,
              requestStatus: "REJECTED",
            },
          }),
        ]);

      activeContracts = active;
      expiredContracts = expired;
      terminatedContracts = terminated;

      // Количество уникальных компаний, с которыми сотрудничает клиент
      const uniqueCompanies = await prisma.contract.groupBy({
        by: ["companyId"],
        where: {
          clientId: user.id,
          requestStatus: "APPROVED",
        },
      });
      companiesCount = uniqueCompanies.length;

      // Количество договоров по месяцам для клиента
      const contractsByMonthRaw = await prisma.$queryRaw`
        SELECT 
          DATE_FORMAT(date, '%Y-%m') as month,
          COUNT(*) as count,
          SUM(sum) as total_sum,
          SUM(CASE WHEN requestStatus = 'PENDING' THEN 1 ELSE 0 END) as pending_count,
          SUM(CASE WHEN requestStatus = 'APPROVED' THEN 1 ELSE 0 END) as approved_count,
          SUM(CASE WHEN requestStatus = 'REJECTED' THEN 1 ELSE 0 END) as rejected_count
        FROM contracts
        WHERE clientId = ${user.id}
        GROUP BY month
        ORDER BY month ASC
        LIMIT 12
      `;

      contractsByMonth = contractsByMonthRaw.map((item) => ({
        month: item.month,
        count: Number(item.count),
        totalSum: Number(item.total_sum),
        pending: Number(item.pending_count),
        approved: Number(item.approved_count),
        rejected: Number(item.rejected_count),
      }));

      // Количество новых компаний по месяцам
      const companiesByMonthRaw = await prisma.$queryRaw`
        SELECT 
          DATE_FORMAT(c.date, '%Y-%m') as month,
          COUNT(DISTINCT c.companyId) as count
        FROM contracts c
        WHERE c.clientId = ${user.id}
          AND c.requestStatus = 'APPROVED'
        GROUP BY month
        ORDER BY month ASC
        LIMIT 12
      `;

      clientsByMonth = companiesByMonthRaw.map((item) => ({
        month: item.month,
        count: Number(item.count),
      }));
    }

    // Формируем ответ в зависимости от роли
    const response = {
      statuses: {
        active: activeContracts,
        expired: expiredContracts,
        terminated: terminatedContracts,
        ...(userRole === "CLIENT" && {
          pending: contractsByMonth.reduce(
            (sum, m) => sum + (m.pending || 0),
            0,
          ),
          rejected: contractsByMonth.reduce(
            (sum, m) => sum + (m.rejected || 0),
            0,
          ),
        }),
      },
      contractsByMonth,
      clientsByMonth,
      totalContracts,
      role: userRole,
    };

    // Добавляем специфичные для роли поля
    if (userRole === "COMPANY_OWNER") {
      response.clientsCount = clientsCount;
      response.companiesCount = 1; // У владельца только одна его компания
    } else if (userRole === "CLIENT") {
      response.companiesCount = companiesCount;
      response.clientsCount = 0; // У клиента нет своих клиентов
    }

    res.status(200).json(response);
  } catch (error) {
    console.error("Dashboard error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Дополнительный метод для получения сводной информации о запросах на договоры (для владельца)
const getPendingRequests = async (req, res) => {
  try {
    if (req.user.role !== "COMPANY_OWNER") {
      return res.status(403).json({ message: "Access denied" });
    }

    const userWithCompany = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { ownedCompany: true },
    });

    if (!userWithCompany?.ownedCompany) {
      return res.status(200).json({ pendingRequests: [], count: 0 });
    }

    const pendingContracts = await prisma.contract.findMany({
      where: {
        companyId: userWithCompany.ownedCompany.id,
        requestStatus: "PENDING",
      },
      include: {
        client: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.status(200).json({
      pendingRequests: pendingContracts,
      count: pendingContracts.length,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  getDashboard,
  getPendingRequests,
};
