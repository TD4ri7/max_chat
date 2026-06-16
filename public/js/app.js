let currentUser = null;
let currentProfileUser = null;
 
let currentChat = {
  id: "global",
  type: "global",
  title: "Global Chat",
  subtitle: "Общий чат для всех пользователей",
};
 
let lastMessageId = null;
let emptyChatSince = null;
 
let messagePollingInterval = null;
let dialogsPollingInterval = null;
 
let isLoadingMessages = false;
let selectedMessageImageUrl = null;
 
const renderedMessages = new Set();
const selectedGroupUsers = new Map();
 
const authScreen = document.getElementById("authScreen");
const appScreen = document.getElementById("appScreen");
 
const loginTab = document.getElementById("loginTab");
const registerTab = document.getElementById("registerTab");
 
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
 
const authError = document.getElementById("authError");
 
const profileUsername = document.getElementById("profileUsername");
const profileAbout = document.getElementById("profileAbout");
const avatarInput = document.getElementById("avatarInput");
const saveProfileBtn = document.getElementById("saveProfileBtn");
 
const globalChatBtn = document.getElementById("globalChatBtn");
const createGroupBtn = document.getElementById("createGroupBtn");
const dialogsList = document.getElementById("dialogsList");
const searchUsersInput = document.getElementById("searchUsersInput");
 
const chatHeaderInfoBtn = document.getElementById("chatHeaderInfoBtn");
const chatHeaderAvatar = document.getElementById("chatHeaderAvatar");
const chatTitle = document.getElementById("chatTitle");
const chatSubtitle = document.getElementById("chatSubtitle");
const chatStatus = document.getElementById("chatStatus");
 
const messagesBox = document.getElementById("messagesBox");
 
const messageForm = document.getElementById("messageForm");
const messageInput = document.getElementById("messageInput");
const messageImageInput = document.getElementById("messageImageInput");
const messageImagePreview = document.getElementById("messageImagePreview");
const messageImagePreviewImg = document.getElementById("messageImagePreviewImg");
const clearMessageImageBtn = document.getElementById("clearMessageImageBtn");
const emojiPickerBtn = document.getElementById("emojiPickerBtn");
const emojiPicker = document.getElementById("emojiPicker");
 
const logoutBtn = document.getElementById("logoutBtn");
 
const userProfileModal = document.getElementById("userProfileModal");
const profileModalBackdrop = document.getElementById("profileModalBackdrop");
const closeProfileModalBtn = document.getElementById("closeProfileModalBtn");
const profileModalAvatar = document.getElementById("profileModalAvatar");
const profileModalName = document.getElementById("profileModalName");
const profileModalLabel = document.getElementById("profileModalLabel");
const profileModalAbout = document.getElementById("profileModalAbout");
const privateMessageBtn = document.getElementById("privateMessageBtn");
const ownProfileNote = document.getElementById("ownProfileNote");
 
const groupCreateModal = document.getElementById("groupCreateModal");
const groupCreateBackdrop = document.getElementById("groupCreateBackdrop");
const closeGroupCreateBtn = document.getElementById("closeGroupCreateBtn");
const groupTitleInput = document.getElementById("groupTitleInput");
const groupUserSearchInput = document.getElementById("groupUserSearchInput");
const selectedGroupUsersBox = document.getElementById("selectedGroupUsers");
const groupUsersList = document.getElementById("groupUsersList");
const groupCreateError = document.getElementById("groupCreateError");
const submitCreateGroupBtn = document.getElementById("submitCreateGroupBtn");
 
const groupInfoModal = document.getElementById("groupInfoModal");
const groupInfoBackdrop = document.getElementById("groupInfoBackdrop");
const closeGroupInfoBtn = document.getElementById("closeGroupInfoBtn");
const groupInfoTitle = document.getElementById("groupInfoTitle");
const groupInfoSubtitle = document.getElementById("groupInfoSubtitle");
const groupInfoParticipantsList = document.getElementById("groupInfoParticipantsList");
 
