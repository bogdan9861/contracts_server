const { prisma } = require("../prisma/prisma.client");

const getCompanies = async (req, res) => {
  try {
    const companies = await prisma.company.findMany();

    res.status(200).json(companies);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  getCompanies,
};
