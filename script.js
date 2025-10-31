// === ELEMENTS ===
const chatBody = document.querySelector(".chat-body");
const messageInput = document.querySelector(".message-input");
const sendMessageButton = document.querySelector("#send-message");
const fileInput = document.querySelector("#file-input");
const fileUploadWrapper = document.querySelector(".file-upload-wrapper");
const fileCancelButton = document.querySelector("#file-cancel");
const chatbotToggler = document.querySelector("#chatbot-toggler");
const closeChatbot = document.querySelector("#close-chatbot");

// === API CONFIG ===
const API_KEY = "AIzaSyBNZcp3FhaYv4OOEOGGAdYXg95xxlm6fgc"; // ⚠️ Nên ẩn key sau
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

// === MODEL SẢN PHẨM ===
const vetProducts = [
  {
    id: 1,
    name: "Bòng thái bình",
    category: "bưởi da xanh, ngon, không hạt",
    animalType: "Hoa quả",
    description: "thực phẩm bổ sung vitamin C, tăng sức đề kháng.",
    price: 250000,
    image: "anh/ngunhubo.png",
  },
  {
    id: 2,
    name: "Whiskas Adult Tuna",
    category: "Thức ăn hạt",
    animalType: "Mèo",
    description: "Thức ăn khô cho mèo trưởng thành vị cá ngừ, giàu dinh dưỡng.",
    price: 180000,
    image: "sanpham/whiskas-tuna.png",
  },
  {
    id: 3,
    name: "Bios Life Pet Vitamin",
    category: "Vitamin & Khoáng chất",
    animalType: "Chó",
    description: "Bổ sung vitamin A, D3, E giúp tăng sức đề kháng và lông mượt hơn.",
    price: 120000,
    image: "sanpham/bioslife.png",
  },
  {
    id: 4,
    name: "Cát vệ sinh Me-O",
    category: "Vệ sinh thú cưng",
    animalType: "Mèo",
    description: "Cát vệ sinh khử mùi, vón cục tốt, dễ dọn.",
    price: 95000,
    image: "sanpham/catmeo.png",
  },
  {
    id: 5,
    name: "Thuốc nhỏ mắt Veyes",
    category: "Thuốc chăm sóc mắt",
    animalType: "Chó, Mèo",
    description: "Giúp giảm viêm, làm sạch và bảo vệ mắt cho chó mèo.",
    price: 85000,
    image: "sanpham/veyes.png",
  },
];

// === HÀM TRA CỨU SẢN PHẨM ===
function findProductByKeyword(keyword) {
  keyword = keyword.toLowerCase();
  return vetProducts.filter(
    (p) =>
      p.name.toLowerCase().includes(keyword) ||
      p.category.toLowerCase().includes(keyword) ||
      p.description.toLowerCase().includes(keyword) ||
      p.animalType.toLowerCase().includes(keyword)
  );
}

function getProductSuggestions(message) {
  const results = findProductByKeyword(message);
  if (results.length === 0) return null;

  return results
    .map(
      (p) => `
      <div class="product-suggestion">
        <img src="${p.image}" alt="${p.name}" width="80" height="80" />
        <div>
          <strong>${p.name}</strong> (${p.animalType})<br>
          💰 ${p.price.toLocaleString()} VNĐ<br>
          📦 ${p.category}<br>
          📝 ${p.description}
        </div>
      </div>
    `
    )
    .join("<hr>");
}

// === USER & CHAT STATE ===
const userData = {
  message: null,
  file: { data: null, mime_type: null },
};

const chatHistory = [
  {
    role: "model",
    parts: [
      {
        text: `Bạn là một trợ lý ảo chuyên về thú y và chăm sóc vật nuôi toàn diện.
        Luôn thân thiện, ưu tiên sức khỏe vật nuôi và gợi ý sản phẩm phù hợp khi cần.`,
      },
    ],
  },
];

// === UTILITIES ===
const initialInputHeight = messageInput ? messageInput.scrollHeight : 40;
let resizeRaf = null;

const createMessageElement = (content, ...classes) => {
  const div = document.createElement("div");
  div.classList.add("message", ...classes);
  if (typeof content === "string" && /<[^>]+>/.test(content)) {
    div.innerHTML = content;
  } else {
    div.textContent = content;
  }
  return div;
};

const resetFileInput = () => {
  if (fileInput) fileInput.value = "";
  fileUploadWrapper.classList.remove("file-uploaded");
  const img = fileUploadWrapper.querySelector("img");
  if (img) img.src = "";
  userData.file = { data: null, mime_type: null };
};

