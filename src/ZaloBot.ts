import axios, { AxiosInstance } from 'axios';
import EventEmitter from 'events';

import { ZaloBotError } from './errors';
import type {
  BotInfo,
  ChatAction,
  DeleteWebhookResult,
  Message,
  MessageResult,
  SendMessageOptions,
  SendPhotoOptions,
  SetWebhookResult,
  TestWebhookResult,
  Update,
  WebhookInfo,
  ZaloApiResponse,
  ZaloBotOptions,
} from './types';

const DEFAULT_API_BASE = 'https://bot-api.zaloplatforms.com/bot';
const DEFAULT_POLLING_TIMEOUT = 30; // seconds
const DEFAULT_POLLING_INTERVAL = 1000; // ms
const MAX_BACKOFF_MS = 60_000;

interface TextHandler {
  regexp: RegExp;
  callback: (msg: Message, match: RegExpExecArray | null) => void;
}

// ---------------------------------------------------------------------------
// Typed event declarations via interface merging
// ---------------------------------------------------------------------------
export declare interface ZaloBot {
  on(event: 'message', listener: (message: Message) => void): this;
  on(event: 'text', listener: (message: Message) => void): this;
  on(event: 'photo', listener: (message: Message) => void): this;
  on(event: 'sticker', listener: (message: Message) => void): this;
  on(event: 'voice', listener: (message: Message) => void): this;
  on(event: 'unsupported', listener: (update: Update) => void): this;
  on(event: 'update', listener: (update: Update) => void): this;
  on(event: 'error', listener: (error: ZaloBotError | Error) => void): this;
  on(event: string, listener: (...args: unknown[]) => void): this;

  once(event: 'message', listener: (message: Message) => void): this;
  once(event: 'text', listener: (message: Message) => void): this;
  once(event: 'photo', listener: (message: Message) => void): this;
  once(event: 'sticker', listener: (message: Message) => void): this;
  once(event: 'voice', listener: (message: Message) => void): this;
  once(event: 'unsupported', listener: (update: Update) => void): this;
  once(event: 'update', listener: (update: Update) => void): this;
  once(event: 'error', listener: (error: ZaloBotError | Error) => void): this;
  once(event: string, listener: (...args: unknown[]) => void): this;

  emit(event: 'message', message: Message): boolean;
  emit(event: 'text', message: Message): boolean;
  emit(event: 'photo', message: Message): boolean;
  emit(event: 'sticker', message: Message): boolean;
  emit(event: 'voice', message: Message): boolean;
  emit(event: 'unsupported', update: Update): boolean;
  emit(event: 'update', update: Update): boolean;
  emit(event: 'error', error: ZaloBotError | Error): boolean;
  emit(event: string, ...args: unknown[]): boolean;
}

// ---------------------------------------------------------------------------
// Main class
// ---------------------------------------------------------------------------
export class ZaloBot extends EventEmitter {
  private readonly token: string;
  private readonly apiBase: string;
  private readonly secret_token?: string;
  private readonly pollingTimeout: number;
  private readonly pollingInterval: number;
  private readonly httpClient: AxiosInstance;
  private readonly textHandlers: TextHandler[] = [];

  private isPolling = false;
  private lastUpdateId = -1;

  constructor(token: string, options: ZaloBotOptions = {}) {
    super();

    if (!token) {
      throw new Error('Bot token is required');
    }

    this.token = token;
    this.secret_token = options.secret_token;
    this.apiBase = options.apiBase ?? `${DEFAULT_API_BASE}${this.token}`;
    this.pollingTimeout = options.polling_timeout ?? DEFAULT_POLLING_TIMEOUT;
    this.pollingInterval = options.polling_interval ?? DEFAULT_POLLING_INTERVAL;

    this.httpClient = axios.create({
      headers: { 'Content-Type': 'application/json' },
      // Give a bit of headroom beyond the long-poll timeout
      timeout: (this.pollingTimeout + 10) * 1000,
    });

    if (options.polling) {
      this.startPolling();
    }
  }

