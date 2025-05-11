const socket = io();
const displayName = localStorage.getItem("displayName");
if (!displayName) {
  window.location.href = "/auth.html";
} else {
  document.getElementById("login-screen").style.display = "none";
  document.getElementById("chat-container").style.display = "block";
  socket.emit("join", displayName);
}

const messagesBox = document.getElementById("chat-box");
const input = document.getElementById("message-input");
const sendButton = document.getElementById("send-btn");
const logoutButton = document.getElementById("logout-btn");

function appendMessage(msg) {
  const div = document.createElement("div");
  div.classList.add("message");
  div.innerText = `${msg.username}: ${msg.text}`;
  messagesBox.appendChild(div);
  messagesBox.scrollTop = messagesBox.scrollHeight;
  console.log("appendMessage:", msg); // ✅ DEBUG: Kiểm tra dữ liệu trong hàm appendMessage
}

sendButton.onclick = () => {
  const msg = input.value;
  if (msg.trim()) {
    const messageData = { username: displayName, text: msg };
    socket.emit("chatMessage", messageData);
    console.log("Emitting chatMessage:", messageData); // ✅ DEBUG: Kiểm tra dữ liệu gửi đi
    input.value = "";
  }
};

socket.on("chatMessage", (data) => {
  console.log("Received chatMessage:", data);
  appendMessage(data);
});

// 🆕 Tải lịch sử tin nhắn
fetch("/api/messages")
  .then(res => res.json())
  .then(data => {
    console.log("Received initial messages:", data); // ✅ DEBUG: Kiểm tra dữ liệu nhận được
    data.forEach(appendMessage);
  });

// Xử lý đăng xuất
logoutButton.onclick = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("displayName");
  window.location.href = "/auth.html";
};
