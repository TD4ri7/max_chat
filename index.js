const express = require("express");
const path = require("path");
const fs = require("fs");
const cookieParser = require("cookie-parser");
const dotenv = require("dotenv");

const initializeDatabaseRegistry = require("./config/db");

const identityRouter = require("./routes/identity");
const accountRouter = require("./routes/profile");
const payloadRouter = require("./routes/messages");
const channelRouter = require("./routes/chats");
dotenv.config();

const app = express();

app.set("trust proxy", 1);

initializeDatabaseRegistry();

const userAssetsDir = path.join(__dirname, "static", "storage", "profiles");
const sharedMediaDir = path.join(__dirname, "static", "storage", "attachments");

[userAssetsDir, sharedMediaDir].forEach((directory) => {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
});

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(express.static(path.join(__dirname, "public")));

app.use("/api/v1/identity", identityRouter);
app.use("/api/v1/account", accountRouter);
app.use("/api/v1/payload", payloadRouter);
app.use("/api/v1/channel", channelRouter);

app.use((req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const APPLICATION_PORT = process.env.PORT || 5000;

app.listen(APPLICATION_PORT, () => {
  console.log(`[Core] Services deployed successfully on port: ${APPLICATION_PORT}`);
});