  // ---------------------------------------------------------------------------
  // Core API caller
  // ---------------------------------------------------------------------------
  private async callApi<T = unknown>(
    method: string,
    data: Record<string, unknown> = {},
  ): Promise<T> {
    try {
      const response = await this.httpClient.post<ZaloApiResponse<T>>(
        `${this.apiBase}/${method}`,
        data,
      );

      const { ok, result, description, error_code } = response.data;

      if (!ok) {
        throw new ZaloBotError(method, description ?? 'Unknown API error', error_code);
      }

      // Some APIs like sendChatAction only return { ok: true } without a result payload
      return (result !== undefined ? result : (true as unknown)) as T;
    } catch (error) {
      if (error instanceof ZaloBotError) {
        this.emit('error', error);
        throw error;
      }

      if (axios.isAxiosError(error)) {
        const apiData = error.response?.data as
          | { description?: string; error_code?: number }
          | undefined;
        const botError = new ZaloBotError(
          method,
          apiData?.description ?? error.message,
          apiData?.error_code ?? error.response?.status,
        );
        this.emit('error', botError);
        throw botError;
      }

      const wrapped = error instanceof Error ? error : new Error(String(error));
      this.emit('error', wrapped);
      throw wrapped;
    }
  }

  // ---------------------------------------------------------------------------
  // 1. getMe
  // ---------------------------------------------------------------------------
  /**
   * Kiểm tra Bot Token, nếu token hợp lệ sẽ trả về các thông tin cơ bản về Bot của bạn.
   * Tham khảo: https://docs.zaloplatforms.com/docs/BOT/apis/getMe
   */
  getMe(): Promise<BotInfo> {
    return this.callApi<BotInfo>('getMe');
  }

  // ---------------------------------------------------------------------------
  // 2. getUpdates (long-polling)
  // ---------------------------------------------------------------------------
  /**
   * Lấy danh sách tin nhắn và sự kiện mới nhất dựa trên cơ chế Long Polling.
   * Tham khảo: https://docs.zaloplatforms.com/docs/BOT/apis/getUpdates
   * @param offset Vị trí bắt đầu của update
   * @param timeout Thời gian timeout của HTTP Request tính theo giây (mặc định 30s)
   */
  getUpdates(offset?: number, timeout?: number): Promise<Update | Update[]> {
    const payload: Record<string, unknown> = {
      timeout: timeout ?? this.pollingTimeout,
    };
    if (offset !== undefined) {
      payload.offset = offset;
    }
    return this.callApi<Update | Update[]>('getUpdates', payload);
  }

  // ---------------------------------------------------------------------------
  // 3. setWebhook
  // ---------------------------------------------------------------------------
  /**
   * Cấu hình Webhook URL cho Bot của bạn.
   * Hệ thống sẽ tự động gửi thử một request tới Webhook URL và trả về kết quả verification.
   * Tham khảo: https://docs.zaloplatforms.com/docs/BOT/apis/setWebhook
   * @param url Webhook URL công khai dạng HTTPS
   * @param secretToken Khóa bí mật (8 - 256 ký tự) để xác thực request từ Zalo qua header X-Bot-Api-Secret-Token
   */
  setWebhook(url: string, secretToken?: string): Promise<SetWebhookResult> {
    const payload: Record<string, unknown> = { url };
    const token = secretToken ?? this.secret_token;
    if (token) {
      payload.secret_token = token;
    }
    return this.callApi<SetWebhookResult>('setWebhook', payload);
  }

  // ---------------------------------------------------------------------------
  // 4. testWebhook
  // ---------------------------------------------------------------------------
  /**
   * Kiểm tra ngay lập tức Webhook URL hiện tại của Bot có nhận được request từ Zalo hay không.
   * Giúp tự chẩn đoán lỗi WAF/CDN, lỗi TLS, hoặc unreachable.
   * Lưu ý: API này bị giới hạn số lần gọi mỗi ngày cho mỗi Bot (lỗi 426 nếu vượt quá).
   * Tham khảo: https://docs.zaloplatforms.com/docs/BOT/apis/testWebhook
   */
  testWebhook(): Promise<TestWebhookResult> {
    return this.callApi<TestWebhookResult>('testWebhook');
  }

  // ---------------------------------------------------------------------------
  // 5. deleteWebhook
  // ---------------------------------------------------------------------------
  /**
   * Gỡ bỏ thiết lập webhook nếu bạn quyết định chuyển lại sang getUpdates.
   * Tham khảo: https://docs.zaloplatforms.com/docs/BOT/apis/deleteWebhook
   */
  deleteWebhook(): Promise<DeleteWebhookResult> {
    return this.callApi<DeleteWebhookResult>('deleteWebhook');
  }

  // ---------------------------------------------------------------------------
  // 6. getWebhookInfo
  // ---------------------------------------------------------------------------
  /**
   * Lấy trạng thái cấu hình hiện tại của webhook.
   * Tham khảo: https://docs.zaloplatforms.com/docs/BOT/apis/getWebhookInfo
   */
  getWebhookInfo(): Promise<WebhookInfo> {
    return this.callApi<WebhookInfo>('getWebhookInfo');
  }

