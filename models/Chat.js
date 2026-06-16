const mongoose = require("mongoose");

const chatSchema = new mongoose.Schema(
  {
    chatId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    type: {
      type: String,
      enum: ["private", "group"],
      required: true,
    },

    title: {
      type: String,
      trim: true,
      maxlength: 80,
      default: "",
    },

    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

chatSchema.path("participants").validate(function (value) {
  if (!Array.isArray(value)) {
    return false;
  }

  const uniqueIds = new Set(value.map((id) => String(id)));

  if (uniqueIds.size !== value.length) {
    return false;
  }

  if (this.type === "private") {
    return value.length === 2;
  }

  if (this.type === "group") {
    return value.length >= 2;
  }

  return false;
}, "Неверное количество участников чата");

chatSchema.index({ type: 1, participants: 1 });
chatSchema.index({ updatedAt: -1 });

module.exports = mongoose.model("Chat", chatSchema);