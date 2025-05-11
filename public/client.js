const socket = io();
const displayName = localStorage.getItem("displayName");
if (!displayName) {
  window.location.href = "login.html";
}

socket.emit("join", displayName);

const messagesBox = document.getElementById("messages");
const input = document.getElementById("message");
const button = document.getElementById("send");

function appendMessage(msg) {
  const div = document.createElement("div");
  div.classList.add("message");
  div.innerText = `${msg.name}: ${msg.text}`;
  messagesBox.appendChild(div);
  messagesBox.scrollTop = messagesBox.scrollHeight;
}

button.onclick = () => {
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
