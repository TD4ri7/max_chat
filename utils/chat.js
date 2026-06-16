const mongoose = require("mongoose");

function makePrivateChatId(firstUserId, secondUserId) {
  const ids = [String(firstUserId), String(secondUserId)].sort();

  return `private_${ids[0]}_${ids[1]}`;
}

function parsePrivateChatId(chatId) {
  if (!chatId || !chatId.startsWith("private_")) {
    return null;
  }

  const clean = chatId.replace("private_", "");
  const parts = clean.split("_");

  if (parts.length !== 2) {
    return null;
  }

  const [firstUserId, secondUserId] = parts;

  if (
    !mongoose.Types.ObjectId.isValid(firstUserId) ||
    !mongoose.Types.ObjectId.isValid(secondUserId)
  ) {
    return null;
  }

  return {
    firstUserId,
    secondUserId,
  };
}

function canUserAccessChat(userId, chatId, chatType) {
  if (chatType === "global") {
    return chatId === "global";
  }

  if (chatType === "private") {
    const parsed = parsePrivateChatId(chatId);

    if (!parsed) {
      return false;
    }

    return (
      String(parsed.firstUserId) === String(userId) ||
      String(parsed.secondUserId) === String(userId)
    );
  }

  return false;
}

module.exports = {
  makePrivateChatId,
  parsePrivateChatId,
  canUserAccessChat,
};