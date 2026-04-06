import axios, { AxiosInstance } from 'axios';
import EventEmitter from 'events';

import { ZaloBotError } from './errors';
import type {
  BotInfo,
  Message,
  SendMessageOptions,
  SendPhotoOptions,
  Update,
  WebhookInfo,
  ZaloBotOptions,
} from './types';

const DEFAULT_API_BASE = 'https://bot-api.zaloplatforms.com/bot';
const DEFAULT_POLLING_TIMEOUT = 30; // seconds
const DEFAULT_POLLING_INTERVAL = 1000; // ms
const MAX_BACKOFF_MS = 60_000;

// ---------------------------------------------------------------------------
// Typed event declarations via interface merging
// ---------------------------------------------------------------------------
export declare interface ZaloBot {
  on(event: 'message', listener: (message: Message) => void): this;
  on(event: 'text', listener: (message: Message) => void): this;
  on(event: 'update', listener: (update: Update) => void): this;
  on(event: 'error', listener: (error: ZaloBotError | Error) => void): this;
  on(event: string, listener: (...args: unknown[]) => void): this;

  once(event: 'message', listener: (message: Message) => void): this;
  once(event: 'text', listener: (message: Message) => void): this;
  once(event: 'update', listener: (update: Update) => void): this;
  once(event: 'error', listener: (error: ZaloBotError | Error) => void): this;
  once(event: string, listener: (...args: unknown[]) => void): this;

  emit(event: 'message', message: Message): boolean;
  emit(event: 'text', message: Message): boolean;
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
      const response = await this.httpClient.post<{
        ok: boolean;
        result?: T;
        error_code?: number;
        description?: string;
      }>(`${this.apiBase}/${method}`, data);

      const { ok, result, description, error_code } = response.data;

      if (!ok) {
        throw new ZaloBotError(method, description ?? 'Unknown API error', error_code);
      }

      return result as T;
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
  // Bot info
  // ---------------------------------------------------------------------------
  getMe(): Promise<BotInfo> {
    return this.callApi<BotInfo>('getMe');
  }

  // ---------------------------------------------------------------------------
  // Updates (long-polling)
  // ---------------------------------------------------------------------------
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
  // Webhook management
  // ---------------------------------------------------------------------------
  setWebhook(url: string, secretToken?: string): Promise<boolean> {
    const payload: Record<string, unknown> = { url };
    const token = secretToken ?? this.secret_token;
    if (token) {
      payload.secret_token = token;
    }
    return this.callApi<boolean>('setWebhook', payload);
  }

  getWebhookInfo(): Promise<WebhookInfo> {
    return this.callApi<WebhookInfo>('getWebhookInfo');
  }

  deleteWebhook(): Promise<boolean> {
    return this.callApi<boolean>('deleteWebhook');
  }

  // ---------------------------------------------------------------------------
  // Sending
  // ---------------------------------------------------------------------------
  sendMessage(
    chat_id: string,
    text: string,
    options?: SendMessageOptions,
  ): Promise<Message> {
    return this.callApi<Message>('sendMessage', { chat_id, text, ...options });
  }

  sendPhoto(
    chat_id: string,
    photo: string,
    options?: SendPhotoOptions,
  ): Promise<Message> {
    return this.callApi<Message>('sendPhoto', { chat_id, photo, ...options });
  }

  sendSticker(chat_id: string, sticker: string): Promise<Message> {
    return this.callApi<Message>('sendSticker', { chat_id, sticker });
  }

  sendChatAction(
    chat_id: string,
    action: 'typing' | 'upload_photo' | 'upload_document' | 'choose_sticker',
  ): Promise<boolean> {
    return this.callApi<boolean>('sendChatAction', { chat_id, action });
  }

  // ---------------------------------------------------------------------------
  // Webhook processing
  // ---------------------------------------------------------------------------
  /**
   * Validate and process a raw webhook payload received from Zalo.
   * Throws `ZaloBotError` if the secret token verification fails.
   */
  processWebhook(
    body: unknown,
    headers?: Record<string, string | string[] | undefined>,
  ): void {
    if (this.secret_token && headers) {
      const received = headers['x-bot-api-secret-token'];
      const receivedStr = Array.isArray(received) ? received[0] : received;
      if (receivedStr !== this.secret_token) {
        throw new ZaloBotError('processWebhook', 'Invalid X-Bot-Api-Secret-Token');
      }
    }

    const payload = body as Record<string, unknown>;
    // Zalo may wrap the update in a `result` field or return it directly
    const update = (payload['result'] ?? payload) as Update;
    this.processUpdate(update);
  }

  // ---------------------------------------------------------------------------
  // Polling lifecycle
  // ---------------------------------------------------------------------------
  startPolling(): void {
    if (this.isPolling) return;
    this.isPolling = true;
    void this._poll(0);
  }

  stopPolling(): void {
    this.isPolling = false;
  }

  // ---------------------------------------------------------------------------
  // Update processing
  // ---------------------------------------------------------------------------
  processUpdate(update: Update): void {
    this.emit('update', update);
    if (update.message) {
      this.emit('message', update.message);
      if (update.message.text) {
        this.emit('text', update.message);
      }
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
