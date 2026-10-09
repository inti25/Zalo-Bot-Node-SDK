# Zalo Bot Platform API Reference

Tài liệu chi tiết về hệ thống Open APIs của **Zalo Bot Platform** theo chuẩn tài liệu chính thức tại:
https://docs.zaloplatforms.com/docs/BOT/apis/getMe

---

## 1. Thông tin chung & Xác thực

### Định dạng URL
Tất cả các truy vấn đến Zalo Bot API **bắt buộc thực hiện qua giao thức HTTPS**:
```
https://bot-api.zaloplatforms.com/bot<BOT_TOKEN>/<functionName>
```

**Ví dụ:**
```
https://bot-api.zaloplatforms.com/bot123456789:abc123xyz/getMe
```

### Phương thức & Định dạng truyền tải
- **Phương thức HTTP hỗ trợ:** `POST` (khuyến nghị cho các thao tác thay đổi dữ liệu) và `GET` (cho truy xuất dữ liệu). Các ví dụ chính thức đều sử dụng `POST`.
- **Content-Type hỗ trợ:**
  - `application/json` (khuyến nghị)
  - `application/x-www-form-urlencoded`
  - `multipart/form-data` (khi tải file)
  - Query parameters: `?...&...`
- **Encoding:** UTF-8.
- **Tên API (`functionName`):** Có phân biệt chữ hoa và chữ thường (case-sensitive).

### Cấu trúc phản hồi chung
Phản hồi từ Zalo Bot API luôn ở dạng JSON:
```json
{
  "ok": true,
  "result": { ... }
}
```
Khi có lỗi:
```json
{
  "ok": false,
  "error_code": 401,
  "description": "Unauthorized"
}
```

---

## 2. Chi tiết 11 API chính thức

### 2.1. `getMe`
Kiểm tra `Bot Token`. Nếu token hợp lệ, trả về các thông tin cơ bản về Bot của bạn.
- **URL**: `POST https://bot-api.zaloplatforms.com/bot${BOT_TOKEN}/getMe`
- **Headers**: `Content-Type: application/json`
- **Parameters**: Không yêu cầu tham số đi kèm (`{}`).
- **Sample Response**:
  ```json
  {
    "ok": true,
    "result": {
      "id": "1459232241454765289",
      "account_name": "bot.VDKyGxQvc",
      "account_type": "BASIC",
      "can_join_groups": false
    }
  }
  ```

---

### 2.2. `getUpdates`
Lấy danh sách tin nhắn và sự kiện mới nhất dựa trên cơ chế **Long Polling**.
> ⚠️ **Lưu ý**: `getUpdates` không hoạt động nếu bạn đang thiết lập Webhook. Phải gọi `deleteWebhook` trước khi sử dụng. Chỉ nên dùng cho môi trường Local / Development.

- **URL**: `POST https://bot-api.zaloplatforms.com/bot${BOT_TOKEN}/getUpdates`
- **Parameters**:
  | Trường | Kiểu dữ liệu | Bắt buộc | Mô tả |
  |---|---|---|---|
  | `timeout` | Number / String | Không | Thời gian timeout HTTP request tính bằng giây (mặc định: `30`). |
- **Sample Request Payload**:
  ```json
  {
    "timeout": 30
  }
  ```

---

### 2.3. `setWebhook`
Cấu hình Webhook URL nhận thông báo từ Zalo Server. Sau khi lưu, Zalo tự động gửi request kiểm tra và trả về kết quả trong `verification`.
- **URL**: `POST https://bot-api.zaloplatforms.com/bot${BOT_TOKEN}/setWebhook`
- **Parameters**:
  | Trường | Kiểu dữ liệu | Bắt buộc | Mô tả |
  |---|---|---|---|
  | `url` | String | Có | Webhook URL công khai dạng HTTPS (không dùng localhost hay IP nội bộ). |
  | `secret_token` | String | Có | Khóa bí mật (8 - 256 ký tự). Đính kèm trong header `X-Bot-Api-Secret-Token` ở mọi request từ Zalo. |
- **Sample Request Payload**:
  ```json
  {
    "url": "https://your-webhookurl.com",
    "secret_token": "mykey-abcyxz"
  }
  ```
