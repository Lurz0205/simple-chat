const authForm = document.getElementById("authForm");
const displayNameInput = document.getElementById("displayName");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const errorMsg = document.getElementById("errorMsg");
const toggleLink = document.getElementById("toggleMode");
const formTitle = document.getElementById("formTitle");
const submitBtn = document.getElementById("submitBtn");

let isLoginMode = true;

toggleLink.addEventListener("click", (e) => {
  e.preventDefault();
  isLoginMode = !isLoginMode;
  formTitle.textContent = isLoginMode ? "Login" : "Register";
  submitBtn.textContent = isLoginMode ? "Login" : "Register";
  toggleLink.textContent = isLoginMode
    ? "Don't have an account? Register"
    : "Already have an account? Login";
  displayNameInput.style.display = isLoginMode ? "none" : "block";
  errorMsg.textContent = "";
});

authForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();
  const displayName = displayNameInput.value.trim();

  if (!username || !password || (!isLoginMode && !displayName)) {
    errorMsg.textContent = "Please fill in all required fields.";
    return;
  }

  const endpoint = isLoginMode ? "/api/login" : "/api/register";
  const body = {
    username,
    password,
    ...(isLoginMode ? {} : { displayName }),
  };

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const result = await res.json();

    if (!res.ok) {
      errorMsg.textContent = result.message || "Something went wrong.";
    } else {
      // Lưu thông tin người dùng và chuyển hướng
      localStorage.setItem("displayName", result.displayName);
      window.location.href = "/index.html"; // Chuyển hướng đến trang chat
    }
  } catch (error) {
    errorMsg.textContent = "Network error. Please try again.";
  }
});