// === GENERATE BOT RESPONSE ===
const generateBotResponse = async (incomingDiv) => {
  const messageElement = incomingDiv.querySelector(".message-text");

  // Gợi ý sản phẩm trước khi gọi API
  const suggestion = getProductSuggestions(userData.message);
  if (suggestion) {
    messageElement.innerHTML = suggestion;
    incomingDiv.classList.remove("thinking");
    chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth" });
    return;
  }

  // Nếu không có sản phẩm thì gọi API Gemini
  chatHistory.push({
    role: "user",
    parts: [
      { text: userData.message },
      ...(userData.file?.data ? [{ inline_data: userData.file }] : []),
    ],
  });

  if (chatHistory.length > 40) chatHistory.splice(0, chatHistory.length - 40);

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: chatHistory }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error.message);

    const apiText =
      (data?.candidates?.[0]?.content?.parts?.[0]?.text || "")
        .replace(/\*\*(.*?)\*\*/g, "$1")
        .trim();

    messageElement.innerText = apiText;
    chatHistory.push({ role: "model", parts: [{ text: apiText }] });
  } catch (err) {
    messageElement.textContent = err?.message || String(err);
    messageElement.style.color = "#ff0000";
  } finally {
    userData.file = { data: null, mime_type: null };
    incomingDiv.classList.remove("thinking");
    requestAnimationFrame(() =>
      chatBody.scrollTo({ behavior: "smooth", top: chatBody.scrollHeight })
    );
  }
};

// === HANDLE USER MESSAGE ===
const handleOutgoingMessage = (e) => {
  e.preventDefault();
  userData.message = messageInput.value.trim();
  if (!userData.message && !userData.file?.data) return;

  messageInput.value = "";
  messageInput.dispatchEvent(new Event("input"));
  fileUploadWrapper.classList.remove("file-uploaded");

  const userDiv = document.createElement("div");
  userDiv.classList.add("message", "user-message");

  const textDiv = document.createElement("div");
  textDiv.classList.add("message-text");
  textDiv.textContent = userData.message;
  userDiv.appendChild(textDiv);

  if (userData.file?.data) {
    const img = document.createElement("img");
    img.className = "attachment";
    img.src = `data:${userData.file.mime_type};base64,${userData.file.data}`;
    userDiv.appendChild(img);
  }

  chatBody.appendChild(userDiv);
  chatBody.scrollTop = chatBody.scrollHeight;

  setTimeout(() => {
    const botThinkingHTML = `
      <img src="anh/ngunhubo.png" class="bot-avatar" width="50" height="50" />
      <div class="message-text">
        <div class="thinking-indicator">
          <div class="dot"></div>
          <div class="dot"></div>
          <div class="dot"></div>
        </div>
      </div>
    `;
    const incomingDiv = document.createElement("div");
    incomingDiv.classList.add("message", "bot-message", "thinking");
    incomingDiv.innerHTML = botThinkingHTML;
    chatBody.appendChild(incomingDiv);
    requestAnimationFrame(() =>
      chatBody.scrollTo({ behavior: "smooth", top: chatBody.scrollHeight })
    );

    generateBotResponse(incomingDiv);
  }, 150);
};

// === INPUT EVENTS ===
messageInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey && window.innerWidth > 768) {
    if (e.target.value.trim()) handleOutgoingMessage(e);
  }
});

messageInput.addEventListener("input", () => {
  if (resizeRaf) cancelAnimationFrame(resizeRaf);
  resizeRaf = requestAnimationFrame(() => {
    messageInput.style.height = `${initialInputHeight}px`;
    messageInput.style.height = `${messageInput.scrollHeight}px`;
  });
});

// === FILE UPLOAD ===
fileInput.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  const MAX_SIZE = 2 * 1024 * 1024;

  if (!validTypes.includes(file.type)) {
    await Swal.fire({
      icon: "error",
      title: "Lỗi",
      text: "Chỉ chấp nhận ảnh (JPEG, PNG, GIF, WEBP)",
      confirmButtonText: "OK",
    });
    return resetFileInput();
  }

  if (file.size > MAX_SIZE) {
    await Swal.fire({
      icon: "error",
      title: "Lỗi",
      text: "File quá lớn (tối đa 2MB)",
      confirmButtonText: "OK",
    });
    return resetFileInput();
  }

  const reader = new FileReader();
  reader.onload = (ev) => {
    const result = ev.target.result;
    fileUploadWrapper.classList.add("file-uploaded");
    const img = fileUploadWrapper.querySelector("img");
    if (img) img.src = result;
    userData.file = { data: result.split(",")[1], mime_type: file.type };
  };
  reader.readAsDataURL(file);
});

fileCancelButton.addEventListener("click", resetFileInput);

// === EMOJI PICKER ===
const picker = new EmojiMart.Picker({
  theme: "light",
  showSkinTones: false,
  previewPosition: "none",
  onEmojiSelect: (emoji) => {
    const { selectionStart, selectionEnd } = messageInput;
    messageInput.setRangeText(emoji.native, selectionStart, selectionEnd, "end");
    messageInput.focus();
  },
  onClickOutside: (e) => {
    if (e.target.id === "emoji-picker") {
      document.body.classList.toggle("show-emoji-picker");
    } else {
      document.body.classList.remove("show-emoji-picker");
    }
  },
});

document.querySelector(".chat-form").appendChild(picker);

// === BUTTON EVENTS ===
sendMessageButton.addEventListener("click", handleOutgoingMessage);
document
  .querySelector("#file-upload")
  .addEventListener("click", () => fileInput.click());
chatbotToggler.addEventListener("click", () =>
  document.body.classList.toggle("show-chatbot")
);
closeChatbot.addEventListener("click", () =>
  document.body.classList.remove("show-chatbot")
);