const emojis = [
  "😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣",
  "😊", "😇", "🙂", "🙃", "😉", "😍", "😘", "😎",
  "🥰", "🤩", "🤔", "🤨", "😐", "😶", "🙄", "😏",
  "😴", "🤤", "😪", "😢", "😭", "😤", "😡", "🤯",
  "👍", "👎", "👌", "✌️", "🤝", "🙏", "👏", "🙌",
  "💪", "🔥", "❤️", "💙", "💚", "💛", "💜", "🖤",
  "💯", "⭐", "✨", "🎉", "🎁", "🏆", "⚡", "✅",
  "❌", "❗", "❓", "📌", "📷", "🎧", "🎮", "💻",
  "☕", "🍕", "🍔", "🍟", "🍫", "🍩", "🍎", "🚀"
];
 
function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
 
function firstLetter(name) {
  return String(name || "?").trim().charAt(0).toUpperCase() || "?";
}
 
function avatarHtml(user, className = "") {
  if (user && user.avatar) {
    return `
      <div class="avatar ${className}">
        <img src="${escapeHtml(user.avatar)}" alt="${escapeHtml(user.username)}" />
      </div>
    `;
  }
 
  return `
    <div class="avatar ${className}">
      ${escapeHtml(firstLetter(user && user.username))}
    </div>
  `;
}
 
function groupAvatarHtml(className = "") {
  return `
    <div class="avatar group-avatar ${className}">
      #
    </div>
  `;
}
 
function renderAvatarContent(element, user) {
  if (!element) {
    return;
  }
 
  element.classList.remove("group-avatar");
 
  if (user && user.avatar) {
    element.innerHTML = `
      <img src="${escapeHtml(user.avatar)}" alt="${escapeHtml(user.username)}" />
    `;
  } else {
    element.textContent = firstLetter(user && user.username);
  }
}
 
function renderGroupAvatarContent(element) {
  if (!element) {
    return;
  }
 
  element.classList.add("group-avatar");
  element.innerHTML = "";
  element.textContent = "#";
}
 
function formatTime(dateValue) {
  if (!dateValue) {
    return "";
  }
 
  const date = new Date(dateValue);
 
  return date.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
 
function formatDateTime(dateValue) {
  if (!dateValue) {
    return "";
  }
 
  const date = new Date(dateValue);
 
  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
 
async function api(path, options = {}) {
  const config = {
    credentials: "include",
    ...options,
  };
 
  if (config.body && !(config.body instanceof FormData)) {
    config.headers = {
      "Content-Type": "application/json",
      ...(config.headers || {}),
    };
 
    config.body = JSON.stringify(config.body);
  }
 
  const response = await fetch(path, config);
  const data = await response.json().catch(() => ({}));
 
  if (!response.ok) {
    throw new Error(data.message || "Ошибка запроса");
  }
 
  return data;
}
 
function anyModalOpen() {
  return (
    !userProfileModal.classList.contains("hidden") ||
    !groupCreateModal.classList.contains("hidden") ||
    !groupInfoModal.classList.contains("hidden")
  );
}
 
function refreshBodyModalState() {
  document.body.classList.toggle("modal-open", anyModalOpen());
}
 
function openModal(modal) {
  modal.classList.remove("hidden");
  refreshBodyModalState();
}
 
function closeModal(modal) {
  modal.classList.add("hidden");
  refreshBodyModalState();
}
 
function showAuth() {
  authScreen.classList.remove("hidden");
  appScreen.classList.add("hidden");
}
 
function showApp() {
  authScreen.classList.add("hidden");
  appScreen.classList.remove("hidden");
}
 
function renderMyProfile() {
  profileUsername.value = currentUser.username || "";
  profileAbout.value = currentUser.about || "";
 
  const avatarElement = document.getElementById("myAvatar");
  renderAvatarContent(avatarElement, currentUser);
}
 
function setAuthError(message) {
  authError.textContent = message || "";
}
 
function clearSelectedMessageImage() {
  if (selectedMessageImageUrl) {
    URL.revokeObjectURL(selectedMessageImageUrl);
    selectedMessageImageUrl = null;
  }
 
  if (messageImageInput) {
    messageImageInput.value = "";
  }
 
  if (messageImagePreviewImg) {
    messageImagePreviewImg.removeAttribute("src");
  }
 
  if (messageImagePreview) {
    messageImagePreview.classList.add("hidden");
  }
}
 
function getSelectedMessageImage() {
  if (!messageImageInput || !messageImageInput.files.length) {
    return null;
  }
 
  return messageImageInput.files[0];
}
 
function insertTextAtCursor(input, value) {
  if (!input) {
    return;
  }
 
  const maxLength = Number(input.getAttribute("maxlength")) || Infinity;
  const start = input.selectionStart ?? input.value.length;
  const end = input.selectionEnd ?? input.value.length;
 
  const before = input.value.slice(0, start);
  const after = input.value.slice(end);
  const nextValue = `${before}${value}${after}`;
 
  if (nextValue.length > maxLength) {
    return;
  }
 
  input.value = nextValue;
 
  const nextCursorPosition = start + value.length;
 
  input.focus();
  input.setSelectionRange(nextCursorPosition, nextCursorPosition);
}
 
function renderEmojiPicker() {
  if (!emojiPicker) {
    return;
  }
 
  emojiPicker.innerHTML = "";
 
  emojis.forEach((emoji) => {
    const button = document.createElement("button");
 
    button.type = "button";
    button.className = "emoji-item";
    button.textContent = emoji;
    button.title = emoji;
 
    button.addEventListener("click", () => {
      insertTextAtCursor(messageInput, emoji);
      closeEmojiPicker();
    });
 
    emojiPicker.appendChild(button);
  });
}
 
function openEmojiPicker() {
  if (!emojiPicker) {
    return;
  }
 
  emojiPicker.classList.remove("hidden");
}
 
function closeEmojiPicker() {
  if (!emojiPicker) {
    return;
  }
 
  emojiPicker.classList.add("hidden");
}
 
function toggleEmojiPicker() {
  if (!emojiPicker) {
    return;
  }
 
  if (emojiPicker.classList.contains("hidden")) {
    openEmojiPicker();
  } else {
    closeEmojiPicker();
  }
}
 
renderEmojiPicker();
 
loginTab.addEventListener("click", () => {
  loginTab.classList.add("active");
  registerTab.classList.remove("active");
 
  loginForm.classList.remove("hidden");
  registerForm.classList.add("hidden");
 
  setAuthError("");
});
 
registerTab.addEventListener("click", () => {
  registerTab.classList.add("active");
  loginTab.classList.remove("active");
 
  registerForm.classList.remove("hidden");
  loginForm.classList.add("hidden");
 
  setAuthError("");
});
 
registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
 
  try {
    setAuthError("");
 
    const username = document.getElementById("registerUsername").value;
    const email = document.getElementById("registerEmail").value;
    const password = document.getElementById("registerPassword").value;
 
    const data = await api("/api/auth/register", {
      method: "POST",
      body: {
        username,
        email,
        password,
      },
    });
 
    currentUser = data.user;
 
    await startApp();
  } catch (error) {
    setAuthError(error.message);
  }
});
 
loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
 
  try {
    setAuthError("");
 
    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;
 
    const data = await api("/api/auth/login", {
      method: "POST",
      body: {
        email,
        password,
      },
    });
 
    currentUser = data.user;
 
    await startApp();
  } catch (error) {
    setAuthError(error.message);
  }
});
 
logoutBtn.addEventListener("click", async () => {
  try {
    await api("/api/auth/logout", {
      method: "POST",
    });
  } catch (error) {
    console.error(error);
  }
 
  stopPolling();
 
  currentUser = null;
  showAuth();
});
 
saveProfileBtn.addEventListener("click", async () => {
  try {
    const data = await api("/api/profile", {
      method: "PUT",
      body: {
        username: profileUsername.value,
        about: profileAbout.value,
      },
    });
 
    currentUser = data.user;
    renderMyProfile();
    await loadDialogs();
  } catch (error) {
    alert(error.message);
  }
});
 
avatarInput.addEventListener("change", async () => {
  const file = avatarInput.files[0];
 
  if (!file) {
    return;
  }
 
  const formData = new FormData();
  formData.append("avatar", file);
 
  try {
    const data = await api("/api/profile/avatar", {
      method: "POST",
      body: formData,
    });
 
    currentUser = data.user;
    renderMyProfile();
    await loadDialogs();
  } catch (error) {
    alert(error.message);
  } finally {
    avatarInput.value = "";
  }
});
 
