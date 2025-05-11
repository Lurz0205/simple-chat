const socket = io();
const displayName = localStorage.getItem("displayName");
if (!displayName) {
  window.location.href = "/auth.html";
} else {
  // Nếu đã đăng nhập, hiển thị giao diện chat (nếu cần)
  document.getElementById("login-screen").style.display = "none";
  document.getElementById("chat-container").style.display = "block";
  socket.emit("join", displayName);
}

const messagesBox = document.getElementById("chat-box");
const input = document.getElementById("message-input");
const sendButton = document.getElementById("send-btn");
const logoutButton = document.getElementById("logout-btn"); // Lấy tham chiếu đến nút đăng xuất

function appendMessage(msg) {
  const div = document.createElement("div");
  div.classList.add("message");
  div.innerText = `${msg.name}: ${msg.text}`;
  messagesBox.appendChild(div);
  messagesBox.scrollTop = messagesBox.scrollHeight;
}

sendButton.onclick = () => {
  const msg = input.value;
  if (msg.trim()) {
    socket.emit("chat message", msg);
    input.value = "";
  }
};

socket.on("chat message", appendMessage);

// 🆕 Tải lịch sử tin nhắn
fetch("/api/messages")
  .then(res => res.json())
  .then(data => data.forEach(appendMessage));

// Xử lý đăng xuất
logoutButton.onclick = () => {
  localStorage.removeItem("token");       // Xóa token (nếu có)
  localStorage.removeItem("displayName"); // Xóa displayName
  window.location.href = "/auth.html";    // Chuyển hướng về trang đăng nhập/đăng ký
};
