const socket = io();

const loginScreen = document.getElementById("login-screen");
const chatContainer = document.getElementById("chat-container");
const chatBox = document.getElementById("chat-box");
const sendBtn = document.getElementById("send-btn");
const messageInput = document.getElementById("message-input");
const joinBtn = document.getElementById("join-btn");
const usernameInput = document.getElementById("username");

let username = "";

joinBtn.addEventListener("click", () => {
  username = usernameInput.value.trim();
  if (username) {
    loginScreen.style.display = "none";
    chatContainer.style.display = "block";
    socket.emit("join", username);
  }
});

sendBtn.addEventListener("click", () => {
  const msg = messageInput.value.trim();
  if (msg !== "") {
    socket.emit("chat message", { username, msg });
    messageInput.value = "";
  }
});

socket.on("chat message", ({ username, msg }) => {
  const msgDiv = document.createElement("div");
  msgDiv.classList.add("message");
  msgDiv.textContent = `${username}: ${msg}`;
  chatBox.appendChild(msgDiv);
  chatBox.scrollTop = chatBox.scrollHeight;
});
