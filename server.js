import express from "express";
import http from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

// Cấu hình đường dẫn tĩnh (vì __dirname không có trong ES Modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

// MongoDB kết nối
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB error:", err));

// Lưu tin nhắn
const messageSchema = new mongoose.Schema({
  username: String,
  text: String,
  time: String,
});
const Message = mongoose.model("Message", messageSchema);

// Gửi lịch sử khi người dùng kết nối
io.on("connection", async (socket) => {
  const messages = await Message.find().sort({ _id: 1 }).limit(100);
  socket.emit("loadMessages", messages);

  socket.on("chatMessage", async (data) => {
    const newMsg = new Message(data);
    await newMsg.save();
    io.emit("chatMessage", data);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
