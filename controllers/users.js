const uploadFile = require("../utlls/uploadFile");
const { prisma } = require("../prisma/prisma.client");

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const register = async (req, res) => {
  try {
    const {
      email,
      password,
      fullName,
      companyName,
      role,
      companyAddress,
      companyPhone,
      companyEmail,
      companyInn,
    } = req.body;

    if (!email || !password || !fullName) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const isExist = await prisma.user.findFirst({
      where: {
        email,
      },
    });

    if (isExist) {
      return res.status(409).json({
        message: "User already exist",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    if (role === "COMPANY_OWNER") {
      if (
        !companyAddress ||
        !companyEmail ||
        !companyInn ||
        !companyName ||
        !companyPhone
      ) {
        return res
          .status(400)
          .json({ message: "Заполните все поля создания компании" });
      }

      prisma.$transaction(
        async (params) => {
          const isCompanyExist = await prisma.company.findFirst({
            where: {
              name: companyName,
            },
          });

          if (isCompanyExist) {
            return res
              .status(400)
              .json({ message: "Компания с таким названием уже существует" });
          }

          try {
            const user = await prisma.user.create({
              data: {
                fullName,
                email,
                password: hashedPassword,
                role,
              },
              include: {
                ownedCompany: true,
              },
            });

            const company = await prisma.company.create({
              data: {
                name: companyName,
                address: companyAddress,
                email: companyEmail,
                inn: companyInn,
                ownerId: user.id,
              },
            });

            await prisma.user.update({
              where: {
                id: user.id,
              },
              data: {
                ownedCompanyId: company.id,
              },
            });

            const token = jwt.sign({ id: user.id }, process.env.SECRET, {
              expiresIn: "30d",
            });

            res.status(201).json({
              ...user,
              token,
            });
          } catch (error) {
            console.log(e);

            return res
              .status(500)
              .json({ message: "Не удалось создать пользователя с компанией" });
          }
        },
        { timeout: 10000 },
      );
    } else {
      const user = await prisma.user.create({
        data: {
          fullName,
          email,
          password: hashedPassword,
          role,
        },
      });

      const token = jwt.sign({ id: user.id }, process.env.SECRET, {
        expiresIn: "30d",
      });

      res.status(201).json({
        ...user,
        token,
      });
    }
  } catch (error) {
    console.log(error);

    res.status(500).json({ message: "Unknown server error" });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log(email, password);

    if (!email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const user = await prisma.user.findFirst({
      where: {
        email,
      },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);

    const token = jwt.sign({ id: user.id }, process.env.SECRET, {
      expiresIn: "30d",
    });

    if (user && isPasswordCorrect) {
      res.status(200).json({ ...user, token });
    } else {
      res.status(400).json({ message: "Incorrect login data" });
    }
  } catch (error) {
    console.log(error);

    res.status(500).json({ message: "Unknown server error" });
  }
};

const current = async (req, res) => {
  try {
    res.status(200).json(req.user);
  } catch (error) {
    res.status(500).json({ message: "Unknown server error" });
  }
};

const edit = async (req, res) => {
  try {
    const { fullName, companyName, email } = req.body;

    const user = await prisma.user.update({
      where: {
        id: req.user.id,
      },
      data: {
        fullName: fullName || req.user.fullName,
        ownedCompany: {
          connect: {
            name: companyName,
          },
        },
        email: email || req.user.email,
      },
      include: {
        contractsAsClient: true,
        contractsAsOwner: true,
        ownedCompany: true,
      },
    });

    res.status(200).json(user);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Unknown server error" });
  }
};

const removeUser = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.user.delete({
      where: {
        id,
      },
    });

    res.status(200).json({ message: "success" });
  } catch (error) {
    console.log(error);

    res.status(500).json({ message: "Unknown server error" });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany();

    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: "Unknown server error" });
  }
};

module.exports = {
  register,
  login,
  current,
  edit,
  getAllUsers,
  removeUser,
};
