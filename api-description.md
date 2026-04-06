# Zalo Bot API Description

Dưới đây là tóm tắt các API chính của Zalo Bot (`https://bot-api.zapps.me/bot{token}`):

- **getMe**: Trả về thông tin cơ bản về bot.
- **getUpdates**: Lấy danh sách tin nhắn và sự kiện mới nhất bằng phương pháp polling.
- **setWebhook**: Thiết lập địa chỉ URL để Zalo đẩy tin nhắn về (Webhook).
- **getWebhookInfo**: Lấy thông tin về cấu hình webhook hiện tại.
- **deleteWebhook**: Xóa cấu hình webhook hiện tại (trở lại chế độ polling).
- **sendMessage**: Gửi một tin nhắn văn bản đến một người dùng (`chat_id` và `text`).
- **sendPhoto**: Gửi một bức ảnh thông qua URL (`chat_id`, `photo`).
- **sendSticker**: Gửi một nhãn dán từ bộ sưu tập nhãn dán (`chat_id`, `sticker`).
- **sendChatAction**: Gửi một thông báo trạng thái hoạt động (ví dụ: `typing`).

Tất cả các API này sử dụng phương thức **POST** và nhận tham số dưới dạng đối tượng **JSON**.
Phản hồi mẫu luôn tuân thủ cấu trúc:
```json
{
  "ok": true,
  "result": { ... }
}
```
Hoặc nếu có lỗi:
```json
{
  "ok": false,
  "error_code": 401,
  "description": "Unauthorized"
}
```