  // ---------------------------------------------------------------------------
  // 7. sendMessage
  // ---------------------------------------------------------------------------
  /**
   * Gửi tin nhắn văn bản đến người dùng hoặc các cuộc trò chuyện.
   * Hỗ trợ định dạng Rich Text qua parse_mode ('markdown' | 'html') hoặc text_styles.
   * Tham khảo: https://docs.zaloplatforms.com/docs/BOT/apis/sendMessage
   * @param chat_id ID của người nhận hoặc cuộc trò chuyện
   * @param text Nội dung văn bản của tin nhắn (1 đến 2000 ký tự)
   * @param options Các tham số tùy chọn (parse_mode, text_styles, ...)
   */
  sendMessage(
    chat_id: string,
    text: string,
    options?: SendMessageOptions,
  ): Promise<MessageResult> {
    return this.callApi<MessageResult>('sendMessage', { chat_id, text, ...options });
  }

  // ---------------------------------------------------------------------------
  // 8. sendPhoto
  // ---------------------------------------------------------------------------
  /**
   * Gửi tin nhắn hình ảnh đến người dùng hoặc các cuộc trò chuyện.
   * Tham khảo: https://docs.zaloplatforms.com/docs/BOT/apis/sendPhoto
   * @param chat_id ID của người nhận hoặc cuộc trò chuyện
   * @param photo Đường dẫn hình ảnh sẽ được gửi
   * @param options Chú thích hình ảnh (caption) và định dạng
   */
  sendPhoto(
    chat_id: string,
    photo: string,
    options?: SendPhotoOptions,
  ): Promise<MessageResult> {
    return this.callApi<MessageResult>('sendPhoto', { chat_id, photo, ...options });
  }

  // ---------------------------------------------------------------------------
  // 9. sendSticker
  // ---------------------------------------------------------------------------
  /**
   * Gửi tin nhắn Sticker đến người dùng hoặc các cuộc trò chuyện.
   * Tham khảo: https://docs.zaloplatforms.com/docs/BOT/apis/sendSticker
   * @param chat_id ID của người nhận hoặc cuộc trò chuyện
   * @param sticker ID sticker lấy từ nguồn https://stickers.zaloapp.com/
   */
  sendSticker(chat_id: string, sticker: string): Promise<MessageResult> {
    return this.callApi<MessageResult>('sendSticker', { chat_id, sticker });
  }

  // ---------------------------------------------------------------------------
  // 10. sendChatAction
  // ---------------------------------------------------------------------------
  /**
   * Hiển thị trạng thái tạm thời trong cuộc trò chuyện (ví dụ: đang soạn tin nhắn 'typing').
   * Tham khảo: https://docs.zaloplatforms.com/docs/BOT/apis/sendChatAction
   * @param chat_id ID của người nhận hoặc cuộc trò chuyện
   * @param action Hành động phát đi: 'typing' (cho tin nhắn văn bản) hoặc 'upload_photo' (sắp ra mắt)
   */
  sendChatAction(chat_id: string, action: ChatAction): Promise<boolean> {
    return this.callApi<boolean>('sendChatAction', { chat_id, action });
  }

  // ---------------------------------------------------------------------------
  // 11. sendVoice
  // ---------------------------------------------------------------------------
  /**
   * Gửi tin nhắn thoại đến người dùng trong cuộc trò chuyện 1-1.
   * Lưu ý: Hiện tại KHÔNG hỗ trợ gửi tin nhắn thoại vào nhóm chat.
   * Tham khảo: https://docs.zaloplatforms.com/docs/BOT/apis/sendVoice
   * @param chat_id ID của người nhận (chỉ hỗ trợ cuộc trò chuyện 1-1)
   * @param voice_url Đường dẫn tới tệp âm thanh hợp lệ có phần mở rộng .aac
   */
  sendVoice(chat_id: string, voice_url: string): Promise<MessageResult> {
    return this.callApi<MessageResult>('sendVoice', { chat_id, voice_url });
  }

  // ---------------------------------------------------------------------------
  // Convenience Handler: onText
  // ---------------------------------------------------------------------------
  /**
   * Đăng ký bộ xử lý dựa trên Regular Expression cho các tin nhắn văn bản.
   * @param regexp Biểu thức chính quy cần khớp
   * @param callback Hàm thực thi khi tin nhắn khớp với regex
   */
  onText(
    regexp: RegExp,
    callback: (message: Message, match: RegExpExecArray | null) => void,
  ): this {
    this.textHandlers.push({ regexp, callback });
    return this;
  }

