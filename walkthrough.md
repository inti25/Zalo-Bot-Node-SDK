# Zalo Bot Custom Framework (TypeScript)

Do thư viện `node-zalo-bot` (bản NPM) gặp lỗi không tương thích, tôi đã thiết kế cho bạn một bộ framework con (Wrapper) trực tiếp dựa trên API chính thức của Zalo dành cho Bot (`https://bot-api.zapps.me`).

## 1. Cấu trúc Framework (`zalo-bot-custom.ts`)
Bộ mã nguồn này đóng vai trò như một thư viện để bạn dễ dàng gọi các API của Zalo:
- **getMe**: Lấy thông tin về Bot.
- **getUpdates**: Sử dụng chế độ **Long Polling** để lấy tin nhắn mới nhất.
- **sendMessage**: Gửi tin nhắn văn bản (`chat_id` và `text`).
- **sendPhoto**: Gửi ảnh.
- **sendSticker**: Gửi nhãn dán.
- **Webhook Management**: `setWebhook`, `getWebhookInfo`, `deleteWebhook`.

## 2. Cách sử dụng

**File `index.ts` hiện tại được viết lại hoàn toàn để sử dụng framework này:**

```typescript
import ZaloBot from './zalo-bot-custom';

const bot = new ZaloBot(process.env.BOT_TOKEN, {
  polling: true, // Tự động bắt đầu lấy dữ liệu mới
});

// Lắng nghe tin nhắn
bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  if (msg.text) {
    bot.sendMessage(chatId, `Chào bạn! Cảm ơn bạn đã nhắn: ${msg.text}`);
  }
});
```

## 3. Cài đặt và Chạy

1.  **Cài đặt axios**: 
    Thư viện này sử dụng `axios` để thực hiện các cuộc gọi API. Chạy lệnh:
    ```bash
    npm install
    ```
2.  **Cấu hình .env**:
    Đảm bảo file `.env` đã có đúng mã token của bạn.
3.  **Khởi động**:
    ```bash
    npm run dev
    ```

## 4. Chế độ Webhook (Production)
Nếu bạn muốn dùng Webhook thay vì Polling:

```typescript
const bot = new ZaloBot(process.env.BOT_TOKEN, {
  secret_token: 'MY_SECRET_KEY', // Khóa bảo mật tự định nghĩa
});

// Trong route của Express.js (ví dụ)
app.post('/webhook', (req, res) => {
  try {
    // Xác thực và xử lý tin nhắn
    bot.processWebhook(req.body, req.headers);
    res.sendStatus(200);
  } catch (err) {
    console.error('Xác thực Webhook thất bại:', err.message);
    res.sendStatus(403);
  }
});

// Thiết lập webhook URL và mã bí mật lên hệ thống Zalo
bot.setWebhook('https://your-domain.com/webhook', 'MY_SECRET_KEY');
```

## 5. Tại sao framework này tốt hơn?
- Dùng đúng chuẩn API của Zalo (`https://bot-api.zaloplatforms.com`).
- **Hỗ trợ bảo mật**: Tích hợp kiểm tra header `X-Bot-Api-Secret-Token` để tránh bị giả mạo request.
- Hỗ trợ đầy đủ các API quan trọng: `getMe`, `getUpdates`, `sendMessage`, `sendPhoto`, `sendSticker`.
- Viết bằng TypeScript giúp bắt lỗi sớm (Type Safety).
