const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// MongoDB connection
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB error:", err));

// MongoDB Schemas
const userSchema = new mongoose.Schema({
  displayName: String,
  username: { type: String, unique: true },
  password: String,
});

const messageSchema = new mongoose.Schema({
  name: String,
  text: String,
  timestamp: { type: Date, default: Date.now },
});

const User = mongoose.model("User", userSchema);
const Message = mongoose.model("Message", messageSchema);

// API: Đăng ký
app.post("/api/register", async (req, res) => {
  const { displayName, username, password } = req.body;
  if (!displayName || !username || !password)
    return res.json({ success: false, message: "Thiếu thông tin" });

  const existingUser = await User.findOne({ username });
  if (existingUser)
    return res.json({ success: false, message: "Tên tài khoản đã tồn tại" });

  const hashed = await bcrypt.hash(password, 10);
  const user = new User({ displayName, username, password: hashed });
  await user.save();
  res.json({ success: true });
});

// API: Đăng nhập
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (!user)
    return res.json({ success: false, message: "Không tìm thấy người dùng" });

  const match = await bcrypt.compare(password, user.password);
  if (!match)
    return res.json({ success: false, message: "Sai mật khẩu" });

  res.json({ success: true, displayName: user.displayName });
});

// API: Lấy lịch sử tin nhắn
app.get("/api/messages", async (req, res) => {
  const messages = await Message.find({}).sort({ timestamp: 1 }).limit(100);
  res.json(messages);
});

// Socket.IO
io.on("connection", (socket) => {
  let displayName = "Ẩn danh";

  socket.on("join", (name) => {
    displayName = name || "Ẩn danh";
  });

  socket.on("chat message", async (msg) => {
    const newMsg = new Message({ name: displayName, text: msg });
    await newMsg.save();
    io.emit("chat message", { name: displayName, text: msg });
  });
});

// Server listen
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
