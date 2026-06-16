const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
 
const Message = require("../models/Message");
const Chat = require("../models/Chat");
const authMiddleware = require("../middleware/authMiddleware");
 
const router = express.Router();
 
const allowedImageTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
 
const upload = multer({
  storage: multer.memoryStorage(),
 
  fileFilter(req, file, cb) {
    if (!allowedImageTypes.includes(file.mimetype)) {
      return cb(
        new Error("Можно загружать только изображения JPG, PNG, WEBP или GIF")
      );
    }
 
    cb(null, true);
  },
 
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});
 
const uploadMessageImage = upload.single("image");
 
function getUploadErrorMessage(error) {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return "Фото не должно быть больше 5 МБ";
    }
 
    if (error.code === "LIMIT_UNEXPECTED_FILE") {
      return "Неверное поле файла. Используйте поле image";
    }
 
    return error.message || "Ошибка загрузки фото";
  }
 
  return error.message || "Ошибка загрузки фото";
}
 
function normalizeImageBuffer(imageData) {
  if (!imageData) {
    return null;
  }
 
  if (Buffer.isBuffer(imageData)) {
    return imageData;
  }
 
  if (imageData.buffer && Buffer.isBuffer(imageData.buffer)) {
    return imageData.buffer;
  }
 
  if (imageData instanceof Uint8Array) {
    return Buffer.from(imageData);
  }
 
  if (Array.isArray(imageData.data)) {
    return Buffer.from(imageData.data);
  }
 
  return null;
}
 
async function getChatAccess(userId, chatId) {
  if (chatId === "global") {
    return {
      ok: true,
      chatType: "global",
      chat: null,
    };
  }
 
  const chat = await Chat.findOne({
    chatId,
    participants: userId,
  });
 
  if (!chat) {
    return {
      ok: false,
      chatType: null,
      chat: null,
    };
  }
 
  return {
    ok: true,
    chatType: chat.type,
    chat,
  };
}
 
router.get("/image/:messageId", authMiddleware, async (req, res) => {
  try {
    const { messageId } = req.params;
 
    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      return res.status(400).json({
        message: "Неверный id сообщения",
      });
    }
 
    const message = await Message.findById(messageId).select(
      "+imageData chatId chatType imageName imageMimeType imageSize"
    );
 
    if (!message) {
      return res.status(404).json({
        message: "Сообщение не найдено",
      });
    }
 
    const access = await getChatAccess(req.user.id, message.chatId);
 
    if (!access.ok) {
      return res.status(403).json({
        message: "Нет доступа к этому фото",
      });
    }
 
    const imageBuffer = normalizeImageBuffer(message.imageData);
 
    if (!imageBuffer || !message.imageMimeType) {
      return res.status(404).json({
        message: "Фото не найдено",
      });
    }
 
    res.setHeader("Content-Type", message.imageMimeType);
    res.setHeader("Content-Length", String(imageBuffer.length));
    res.setHeader("Cache-Control", "private, max-age=86400");
 
    return res.end(imageBuffer);
  } catch (error) {
    console.error("LOAD_MESSAGE_IMAGE_ERROR:", error);
 
    return res.status(500).json({
      message: error.message || "Ошибка загрузки фото",
    });
  }
});
 
router.get("/:chatId", authMiddleware, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { after, since } = req.query;
 
    const access = await getChatAccess(req.user.id, chatId);
 
    if (!access.ok) {
      return res.status(403).json({
        message: "Нет доступа к этому чату",
      });
    }
 
    const query = {
      chatId,
    };
 
    let sort = {
      _id: -1,
    };
 
    let limit = Number(req.query.limit) || 50;
 
    if (limit > 100) {
      limit = 100;
    }
 
    if (after) {
      if (!mongoose.Types.ObjectId.isValid(after)) {
        return res.status(400).json({
          message: "Неверный after id",
        });
      }
 
      query._id = {
        $gt: new mongoose.Types.ObjectId(after),
      };
 
      sort = {
        _id: 1,
      };
    } else if (since) {
      const sinceDate = new Date(since);
 
      if (Number.isNaN(sinceDate.getTime())) {
        return res.status(400).json({
          message: "Неверная дата since",
        });
      }
 
      query.createdAt = {
        $gt: sinceDate,
      };
 
      sort = {
        createdAt: 1,
      };
    }
 
    let messages = await Message.find(query)
      .sort(sort)
      .limit(limit)
      .populate("sender", "username avatar about")
      .lean();
 
    if (!after && !since) {
      messages = messages.reverse();
    }
 
    res.json({
      messages,
      lastMessageId:
        messages.length > 0 ? messages[messages.length - 1]._id : after || null,
      serverTime: new Date().toISOString(),
    });
  } catch (error) {
    console.error("LOAD_MESSAGES_ERROR:", error);
 
    res.status(500).json({
      message: error.message || "Ошибка загрузки сообщений",
    });
  }
});
 
router.post("/", authMiddleware, (req, res) => {
  uploadMessageImage(req, res, async (uploadError) => {
    if (uploadError) {
      return res.status(400).json({
        message: getUploadErrorMessage(uploadError),
      });
    }
 
    try {
      const chatId = typeof req.body.chatId === "string" ? req.body.chatId : "";
      const chatType =
        typeof req.body.chatType === "string" ? req.body.chatType : "";
      const text = typeof req.body.text === "string" ? req.body.text.trim() : "";
 
      const hasImage = Boolean(req.file);
 
      if (!chatId || !chatType || (!text && !hasImage)) {
        return res.status(400).json({
          message: "Введите сообщение или прикрепите фото",
        });
      }
 
      const access = await getChatAccess(req.user.id, chatId);
 
      if (!access.ok) {
        return res.status(403).json({
          message:
            "Нет доступа к этому чату. Для личного чата сначала откройте профиль пользователя и нажмите кнопку личного сообщения.",
        });
      }
 
      if (chatType !== access.chatType) {
        return res.status(400).json({
          message: "Неверный тип чата",
        });
      }
 
      if (text.length > 2000) {
        return res.status(400).json({
          message: "Сообщение слишком длинное",
        });
      }
 
      const message = new Message({
        chatId,
        chatType: access.chatType,
        sender: req.user.id,
        text,
        imageUrl: "",
        imageName: "",
        imageMimeType: "",
        imageSize: 0,
      });
 
      if (req.file) {
        message.imageUrl = `/api/messages/image/${message._id}`;
        message.imageName = req.file.originalname || "";
        message.imageMimeType = req.file.mimetype || "";
        message.imageSize = req.file.size || 0;
        message.imageData = req.file.buffer;
      }
 
      await message.save();
 
      if (access.chat) {
        await Chat.findByIdAndUpdate(access.chat._id, {
          lastMessage: message._id,
        });
      }
 
      const fullMessage = await Message.findById(message._id)
        .populate("sender", "username avatar about")
        .lean();
 
      res.status(201).json({
        message: fullMessage,
      });
    } catch (error) {
      console.error("SEND_MESSAGE_ERROR:", error);
 
      if (error.name === "ValidationError") {
        return res.status(400).json({
          message: error.message || "Ошибка проверки сообщения",
        });
      }
 
      res.status(500).json({
        message: error.message || "Ошибка отправки сообщения",
      });
    }
  });
});
 
module.exports = router;