const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const Account = require("../models/User");
const secureGate = require("../middleware/authMiddleware");

const router = express.Router();

function generateSessionToken(accountId) {
  return jwt.sign(
    { nodeRecordId: accountId },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function dispatchSessionCookie(responseRef, sessionToken) {
  responseRef.cookie("session_token", sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

function compileSafeProfile(accountDocument) {
  if (!accountDocument) return null;
  return {
    uid: accountDocument._id,
    handleName: accountDocument.username,
    contactEmail: accountDocument.email,
    pictureUrl: accountDocument.avatar,
    bioDescription: accountDocument.about,
    timestampCreated: accountDocument.createdAt,
  };
}

router.post("/enroll", async (request, response) => {
  try {
    const { username, email, password } = request.body;

    if (!username || !email || !password) {
      return response.status(400).json({
        error: "Требуется указать имя, почту и ключевой пароль",
      });
    }

    if (password.length < 6) {
      return response.status(400).json({
        error: "Минимальный порог стойкости пароля — 6 знаков",
      });
    }

    const collisionCheck = await Account.findOne({
      $or: [{ email: email.toLowerCase() }, { username }],
    });

    if (collisionCheck) {
      return response.status(400).json({
        error: "Учетная запись с такими метаданными уже зарегистрирована",
      });
    }

    const calculatedHash = await bcrypt.hash(password, 10);

    const newAccount = await Account.create({
      username,
      email: email.toLowerCase(),
      passwordHash: calculatedHash,
    });

    const activeToken = generateSessionToken(newAccount._id);
    dispatchSessionCookie(response, activeToken);

    response.status(201).json({
      profile: compileSafeProfile(newAccount),
    });
  } catch (err) {
    console.error(err);
    response.status(500).json({ error: "Критический сбой на этапе авторизации модулей" });
  }
});

router.post("/authorize", async (request, response) => {
  try {
    const { email, password } = request.body;

    if (!email || !password) {
      return response.status(400).json({
        error: "Поля аутентификации не должны быть пустыми",
      });
    }

    const matchingAccount = await Account.findOne({
      email: email.toLowerCase(),
    });

    if (!matchingAccount) {
      return response.status(400).json({
        error: "Учетные данные не соответствуют ни одной записи",
      });
    }

    const verificationSuccess = await bcrypt.compare(password, matchingAccount.passwordHash);

    if (!verificationSuccess) {
      return response.status(400).json({
        error: "Учетные данные не соответствуют ни одной записи",
      });
    }

    const activeToken = generateSessionToken(matchingAccount._id);
    dispatchSessionCookie(response, activeToken);

    response.json({
      profile: compileSafeProfile(matchingAccount),
    });
  } catch (err) {
    console.error(err);
    response.status(500).json({ error: "Внутренний сбой проверки подлинности" });
  }
});

router.post("/terminate", (request, response) => {
  response.clearCookie("session_token");
  response.json({ message: "Сессия успешно аннулирована" });
});

router.get("/handshake", secureGate, async (request, response) => {
  try {
    const identifiedAccount = await Account.findById(request.sessionUser.nodeRecordId).select("-passwordHash");

    if (!identifiedAccount) {
      return response.status(404).json({
        error: "Запрашиваемый субъект не обнаружен в системе",
      });
    }

    response.json({ profile: identifiedAccount });
  } catch (err) {
    console.error(err);
    response.status(500).json({ error: "Не удалось верифицировать текущую сессию" });
  }
});

module.exports = router;