if (messageImageInput) {
  messageImageInput.addEventListener("change", () => {
    const file = getSelectedMessageImage();
 
    if (!file) {
      clearSelectedMessageImage();
      return;
    }
 
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
 
    if (!allowedTypes.includes(file.type)) {
      alert("Можно выбрать только фото JPG, PNG, WEBP или GIF");
      clearSelectedMessageImage();
      return;
    }
 
    if (file.size > 5 * 1024 * 1024) {
      alert("Фото не должно быть больше 5 МБ");
      clearSelectedMessageImage();
      return;
    }
 
    if (selectedMessageImageUrl) {
      URL.revokeObjectURL(selectedMessageImageUrl);
    }
 
    selectedMessageImageUrl = URL.createObjectURL(file);
    messageImagePreviewImg.src = selectedMessageImageUrl;
    messageImagePreview.classList.remove("hidden");
  });
}
 
if (clearMessageImageBtn) {
  clearMessageImageBtn.addEventListener("click", () => {
    clearSelectedMessageImage();
  });
}
 
if (emojiPickerBtn) {
  emojiPickerBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleEmojiPicker();
  });
}
 
if (emojiPicker) {
  emojiPicker.addEventListener("click", (event) => {
    event.stopPropagation();
  });
}
 
document.addEventListener("click", (event) => {
  if (!emojiPicker || !emojiPickerBtn) {
    return;
  }
 
  const clickedPicker = emojiPicker.contains(event.target);
  const clickedButton = emojiPickerBtn.contains(event.target);
 
  if (!clickedPicker && !clickedButton) {
    closeEmojiPicker();
  }
});
 
globalChatBtn.addEventListener("click", async () => {
  await openGlobalChat();
});
 
createGroupBtn.addEventListener("click", async () => {
  await openGroupCreateModal();
});
 
searchUsersInput.addEventListener("input", async () => {
  await loadDialogs();
});
 
profileModalBackdrop.addEventListener("click", closeUserProfileModal);
closeProfileModalBtn.addEventListener("click", closeUserProfileModal);
 
groupCreateBackdrop.addEventListener("click", closeGroupCreateModal);
closeGroupCreateBtn.addEventListener("click", closeGroupCreateModal);
 
groupInfoBackdrop.addEventListener("click", closeGroupInfoModal);
closeGroupInfoBtn.addEventListener("click", closeGroupInfoModal);
 
groupUserSearchInput.addEventListener("input", async () => {
  await loadGroupUsersForModal();
});
 
submitCreateGroupBtn.addEventListener("click", async () => {
  await createGroupChat();
});
 
privateMessageBtn.addEventListener("click", async () => {
  if (!currentProfileUser) {
    return;
  }
 
  if (String(currentProfileUser._id) === String(currentUser._id)) {
    return;
  }
 
  try {
    const data = await api(`/api/chats/private/${currentProfileUser._id}`, {
      method: "POST",
    });
 
    closeUserProfileModal();
 
    await loadDialogs();
    await openDialogChat(data.dialog);
  } catch (error) {
    alert(error.message);
  }
});
 
chatHeaderInfoBtn.addEventListener("click", () => {
  if (currentChat.type === "private" && currentChat.user) {
    openUserProfile(currentChat.user);
    return;
  }
 
  if (currentChat.type === "group") {
    openGroupInfoModal();
  }
});
 
document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") {
    return;
  }
 
  if (emojiPicker && !emojiPicker.classList.contains("hidden")) {
    closeEmojiPicker();
    return;
  }
 
  if (!groupCreateModal.classList.contains("hidden")) {
    closeGroupCreateModal();
    return;
  }
 
  if (!groupInfoModal.classList.contains("hidden")) {
    closeGroupInfoModal();
    return;
  }
 
  if (!userProfileModal.classList.contains("hidden")) {
    closeUserProfileModal();
  }
});
 
async function startApp() {
  showApp();
  renderMyProfile();
 
  await loadDialogs();
  await openGlobalChat();
 
  startDialogsPolling();
}
 
async function openGlobalChat() {
  currentChat = {
    id: "global",
    type: "global",
    title: "Global Chat",
    subtitle: "Общий чат для всех пользователей",
  };
 
  globalChatBtn.classList.add("active");
 
  document.querySelectorAll(".dialog-item").forEach((item) => {
    item.classList.remove("active");
  });
 
  await openCurrentChat();
}
 
