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
const archivedMessagesContainer = document.getElementById("archived-messages-container"); // Get the new container

function appendMessage(msg) {
    const div = document.createElement("div");
    div.classList.add("message");
    div.innerText = `${msg.username}: ${msg.text} (${msg.time})`; // Display time
    messagesBox.appendChild(div);
    messagesBox.scrollTop = messagesBox.scrollHeight;
}

sendButton.onclick = () => {
    const msg = input.value;
    if (msg.trim()) {
        socket.emit("chatMessage", { username: displayName, text: msg });
        input.value = "";
    }
};

socket.on("chatMessage", (data) => {
    appendMessage(data);
});

// Load today's messages
fetch(`/api/messages?date=${new Date().toISOString().split("T")[0]}`)
    .then(res => res.json())
    .then(data => {
        data.forEach(appendMessage);
    });

// **NEW**: Function to fetch and display archived messages
async function displayArchivedMessages() {
    try {
        const archivedDates = await (await fetch("/api/archivedDates")).json();
        archivedMessagesContainer.innerHTML = ""; // Clear the container

        for (const archivedDate of archivedDates) {
            const date = archivedDate.date;
            const archivedMessages = await (await fetch(`/api/archivedMessages?date=${date}`)).json();

            if (archivedMessages.length > 0) {
                const dateHeader = document.createElement("h3");
                dateHeader.innerText = `Archived Messages for ${date}`;
                archivedMessagesContainer.appendChild(dateHeader);

                const archivedList = document.createElement("ul");
                archivedMessages.forEach(msg => {
                    const li = document.createElement("li");
                    li.innerText = `${msg.username}: ${msg.text} (${msg.time})`;
                    archivedList.appendChild(li);
                });
                archivedMessagesContainer.appendChild(archivedList);
            }
        }
    } catch (error) {
        console.error("Error fetching archived messages:", error);
    }
}

// **NEW**: Fetch archived messages when the page loads
displayArchivedMessages();

// Xử lý đăng xuất
logoutButton.onclick = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("displayName");
    window.location.href = "/auth.html";
};
