// server.js
import express from "express";
import http from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

// Cấu hình đường dẫn tĩnh
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

// Kết nối MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB error:", err));

// Schema cho tin nhắn
const messageSchema = new mongoose.Schema({
  username: String,
  text: String,
  time: String,
  date: String, // Thêm trường ngày
});
const Message = mongoose.model("Message", messageSchema);

// **NEW**: Schema cho ngày đã lưu trữ
const archivedDateSchema = new mongoose.Schema({
  date: String,
});
const ArchivedDate = mongoose.model("ArchivedDate", archivedDateSchema);

// **NEW**: Hàm để lưu trữ tin nhắn theo ngày
async function archiveMessages(date) {
  try {
    // Kiểm tra xem ngày đã được lưu trữ chưa
    const alreadyArchived = await ArchivedDate.findOne({ date });
    if (alreadyArchived) {
      console.log(`Messages for ${date} already archived.`);
      return; // Không làm gì nếu đã lưu trữ
    }

    // Lấy tất cả tin nhắn trong ngày
    const messagesToArchive = await Message.find({ date });

    if (messagesToArchive.length > 0) {
      // Tạo model mới cho ngày đã lưu trữ (ví dụ: ChatHistory_20240728)
      const ArchivedMessageModel = mongoose.model(`ChatHistory_${date}`, messageSchema);

      // Chuyển tin nhắn sang model mới
      await ArchivedMessageModel.insertMany(messagesToArchive);

      // Xóa tin nhắn gốc
      await Message.deleteMany({ date });

      // Lưu ngày đã lưu trữ
      const newArchivedDate = new ArchivedDate({ date });
      await newArchivedDate.save();

      console.log(`Archived ${messagesToArchive.length} messages for ${date}.`);
    } else {
      console.log(`No messages to archive for ${date}.`);
    }
  } catch (error) {
    console.error("Error archiving messages:", error);
  }
}

io.on("connection", async (socket) => {
  console.log("A user connected");

  const today = new Date().toISOString().split("T")[0];

  // Lấy tin nhắn hôm nay
  const messages = await Message.find({ date: today }).sort({ _id: 1 }).limit(100);
  socket.emit("loadMessages", messages);

  socket.on("chatMessage", async (data) => {
    console.log("Received chatMessage:", data); // Debug
    const newMsg = new Message({
      username: data.username,
      text: data.text,
      time: new Date().toLocaleTimeString(),
      date: today, // Lưu ngày vào tin nhắn
    });
    await newMsg.save();
    io.emit("chatMessage", newMsg); // Phát lại toàn bộ đối tượng newMsg
  });

  socket.on("disconnect", () => {
    console.log("A user disconnected");
  });
});

// **NEW**: Hàm chạy mỗi ngày để lưu trữ tin nhắn
function runDailyArchive() {
  const today = new Date().toISOString().split("T")[0];
  archiveMessages(today);
  // Tính thời gian đến nửa đêm
  const now = new Date();
  const midnight = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    0,
    0,
    0
  );
  const diff = midnight.getTime() - now.getTime();
  setTimeout(runDailyArchive, diff); // Đặt hẹn giờ để chạy lại vào nửa đêm
}

// Chạy hàm lưu trữ hàng ngày
runDailyArchive();

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