async function openDialogChat(dialog) {
  const type = dialog.type || dialog.chatType;
 
  if (type === "private") {
    currentChat = {
      id: dialog.chatId,
      type: "private",
      title: dialog.user.username,
      subtitle: dialog.user.about || "Личный чат",
      user: dialog.user,
      participants: dialog.participants || [],
    };
  }
 
  if (type === "group") {
    currentChat = {
      id: dialog.chatId,
      type: "group",
      title: dialog.title || "Групповой чат",
      subtitle: `${(dialog.participants || []).length} участников`,
      user: null,
      participants: dialog.participants || [],
    };
  }
 
  globalChatBtn.classList.remove("active");
 
  document.querySelectorAll(".dialog-item").forEach((item) => {
    item.classList.toggle("active", item.dataset.chatId === dialog.chatId);
  });
 
  await openCurrentChat();
}
 
function renderChatHeader() {
  chatTitle.textContent = currentChat.title;
  chatSubtitle.textContent = currentChat.subtitle;
 
  chatHeaderInfoBtn.classList.remove("clickable");
 
  if (currentChat.type === "global") {
    chatStatus.textContent = "global";
    chatHeaderAvatar.classList.add("hidden");
    return;
  }
 
  chatHeaderAvatar.classList.remove("hidden");
 
  if (currentChat.type === "private") {
    chatStatus.textContent = "private";
    renderAvatarContent(chatHeaderAvatar, currentChat.user);
    chatHeaderInfoBtn.classList.add("clickable");
    return;
  }
 
  if (currentChat.type === "group") {
    chatStatus.textContent = "group";
    renderGroupAvatarContent(chatHeaderAvatar);
    chatHeaderInfoBtn.classList.add("clickable");
  }
}
 
async function openCurrentChat() {
  renderChatHeader();
  clearSelectedMessageImage();
  closeEmojiPicker();
 
  messagesBox.innerHTML = "";
  renderedMessages.clear();
  lastMessageId = null;
  emptyChatSince = null;
 
  await loadInitialMessages();
 
  startMessagePolling();
}
 
async function loadInitialMessages() {
  try {
    const data = await api(`/api/messages/${currentChat.id}?limit=50`);
 
    if (data.messages.length === 0) {
      emptyChatSince = data.serverTime;
    }
 
    appendMessages(data.messages);
    
    // Скроллим вниз сразу после добавления текста
    function scrollMessagesToBottom() {
  // Используем setTimeout, чтобы дать браузеру микросекунду на перерасчет высоты DOM-дерева
  setTimeout(() => {
    messagesBox.scrollTo({
      top: messagesBox.scrollHeight,
      behavior: "smooth" // Делает прокрутку плавной (можно убрать "smooth", если хочешь мгновенный прыжок вниз)
    });
  }, 50);
}
    
    if (images.length > 0) {
      images.forEach((img) => {
        img.addEventListener("load", () => {
          loadedImagesCount++;
          if (loadedImagesCount === images.length) {
            scrollMessagesToBottom();
          }
        });
      });
    }
  } catch (error) {
    console.error(error);
  }
}
async function loadOnlyNewMessages() {
  if (isLoadingMessages) {
    return;
  }
 
  isLoadingMessages = true;
 
  try {
    let url = `/api/messages/${currentChat.id}`;
 
    if (lastMessageId) {
      url += `?after=${lastMessageId}`;
    } else if (emptyChatSince) {
      url += `?since=${encodeURIComponent(emptyChatSince)}`;
    } else {
      isLoadingMessages = false;
      return;
    }
 
    const data = await api(url);
 
    if (data.messages.length > 0) {
      appendMessages(data.messages);
      scrollMessagesToBottom();
    }
  } catch (error) {
    console.error(error);
  } finally {
    isLoadingMessages = false;
  }
}
 