- **Sample Response**:
  ```json
  {
    "ok": true,
    "result": {
      "url": "https://your-webhookurl.com",
      "updated_at": 1749538250568,
      "verification": {
        "ok": true,
        "url": "https://your-webhookurl.com",
        "outcome": "webhook.ok",
        "hint": "Your endpoint responded successfully."
      }
    }
  }
  ```

---

### 2.4. `testWebhook`
Kiểm tra ngay lập tức Webhook URL hiện tại có nhận được request từ Zalo hay không, giúp tự chẩn đoán sự cố WAF, CDN, TLS hoặc kết nối.
> ⚠️ **Giới hạn**: API này bị giới hạn số lần gọi mỗi ngày cho mỗi Bot. Vượt quá sẽ trả về `"ok": false` kèm `"errorCode": 426`.

- **URL**: `POST https://bot-api.zaloplatforms.com/bot${BOT_TOKEN}/testWebhook`
- **Parameters**: Không yêu cầu tham số đi kèm (`{}`).
- **Sample Response (Thành công - 2xx)**:
  ```json
  {
    "ok": true,
    "result": {
      "ok": true,
      "url": "https://your-webhookurl.com",
      "outcome": "webhook.ok",
      "hint": "Your endpoint responded successfully."
    }
  }
  ```
- **Sample Response (Bị chặn 403)**:
  ```json
  {
    "ok": true,
    "result": {
      "ok": false,
      "url": "https://your-webhookurl.com",
      "outcome": "webhook.http.403",
      "hint": "Your server or CDN rejected the request with 403. Check WAF / Cloudflare rules, any IP allowlist, and that the User-Agent \"Java/<version>\" is permitted."
    }
  }
  ```
- **Bảng mã `outcome`**:
  | Outcome | Ý nghĩa |
  |---|---|
  | `webhook.ok` | Phản hồi mã 2xx thành công |
  | `webhook.http.403` | Server/CDN từ chối với mã 403 (WAF, IP allowlist, User-Agent Java) |
  | `webhook.http.404` | Endpoint trả về 404 hoặc không nhận POST |
  | `webhook.http.5xx` | Server gặp lỗi khi xử lý request |
  | `webhook.http.other` | Server trả về mã khác (ví dụ redirect 3xx) |
  | `webhook.err.tls` | Lỗi chứng chỉ TLS / SSL chain |
  | `webhook.err.unreachable` | Không phân giải được hostname hoặc quá thời gian kết nối |

---

### 2.5. `deleteWebhook`
Gỡ bỏ thiết lập Webhook để chuyển lại chế độ polling với `getUpdates`.
- **URL**: `POST https://bot-api.zaloplatforms.com/bot${BOT_TOKEN}/deleteWebhook`
- **Parameters**: Không yêu cầu tham số đi kèm (`{}`).
- **Sample Response**:
  ```json
  {
    "ok": true,
    "result": {
      "url": "",
      "updated_at": 1749538250568
    }
  }
  ```

---

### 2.6. `getWebhookInfo`
Lấy trạng thái cấu hình hiện tại của Webhook.
- **URL**: `POST https://bot-api.zaloplatforms.com/bot${BOT_TOKEN}/getWebhookInfo`
- **Parameters**: Không yêu cầu tham số đi kèm (`{}`).
- **Sample Response**:
  ```json
  {
    "ok": true,
    "result": {
      "url": "https://your-webhookurl.com",
      "updated_at": 1749633372026
    }
  }
  ```

---

### 2.7. `sendMessage`
Gửi tin nhắn văn bản đến người dùng hoặc cuộc trò chuyện. Hỗ trợ định dạng Rich Text qua `parse_mode` hoặc `text_styles`.
- **URL**: `POST https://bot-api.zaloplatforms.com/bot${BOT_TOKEN}/sendMessage`
- **Parameters**:
  | Trường | Kiểu dữ liệu | Bắt buộc | Mô tả |
  |---|---|---|---|
  | `chat_id` | String | Có | ID của người nhận hoặc cuộc trò chuyện |
  | `text` | String | Có | Nội dung văn bản (độ dài 1 đến 2000 ký tự) |
  | `parse_mode` | String | Không | `markdown` hoặc `html`. Server tự động phân tích và loại bỏ markup |
  | `text_styles` | Array | Không | Danh sách các style run áp trực tiếp lên văn bản thô (bị bỏ qua nếu có `parse_mode`) |
