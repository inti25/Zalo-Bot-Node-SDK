/**
 * Options for creating a ZaloBot instance
 */
export interface ZaloBotOptions {
  /** Enable long-polling mode at startup */
  polling?: boolean;
  /** Interval (ms) between poll retries. Default: 1000 */
  polling_interval?: number;
  /** Timeout (s) for each long-poll request. Default: 30 */
  polling_timeout?: number;
  /** Override the full API base URL (e.g. `https://bot-api.zaloplatforms.com/bot<token>`) */
  apiBase?: string;
  /** Secret token for webhook request verification (8 to 256 characters) */
  secret_token?: string;
}

/**
 * Thông tin cơ bản về Bot trả về từ API `getMe`
 */
export interface BotInfo {
  /** ID duy nhất của Bot */
  id: string;
  /** Tên tài khoản bot (ví dụ: bot.VDKyGxQvc) */
  account_name: string;
  /** Loại tài khoản (ví dụ: BASIC) */
  account_type?: 'BASIC' | string;
  /** Cho biết bot có quyền tham gia vào nhóm hay không */
  can_join_groups?: boolean;
  /** Tương thích ngược */
  is_bot?: boolean;
  first_name?: string;
  username?: string;
}

/**
 * Thông tin người dùng gửi tin nhắn
 */
export interface User {
  /** ID người dùng Zalo */
  id: string;
  /** Tên hiển thị người dùng (display_name) */
  display_name?: string;
  /** Cho biết có phải bot không */
  is_bot?: boolean;
  /** Tương thích ngược */
  first_name?: string;
  last_name?: string;
  username?: string;
}

export type ChatType = 'PRIVATE' | 'GROUP' | string;

/**
 * Thông tin cuộc trò chuyện
 */
export interface Chat {
  /** ID của người nhận hoặc nhóm chat */
  id: string;
  /** Loại cuộc hội thoại: PRIVATE (cá nhân) hoặc GROUP (nhóm) */
  chat_type?: ChatType;
  /** Tương thích ngược */
  type?: string;
  title?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
}

/**
 * Mã định dạng văn bản (style run code) hỗ trợ trong `text_styles`
 */
export type TextStyleCode =
  | 'b' // In đậm
  | 'i' // In nghiêng
  | 'u' // Gạch chân
  | 's' // Gạch ngang
  | 'f_13' // Cỡ chữ nhỏ
  | 'f_15' // Cỡ chữ thường
  | 'f_18' // Cỡ chữ lớn
  | 'f_20' // Cỡ chữ rất lớn
  | 'c_050a19' // Màu mặc định
  | 'c_15a85f' // Màu xanh lá
  | 'c_f7b503' // Màu vàng
  | 'c_f27806' // Màu cam
  | 'c_db342e' // Màu đỏ
  | 'lst_1' // Danh sách không thứ tự
  | 'lst_2' // Danh sách có thứ tự
  | 'ind_1' // Thụt lề cấp 1
  | 'ind_2' // Thụt lề cấp 2
  | 'ind_3' // Thụt lề cấp 3
  | 'ind_4' // Thụt lề cấp 4
  | 'ind_5' // Thụt lề cấp 5
  | string;

/**
 * Định dạng trực tiếp cho từng đoạn văn bản thô
 */
export interface TextStyle {
  /** Vị trí bắt đầu của đoạn theo UTF-16 code unit */
  start: number;
  /** Độ dài của đoạn theo UTF-16 code unit */
  len: number;
  /** Danh sách các mã định dạng áp dụng cho đoạn, ví dụ: ["b", "c_db342e"] */
  st: TextStyleCode[];
}

export type ParseMode = 'markdown' | 'html' | 'Markdown' | 'HTML';

/**
 * Các tham số tùy chọn khi gọi API `sendMessage`
 */
export interface SendMessageOptions {
  /**
   * Định dạng văn bản tự động phân tích: 'markdown' hoặc 'html'.
   * Khi gửi cả parse_mode và text_styles, parse_mode sẽ được ưu tiên.
   */
  parse_mode?: ParseMode;
  /** Danh sách các đoạn style run áp dụng trực tiếp lên text dạng thô */
  text_styles?: TextStyle[];
  /** Tắt thông báo người nhận */
  disable_notification?: boolean;
  /** ID tin nhắn cần reply */
  reply_to_message_id?: number | string;
}

/**
 * Các tham số tùy chọn khi gọi API `sendPhoto`
 */
export interface SendPhotoOptions {
  /** Chú thích kèm theo hình ảnh (1 đến 2000 ký tự) */
  caption?: string;
  /** Định dạng văn bản của chú thích */
  parse_mode?: ParseMode;
  /** Tắt thông báo */
  disable_notification?: boolean;
}