function appendMessages(messages) {
  messages.forEach((message) => {
    if (renderedMessages.has(message._id)) {
      return;
    }

    renderedMessages.add(message._id);
    lastMessageId = message._id;

    // Безопасная проверка на автора сообщения (учитываем id и _id)
    const isOwn = String(message.sender._id || message.sender) === String(currentUser._id || currentUser.id);
    const isAdmin = currentUser && currentUser.role === "admin"; // Проверяем, админ ли тот, кто смотрит чат

    const textHtml = message.text
      ? `<div class="message-text">${escapeHtml(message.text)}</div>`
      : "";

    const imageHtml = message.imageUrl
      ? `
        <a
          class="message-image-link"
          href="${escapeHtml(message.imageUrl)}"
          target="_blank"
          rel="noopener noreferrer"
        >
          <img
            class="message-image"
            src="${escapeHtml(message.imageUrl)}"
            alt="Фото сообщения"
            loading="lazy"
          />
        </a>
      `
      : "";

    // Бейдж короны для админов в чате
    const adminBadge = message.sender.role === "admin" ? `<span class="admin-badge" style="color: #ffcc00; font-size: 11px; margin-left: 5px;">👑 Админ</span>` : "";

    // Кнопка удаления для администратора
    const deleteButtonHtml = isAdmin 
      ? `<button class="delete-msg-btn" data-msg-id="${message._id}" style="background:none; border:none; color:#ff4d4d; cursor:pointer; font-size:11px; margin-left: 10px;">Удалить</button>` 
      : "";

    const messageElement = document.createElement("div");
    messageElement.className = `message ${isOwn ? "own" : ""}`;
    messageElement.id = `msg-${message._id}`;

    messageElement.innerHTML = `
      <button class="profile-open-btn message-avatar-open" type="button" data-open-profile="true">
        ${avatarHtml(message.sender)}
      </button>

      <div class="message-bubble">
        <div class="message-meta">
          <button class="message-name profile-open-btn" type="button" data-open-profile="true">
            ${escapeHtml(message.sender.username)}
          </button>
          ${adminBadge}
          <span class="message-time">${escapeHtml(formatTime(message.createdAt))}</span>
          ${deleteButtonHtml}
        </div>

        ${textHtml}
        ${imageHtml}
      </div>
    `;

    // Клик на имя или аватарку открывает профиль пользователя
    messageElement.querySelectorAll("[data-open-profile='true']").forEach((button) => {
      button.addEventListener("click", () => {
        openUserProfile(message.sender);
      });
    });

    // Если залогинен админ — вешаем событие удаления на кнопку
    if (isAdmin) {
      const delBtn = messageElement.querySelector(".delete-msg-btn");
      if (delBtn) {
        delBtn.addEventListener("click", async () => {
          if (confirm("Вы уверены, что хотите удалить это сообщение?")) {
            try {
              await api(`/api/messages/${message._id}`, { method: "DELETE" });
              messageElement.remove(); // Удаляем элемент с экрана
              renderedMessages.delete(message._id); // Стираем из памяти фронтенда
            } catch (err) {
              alert(err.message);
            }
          }
        });
      }
    }

    messagesBox.appendChild(messageElement);
  });
}
 
function scrollMessagesToBottom() {
  messagesBox.scrollTop = messagesBox.scrollHeight;
}
 
function startMessagePolling() {
  if (messagePollingInterval) {
    clearInterval(messagePollingInterval);
  }
 
  messagePollingInterval = setInterval(() => {
    loadOnlyNewMessages();
  }, 1000);
}
 
function startDialogsPolling() {
  if (dialogsPollingInterval) {
    clearInterval(dialogsPollingInterval);
  }
 
  dialogsPollingInterval = setInterval(() => {
    loadDialogs();
  }, 3000);
}
 
function stopPolling() {
  if (messagePollingInterval) {
    clearInterval(messagePollingInterval);
    messagePollingInterval = null;
  }
 
  if (dialogsPollingInterval) {
    clearInterval(dialogsPollingInterval);
    dialogsPollingInterval = null;
  }
}
 
messageForm.addEventListener("submit", async (event) => {
  event.preventDefault();
 
  const text = messageInput.value.trim();
  const imageFile = getSelectedMessageImage();
 
  if (!text && !imageFile) {
    return;
  }
 
  const formData = new FormData();
  formData.append("chatId", currentChat.id);
  formData.append("chatType", currentChat.type);
  formData.append("text", text);
 
  if (imageFile) {
    formData.append("image", imageFile);
  }
 
  messageInput.value = "";
  closeEmojiPicker();
 
  try {
    const data = await api("/api/messages", {
      method: "POST",
      body: formData,
    });
 
    appendMessages([data.message]);
    scrollMessagesToBottom();
    clearSelectedMessageImage();
 
    await loadDialogs();
  } catch (error) {
    messageInput.value = text;
    alert(error.message);
  }
});
 
async function loadDialogs() {
  try {
    const query = searchUsersInput.value.trim();
    const url = query
      ? `/api/chats/dialogs?q=${encodeURIComponent(query)}`
      : "/api/chats/dialogs";
 
    const data = await api(url);
 
    renderDialogs(data.dialogs);
  } catch (error) {
    console.error(error);
  }
}
 
