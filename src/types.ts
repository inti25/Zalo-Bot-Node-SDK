/** Options for creating a ZaloBot instance */
export interface ZaloBotOptions {
  /** Enable long-polling mode at startup */
  polling?: boolean;
  /** Interval (ms) between poll retries. Default: 1000 */
  polling_interval?: number;
  /** Timeout (s) for each long-poll request. Default: 30 */
  polling_timeout?: number;
  /** Override the full API base URL (e.g. `https://bot-api.zaloplatforms.com/bot<token>`) */
  apiBase?: string;
  /** Secret token for webhook request verification */
  secret_token?: string;
}

export interface User {
  id: string;
  is_bot?: boolean;
  first_name?: string;
  last_name?: string;
  username?: string;
}

export interface Chat {
  id: string;
  type?: string;
  title?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
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

export interface Message {
  message_id?: number;
  from?: User;
  chat?: Chat;
  date?: number;
  text?: string;
  photo?: PhotoSize[];
  sticker?: Sticker;
}

export interface Update {
  update_id?: number;
  event_name?: string;
  message?: Message;
}

export interface WebhookInfo {
  url: string;
  has_custom_certificate?: boolean;
  pending_update_count?: number;
  last_error_date?: number;
  last_error_message?: string;
}

export interface BotInfo {
  id: string;
  is_bot?: boolean;
  first_name?: string;
  username?: string;
}

export interface SendMessageOptions {
  parse_mode?: 'HTML' | 'Markdown';
  disable_notification?: boolean;
  reply_to_message_id?: number;
}

export interface SendPhotoOptions {
  caption?: string;
  parse_mode?: 'HTML' | 'Markdown';
  disable_notification?: boolean;
}
