const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);
const path = require("path");

app.use(express.static(path.join(__dirname, "public")));

io.on("connection", (socket) => {
  socket.on("join", (username) => {
    console.log(`${username} joined the chat`);
  });

  socket.on("chat message", ({ username, msg }) => {
    io.emit("chat message", { username, msg }); // Broadcast to all users
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
