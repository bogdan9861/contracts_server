const { prisma } = require("../prisma/prisma.client");
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

module.exports = {
  create,
  edit,
  getContracts,
};
