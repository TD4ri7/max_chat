const mongoose = require("mongoose");
 
const messageSchema = new mongoose.Schema(
  {
    chatId: {
      type: String,
      required: true,
      index: true,
    },
 
    chatType: {
      type: String,
      enum: ["global", "private", "group"],
      required: true,
    },
 
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
 
    text: {
      type: String,
      default: "",
      trim: true,
      maxlength: 2000,
    },
 
    imageUrl: {
      type: String,
      default: "",
      trim: true,
    },
 
    imageName: {
      type: String,
      default: "",
      trim: true,
    },
 
    imageMimeType: {
      type: String,
      default: "",
      trim: true,
    },
 
    imageSize: {
      type: Number,
      default: 0,
    },
 
    imageData: {
      type: Buffer,
      select: false,
    },
  },
  {
    timestamps: true,
  }
);
 
messageSchema.pre("validate", function () {
  const trimmedText = String(this.text || "").trim();
  const trimmedImageUrl = String(this.imageUrl || "").trim();
  const hasImageData = Boolean(this.imageData && this.imageData.length > 0);
 
  this.text = trimmedText;
  this.imageUrl = trimmedImageUrl;
 
  if (!trimmedText && !trimmedImageUrl && !hasImageData) {
    this.invalidate("text", "Введите сообщение или прикрепите фото");
  }
});
 
messageSchema.index({ chatId: 1, _id: 1 });
messageSchema.index({ chatId: 1, createdAt: 1 });
 
module.exports = mongoose.model("Message", messageSchema);
 