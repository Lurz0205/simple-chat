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
const Message = mongoose.model("Message", messageSchema);  // Keep this declaration

// **NEW: User Schema & Model** // I'm keeping this here, assuming you need it for user authentication
const userSchema = new mongoose.Schema({
    username: String,
    password: String,
    displayName: String,
});
const User = mongoose.model("User", userSchema);


// **NEW: Register Route** //  and these routes
app.post('/api/register', async (req, res) => {
    const { username, password, displayName } = req.body;

     if (!username || !password || !displayName) {
        return res.status(400).json({ message: "Missing fields" });
    }

    try {
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ message: "Username already exists" });
        }

        const newUser = new User({ username, password, displayName });
        await newUser.save();

        res.status(201).json({ message: "User created successfully" });

    } catch (error) {
        console.error("Registration error:", error);
        res.status(500).json({ message: "Registration failed" });
    }
});

// **NEW: Login Route**
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

     if (!username || !password) {
        return res.status(400).json({ message: "Missing fields" });
    }

    try {
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        if (password !== user.password) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        res.json({ message: "Login successful", displayName: user.displayName });

    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ message: "Login failed" });
    }
});


// Gửi lịch sử khi người dùng kết nối
io.on("connection", async (socket) => {
  const messages = await Message.find().sort({ _id: 1 }).limit(100);
  socket.emit("loadMessages", messages);

  socket.on("chatMessage", async (data) => {
    const newMsg = new Message({  // Corrected:  Make sure Message is constructed correctly.
        username: data.username,
        text: data.text,
        time: new Date().toLocaleTimeString()
    });
    await newMsg.save();
    io.emit("chatMessage", data);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