  /**
   * Gỡ bỏ bộ xử lý tin nhắn văn bản theo regex
   */
  removeTextListener(regexp: RegExp): this {
    const idx = this.textHandlers.findIndex(
      (item) => item.regexp.toString() === regexp.toString(),
    );
    if (idx !== -1) {
      this.textHandlers.splice(idx, 1);
    }
    return this;
  }

  // ---------------------------------------------------------------------------
  // Webhook processing
  // ---------------------------------------------------------------------------
  /**
   * Xác thực và xử lý webhook payload nhận được từ Zalo Server.
   * Tự động kiểm tra header X-Bot-Api-Secret-Token với secret_token đã cấu hình.
   * Throws `ZaloBotError` nếu token không trùng khớp.
   */
  processWebhook(
    body: unknown,
    headers?: Record<string, string | string[] | undefined>,
  ): void {
    if (this.secret_token && headers) {
      const headerKey = Object.keys(headers).find(
        (key) => key.toLowerCase() === 'x-bot-api-secret-token',
      );
      const received = headerKey ? headers[headerKey] : undefined;
      const receivedStr = Array.isArray(received) ? received[0] : received;
      if (receivedStr !== this.secret_token) {
        throw new ZaloBotError('processWebhook', 'Invalid X-Bot-Api-Secret-Token', 401);
      }
    }

    const payload = body as Record<string, unknown>;
    // Zalo có thể bọc sự kiện trong `result` hoặc gửi trực tiếp
    const update = (payload['result'] ?? payload) as Update;
    this.processUpdate(update);
  }

  // ---------------------------------------------------------------------------
  // Polling lifecycle
  // ---------------------------------------------------------------------------
  /**
   * Bắt đầu nhận tin nhắn qua Long Polling.
   * Đảm bảo Webhook đã được xóa bằng deleteWebhook trước khi bắt đầu.
   */
  startPolling(): void {
    if (this.isPolling) return;
    this.isPolling = true;
    void this._poll(0);
  }

  /**
   * Dừng nhận tin nhắn qua Long Polling.
   */
  stopPolling(): void {
    this.isPolling = false;
  }

  // ---------------------------------------------------------------------------
  // Update processing
  // ---------------------------------------------------------------------------
  processUpdate(update: Update): void {
    this.emit('update', update);

    if (update.event_name) {
      this.emit(update.event_name, update);
    }

    if (update.message) {
      const msg = update.message;
      this.emit('message', msg);

      if (msg.text) {
        this.emit('text', msg);

        // Kích hoạt các callback onText đã đăng ký
        for (const handler of this.textHandlers) {
          const match = handler.regexp.exec(msg.text);
          if (match) {
            handler.callback(msg, match);
            handler.regexp.lastIndex = 0;
          }
        }
      }

      if (msg.photo || update.event_name === 'message.image.received') {
        this.emit('photo', msg);
      }

      if (msg.sticker || update.event_name === 'message.sticker.received') {
        this.emit('sticker', msg);
      }

      if (msg.voice_url || update.event_name === 'message.voice.received') {
        this.emit('voice', msg);
      }
    } else if (update.event_name === 'message.unsupported.received') {
      this.emit('unsupported', update);
    }
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------
  private async _poll(consecutiveErrors: number): Promise<void> {
    if (!this.isPolling) return;

    try {
      const offset = this.lastUpdateId >= 0 ? this.lastUpdateId + 1 : undefined;
      const result = await this.getUpdates(offset, this.pollingTimeout);
      consecutiveErrors = 0;

      if (Array.isArray(result)) {
        for (const update of result) {
          this._trackAndProcess(update);
        }
      } else if (result) {
        this._trackAndProcess(result);
      }
    } catch {
      consecutiveErrors++;
      const backoff = Math.min(
        this.pollingInterval * Math.pow(2, consecutiveErrors - 1),
        MAX_BACKOFF_MS,
      );
      await new Promise<void>((resolve) => setTimeout(resolve, backoff));
    }

    if (this.isPolling) {
      setTimeout(() => void this._poll(consecutiveErrors), this.pollingInterval);
    }
  }

  private _trackAndProcess(update: Update): void {
    if (update.update_id !== undefined && update.update_id > this.lastUpdateId) {
      this.lastUpdateId = update.update_id;
    }
    this.processUpdate(update);
  }
}

export default ZaloBot;