function renderDialogs(dialogs) {
  dialogsList.innerHTML = "";
 
  if (dialogs.length === 0) {
    dialogsList.innerHTML = `
      <div class="dialog-last" style="padding: 12px; white-space: normal;">
        Чатов пока нет. Личный чат создаётся через профиль пользователя, а групповой — через кнопку "Создать групповой чат".
      </div>
    `;
 
    return;
  }
 
  dialogs.forEach((dialog) => {
    const type = dialog.type || dialog.chatType;
 
    const button = document.createElement("button");
 
    button.type = "button";
    button.className = `dialog-item ${
      currentChat.id === dialog.chatId ? "active" : ""
    }`;
 
    button.dataset.chatId = dialog.chatId;
 
    const lastMessage = dialog.lastMessage;
 
    let lastText = type === "group" ? "Группа создана" : "Чат создан, сообщений пока нет";
    let lastTime = "";
 
    if (lastMessage) {
      const senderName =
        String(lastMessage.sender._id) === String(currentUser._id)
          ? "Вы"
          : lastMessage.sender.username;
 
      const messageText = String(lastMessage.text || "").trim();
 
      if (messageText && lastMessage.imageUrl) {
        lastText = `${senderName}: ${messageText} 📷`;
      } else if (messageText) {
        lastText = `${senderName}: ${messageText}`;
      } else if (lastMessage.imageUrl) {
        lastText = `${senderName}: 📷 Фото`;
      } else {
        lastText = `${senderName}: Сообщение`;
      }
 
      lastTime = formatDateTime(lastMessage.createdAt);
    } else {
      lastTime = formatDateTime(dialog.createdAt);
    }
 
    const avatar = type === "group" ? groupAvatarHtml() : avatarHtml(dialog.user);
    const title = type === "group" ? dialog.title : dialog.user.username;
    const subtitle =
      type === "group"
        ? `${(dialog.participants || []).length} участников`
        : dialog.user.about || "Нет описания профиля";
 
    button.innerHTML = `
      ${avatar}
 
      <div class="dialog-content">
        <div class="dialog-top">
          <span class="dialog-name">${escapeHtml(title)}</span>
          <span class="dialog-time">${escapeHtml(lastTime)}</span>
        </div>
 
        <div class="dialog-last">${escapeHtml(lastText)}</div>
 
        <div class="dialog-about">
          ${escapeHtml(subtitle)}
        </div>
      </div>
    `;
 
    button.addEventListener("click", async () => {
      await openDialogChat(dialog);
    });
 
    dialogsList.appendChild(button);
  });
}
 
function openUserProfile(user) {
  if (!user) {
    return;
  }
 
  currentProfileUser = user;
 
  renderAvatarContent(profileModalAvatar, user);
 
  profileModalName.textContent = user.username || "Пользователь";
  profileModalLabel.textContent = "Профиль пользователя";
 
  const aboutText =
    user.about && user.about.trim()
      ? user.about.trim()
      : "Пользователь пока не добавил рассказ о себе.";
 
  profileModalAbout.textContent = aboutText;
 
  const isOwnProfile = String(user._id) === String(currentUser._id);
 
  if (isOwnProfile) {
    privateMessageBtn.classList.add("hidden");
    ownProfileNote.classList.remove("hidden");
  } else {
    privateMessageBtn.classList.remove("hidden");
    ownProfileNote.classList.add("hidden");
  }
 
  openModal(userProfileModal);
}
 
function closeUserProfileModal() {
  currentProfileUser = null;
  closeModal(userProfileModal);
}
 
async function openGroupCreateModal() {
  selectedGroupUsers.clear();
 
  groupTitleInput.value = "";
  groupUserSearchInput.value = "";
  groupCreateError.textContent = "";
 
  renderSelectedGroupUsers();
 
  openModal(groupCreateModal);
 
  await loadGroupUsersForModal();
}
 
function closeGroupCreateModal() {
  selectedGroupUsers.clear();
  groupCreateError.textContent = "";
  closeModal(groupCreateModal);
}
 
async function loadGroupUsersForModal() {
  try {
    const query = groupUserSearchInput.value.trim();
    const url = query
      ? `/api/chats/users?q=${encodeURIComponent(query)}`
      : "/api/chats/users";
 
    const data = await api(url);
 
    renderGroupUsers(data.users);
  } catch (error) {
    groupUsersList.innerHTML = `
      <div class="dialog-last" style="padding: 12px; white-space: normal;">
        ${escapeHtml(error.message)}
      </div>
    `;
  }
}
 
