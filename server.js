const express = require("express");
const path = require("path");
const fs = require("fs");
const cookieParser = require("cookie-parser");
const dotenv = require("dotenv");

const connectDB = require("./config/db");

const authRoutes = require("./routes/auth");
const profileRoutes = require("./routes/profile");
const messagesRoutes = require("./routes/messages");
const chatsRoutes = require("./routes/chats");

dotenv.config();

const app = express();

app.set("trust proxy", 1);

connectDB();

const avatarsDir = path.join(__dirname, "public", "uploads", "avatars");
const messagesDir = path.join(__dirname, "public", "uploads", "messages");

[avatarsDir, messagesDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(express.static(path.join(__dirname, "public")));

app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/messages", messagesRoutes);
app.use("/api/chats", chatsRoutes);


app.use((req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
});