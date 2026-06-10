const { prisma } = require("../prisma/prisma.client");

const getCompanies = async (req, res) => {
  try {
    const companies = await prisma.company.findMany({
      include: {
        owner: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    res.status(200).json(companies);
  } catch (error) {
    console.error("Error in getCompanies:", error);
    res
      .status(500)
      .json({ message: "Ошибка при получении компаний", error: error.message });
  }
};

// Получение компании по ID
const getCompanyById = async (req, res) => {
  try {
    const { id } = req.params;
    const company = await prisma.company.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    if (!company) {
      return res.status(404).json({ message: "Компания не найдена" });
    }

    res.status(200).json(company);
  } catch (error) {
    console.error("Error in getCompanyById:", error);
    res
      .status(500)
      .json({ message: "Ошибка при получении компании", error: error.message });
  }
};

module.exports = {
  getCompanies,
  getCompanyById,
};
