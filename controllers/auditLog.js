const { prisma } = require("../prisma/prisma.client");

const getAudit = async (req, res) => {
  try {
    const logs = await prisma.auditLog.findMany({
      where: {
        userId: req.user.id,
      },
    });

    res.status(200).json(logs);
  } catch (error) {
    res.status(500).json({ message: "Token error" });
  }
};

module.exports = {
  getAudit,
};
