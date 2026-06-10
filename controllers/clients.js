const { prisma } = require("../prisma/prisma.client");

const createClient = async (req, res) => {
  try {
    const { companyName, contactPerson, email, phone } = req.body;

    const client = await prisma.client.create({
      data: {
        companyName,
        contactPerson,
        email,
        phone,
        userId: req.user.id,
      },
      include: {
        contracts: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        type: "CLIENT_CREATED",
        message: "Вы добавили нового клиента",
      },
    });

    res.status(201).json(client);
  } catch (error) {
    console.log(error);

    res.status(500).json({ message: "Server error" });
  }
};

const getMyClients = async (req, res) => {
  try {
    const { search } = req.query;

    const where = {};

    where.userId = req.user.id;

    if (search) {
      where.companyName = {
        contains: search,
      };
    }

    const clients = await prisma.client.findMany({
      where,
      include: {
        contracts: true,
      },
    });

    res.status(200).json(clients);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

const editClient = async (req, res) => {
  try {
    const { id } = req.params;
    const { companyName, contactPerson, email, phone, status } = req.body;

    const client = await prisma.client.findFirst({
      where: {
        id,
      },
    });

    if (!client) {
      return res
        .status(404)
        .json({ message: "Cannot find client with specified id" });
    }

    const updatedClient = await prisma.client.update({
      where: {
        id,
      },
      data: {
        companyName: companyName || client.companyName,
        contactPerson: contactPerson || client.contactPerson,
        email: email || client.email,
        phone: phone || client.phone,
        status: status || client.status,
      },
      include: {
        contracts: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        type: "CLIENT_UPDATED",
        message: "Вы изменили данные клиента",
      },
    });

    res.status(200).json(updatedClient);
  } catch (error) {
    console.log(error);

    res.status(500).json({ message: "Server error" });
  }
};

const deleteClient = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.client.delete({
      where: {
        id,
      },
    });

    res.status(200).json({});
  } catch (error) {
    console.log(error);

    res.status(500).json({ message: "Server error" });
  }
};

const getCompanyClients = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    // Проверяем, что пользователь - владелец компании
    if (userRole !== "COMPANY_OWNER") {
      return res
        .status(403)
        .json({ message: "Доступ запрещён. Только для владельцев компаний." });
    }

    // Получаем компанию пользователя
    const userWithCompany = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        ownedCompany: true,
      },
    });

    if (!userWithCompany?.ownedCompany) {
      return res.status(200).json([]);
    }

    const companyId = userWithCompany.ownedCompany.id;

    // Получаем всех уникальных клиентов, у которых есть договоры с этой компанией
    const clients = await prisma.user.findMany({
      where: {
        role: "CLIENT",
        contractsAsClient: {
          some: {
            companyId: companyId,
          },
        },
      },
      include: {
        contractsAsClient: {
          where: {
            companyId: companyId,
          },
          select: {
            id: true,
            number: true,
            sum: true,
            date: true,
            requestStatus: true,
            contractStatus: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Форматируем ответ с дополнительной статистикой по каждому клиенту
    const formattedClients = clients.map((client) => {
      const contracts = client.contractsAsClient;
      const activeContracts = contracts.filter(
        (c) => c.contractStatus === "ACTIVE" && c.requestStatus === "APPROVED",
      ).length;
      const totalContractsSum = contracts
        .filter((c) => c.requestStatus === "APPROVED")
        .reduce((sum, c) => sum + Number(c.sum), 0);

      return {
        id: client.id,
        fullName: client.fullName,
        email: client.email,
        phone: client.phone,
        createdAt: client.createdAt,
        contractsCount: contracts.length,
        activeContractsCount: activeContracts,
        totalContractsSum: totalContractsSum,
        contracts: contracts.map((c) => ({
          id: c.id,
          number: c.number,
          sum: c.sum,
          date: c.date,
          requestStatus: c.requestStatus,
          contractStatus: c.contractStatus,
        })),
      };
    });

    res.status(200).json(formattedClients);
  } catch (error) {
    console.error("Error in getCompanyClients:", error);
    res.status(500).json({
      message: "Ошибка при получении списка клиентов",
      error: error.message,
    });
  }
};

module.exports = {
  createClient,
  getMyClients,
  editClient,
  deleteClient,
  getCompanyClients,
};
