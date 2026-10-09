import * as dotenv from 'dotenv';
import { ZaloBot } from '../src';

dotenv.config();

const token = process.env.BOT_TOKEN;
if (!token) {
  console.error('Error: BOT_TOKEN is not set in .env');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Initialize Bot instance
// ---------------------------------------------------------------------------
const bot = new ZaloBot(token, {
  polling: false,
});

// Fetch bot details on start
bot
  .getMe()
  .then((info) => {
    console.log('🤖 Bot connected:', {
      id: info.id,
      account_name: info.account_name,
      account_type: info.account_type,
      can_join_groups: info.can_join_groups,
    });
  })
  .catch((err: Error) => console.error('getMe failed:', err.message));

// Delete any existing webhook before using polling
bot
  .deleteWebhook()
  .then((res) => {
    console.log('Webhook cleared at:', res.updated_at, '. Starting polling...');
    bot.startPolling();
  })
  .catch((err: Error) => console.error('Failed to delete webhook:', err.message));

// ---------------------------------------------------------------------------
// Event listeners & commands
// ---------------------------------------------------------------------------
// Regex command handler for /start
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat?.id;
  if (!chatId) return;

  bot.sendChatAction(chatId, 'typing').catch(console.error);

  bot
    .sendMessage(
      chatId,
      `**Xin chào ${msg.from?.display_name ?? 'bạn'}!**\nTôi là Zalo Bot.\nHãy gửi tin nhắn hoặc dùng lệnh \`/echo <nội dung>\`.`,
      { parse_mode: 'markdown' },
    )
    .catch((err: Error) => console.error('sendMessage failed:', err.message));
});

// Regex command handler for /echo <text>
bot.onText(/\/echo (.+)/, (msg, match) => {
  const chatId = msg.chat?.id;
  if (!chatId) return;

  const content = match ? match[1] : '';
  bot
    .sendMessage(chatId, `Bạn vừa nói: ${content}`)
    .catch((err: Error) => console.error('echo sendMessage failed:', err.message));
});

// General message listener
bot.on('message', (msg) => {
  console.log('Received message:', {
    chatId: msg.chat?.id,
    from: msg.from?.display_name,
    text: msg.text,
  });
});

// Image message listener
bot.on('photo', (msg) => {
  console.log('Received photo from:', msg.from?.display_name, 'URL:', msg.photo);
});

// Sticker message listener
bot.on('sticker', (msg) => {
  console.log('Received sticker:', msg.sticker);
});

// Voice message listener
bot.on('voice', (msg) => {
  console.log('Received voice:', msg.voice_url);
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
// const webhookBot = new ZaloBot(token, { secret_token: 'MY_SECRET_KEY_123' });
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
// app.listen(3000, async () => {
//   console.log('Webhook listening on port 3000');
//   // Register webhook
//   const result = await webhookBot.setWebhook('https://your-domain.com/webhook');
//   console.log('setWebhook result:', result);
//   // Test webhook endpoint reachability
//   const testRes = await webhookBot.testWebhook();
//   console.log('testWebhook result:', testRes);
// });
