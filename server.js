// server.js - Main server file
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const cron = require('node-cron');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'admin')));

const store = require('./bot/store');

// ─── Start Bot ──────────────────────────────────────────────────────────────
let bot;
function startBot() {
  try {
    bot = require('./bot/bot');
    console.log('✅ Bot started successfully');
  } catch (err) {
    console.error('❌ Bot start error:', err.message);
    console.log('🔄 Retrying in 10 seconds...');
    setTimeout(startBot, 10000);
  }
}
startBot();

// ─── API Routes ─────────────────────────────────────────────────────────────

app.get('/api/health', (req, res) => {
  res.json({ ok: true, uptime: process.uptime(), time: new Date().toISOString() });
});

app.get('/api/stats', (req, res) => {
  const orders = store.getOrders();
  const users = store.getActiveUsers();
  const recent = orders.slice(-20).reverse();
  res.json({
    total: orders.length,
    pending: orders.filter(o => o.status === 'PENDING').length,
    confirmed: orders.filter(o => o.status === 'CONFIRMED').length,
    cancelled: orders.filter(o => o.status === 'CANCELLED').length,
    users: users.length,
    recent
  });
});

app.get('/api/orders', (req, res) => {
  let orders = store.getOrders();
  if (req.query.status) {
    orders = orders.filter(o => o.status === req.query.status);
  }
  res.json({ orders });
});

app.post('/api/orders/:id/confirm', async (req, res) => {
  const order = store.updateOrder(req.params.id, { status: 'CONFIRMED' });
  if (order && bot) {
    try {
      await bot.sendMessage(order.userId,
        `✅ သင်၏ဝယ်ယူမှုအောင်မြင်ပါသည်။\n\nOrder ID: \`${order.id}\``,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [[{ text: '🏠 Main Menu', callback_data: 'main_menu' }]]
          }
        }
      );
    } catch(e) { console.error('Notify error:', e.message); }
  }
  res.json({ ok: true, order });
});

app.post('/api/orders/:id/cancel', async (req, res) => {
  const order = store.updateOrder(req.params.id, { status: 'CANCELLED' });
  if (order && bot) {
    try {
      await bot.sendMessage(order.userId,
        `❌ သင်၏ Order ကို ပယ်ဖျက်လိုက်ပါသည်။\n\nOrder ID: \`${order.id}\`\n\nမေးမြန်းရန် Customer Support သို့ ဆက်သွယ်ပါ`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '💬 Customer Support', url: 'http://t.me/Luxecustomersupport_Bot' }],
              [{ text: '🏠 Main Menu', callback_data: 'main_menu' }]
            ]
          }
        }
      );
    } catch(e) {}
  }
  res.json({ ok: true, order });
});

app.get('/api/store', (req, res) => {
  const d = store.data;
  // Don't expose sensitive
  const safe = {
    tonPrices: d.tonPrices,
    usdtPrices: d.usdtPrices,
    telegramStarPrices: d.telegramStarPrices,
    telegramPremiumPrices: d.telegramPremiumPrices,
    paymentInfo: d.paymentInfo,
    tonAddresses: d.tonAddresses,
    bitgetWallet: d.bitgetWallet,
    exchangeWallets: d.exchangeWallets,
    maintenance: d.maintenance,
    maintenanceMessage: d.maintenanceMessage,
    maintenanceOffMessage: d.maintenanceOffMessage
  };
  res.json(safe);
});

app.patch('/api/store', (req, res) => {
  const allowed = [
    'tonPrices','usdtPrices','telegramStarPrices','telegramPremiumPrices',
    'paymentInfo','tonAddresses','bitgetWallet','exchangeWallets',
    'maintenanceMessage','maintenanceOffMessage'
  ];
  for (const [k, v] of Object.entries(req.body)) {
    if (allowed.includes(k)) store.set(k, v);
  }
  res.json({ ok: true });
});

app.post('/api/maintenance', async (req, res) => {
  const { maintenance } = req.body;
  store.set('maintenance', maintenance);
  if (bot) {
    const users = store.getActiveUsers();
    const msg = maintenance ? store.get('maintenanceMessage') : store.get('maintenanceOffMessage');
    let sent = 0;
    for (const uid of users) {
      try { await bot.sendMessage(uid, msg); sent++; } catch(e) {}
    }
    res.json({ ok: true, sent, maintenance });
  } else {
    res.json({ ok: true, maintenance });
  }
});

app.post('/api/broadcast', async (req, res) => {
  const { message } = req.body;
  if (!message || !bot) return res.json({ ok: false, sent: 0 });
  const users = store.getActiveUsers();
  let sent = 0;
  for (const uid of users) {
    try { await bot.sendMessage(uid, message, { parse_mode: 'Markdown' }); sent++; } catch(e) {}
  }
  res.json({ ok: true, sent });
});

// Serve admin panel
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'index.html'));
});

// ─── Keepalive cron ──────────────────────────────────────────────────────────
cron.schedule('*/10 * * * *', () => {
  console.log(`[${new Date().toUTCString()}] ⏰ Keepalive ping - Bot running`);
});

// ─── Start ──────────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Admin server running on port ${PORT}`);
  console.log(`🌐 Open: http://localhost:${PORT}`);
});

// ─── Uncaught error handlers (keep server alive) ─────────────────────────────
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err.message);
});
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});
