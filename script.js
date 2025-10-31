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
const API_KEY = "AIzaSyA9EwDo5ErtNWImcDv6Tc8zz9OZmBjPFSA";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

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

        **CHỨC NĂNG CHÍNH:**
        1. Tư vấn sức khỏe:
          - Giải thích triệu chứng bệnh thường gặp
          - Hướng dẫn sơ cứu khẩn cấp
          - Tư vấn dinh dưỡng và chế độ ăn
          - Phân tích hành vi vật nuôi

        2. Gợi ý sản phẩm:
          - Thức ăn và supplement dinh dưỡng
          - Sản phẩm vệ sinh, chăm sóc
          - Phụ kiện và đồ chơi
          - Thuốc thú y thông thường

        3. Chăm sóc khách hàng:
          - Hỗ trợ đặt lịch khám
          - Tư vấn dịch vụ spa, grooming
          - Giải đáp chính sách bảo hành
          - Hướng dẫn sử dụng sản phẩm

        **NGUYÊN TẮC HOẠT ĐỘNG:**
        - KHÔNG chẩn đoán thay thế bác sĩ thú y
        - KHÔNG kê đơn thuốc điều trị
        - Luôn đề xuất đến phòng khám thú y trong trường hợp khẩn cấp
        - Gợi ý sản phẩm phù hợp với nhu cầu cụ thể

        **PHẠM VI KIẾN THỨC:**
        - Chó, mèo, thú cưng nhỏ
        - Cá cảnh và thủy sinh
        - Chim và bò sát cảnh
        - Các giống vật nuôi phổ biến

        Đối với câu hỏi ngoài phạm vi, vui lòng trả lời: "Xin lỗi, tôi chỉ có thể hỗ trợ các vấn đề về thú cưng và chăm sóc vật nuôi."

        Hãy tiếp cận thân thiện, chuyên nghiệp và luôn đặt sức khỏe vật nuôi lên hàng đầu.`
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

  chatHistory.push({
    role: "user",
    parts: [
      { text: userData.message },
      ...(userData.file?.data ? [{ inline_data: userData.file }] : []),
    ],
  });

  // Giới hạn độ dài lịch sử
  if (chatHistory.length > 40) chatHistory.splice(0, chatHistory.length - 40);

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: chatHistory }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error.message);

    const apiText = (data?.candidates?.[0]?.content?.parts?.[0]?.text || "")
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

  // Clear input
  messageInput.value = "";
  messageInput.dispatchEvent(new Event("input"));
  fileUploadWrapper.classList.remove("file-uploaded");

  // Hiển thị tin nhắn người dùng
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

  // Tạo phản hồi bot
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
  const MAX_SIZE = 2 * 1024 * 1024; // 2MB

  if (!validTypes.includes(file.type)) {
    await Swal.fire({ icon: "error", title: "Lỗi", text: "Chỉ chấp nhận ảnh (JPEG, PNG, GIF, WEBP)", confirmButtonText: "OK" });
    return resetFileInput();
  }

  if (file.size > MAX_SIZE) {
    await Swal.fire({ icon: "error", title: "Lỗi", text: "File quá lớn (tối đa 2MB)", confirmButtonText: "OK" });
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
document.querySelector("#file-upload").addEventListener("click", () => fileInput.click());
chatbotToggler.addEventListener("click", () => document.body.classList.toggle("show-chatbot"));
closeChatbot.addEventListener("click", () => document.body.classList.remove("show-chatbot"));
