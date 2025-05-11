import express from "express";
import http from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from 'url';

dotenv.config();

// Cấu hình đường dẫn tĩnh
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  // Tăng cường độ ổn định và hiệu suất
  cors: {
    origin: "*",  // Cho phép tất cả các nguồn (trong môi trường production, hãy cấu hình cụ thể)
    methods: ["GET", "POST"]
  },
  transports: ['websocket', 'polling'], // Ưu tiên Websocket
  maxHttpBufferSize: 1e8,  // 100MB, tăng kích thước buffer nếu cần thiết
  pingTimeout: 60000,    // Tăng timeout để tránh ngắt kết nối không cần thiết
  pingInterval: 25000,
});

app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

// Kết nối MongoDB
mongoose
  .connect(process.env.MONGO_URI, {
    // Các tùy chọn để tối ưu hóa kết nối
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000, // Tăng timeout để kết nối ổn định hơn
    socketTimeoutMS: 30000,         // Tăng timeout cho socket
  })
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

// **NEW**: Schema cho User
const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  displayName: String,
});
const User = mongoose.model("User", userSchema);

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

// Định nghĩa một route để lấy tin nhắn theo ngày
app.get("/api/messages", async (req, res) => {
  const date = req.query.date;
  if (!date) {
    return res.status(400).json({ error: "Date is required" });
  }

  try {
    const messages = await Message.find({ date }).sort({ time: 1 }); // Sắp xếp theo thời gian
    res.json(messages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

// **NEW**: Route to get archived dates
app.get("/api/archivedDates", async (req, res) => {
  try {
    const archivedDates = await ArchivedDate.find().sort({ date: -1 }); // Sort by date descending
    res.json(archivedDates);
  } catch (error) {
    console.error("Error fetching archived dates:", error);
    res.status(500).json({ error: "Failed to fetch archived dates" });
  }
});

// **NEW**: Route to get archived messages for a specific date
app.get("/api/archivedMessages", async (req, res) => {
  const date = req.query.date;
  if (!date) {
    return res.status(400).json({ error: "Date is required" });
  }

  try {
    const ArchivedMessageModel = mongoose.model(`ChatHistory_${date}`, messageSchema);
    const messages = await ArchivedMessageModel.find().sort({ time: 1 });
    res.json(messages);
  } catch (error) {
    console.error("Error fetching archived messages:", error);
    res.status(500).json({ error: "Failed to fetch archived messages" });
  }
});

// **NEW**: Đăng ký người dùng
app.post("/api/register", async (req, res) => {
  const { username, password, displayName } = req.body;

  if (!username || !password || !displayName) {
    return res.status(400).json({ message: "Vui lòng điền đầy đủ thông tin." });
  }

  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: "Tên người dùng đã tồn tại." });
    }

    const newUser = new User({ username, password, displayName });
    await newUser.save();

    res.status(201).json({ message: "Người dùng đã được tạo thành công." });
  } catch (error) {
    console.error("Lỗi đăng ký:", error);
    res.status(500).json({ message: "Đăng ký không thành công." });
  }
});

// **NEW**: Đăng nhập người dùng
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "Vui lòng điền đầy đủ thông tin." });
  }

  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ message: "Tên người dùng không tồn tại." });
    }

    if (password !== user.password) {
      return res.status(401).json({ message: "Mật khẩu không đúng." });
    }

    // **IMPORTANT**:  In a real application, you should use a more secure method like JWT
    res.json({ message: "Đăng nhập thành công.", displayName: user.displayName });
  } catch (error) {
    console.error("Lỗi đăng nhập:", error);
    res.status(500).json({ message: "Đăng nhập không thành công." });
  }
});

io.on("connection", async (socket) => {
  console.log("A user connected");

  const today = new Date().toISOString().split("T")[0];
  try{
        // Lấy tin nhắn hôm nay
        const messages = await Message.find({ date: today }).sort({ time: 1 }).limit(100);
        socket.emit("loadMessages", messages);
  }catch(e){
        console.error("Error loading messages", e)
  }


  socket.on("chatMessage", async (data) => {
    console.log("Received chatMessage:", data);
    const newMsg = new Message({
      username: data.username,
      text: data.text,
      time: new Date().toLocaleTimeString(),
      date: today,
    });
    try{
        await newMsg.save();
        io.emit("chatMessage", newMsg);
    }catch(e){
        console.error("Error saving message",e);
    }

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