function renderGroupUsers(users) {
  groupUsersList.innerHTML = "";
 
  if (!users.length) {
    groupUsersList.innerHTML = `
      <div class="dialog-last" style="padding: 12px; white-space: normal;">
        Пользователи не найдены
      </div>
    `;
 
    return;
  }
 
  users.forEach((user) => {
    const isSelected = selectedGroupUsers.has(String(user._id));
 
    const button = document.createElement("button");
    button.type = "button";
    button.className = `user-pick-item ${isSelected ? "selected" : ""}`;
 
    button.innerHTML = `
      ${avatarHtml(user)}
 
      <div class="user-pick-content">
        <div class="user-pick-name">${escapeHtml(user.username)}</div>
        <div class="user-pick-about">
          ${escapeHtml(user.about || user.email || "Нет описания")}
        </div>
      </div>
    `;
 
    button.addEventListener("click", () => {
      toggleGroupUser(user);
    });
 
    groupUsersList.appendChild(button);
  });
}
 
function toggleGroupUser(user) {
  const userId = String(user._id);
 
  if (selectedGroupUsers.has(userId)) {
    selectedGroupUsers.delete(userId);
  } else {
    selectedGroupUsers.set(userId, user);
  }
 
  renderSelectedGroupUsers();
  loadGroupUsersForModal();
}
 
function renderSelectedGroupUsers() {
  selectedGroupUsersBox.innerHTML = "";
 
  if (selectedGroupUsers.size === 0) {
    selectedGroupUsersBox.innerHTML = `
      <span class="dialog-last" style="white-space: normal;">
        Участники ещё не выбраны
      </span>
    `;
 
    return;
  }
 
  selectedGroupUsers.forEach((user, userId) => {
    const chip = document.createElement("span");
    chip.className = "selected-user-chip";
 
    chip.innerHTML = `
      ${escapeHtml(user.username)}
      <button type="button" data-remove-user="${escapeHtml(userId)}">×</button>
    `;
 
    selectedGroupUsersBox.appendChild(chip);
  });
 
  selectedGroupUsersBox.querySelectorAll("[data-remove-user]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedGroupUsers.delete(button.dataset.removeUser);
      renderSelectedGroupUsers();
      loadGroupUsersForModal();
    });
  });
}
 
async function createGroupChat() {
  try {
    groupCreateError.textContent = "";
 
    const title = groupTitleInput.value.trim();
    const participantIds = Array.from(selectedGroupUsers.keys());
 
    const data = await api("/api/chats/group", {
      method: "POST",
      body: {
        title,
        participantIds,
      },
    });
 
    closeGroupCreateModal();
 
    await loadDialogs();
    await openDialogChat(data.dialog);
  } catch (error) {
    groupCreateError.textContent = error.message;
  }
}
 
function openGroupInfoModal() {
  if (currentChat.type !== "group") {
    return;
  }
 
  groupInfoTitle.textContent = currentChat.title || "Групповой чат";
  groupInfoSubtitle.textContent = `${(currentChat.participants || []).length} участников`;
 
  groupInfoParticipantsList.innerHTML = "";
 
  if (!currentChat.participants || currentChat.participants.length === 0) {
    groupInfoParticipantsList.innerHTML = `
      <div class="dialog-last" style="white-space: normal;">
        Участники не найдены
      </div>
    `;
  } else {
    currentChat.participants.forEach((participant) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "group-participant-btn";
 
      button.innerHTML = `
        ${avatarHtml(participant)}
 
        <div class="user-pick-content">
          <div class="user-pick-name">${escapeHtml(participant.username)}</div>
          <div class="user-pick-about">
            ${escapeHtml(participant.about || participant.email || "Нет описания")}
          </div>
        </div>
      `;
 
      button.addEventListener("click", () => {
        closeGroupInfoModal();
        openUserProfile(participant);
      });
 
      groupInfoParticipantsList.appendChild(button);
    });
  }
 
  openModal(groupInfoModal);
}
 
function closeGroupInfoModal() {
  closeModal(groupInfoModal);
}
 
async function checkAuth() {
  try {
    const data = await api("/api/auth/me");
 
    currentUser = data.user;
 
    await startApp();
  } catch (error) {
    showAuth();
  }
}
 
checkAuth();
 