const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/User");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

function createToken(userId) {
  return jwt.sign(
    {
      id: userId,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d",
    }
  );
}

function setAuthCookie(res, token) {
  res.cookie("token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

function publicUser(user) {
  return {
    _id: user._id,
    username: user.username,
    email: user.email,
    avatar: user.avatar,
    about: user.about,
    createdAt: user.createdAt,
  };
}

router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        message: "Введите имя, email и пароль",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "Пароль должен быть минимум 6 символов",
      });
    }

    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username }],
    });

    if (existingUser) {
      return res.status(400).json({
        message: "Такой пользователь уже существует",
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      username,
      email: email.toLowerCase(),
      passwordHash,
    });

    const token = createToken(user._id);

    setAuthCookie(res, token);

    res.status(201).json({
      user: publicUser(user),
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Ошибка регистрации",
    });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Введите email и пароль",
      });
    }

    const user = await User.findOne({
      email: email.toLowerCase(),
    });

    if (!user) {
      return res.status(400).json({
        message: "Неверный email или пароль",
      });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordCorrect) {
      return res.status(400).json({
        message: "Неверный email или пароль",
      });
    }

    const token = createToken(user._id);

    setAuthCookie(res, token);

    res.json({
      user: publicUser(user),
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Ошибка авторизации",
    });
  }
});

router.post("/logout", (req, res) => {
  res.clearCookie("token");

  res.json({
    message: "Вы вышли из аккаунта",
  });
});

router.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-passwordHash");

    if (!user) {
      return res.status(404).json({
        message: "Пользователь не найден",
      });
    }

    res.json({
      user,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Ошибка получения пользователя",
    });
  }
});

module.exports = router;