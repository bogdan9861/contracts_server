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

module.exports = {
  createClient,
  getMyClients,
  editClient,
  deleteClient,
};
