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
const logoutButton = document.getElementById("logout-btn");

function appendMessage(msg) {
  const div = document.createElement("div");
  div.classList.add("message");
  div.innerText = `${msg.username}: ${msg.text}`; // ✅ Sửa lại để sử dụng msg.username
  messagesBox.appendChild(div);
  messagesBox.scrollTop = messagesBox.scrollHeight;
}

sendButton.onclick = () => {
  const msg = input.value;
  if (msg.trim()) {
    socket.emit("chat message", {  // ✅ Gửi một object chứa username và text
      username: displayName,
      text: msg,
    });
    input.value = "";
  }
};

socket.on("chat message", (data) => {  // ✅ Lắng nghe sự kiện "chat message"
  appendMessage(data);
});

// 🆕 Tải lịch sử tin nhắn
fetch("/api/messages")
  .then(res => res.json())
  .then(data => data.forEach(appendMessage));

// Xử lý đăng xuất
logoutButton.onclick = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("displayName");
  window.location.href = "/auth.html";
};
