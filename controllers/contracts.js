const { prisma } = require("../prisma/prisma.client");
const { createNotification } = require("../controllers/notificationController");
const uploadFile = require("../utlls/uploadFile");

const create = async (req, res) => {
  try {
    const { number, date, sum, clientId } = req.body;
    const file = req.file;

    console.log(file);

    const createContact = async (url) => {
      const contract = await prisma.contract.create({
        data: {
          number,
          date,
          sum,
          fileUrl: url || "",
          clientId,
          userId: req.user.id,
        },
        include: {
          client: true,
        },
      });

      await prisma.auditLog.create({
        data: {
          userId: req.user.id,
          type: "CONTRACT_CREATED",
          message: `Вы добавили новый договор ${contract.number} на сумму ${contract.sum}`,
        },
      });

      return res.status(201).json(contract);
    };

    if (file) {
      uploadFile(file?.path)
        .then((file) => {
          createContact(file.url);
        })
        .catch((e) => {
          return res.status(500).json({ message: "Failed to upload file" });
        });
    } else {
      createContact();
    }
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

const edit = async (req, res) => {
  try {
    const { id } = req.params;
    const { number, date, sum, status, clientId } = req.body;
    const file = req.file;

    const contract = await prisma.contract.findFirst({
      where: {
        id,
      },
    });

    if (!contract) {
      return res
        .status(404)
        .json({ message: "Cannot find contract with specified id" });
    }

    const editContract = async (url) => {
      const updatedContract = await prisma.contract.update({
        where: {
          id,
        },

        data: {
          number: number || contract.number,
          date: date || contract.date,
          status: status || contract.status,
          sum: sum || contract.sum,
          fileUrl: url || contract?.url,
          clientId: clientId || contract?.clientId,
        },
        include: {
          client: true,
        },
      });

      await prisma.auditLog.create({
        data: {
          userId: req.user.id,
          type: "CONTRACT_UPDATED",
          message: `Вы изменили данные договора ${contract.number}`,
        },
      });

      return res.status(200).json(updatedContract);
    };

    if (file?.path) {
      uploadFile(file?.path)
        .then(({ url }) => {
          editContract(url);
        })
        .catch((e) => {
          return res.status(500).json({ message: "Failed to uplaod file" });
        });
    } else {
      editContract();
    }
  } catch (error) {
    console.log(error);

    res.status(500).json({ message: "Server error" });
  }
};

const getContracts = async (req, res) => {
  try {
    const { number, status } = req.query;

    console.log(req.user.id);

    const where = {
      userId: req.user.id,
    };

    if (number) {
      where.number = {
        contains: number,
      };
    }

    if (status) {
      where.status = {
        equals: status,
      };
    }

    const contracts = await prisma.contract.findMany({
      where,
      include: {
        client: true,
      },
    });

    return res.status(200).json(contracts);
  } catch (error) {
    console.log(error);

    res.status(500).json({ message: "Server error" });
  }
};

const getMyContracts = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    let contracts = [];

    if (userRole === "COMPANY_OWNER") {
      // Владелец компании получает договоры своей компании
      const userWithCompany = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          ownedCompany: true,
        },
      });

      if (!userWithCompany?.ownedCompany) {
        return res.status(200).json([]);
      }

      contracts = await prisma.contract.findMany({
        where: {
          companyId: userWithCompany.ownedCompany.id,
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
          company: {
            select: {
              id: true,
              name: true,
              inn: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      // Форматируем ответ для владельца
      contracts = contracts.map((contract) => ({
        id: contract.id,
        number: contract.number,
        date: contract.date,
        sum: contract.sum,
        fileUrl: contract.fileUrl,
        requestStatus: contract.requestStatus,
        contractStatus: contract.contractStatus,
        reviewedAt: contract.reviewedAt,
        signedAt: contract.signedAt,
        rejectedAt: contract.rejectedAt,
        rejectedReason: contract.rejectedReason,
        createdAt: contract.createdAt,
        updatedAt: contract.updatedAt,
        client: contract.client,
        company: contract.company,
      }));
    } else if (userRole === "CLIENT") {
      // Клиент получает свои договоры
      contracts = await prisma.contract.findMany({
        where: {
          clientId: userId,
        },
        include: {
          company: {
            select: {
              id: true,
              name: true,
              inn: true,
              address: true,
              phone: true,
              email: true,
            },
          },
          owner: {
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

      // Форматируем ответ для клиента
      contracts = contracts.map((contract) => ({
        id: contract.id,
        number: contract.number,
        date: contract.date,
        sum: contract.sum,
        fileUrl: contract.fileUrl,
        requestStatus: contract.requestStatus,
        contractStatus: contract.contractStatus,
        reviewedAt: contract.reviewedAt,
        signedAt: contract.signedAt,
        rejectedAt: contract.rejectedAt,
        rejectedReason: contract.rejectedReason,
        createdAt: contract.createdAt,
        updatedAt: contract.updatedAt,
        company: contract.company,
        owner: contract.owner,
      }));
    }

    res.status(200).json(contracts);
  } catch (error) {
    console.error("Error in getMyContracts:", error);
    res.status(500).json({
      message: "Ошибка при получении договоров",
      error: error.message,
    });
  }
};

const getPendingRequests = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    if (userRole !== "COMPANY_OWNER") {
      return res.status(403).json({ message: "Доступ запрещён" });
    }

    // Получаем компанию пользователя
    const userWithCompany = await prisma.user.findUnique({
      where: { id: userId },
      include: { ownedCompany: true },
    });

    if (!userWithCompany?.ownedCompany) {
      return res.status(200).json({ pendingRequests: [] });
    }

    const pendingRequests = await prisma.contract.findMany({
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
        company: {
          select: {
            id: true,
            name: true,
            inn: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.status(200).json({
      pendingRequests,
      count: pendingRequests.length,
    });
  } catch (error) {
    console.error("Error in getPendingRequests:", error);
    res
      .status(500)
      .json({ message: "Ошибка при получении запросов", error: error.message });
  }
};

// Подтверждение договора владельцем компании
const approveContract = async (req, res) => {
  try {
    const { contractId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (userRole !== "COMPANY_OWNER") {
      return res.status(403).json({ message: "Доступ запрещён" });
    }

    // Получаем договор с данными
    const contract = await prisma.contract.findUnique({
      where: { id: contractId },
      include: {
        client: true,
        company: true,
      },
    });

    if (!contract) {
      return res.status(404).json({ message: "Договор не найден" });
    }

    // Проверяем, что договор принадлежит компании пользователя
    const userWithCompany = await prisma.user.findUnique({
      where: { id: userId },
      include: { ownedCompany: true },
    });

    if (contract.companyId !== userWithCompany?.ownedCompany?.id) {
      return res
        .status(403)
        .json({ message: "У вас нет прав на этот договор" });
    }

    if (contract.requestStatus !== "PENDING") {
      return res.status(400).json({ message: "Договор уже обработан" });
    }

    // Обновляем статус договора
    const updatedContract = await prisma.contract.update({
      where: { id: contractId },
      data: {
        requestStatus: "APPROVED",
        reviewedAt: new Date(),
        signedAt: new Date(),
      },
    });

    // Создаем уведомление для клиента
    await createNotification(
      contract.clientId,
      "Договор подтверждён",
      `Ваш договор №${contract.number} с компанией ${contract.company.name} был подтверждён.`,
      "CONTRACT_APPROVED",
      contractId,
    );

    // Создаем аудит лог
    await prisma.auditLog.create({
      data: {
        action: "APPROVE_CONTRACT",
        entityType: "Contract",
        entityId: contractId,
        userId: userId,
        newValue: { requestStatus: "APPROVED" },
      },
    });

    res.status(200).json({
      message: "Договор успешно подтверждён",
      contract: updatedContract,
    });
  } catch (error) {
    console.error("Error in approveContract:", error);
    res.status(500).json({
      message: "Ошибка при подтверждении договора",
      error: error.message,
    });
  }
};

// Отклонение договора владельцем компании
const rejectContract = async (req, res) => {
  try {
    const { contractId } = req.params;
    const { reason } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (userRole !== "COMPANY_OWNER") {
      return res.status(403).json({ message: "Доступ запрещён" });
    }

    if (!reason || reason.trim() === "") {
      return res
        .status(400)
        .json({ message: "Необходимо указать причину отклонения" });
    }

    // Получаем договор с данными
    const contract = await prisma.contract.findUnique({
      where: { id: contractId },
      include: {
        client: true,
        company: true,
      },
    });

    if (!contract) {
      return res.status(404).json({ message: "Договор не найден" });
    }

    // Проверяем, что договор принадлежит компании пользователя
    const userWithCompany = await prisma.user.findUnique({
      where: { id: userId },
      include: { ownedCompany: true },
    });

    if (contract.companyId !== userWithCompany?.ownedCompany?.id) {
      return res
        .status(403)
        .json({ message: "У вас нет прав на этот договор" });
    }

    if (contract.requestStatus !== "PENDING") {
      return res.status(400).json({ message: "Договор уже обработан" });
    }

    // Обновляем статус договора
    const updatedContract = await prisma.contract.update({
      where: { id: contractId },
      data: {
        requestStatus: "REJECTED",
        reviewedAt: new Date(),
        rejectedAt: new Date(),
        rejectedReason: reason,
      },
    });

    // Создаем уведомление для клиента
    await createNotification(
      contract.clientId,
      "Договор отклонён",
      `Ваш договор №${contract.number} с компанией ${contract.company.name} был отклонён. Причина: ${reason}`,
      "CONTRACT_REJECTED",
      contractId,
    );

    // Создаем аудит лог
    await prisma.auditLog.create({
      data: {
        action: "REJECT_CONTRACT",
        entityType: "Contract",
        entityId: contractId,
        userId: userId,
        newValue: { requestStatus: "REJECTED", rejectedReason: reason },
      },
    });

    res.status(200).json({
      message: "Договор отклонён",
      contract: updatedContract,
    });
  } catch (error) {
    console.error("Error in rejectContract:", error);
    res.status(500).json({
      message: "Ошибка при отклонении договора",
      error: error.message,
    });
  }
};

const createContractRequest = async (req, res) => {
  try {
    const { companyId, number, sum } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    console.log("req?.file", req?.file);

    if (userRole !== "CLIENT") {
      return res
        .status(403)
        .json({ message: "Только клиенты могут создавать запросы на договор" });
    }

    // Получаем компанию и её владельца
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: {
        owner: true,
      },
    });

    if (!company) {
      return res.status(404).json({ message: "Компания не найдена" });
    }

    // Проверяем, существует ли договор с таким номером
    const existingContract = await prisma.contract.findUnique({
      where: { number },
    });

    if (existingContract) {
      return res
        .status(400)
        .json({ message: "Договор с таким номером уже существует" });
    }

    uploadFile(req?.file?.path)
      .then(async ({ url }) => {
        const contract = await prisma.contract.create({
          data: {
            number,
            sum: parseFloat(sum),
            fileUrl: url,
            companyId,
            ownerId: company.owner.id,
            clientId: userId,
            requestStatus: "PENDING",
            contractStatus: "ACTIVE",
          },
        });

        await createNotification(
          company.owner.id,
          "Новый запрос на договор",
          `Клиент ${req.user.fullName} отправил запрос на заключение договора №${number}`,
          "CONTRACT_REQUEST_RECEIVED",
          contract.id,
        );

        await createNotification(
          userId,
          "Запрос отправлен",
          `Ваш запрос на договор №${number} отправлен на рассмотрение компании ${company.name}`,
          "CONTRACT_REQUEST_RECEIVED",
          contract.id,
        );

        await prisma.auditLog.create({
          data: {
            action: "CREATE_CONTRACT",
            entityType: "Contract",
            entityId: contract.id,
            userId: userId,
            newValue: { number, sum, companyId },
          },
        });

        res.status(201).json({
          message: "Запрос на договор успешно создан",
          contract,
        });
      })
      .catch((e) => {
        console.log(e);

        return res.status(500).json({ message: "Failed to upload file" });
      });
  } catch (error) {
    console.error("Error in createContractRequest:", error);
    res
      .status(500)
      .json({ message: "Ошибка при создании договора", error: error.message });
  }
};

module.exports = {
  create,
  edit,
  getContracts,
  getMyContracts,
  getPendingRequests,
  approveContract,
  rejectContract,
  createContractRequest,
};
