# zalo-bot

A lightweight, fully-typed TypeScript SDK for the [Zalo Bot API](https://developers.zalo.me/).

## Installation

```bash
npm install zalo-bot-node-sdk
```

## Quick start

```typescript
import { ZaloBot } from 'zalo-bot';

const bot = new ZaloBot('YOUR_BOT_TOKEN', { polling: true });

bot.on('message', (msg) => {
  if (msg.chat?.id && msg.text) {
    bot.sendMessage(msg.chat.id, `You said: "${msg.text}"`);
  }
});

bot.on('error', (err) => console.error(err));
```

## Webhook mode (production)

```typescript
import express from 'express';
import { ZaloBot } from 'zalo-bot';

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

// Register the webhook URL with Zalo once
bot.setWebhook('https://your-domain.com/webhook');

app.listen(3000);
```

## API

### `new ZaloBot(token, options?)`

| Option | Type | Default | Description |
|---|---|---|---|
| `polling` | `boolean` | `false` | Start long-polling on construction |
| `polling_timeout` | `number` | `30` | Seconds per poll request |
| `polling_interval` | `number` | `1000` | Ms between poll cycles |
| `secret_token` | `string` | — | Webhook secret token |
| `apiBase` | `string` | `https://bot-api.zaloplatforms.com/bot<token>` | Override the full base URL |

### Methods

| Method | Description |
|---|---|
| `getMe()` | Get bot info |
| `getUpdates(offset?, timeout?)` | Fetch pending updates |
| `setWebhook(url, secretToken?)` | Register a webhook URL |
| `getWebhookInfo()` | Get current webhook info |
| `deleteWebhook()` | Remove webhook (required before polling) |
| `sendMessage(chat_id, text, options?)` | Send a text message |
| `sendPhoto(chat_id, photo, options?)` | Send a photo by URL |
| `sendSticker(chat_id, sticker)` | Send a sticker |
| `sendChatAction(chat_id, action)` | Send a typing / upload indicator |
| `processWebhook(body, headers?)` | Validate & process a webhook payload |
| `startPolling()` | Start long-polling manually |
| `stopPolling()` | Stop long-polling |
| `processUpdate(update)` | Process an update object directly |

### Events

| Event | Payload | Description |
|---|---|---|
| `update` | `Update` | Every incoming update |
| `message` | `Message` | Updates that contain a message |
| `text` | `Message` | Messages that contain text |
| `error` | `ZaloBotError \| Error` | API or network errors |

## Development

```bash
# Install deps
npm install

# Build the library → dist/
npm run build

# Run the example (requires .env with BOT_TOKEN)
npm run example
```

## Publishing

```bash
npm publish
```

Only the `dist/` folder and `README.md` are included in the published package.

## License

ISC
