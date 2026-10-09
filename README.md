# zalo-bot

A lightweight, fully-typed TypeScript SDK for the [Zalo Bot Platform](https://docs.zaloplatforms.com/docs/BOT/apis/getMe).

## Installation

```bash
npm install zalo-bot-node-sdk
```

## Quick start (Long Polling)

```typescript
import { ZaloBot } from 'zalo-bot-node-sdk';

const bot = new ZaloBot('YOUR_BOT_TOKEN', { polling: false });

// Clear any webhook before starting long polling
await bot.deleteWebhook();
bot.startPolling();

// Listen with regex commands
bot.onText(/\/echo (.+)/, (msg, match) => {
  const text = match ? match[1] : '';
  bot.sendMessage(msg.chat!.id, `You said: ${text}`);
});

// Send messages with Markdown formatting
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(
    msg.chat!.id,
    `**Hello ${msg.from?.display_name}!** Welcome to Zalo Bot!`,
    { parse_mode: 'markdown' }
  );
});

bot.on('error', (err) => console.error(err));
```

## Webhook mode (Production)

```typescript
import express from 'express';
import { ZaloBot } from 'zalo-bot-node-sdk';

const bot = new ZaloBot('YOUR_BOT_TOKEN', { secret_token: 'MY_SECRET' });

const app = express();
app.use(express.json());

app.post('/webhook', (req, res) => {
  try {
    bot.processWebhook(req.body, req.headers as Record<string, string>);
    res.sendStatus(200);
  } catch {
    res.sendStatus(403);
  }
});

app.listen(3000, async () => {
  // Register the webhook URL with Zalo
  const result = await bot.setWebhook('https://your-domain.com/webhook');
  console.log('Webhook set:', result);

  // Run self-diagnostics
  const test = await bot.testWebhook();
  console.log('Webhook test outcome:', test.outcome);
});
```

## API Reference

### `new ZaloBot(token, options?)`

| Option | Type | Default | Description |
|---|---|---|---|
| `polling` | `boolean` | `false` | Start long-polling on construction |
| `polling_timeout` | `number` | `30` | Seconds per long-poll request |
| `polling_interval` | `number` | `1000` | Milliseconds between poll cycles |
| `secret_token` | `string` | — | Webhook secret token (8-256 chars) |
| `apiBase` | `string` | `https://bot-api.zaloplatforms.com/bot<token>` | Override the API base URL |

### Methods

| Method | Return Type | Description |
|---|---|---|
| `getMe()` | `Promise<BotInfo>` | Get bot information (`id`, `account_name`, `account_type`, `can_join_groups`) |
| `getUpdates(offset?, timeout?)` | `Promise<Update \| Update[]>` | Fetch pending updates via long-polling |
| `setWebhook(url, secretToken?)` | `Promise<SetWebhookResult>` | Register a webhook URL and receive verification results |
| `testWebhook()` | `Promise<TestWebhookResult>` | Test if the webhook endpoint is reachable from Zalo server |
| `deleteWebhook()` | `Promise<DeleteWebhookResult>` | Delete existing webhook configuration |
| `getWebhookInfo()` | `Promise<WebhookInfo>` | Retrieve current webhook configuration |
| `sendMessage(chat_id, text, options?)` | `Promise<MessageResult>` | Send text message with Markdown, HTML, or `text_styles` |
| `sendPhoto(chat_id, photo, options?)` | `Promise<MessageResult>` | Send a photo from a public URL with optional caption |
| `sendSticker(chat_id, sticker)` | `Promise<MessageResult>` | Send a sticker by ID from `stickers.zaloapp.com` |
| `sendChatAction(chat_id, action)` | `Promise<boolean>` | Send temporary action status (`typing`, `upload_photo`) |
| `sendVoice(chat_id, voice_url)` | `Promise<MessageResult>` | Send a `.aac` audio file in 1-on-1 chats |
| `onText(regexp, callback)` | `this` | Register a regex text command listener |
| `removeTextListener(regexp)` | `this` | Remove a registered regex text command listener |
| `processWebhook(body, headers?)` | `void` | Validate `X-Bot-Api-Secret-Token` and process webhook event |
| `startPolling()` | `void` | Start long-polling loop |
| `stopPolling()` | `void` | Stop long-polling loop |
| `processUpdate(update)` | `void` | Process an update object directly |

### Events

| Event | Payload | Description |
|---|---|---|
| `update` | `Update` | Fired for every incoming update |
| `message` | `Message` | Fired when an update contains a message |
| `text` | `Message` | Fired when a message contains text |
| `photo` | `Message` | Fired when a message contains a photo |
| `sticker` | `Message` | Fired when a message contains a sticker |
| `voice` | `Message` | Fired when a message contains voice audio |
| `unsupported` | `Update` | Fired on `message.unsupported.received` events |
| `error` | `ZaloBotError \| Error` | Fired on API or network errors |

## Development

```bash
# Install dependencies
npm install

# Build the library
npm run build

# Run the example (requires .env with BOT_TOKEN)
npm run example
```

## Official Documentation

Refer to the official Zalo Platform documentation:
- [Zalo Bot API getMe](https://docs.zaloplatforms.com/docs/BOT/apis/getMe)
- [API Reference](https://docs.zaloplatforms.com/docs/BOT/call_api)
- [Webhook Guide](https://docs.zaloplatforms.com/docs/BOT/webhook)

## License

ISC