/**
 * Hành động trạng thái trò chuyện cho API `sendChatAction`
 */
export type ChatAction = 'typing' | 'upload_photo' | string;

/**
 * Kết quả trả về sau khi gửi tin nhắn thành công
 */
export interface MessageResult {
  /** ID tin nhắn được tạo bởi hệ thống Zalo */
  message_id: string;
  /** Thời điểm gửi tin nhắn (timestamp in milliseconds) */
  date: number;
}

export interface PhotoSize {
  file_id: string;
  file_unique_id: string;
  width: number;
  height: number;
  file_size?: number;
}

export interface Sticker {
  file_id: string;
  file_unique_id: string;
  width: number;
  height: number;
  is_animated?: boolean;
  is_video?: boolean;
  emoji?: string;
  set_name?: string;
  file_size?: number;
}

/**
 * Cấu trúc tin nhắn nhận được từ Webhook hoặc Polling
 */
export interface Message {
  /** ID tin nhắn */
  message_id?: string | number;
  /** Người gửi */
  from?: User;
  /** Cuộc trò chuyện */
  chat?: Chat;
  /** Thời gian (timestamp ms) */
  date?: number;
  /** Nội dung văn bản */
  text?: string;
  /** Đường dẫn hình ảnh hoặc mảng ảnh */
  photo?: string | PhotoSize[];
  /** Chú thích hình ảnh */
  caption?: string;
  /** ID nhãn dán hoặc đối tượng Sticker */
  sticker?: string | Sticker;
  /** Đường dẫn sticker */
  url?: string;
  /** Đường dẫn tệp tin âm thanh thoại (.aac) */
  voice_url?: string;
}

/**
 * Các tên sự kiện webhook Zalo Bot
 */
export type WebhookEventName =
  | 'message.text.received'
  | 'message.image.received'
  | 'message.sticker.received'
  | 'message.voice.received'
  | 'message.unsupported.received'
  | string;

/**
 * Dữ liệu sự kiện nhận được từ Webhook hoặc getUpdates
 */
export interface Update {
  update_id?: number;
  /** Tên sự kiện (ví dụ: message.text.received) */
  event_name?: WebhookEventName;
  /** Nội dung chi tiết tin nhắn */
  message?: Message;
}

/**
 * Mã phân loại kết quả kiểm tra Webhook endpoint
 */
export type WebhookOutcome =
  | 'webhook.ok'
  | 'webhook.http.403'
  | 'webhook.http.404'
  | 'webhook.http.5xx'
  | 'webhook.http.other'
  | 'webhook.err.tls'
  | 'webhook.err.unreachable'
  | string;

/**
 * Chi tiết xác thực endpoint webhook
 */
export interface WebhookVerification {
  /** true nếu endpoint phản hồi HTTP 2xx */
  ok: boolean;
  /** URL webhook đang được kiểm tra */
  url: string;
  /** Mã phân loại kết quả */
  outcome: WebhookOutcome;
  /** Gợi ý chẩn đoán lỗi */
  hint: string;
}

/**
 * Kết quả trả về từ API `setWebhook`
 */
export interface SetWebhookResult {
  /** URL webhook vừa thiết lập */
  url: string;
  /** Thời gian cập nhật (timestamp ms) */
  updated_at: number;
  /** Kết quả kiểm tra endpoint tự động */
  verification?: WebhookVerification;
}

/**
 * Kết quả trả về từ API `testWebhook`
 */
export interface TestWebhookResult {
  /** true nếu endpoint webhook phản hồi HTTP 2xx */
  ok: boolean;
  /** URL webhook đang được kiểm tra */
  url: string;
  /** Mã phân loại kết quả */
  outcome: WebhookOutcome;
  /** Gợi ý chẩn đoán lỗi */
  hint: string;
}

/**
 * Kết quả trả về từ API `deleteWebhook`
 */
export interface DeleteWebhookResult {
  /** URL sau khi xóa (chuỗi rỗng) */
  url: string;
  /** Thời gian cập nhật */
  updated_at: number;
}

/**
 * Thông tin trạng thái cấu hình hiện tại của Webhook từ `getWebhookInfo`
 */
export interface WebhookInfo {
  /** Webhook URL hiện tại */
  url: string;
  /** Thời gian cập nhật gần nhất */
  updated_at?: number;
  /** Tương thích ngược */
  has_custom_certificate?: boolean;
  pending_update_count?: number;
  last_error_date?: number;
  last_error_message?: string;
}

/**
 * Cấu trúc phản hồi chung từ Zalo Bot API
 */
export interface ZaloApiResponse<T = unknown> {
  ok: boolean;
  result?: T;
  error_code?: number;
  description?: string;
}