- **Sample Request (Markdown)**:
  ```json
  {
    "chat_id": "abc.xyz",
    "parse_mode": "markdown",
    "text": "**Xin chào** _bạn_, đây là tin nhắn ~~gạch ngang~~"
  }
  ```
- **Sample Request (`text_styles`)**:
  ```json
  {
    "chat_id": "abc.xyz",
    "text": "Xin chào bạn",
    "text_styles": [
      { "start": 0, "len": 7, "st": ["b", "c_db342e"] }
    ]
  }
  ```
- **Sample Response**:
  ```json
  {
    "ok": true,
    "result": {
      "message_id": "82599fa32f56d00e8941",
      "date": 1749632637199
    }
  }
  ```

#### Cú pháp Markdown hỗ trợ:
- `**đậm**`, `__đậm__`
- `*nghiêng*`, `_nghiêng_`
- `***đậm nghiêng***`
- `~~gạch ngang~~`
- `` `code` ``
- `# Tiêu đề` … `#### Tiêu đề`
- `- mục`, `* mục`, `+ mục`, `1. mục`
- `> trích dẫn`
- `{red}…{/red}`, `{orange}…{/orange}`, `{yellow}…{/yellow}`, `{green}…{/green}`
- `{big}…{/big}`, `{underline}…{/underline}`

#### Thẻ HTML hỗ trợ:
- `<b>`, `<strong>`, `<i>`, `<em>`, `<u>`, `<s>`, `<del>`, `<strike>`
- `<h1>`–`<h6>`, `<ul>`, `<ol>`, `<li>`, `<p>`, `<div>`
- `style="..."` (`font-size`, `font-weight`, `font-style`, `text-decoration`, `color`)

#### Mã định dạng `text_styles` (`st`):
- Kiểu chữ: `b` (đậm), `i` (nghiêng), `u` (gạch chân), `s` (gạch ngang)
- Cỡ chữ: `f_13` (nhỏ), `f_15` (thường), `f_18` (lớn), `f_20` (rất lớn)
- Màu sắc: `c_050a19` (mặc định), `c_15a85f` (xanh lá), `c_f7b503` (vàng), `c_f27806` (cam), `c_db342e` (đỏ)
- Danh sách & Thụt lề: `lst_1`, `lst_2`, `ind_1` ... `ind_5`

---

### 2.8. `sendPhoto`
Gửi tin nhắn hình ảnh bằng URL.
- **URL**: `POST https://bot-api.zaloplatforms.com/bot${BOT_TOKEN}/sendPhoto`
- **Parameters**:
  | Trường | Kiểu dữ liệu | Bắt buộc | Mô tả |
  |---|---|---|---|
  | `chat_id` | String | Có | ID của người nhận hoặc cuộc trò chuyện |
  | `photo` | String | Có | URL hình ảnh |
  | `caption` | String | Không | Chú thích kèm theo hình ảnh (1 đến 2000 ký tự) |
- **Sample Request**:
  ```json
  {
    "chat_id": "abc.xyz",
    "photo": "https://placehold.co/600x400",
    "caption": "Hình ảnh minh họa"
  }
  ```
- **Sample Response**:
  ```json
  {
    "ok": true,
    "result": {
      "message_id": "82599fa32f56d00e8941",
      "date": 1749632637199
    }
  }
  ```

---

### 2.9. `sendSticker`
Gửi tin nhắn Sticker lấy từ kho sticker Zalo (`https://stickers.zaloapp.com/`).
- **URL**: `POST https://bot-api.zaloplatforms.com/bot${BOT_TOKEN}/sendSticker`
- **Parameters**:
  | Trường | Kiểu dữ liệu | Bắt buộc | Mô tả |
  |---|---|---|---|
  | `chat_id` | String | Có | ID của người nhận hoặc cuộc trò chuyện |
  | `sticker` | String | Có | Mã sticker ID lấy từ kho stickers Zalo |
- **Sample Request**:
  ```json
  {
    "chat_id": "abc.xyz",
    "sticker": "0e078a2fb66a5f34067b"
  }
  ```
- **Sample Response**:
  ```json
  {
    "ok": true,
    "result": {
      "message_id": "82599fa32f56d00e8941",
      "date": 1749632637199
    }
  }
  ```

