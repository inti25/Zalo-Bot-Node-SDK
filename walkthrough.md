# Zalo Bot TypeScript SDK - Kiến trúc & Hướng dẫn sử dụng

Dự án này là bộ SDK TypeScript hoàn chỉnh, chính xác theo tài liệu chính thức của **Zalo Bot Platform** tại:
https://docs.zaloplatforms.com/docs/BOT/apis/getMe

---

## 1. Cấu trúc mã nguồn

- [src/types.ts](file:///d:/github/zalo_bot/src/types.ts): Định nghĩa kiểu dữ liệu (TypeScript Interfaces) cho toàn bộ 11 API, các sự kiện webhook, enum lỗi, mã định dạng văn bản (Markdown, HTML, `text_styles`).
- [src/ZaloBot.ts](file:///d:/github/zalo_bot/src/ZaloBot.ts): Lớp chính [ZaloBot](file:///d:/github/zalo_bot/src/ZaloBot.ts) kế thừa `EventEmitter`, tích hợp HTTP client qua Axios, hỗ trợ cả cơ chế **Long Polling** và **Webhook**, tự động thử lại khi mất mạng (exponential backoff) và các helper method tiện lợi như `onText`.
- [src/errors.ts](file:///d:/github/zalo_bot/src/errors.ts): Lớp lỗi [ZaloBotError](file:///d:/github/zalo_bot/src/errors.ts) chứa mã lỗi (`errorCode`), tên phương thức API (`method`) và mô tả lỗi.
- [src/index.ts](file:///d:/github/zalo_bot/src/index.ts): Điểm xuất khẩu (entrypoint) chính của thư viện.
- [api-description.md](file:///d:/github/zalo_bot/api-description.md): Tài liệu đặc tả kỹ thuật chi tiết cho tất cả API của Zalo Bot.
- [example/basic.ts](file:///d:/github/zalo_bot/example/basic.ts): File ví dụ thực tế sử dụng cả chế độ Polling và Webhook.

---

## 2. Danh sách 11 API chính thức đã tích hợp

1. **`getMe()`**: Trả về thông tin cơ bản về bot (`id`, `account_name`, `account_type`, `can_join_groups`).
2. **`getUpdates(offset?, timeout?)`**: Lấy danh sách tin nhắn và sự kiện theo cơ chế Long Polling.
3. **`setWebhook(url, secretToken?)`**: Đăng ký URL webhook và nhận kết quả kiểm tra `verification`.
4. **`testWebhook()`**: Tự chẩn đoán kiểm tra kết nối giữa Zalo server và Webhook endpoint (phát hiện WAF/CDN 403, TLS error, timeout).
5. **`deleteWebhook()`**: Gỡ bỏ webhook để chuyển sang chế độ Long Polling.
6. **`getWebhookInfo()`**: Lấy thông tin cấu hình webhook hiện tại.
7. **`sendMessage(chat_id, text, options?)`**: Gửi tin nhắn văn bản, hỗ trợ định dạng Rich Text qua `parse_mode` (`markdown`, `html`) hoặc `text_styles`.
8. **`sendPhoto(chat_id, photo, options?)`**: Gửi ảnh qua URL kèm chú thích.
9. **`sendSticker(chat_id, sticker)`**: Gửi nhãn dán từ kho stickers Zalo.
10. **`sendChatAction(chat_id, action)`**: Báo hiệu trạng thái hoạt động tạm thời (`typing`, `upload_photo`).
11. **`sendVoice(chat_id, voice_url)`**: Gửi tin nhắn thoại định dạng `.aac` (cuộc trò chuyện 1-1).

---

## 3. Cách sử dụng

### 3.1. Chế độ Long Polling (Development)

```typescript
import { ZaloBot } from 'zalo-bot-node-sdk';

const bot = new ZaloBot(process.env.BOT_TOKEN!, {
  polling: false,
});

// Xóa webhook cũ trước khi chạy polling
await bot.deleteWebhook();
bot.startPolling();

// Đăng ký lệnh với Regular Expression
bot.onText(/\/echo (.+)/, (msg, match) => {
  const text = match ? match[1] : '';
  bot.sendMessage(msg.chat!.id, `Bạn vừa nói: ${text}`);
});

// Gửi tin nhắn có định dạng Markdown
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(
    msg.chat!.id,
    `**Xin chào ${msg.from?.display_name}!** Chúc bạn một ngày tốt lành!`,
    { parse_mode: 'markdown' }
  );
});

// Bắt sự kiện hình ảnh, sticker, voice
bot.on('photo', (msg) => console.log('Ảnh nhận được:', msg.photo));
bot.on('voice', (msg) => console.log('Tin nhắn thoại:', msg.voice_url));
```

### 3.2. Chế độ Webhook (Production)

```typescript
import express from 'express';
import { ZaloBot } from 'zalo-bot-node-sdk';

const app = express();
app.use(express.json());

const bot = new ZaloBot(process.env.BOT_TOKEN!, {
  secret_token: 'MY_SECRET_KEY_123',
});

app.post('/webhook', (req, res) => {
  try {
    // Tự động kiểm tra header X-Bot-Api-Secret-Token
    bot.processWebhook(req.body, req.headers as Record<string, string>);
    res.sendStatus(200);
  } catch (err) {
    console.error('Xác thực Webhook thất bại:', err);
    res.sendStatus(403);
  }
});

app.listen(3000, async () => {
  // Cài đặt Webhook URL
  const setResult = await bot.setWebhook('https://your-domain.com/webhook');
  console.log('Cấu hình Webhook:', setResult);

  // Tự chẩn đoán trạng thái Webhook
  const testResult = await bot.testWebhook();
  console.log('Kết quả kiểm tra:', testResult.outcome, testResult.hint);
});
```

---

## 4. Biên dịch & Kiểm thử

```bash
# Cài đặt thư viện
npm install

# Biên dịch TypeScript sang JavaScript trong thư mục dist/
npm run build

# Chạy thử nghiệm
npm run example
```
