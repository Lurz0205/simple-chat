import express from "express";
import http from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB error:", err));

const messageSchema = new mongoose.Schema({
  username: String,
  text: String,
  time: String,
});
const Message = mongoose.model("Message", messageSchema);

io.on("connection", async (socket) => {
  const messages = await Message.find().sort({ _id: 1 }).limit(100);
  socket.emit("loadMessages", messages);

  socket.on("chat message", async (data) => { // ✅ Lắng nghe sự kiện "chat message"
    const newMsg = new Message({
      username: data.username,
      text: data.text,
      time: new Date().toLocaleTimeString(),
    });
    await newMsg.save();
    io.emit("chat message", data); // ✅ Broadcast dữ liệu nhận được
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
