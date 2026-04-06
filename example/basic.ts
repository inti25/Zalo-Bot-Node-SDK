import * as dotenv from 'dotenv';
import { ZaloBot } from '../src';

dotenv.config();

const token = process.env.BOT_TOKEN;
if (!token) {
  console.error('Error: BOT_TOKEN is not set in .env');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Polling mode
// ---------------------------------------------------------------------------
const bot = new ZaloBot(token, {
  polling: false,
});

// Delete any existing webhook before using polling
bot
  .deleteWebhook()
  .then(() => {
    console.log('Webhook cleared. Starting polling...');
    bot.startPolling();
  })
  .catch((err: Error) => console.error('Failed to delete webhook:', err.message));

// ---------------------------------------------------------------------------
// Event listeners
// ---------------------------------------------------------------------------
bot.on('message', (msg) => {
  if (!msg.chat?.id || !msg.text) return;
  bot
    .sendMessage(msg.chat.id, `You said: "${msg.text}"`)
    .catch((err: Error) => console.error('sendMessage failed:', err.message));
});

bot.on('text', (msg) => {
  if (msg.text?.startsWith('/start')) {
    bot
      .sendMessage(msg.chat!.id, 'Bot is ready! Send anything to chat.')
      .catch((err: Error) => console.error('sendMessage failed:', err.message));
  }
});

bot.on('error', (err) => {
  console.error('Bot error:', err.message);
});

// ---------------------------------------------------------------------------
// Webhook mode (Express example – uncomment to use)
// ---------------------------------------------------------------------------
// import express from 'express';
// const app = express();
// app.use(express.json());
//
// const webhookBot = new ZaloBot(token, { secret_token: 'MY_SECRET' });
//
// app.post('/webhook', (req, res) => {
//   try {
//     webhookBot.processWebhook(req.body, req.headers as Record<string, string>);
//     res.sendStatus(200);
//   } catch (err: any) {
//     console.error('Webhook verification failed:', err.message);
//     res.sendStatus(403);
//   }
// });
//
// app.listen(3000, () => console.log('Webhook listening on port 3000'));