---

### 2.10. `sendChatAction`
Hiển thị trạng thái hoạt động tạm thời trong cuộc trò chuyện (như đang gõ tin nhắn).
- **URL**: `POST https://bot-api.zaloplatforms.com/bot${BOT_TOKEN}/sendChatAction`
- **Parameters**:
  | Trường | Kiểu dữ liệu | Bắt buộc | Mô tả |
  |---|---|---|---|
  | `chat_id` | String | Có | ID của người nhận hoặc cuộc trò chuyện |
  | `action` | String | Có | Loại hành động: `typing` (tin nhắn văn bản), `upload_photo` (ảnh - sắp ra mắt) |
- **Sample Request**:
  ```json
  {
    "chat_id": "abc.xyz",
    "action": "typing"
  }
  ```
- **Sample Response**:
  ```json
  {
    "ok": true
  }
  ```

---

### 2.11. `sendVoice`
Gửi tin nhắn thoại đến người dùng trong cuộc trò chuyện 1-1.
> ⚠️ **Giới hạn**: Chỉ hỗ trợ gửi tin nhắn thoại trong cuộc trò chuyện 1-1. **Không hỗ trợ gửi vào nhóm chat**. Tệp âm thanh bắt buộc có định dạng `.aac`.

- **URL**: `POST https://bot-api.zaloplatforms.com/bot${BOT_TOKEN}/sendVoice`
- **Parameters**:
  | Trường | Kiểu dữ liệu | Bắt buộc | Mô tả |
  |---|---|---|---|
  | `chat_id` | String | Có | ID người nhận (1-1, không hỗ trợ nhóm) |
  | `voice_url` | String | Có | Đường dẫn hợp lệ đến tệp âm thanh có phần mở rộng `.aac` |
- **Sample Request**:
  ```json
  {
    "chat_id": "abc.xyz",
    "voice_url": "https://example.com/audio.aac"
  }
  ```
- **Sample Response**:
  ```json
  {
    "ok": true,
    "result": {
      "message_id": "82599fa32f56d00e8941",
      "date": 1749632637199
    }
  }
  ```

---

## 3. Webhook Events & Payload

Khi có sự kiện mới, Zalo gửi POST request đến Webhook URL đã thiết lập, kèm theo header:
```http
X-Bot-Api-Secret-Token: <secret_token>
```

### Các sự kiện (`event_name`):
1. `message.text.received`: Nhận tin nhắn văn bản.
2. `message.image.received`: Nhận tin nhắn hình ảnh (`photo`, `caption`).
3. `message.sticker.received`: Nhận tin nhắn Sticker (`sticker`, `url`).
4. `message.voice.received`: Nhận tin nhắn thoại (`voice_url`).
5. `message.unsupported.received`: Nhận tin nhắn từ nhóm đối tượng đặc biệt (trẻ em, bảo vệ dữ liệu theo luật).

### Cấu trúc Webhook Payload:
```json
{
  "ok": true,
  "result": {
    "event_name": "message.text.received",
    "message": {
      "from": {
        "id": "6ede9afa66b88fe6d6a9",
        "display_name": "Ted",
        "is_bot": false
      },
      "chat": {
        "id": "6ede9afa66b88fe6d6a9",
        "chat_type": "PRIVATE"
      },
      "text": "Xin chào",
      "message_id": "2d758cb5e222177a4e35",
      "date": 1750316131602
    }
  }
}
```

---

## 4. Bảng mã lỗi hệ thống (Error Codes)

| Mã lỗi | Tên lỗi | Ý nghĩa |
|---|---|---|
| `400` | Bad request | Sai đường dẫn hoặc API Name không hợp lệ |
| `401` | Unauthorized | Token đã hết hạn hoặc không hợp lệ |
| `403` | Internal server error | Lỗi nội bộ hệ thống |
| `404` | Not found | Yêu cầu truy cập không hợp lệ |
| `408` | Request timeout | Quá thời gian xử lý cho phép |
| `426` | Upgrade Required / Rate Limit | Vượt quá giới hạn số lượt gọi API testWebhook trong ngày |
| `429` | Quota exceeded | Vượt quá giới hạn sử dụng API cho phép |
