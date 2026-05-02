// bot/bot.js - Main Telegram Bot Logic
const TelegramBot = require('node-telegram-bot-api');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const store = require('./store');

const BOT_TOKEN = process.env.BOT_TOKEN || '8644725270:AAFKhW9h6ww2MpJqCb-C1L-UM1pxfalVrY4';
const ADMIN_ID = process.env.ADMIN_ID || '6078445562';

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// ─── Helpers ────────────────────────────────────────────────────────────────

function mainMenuKeyboard() {
  return {
    reply_markup: {
      inline_keyboard: [
        [{ text: '💎 Ton ဝယ်ယူ(သို့)ရောင်းရန်', callback_data: 'menu_ton' }],
        [{ text: '💱 Crypto Currency ရောင်း(သို့)ဝယ်ရန်', callback_data: 'menu_crypto' }],
        [{ text: '⭐ Telegram Premium (or) Telegram Star ဝယ်ယူရန်', callback_data: 'menu_tg_services' }],
        [{ text: '📡 Telegram Channel Monetization အကြောင်းအသေးစိတ်စုံစမ်းရန်', callback_data: 'menu_monetization' }],
        [{ text: '🤖 Chat With AI', callback_data: 'menu_ai' }],
        [{ text: '🔧 အခြား (Other)', callback_data: 'menu_other' }]
      ]
    }
  };
}

function paymentButtons() {
  return [
    [{ text: '🏠 Main Menu', callback_data: 'main_menu' }, { text: '✅ Payment Completed', callback_data: 'payment_completed' }]
  ];
}

function paymentText() {
  const p = store.get('paymentInfo');
  return `ဝယ်ယူမှုပြီးဆုံးရန်အောက်ပါဖုန်းနံပါတ်များသို့ငွေလွှဲပါ\n\nNAME - ${p.name}\n📱 ${p.kpay} [KPAY]\n📱 ${p.ayapay} [AYA PAY]\n📱 ${p.wavepay} [WAVE PAY]`;
}

async function sendMainMenu(chatId) {
  await bot.sendMessage(chatId, 'သင်လုပ်ဆောင်လိုသောခလုပ်များကိုနှိပ်ပါ', mainMenuKeyboard());
}

async function notifyAdmin(text, photoFileId = null) {
  try {
    if (photoFileId) {
      await bot.sendPhoto(ADMIN_ID, photoFileId, { caption: text });
    } else {
      await bot.sendMessage(ADMIN_ID, text);
    }
  } catch (e) {
    console.error('Admin notify error:', e.message);
  }
}

async function checkMaintenance(chatId) {
  if (store.get('maintenance')) {
    await bot.sendMessage(chatId, store.get('maintenanceMessage'));
    return true;
  }
  return false;
}

function createOrderId() {
  return 'ORD-' + Date.now().toString(36).toUpperCase() + '-' + uuidv4().slice(0, 4).toUpperCase();
}

// ─── AI Chat ────────────────────────────────────────────────────────────────

async function askAI(userMessage, chatId) {
  try {
    const response = await axios.post('https://api.anthropic.com/v1/messages', {
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system: `You are the AI assistant for Luxe Exchange, a crypto exchange service in Myanmar. 
You ONLY answer questions related to Luxe Exchange services: TON buying/selling, USDT buying/selling, Telegram Premium, Telegram Stars, and Channel Monetization.
You MUST respond in Myanmar (Burmese) language only.
If a user asks something unrelated to Luxe Exchange services, politely redirect them to our services in Burmese.
Keep responses concise and helpful.`,
      messages: [{ role: 'user', content: userMessage }]
    }, {
      headers: { 'Content-Type': 'application/json' }
    });
    const content = response.data?.content?.[0]?.text;
    return content || 'ကျွန်တော်မဖြေနိုင်ပါ။ Customer Support သို့ဆက်သွယ်ပါ။';
  } catch (e) {
    return 'AI ဝန်ဆောင်မှုယာယီမရရှိနိုင်ပါ။ Customer Support သို့ဆက်သွယ်ပါ။';
  }
}

// ─── /start ─────────────────────────────────────────────────────────────────

bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  store.trackUser(chatId);
  store.clearUserState(chatId);

  if (await checkMaintenance(chatId)) return;

  await bot.sendMessage(chatId,
    '🏦 *LUXE EXCHANGE* မှကြိုဆိုပါတယ် 🎉\n\nLuxe Exchange Official Channels နှင့် Groups များသို့ ချိတ်ဆက်ပါ',
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '📢 Our Official Channel', url: 'https://t.me/luxeexchangemyanmar' }],
          [{ text: '👥 Our Official Group', url: 'https://t.me/luxeexchangecommunity' }]
        ]
      }
    }
  );

  setTimeout(async () => {
    await sendMainMenu(chatId);
  }, 500);
});

// ─── Callback Query Handler ──────────────────────────────────────────────────

bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;
  const user = query.from;

  await bot.answerCallbackQuery(query.id);

  if (await checkMaintenance(chatId)) return;

  // ── Main Menu ──
  if (data === 'main_menu') {
    store.clearUserState(chatId);
    return sendMainMenu(chatId);
  }

  // ── TON Section ──
  if (data === 'menu_ton') {
    const prices = store.get('tonPrices');
    let keyboard = prices.map(p => [
      { text: `${p.amount} TON - ${p.price} MMK`, callback_data: `_noop` },
    ]).concat(
      prices.map(p => [
        { text: `🛒 Buy ${p.amount}T`, callback_data: `ton_buy_${p.amount}_${p.price}` },
        { text: `💰 Sell ${p.amount}T`, callback_data: `ton_sell_${p.amount}_${p.price}` }
      ])
    );

    // Rebuild as paired rows
    let rows = [];
    rows.push([{ text: '📊 TON Today Price', callback_data: '_noop' }]);
    for (const p of prices) {
      rows.push([
        { text: `💎 ${p.amount} TON = ${Number(p.price).toLocaleString()} MMK`, callback_data: '_noop' }
      ]);
      rows.push([
        { text: `🛒 Buy`, callback_data: `ton_buy_${p.amount}_${p.price}` },
        { text: `💰 Sell`, callback_data: `ton_sell_${p.amount}_${p.price}` }
      ]);
    }
    rows.push([{ text: '🏠 Main Menu', callback_data: 'main_menu' }]);

    await bot.sendMessage(chatId, '💎 *TON Today Price*', {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: rows }
    });
    return;
  }

  if (data.startsWith('ton_buy_')) {
    const parts = data.split('_');
    const amount = parts[2];
    const price = parts[3];
    const p = store.get('paymentInfo');
    await bot.sendMessage(chatId,
      `🛒 *TON Buy - ${amount} TON (${Number(price).toLocaleString()} MMK)*\n\n${paymentText()}`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🏠 Main Menu', callback_data: 'main_menu' }, { text: '✅ Payment Completed', callback_data: `ton_buy_done_${amount}_${price}` }]
          ]
        }
      }
    );
    store.setUserState(chatId, { pendingAction: 'ton_buy_screenshot', amount, price, type: 'TON_BUY' });
    return;
  }

  if (data.startsWith('ton_buy_done_')) {
    await bot.sendMessage(chatId, 'ငွေချေမှုပြီးမြောက်ပါကသင်၏ငွေချေမှုပြီးမြောက်ကြောင်း Slip အားပို့ပေးပါ။',
      { reply_markup: { inline_keyboard: [[{ text: '🏠 Main Menu', callback_data: 'main_menu' }]] } }
    );
    return;
  }

  if (data.startsWith('ton_sell_')) {
    const parts = data.split('_');
    const amount = parts[2];
    const price = parts[3];
    const addr = store.get('tonAddresses');
    await bot.sendMessage(chatId,
      `💰 *TON Sell - ${amount} TON*\n\nTon Network Address:\n\`${addr.tonNetwork}\`\n\nEthereum Network Address:\n\`${addr.ethereumNetwork}\`\n\nBEP20 Address:\n\`${addr.bep20}\``,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🏠 Main Menu', callback_data: 'main_menu' }, { text: '✅ Completed Payment', callback_data: `ton_sell_done_${amount}_${price}` }]
          ]
        }
      }
    );
    store.setUserState(chatId, { pendingAction: 'ton_sell_screenshot', amount, price, type: 'TON_SELL' });
    return;
  }

  if (data.startsWith('ton_sell_done_')) {
    await bot.sendMessage(chatId, 'ငွေချေမှုပြီးမြောက်ပါကသင်၏ငွေချေမှုပြီးမြောက်ကြောင်း Slip အားပို့ပေးပါ။',
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: '💬 Customer Support', url: 'http://t.me/Luxecustomersupport_Bot' }],
            [{ text: '🏠 Main Menu', callback_data: 'main_menu' }]
          ]
        }
      }
    );
    return;
  }

  // ── CRYPTO / USDT Section ──
  if (data === 'menu_crypto') {
    const prices = store.get('usdtPrices');
    let rows = [];
    rows.push([{ text: '📊 USDT ရောင်းဈေး', callback_data: '_noop' }]);
    for (const p of prices) {
      rows.push([
        { text: `💵 ${p.amount} USDT = ${Number(p.price).toLocaleString()} MMK`, callback_data: '_noop' }
      ]);
      rows.push([
        { text: `🛒 Buy`, callback_data: `usdt_buy_${p.amount}_${p.price}` },
        { text: `💰 Sell`, callback_data: `usdt_sell_${p.amount}_${p.price}` }
      ]);
    }
    rows.push([{ text: '🏠 Main Menu', callback_data: 'main_menu' }]);
    await bot.sendMessage(chatId, '💵 *USDT ရောင်းဈေး*', {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: rows }
    });
    return;
  }

  if (data.startsWith('usdt_buy_')) {
    const parts = data.split('_');
    const amount = parts[2];
    const price = parts[3];
    store.setUserState(chatId, { pendingAction: 'usdt_buy_exchange', amount, price, type: 'USDT_BUY' });
    await bot.sendMessage(chatId,
      'ကျေးဇူးပြု၍သင်ဝယ်ယူလိုသော USDT Exchange (သို့မဟုတ်) Wallet ကို ရွေးချယ်ပါ',
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔶 Binance Exchange', callback_data: `usdt_buy_ex_Binance_${amount}_${price}` }],
            [{ text: '🔵 Bitget Exchange', callback_data: `usdt_buy_ex_Bitget_${amount}_${price}` }],
            [{ text: '🟡 OKX Exchange', callback_data: `usdt_buy_ex_OKX_${amount}_${price}` }],
            [{ text: '👛 Other Third Party Wallets', callback_data: `usdt_buy_ex_Other_${amount}_${price}` }],
            [{ text: '🏠 Main Menu', callback_data: 'main_menu' }, { text: '💬 Customer Support', url: 'http://t.me/Luxecustomersupport_Bot' }]
          ]
        }
      }
    );
    return;
  }

  if (data.startsWith('usdt_buy_ex_')) {
    const parts = data.split('_');
    // usdt_buy_ex_ExchangeName_amount_price
    const exchange = parts[3];
    const amount = parts[4];
    const price = parts[5];
    store.setUserState(chatId, { pendingAction: 'usdt_buy_wallet_address', exchange, amount, price, type: 'USDT_BUY' });
    await bot.sendMessage(chatId,
      `*${exchange}* ကို ရွေးချယ်ပြီးပါပြီ\n\nကျေးဇူးပြု၍သင့်ရဲ့ ယာယီ Wallet or Exchange Address ကို ပေးပို့ပါ`,
      { parse_mode: 'Markdown' }
    );
    return;
  }

  if (data.startsWith('usdt_buy_pay_')) {
    const parts = data.split('_');
    const amount = parts[3];
    const price = parts[4];
    const p = store.get('paymentInfo');
    await bot.sendMessage(chatId,
      `✅ ယာယီ wallet address သတ်မှတ်ပြီးပါပြီ\n\nဝယ်ယူမှုပြီးဆုံးရန်အောက်ပါဖုန်းနံပါတ်များသို့ငွေလွှဲပါ\n\nNAME - ${p.name}\n📱 ${p.kpay} [KPAY]\n📱 ${p.ayapay} [AYA PAY]\n📱 ${p.wavepay} [WAVE PAY]`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: '🏠 Back Main Menu', callback_data: 'main_menu' }, { text: '✅ Complete Payment', callback_data: 'usdt_buy_screenshot' }]
          ]
        }
      }
    );
    return;
  }

  if (data === 'usdt_buy_screenshot') {
    await bot.sendMessage(chatId, 'ငွေလွှဲပြီးကြောင်းပြီးစီးမှု Screenshot ပုံကို ပို့ပေးပါခင်ဗျာ',
      { reply_markup: { inline_keyboard: [[{ text: '🏠 Main Menu', callback_data: 'main_menu' }]] } }
    );
    const state = store.getUserState(chatId);
    store.setUserState(chatId, { ...state, pendingAction: 'usdt_buy_awaiting_screenshot' });
    return;
  }

  // ── USDT SELL ──
  if (data.startsWith('usdt_sell_')) {
    const parts = data.split('_');
    const amount = parts[2];
    const price = parts[3];
    store.setUserState(chatId, { type: 'USDT_SELL', amount, price, pendingAction: 'usdt_sell_setup_amount' });
    await bot.sendMessage(chatId,
      'သင်ရောင်းလိုသော USDT amount ကို Setup လုပ်ပါ',
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: '📝 Setup Sell USDT Amount', callback_data: 'usdt_sell_set_amount' }],
            [{ text: '💳 Setup MMK PAY', callback_data: 'usdt_sell_set_mmkpay' }],
            [{ text: '🏠 Back Main Menu', callback_data: 'main_menu' }]
          ]
        }
      }
    );
    return;
  }

  if (data === 'usdt_sell_set_amount') {
    const state = store.getUserState(chatId);
    store.setUserState(chatId, { ...state, pendingAction: 'usdt_sell_awaiting_amount' });
    await bot.sendMessage(chatId, 'ရောင်းလိုသော USDT ပမာဏကို ဂဏန်းဖြင့် ပေးပို့ပါ (ဥပမာ: 5)');
    return;
  }

  if (data === 'usdt_sell_set_mmkpay') {
    const state = store.getUserState(chatId);
    store.setUserState(chatId, { ...state, pendingAction: 'usdt_sell_awaiting_mmkpay' });
    await bot.sendMessage(chatId,
      'သင့်၏ ငွေလက်ခံ\nAya Pay Ph No\nKpay Ph No\nWave Pay Ph No\nနှင့်နာမည်ကို ယခု Bot ကိုပို့ပေးပါ\n\nဥပမာ:\nMin Htet Kyaw\n09754310892(Wave Money)\nယခုလိုပို့ပေးပါခင်ဗျာ'
    );
    return;
  }

  if (data === 'usdt_sell_complete') {
    const state = store.getUserState(chatId);
    store.setUserState(chatId, { ...state, pendingAction: 'usdt_sell_choose_exchange' });
    await bot.sendMessage(chatId,
      'သင် USDT လွှဲလိုသော Exchange or Wallet ကို ရွေးချယ်ပေးပါ',
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔶 Binance Exchange', callback_data: 'usdt_sell_ex_Binance' }],
            [{ text: '🔵 Bitget Exchange', callback_data: 'usdt_sell_ex_Bitget' }],
            [{ text: '🟡 OKX Exchange', callback_data: 'usdt_sell_ex_OKX' }],
            [{ text: '👛 Other Third Party Wallets', callback_data: 'usdt_sell_ex_Other' }],
            [{ text: '🏠 Main Menu', callback_data: 'main_menu' }, { text: '💬 Customer Support', url: 'http://t.me/Luxecustomersupport_Bot' }]
          ]
        }
      }
    );
    return;
  }

  if (data.startsWith('usdt_sell_ex_')) {
    const exchange = data.replace('usdt_sell_ex_', '');
    const state = store.getUserState(chatId);
    store.setUserState(chatId, { ...state, exchange });
    if (exchange === 'Bitget') {
      const wallet = store.get('bitgetWallet');
      await bot.sendMessage(chatId,
        `🔵 *Bitget Exchange*\n\nUID: \`${wallet.uid}\`\nAddress: \`${wallet.address}\``,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🏠 Main Menu', callback_data: 'main_menu' }, { text: '✅ Complete', callback_data: 'usdt_sell_screenshot' }]
            ]
          }
        }
      );
    } else {
      const wallets = store.get('exchangeWallets');
      const w = wallets[exchange.toLowerCase()] || {};
      const addrText = w.address ? `Address: \`${w.address}\`` : 'Address: (ကျေးဇူးပြု၍ Customer Support ကိုဆက်သွယ်ပါ)';
      await bot.sendMessage(chatId,
        `*${exchange}*\n\n${addrText}`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🏠 Main Menu', callback_data: 'main_menu' }, { text: '✅ Complete', callback_data: 'usdt_sell_screenshot' }]
            ]
          }
        }
      );
    }
    return;
  }

  if (data === 'usdt_sell_screenshot') {
    const state = store.getUserState(chatId);
    store.setUserState(chatId, { ...state, pendingAction: 'usdt_sell_awaiting_screenshot' });
    await bot.sendMessage(chatId, 'ကျေးဇူးပြု၍သင်လွှဲပြောင်းထားသော Screenshot ကိုပို့ပေးပါခင်ဗျာ',
      { reply_markup: { inline_keyboard: [[{ text: '🏠 Main Menu', callback_data: 'main_menu' }]] } }
    );
    return;
  }

  // ── TG Services ──
  if (data === 'menu_tg_services') {
    await bot.sendMessage(chatId, '⭐ Telegram Services ကိုရွေးချယ်ပါ', {
      reply_markup: {
        inline_keyboard: [
          [{ text: '👑 Telegram Premium Buy', callback_data: 'tg_premium' }],
          [{ text: '⭐ Telegram Star Buy', callback_data: 'tg_stars' }],
          [{ text: '🏠 Main Menu', callback_data: 'main_menu' }]
        ]
      }
    });
    return;
  }

  if (data === 'tg_stars') {
    const prices = store.get('telegramStarPrices');
    const rows = prices.map(p => [
      { text: `⭐ ${p.stars} Stars - ${Number(p.price).toLocaleString()} MMK`, callback_data: `star_buy_${p.stars}_${p.price}` }
    ]);
    rows.push([{ text: '🏠 Main Menu', callback_data: 'main_menu' }]);
    await bot.sendMessage(chatId, '⭐ *Telegram Stars ဈေးနှုန်း*', {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: rows }
    });
    return;
  }

  if (data.startsWith('star_buy_')) {
    const parts = data.split('_');
    const stars = parts[2];
    const price = parts[3];
    store.setUserState(chatId, { type: 'STAR_BUY', stars, price, pendingAction: 'star_awaiting_screenshot' });
    await bot.sendMessage(chatId,
      `⭐ *${stars} Stars - ${Number(price).toLocaleString()} MMK*\n\n${paymentText()}`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🏠 Back Main Menu', callback_data: 'main_menu' }, { text: '✅ Complete Payment', callback_data: 'star_payment_done' }]
          ]
        }
      }
    );
    return;
  }

  if (data === 'star_payment_done') {
    const state = store.getUserState(chatId);
    store.setUserState(chatId, { ...state, pendingAction: 'star_awaiting_screenshot' });
    await bot.sendMessage(chatId, 'ငွေလွှဲပြီးကြောင်းပြီးစီးမှု Screenshot ပုံကိုပို့ပေးပါခင်ဗျာ',
      { reply_markup: { inline_keyboard: [[{ text: '🏠 Main Menu', callback_data: 'main_menu' }]] } }
    );
    return;
  }

  if (data === 'tg_premium') {
    const prices = store.get('telegramPremiumPrices');
    const rows = prices.map(p => [
      { text: `👑 ${p.period} - ${Number(p.price).toLocaleString()} MMK`, callback_data: `premium_buy_${encodeURIComponent(p.period)}_${p.price}` }
    ]);
    rows.push([{ text: '🏠 Main Menu', callback_data: 'main_menu' }]);
    await bot.sendMessage(chatId, '👑 *Telegram Premium ဝယ်ယူရန်*\n\nသင်ဝယ်လိုသော Telegram Premium ကိုရွေးချယ်ပါ', {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: rows }
    });
    return;
  }

  if (data.startsWith('premium_buy_')) {
    const parts = data.split('_');
    const price = parts[parts.length - 1];
    const period = decodeURIComponent(parts.slice(2, parts.length - 1).join('_'));
    store.setUserState(chatId, { type: 'PREMIUM_BUY', period, price, pendingAction: 'premium_awaiting_screenshot' });
    await bot.sendMessage(chatId,
      `👑 *Telegram Premium - ${period}*\n*${Number(price).toLocaleString()} MMK*\n\n${paymentText()}`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🏠 Back Main Menu', callback_data: 'main_menu' }, { text: '✅ Complete Payment', callback_data: 'premium_payment_done' }]
          ]
        }
      }
    );
    return;
  }

  if (data === 'premium_payment_done') {
    const state = store.getUserState(chatId);
    store.setUserState(chatId, { ...state, pendingAction: 'premium_awaiting_screenshot' });
    await bot.sendMessage(chatId, 'ငွေလွှဲပြီးကြောင်းပြီးစီးမှု Screenshot ပုံကိုပို့ပေးပါခင်ဗျာ',
      { reply_markup: { inline_keyboard: [[{ text: '🏠 Main Menu', callback_data: 'main_menu' }]] } }
    );
    return;
  }

  // ── Monetization ──
  if (data === 'menu_monetization') {
    await bot.sendMessage(chatId,
      '📡 *Telegram Monetization*\n\nTelegram Monetization လျှောက်ရန်အတွက် Luxe Monetization Team ကိုဆက်သွယ်ပေးပါ',
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '📡 Monetization Team', url: 'https://t.me/LuxeMonetization_Bot' }],
            [{ text: '🏠 Main Menu', callback_data: 'main_menu' }]
          ]
        }
      }
    );
    return;
  }

  // ── AI Chat ──
  if (data === 'menu_ai') {
    store.setUserState(chatId, { pendingAction: 'ai_chat' });
    await bot.sendMessage(chatId,
      '🤖 *Luxe Exchange AI Assistant*\n\nLuxe Exchange ဝန်ဆောင်မှုများနှင့် ပတ်သက်သောမေးခွန်းများ မြန်မာဘာသာဖြင့် မေးမြန်းနိုင်ပါသည်',
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🏠 Main Menu', callback_data: 'main_menu' }]
          ]
        }
      }
    );
    return;
  }

  // ── Other ──
  if (data === 'menu_other') {
    await bot.sendMessage(chatId, 'အကူအညီလိုအပ်ပါကဆက်သွယ်ပါ', {
      reply_markup: {
        inline_keyboard: [
          [{ text: '💬 Customer Support', url: 'http://t.me/Luxecustomersupport_Bot' }],
          [{ text: '🏠 Main Menu', callback_data: 'main_menu' }]
        ]
      }
    });
    return;
  }

  // Ignore _noop
  if (data === '_noop') return;
});

// ─── Photo Handler (Screenshots) ────────────────────────────────────────────

bot.on('photo', async (msg) => {
  const chatId = msg.chat.id;
  const user = msg.from;
  const state = store.getUserState(chatId);

  if (!state.pendingAction) return;

  const photoFileId = msg.photo[msg.photo.length - 1].file_id;
  const action = state.pendingAction;

  if (action.includes('screenshot') || action.includes('awaiting_screenshot')) {
    const orderId = createOrderId();
    const order = store.addOrder({
      id: orderId,
      userId: chatId,
      username: user.username || user.first_name,
      telegramId: user.id,
      type: state.type || 'UNKNOWN',
      status: 'PENDING',
      amount: state.amount || state.stars || state.period || '-',
      price: state.price || '-',
      exchange: state.exchange || '-',
      walletAddress: state.walletAddress || '-',
      mmkPay: state.mmkPayInfo || '-',
      createdAt: new Date().toISOString()
    });

    const adminMsg = `🔔 *New Order Received*\n\n` +
      `Order ID: \`${orderId}\`\n` +
      `Type: ${state.type}\n` +
      `User: @${user.username || user.first_name}\n` +
      `Telegram ID: ${user.id}\n` +
      `Amount: ${state.amount || state.stars || state.period || '-'}\n` +
      `Price: ${state.price || '-'} MMK\n` +
      `Exchange: ${state.exchange || '-'}\n` +
      `Wallet: ${state.walletAddress || '-'}\n` +
      `MMK Pay: ${state.mmkPayInfo || '-'}\n` +
      `Time: ${new Date().toLocaleString('en-GB', { timeZone: 'Asia/Yangon' })}`;

    await notifyAdmin(adminMsg, photoFileId);

    store.clearUserState(chatId);
    store.setUserState(chatId, { lastOrderId: orderId });

    await bot.sendMessage(chatId,
      `✅ *Order Submitted Successfully!*\n\nOrder ID: \`${orderId}\`\n\nAdmin မှ မကြာမီ စစ်ဆေးပေးပါမည်။ Admin ကြေညာပြီးပါက သတင်းပို့ပေးပါမည်`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🏠 Back Main Menu', callback_data: 'main_menu' }],
            [{ text: '💬 Customer Support', url: 'http://t.me/Luxecustomersupport_Bot' }]
          ]
        }
      }
    );
    return;
  }
});

// ─── Text Message Handler ────────────────────────────────────────────────────

bot.on('message', async (msg) => {
  if (msg.photo || msg.document) return;
  const chatId = msg.chat.id;
  const text = msg.text;
  const state = store.getUserState(chatId);

  if (!text || text.startsWith('/')) return;
  if (await checkMaintenance(chatId)) return;

  store.trackUser(chatId);

  // AI Chat mode
  if (state.pendingAction === 'ai_chat') {
    const thinking = await bot.sendMessage(chatId, '⏳ ဖြေကြားနေပါသည်...');
    const reply = await askAI(text, chatId);
    await bot.deleteMessage(chatId, thinking.message_id).catch(() => {});
    await bot.sendMessage(chatId, `🤖 ${reply}`, {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🏠 Main Menu', callback_data: 'main_menu' }]
        ]
      }
    });
    return;
  }

  // USDT Buy - wallet address input
  if (state.pendingAction === 'usdt_buy_wallet_address') {
    store.setUserState(chatId, { ...state, walletAddress: text, pendingAction: 'usdt_buy_awaiting_payment' });
    await bot.sendMessage(chatId,
      `✅ ယာယီ wallet address သတ်မှတ်ပြီးပါပြီ\n\n\`${text}\`\n\nဝယ်ယူမှုပြီးဆုံးရန်အောက်ပါဖုန်းနံပါတ်များသို့ငွေလွှဲပါ\n\n${paymentText()}`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🏠 Back Main Menu', callback_data: 'main_menu' }, { text: '✅ Complete Payment', callback_data: 'usdt_buy_screenshot' }]
          ]
        }
      }
    );
    return;
  }

  // USDT Sell - amount input
  if (state.pendingAction === 'usdt_sell_awaiting_amount') {
    store.setUserState(chatId, { ...state, sellAmount: text, pendingAction: null });
    await bot.sendMessage(chatId,
      `✅ သင်ရောင်းလိုသော USDT ပမာဏ: *${text} USDT* သတ်မှတ်ပြီးပါပြီ`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '💳 Setup MMK PAY', callback_data: 'usdt_sell_set_mmkpay' }],
            [{ text: '🏠 Back Main Menu', callback_data: 'main_menu' }]
          ]
        }
      }
    );
    return;
  }

  // USDT Sell - MMK pay info
  if (state.pendingAction === 'usdt_sell_awaiting_mmkpay') {
    store.setUserState(chatId, { ...state, mmkPayInfo: text, pendingAction: null });
    await bot.sendMessage(chatId,
      `✅ ငွေလက်ခံ အချက်အလက် သိမ်းဆည်းပြီးပါပြီ\n\n${text}`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: '🏠 Main Menu', callback_data: 'main_menu' }, { text: '✅ Complete', callback_data: 'usdt_sell_complete' }]
          ]
        }
      }
    );
    return;
  }

  // Default - show main menu
  await sendMainMenu(chatId);
});

// ─── Admin commands ──────────────────────────────────────────────────────────

bot.onText(/\/admin/, async (msg) => {
  if (String(msg.chat.id) !== String(ADMIN_ID)) return;
  await bot.sendMessage(msg.chat.id, '🛠️ Admin Panel: http://localhost:3000\n\nCommands:\n/maintenance_on - Enable maintenance\n/maintenance_off - Disable maintenance\n/broadcast [message] - Broadcast to all users\n/orders - View recent orders');
});

bot.onText(/\/maintenance_on/, async (msg) => {
  if (String(msg.chat.id) !== String(ADMIN_ID)) return;
  store.set('maintenance', true);
  const users = store.getActiveUsers();
  for (const uid of users) {
    try { await bot.sendMessage(uid, store.get('maintenanceMessage')); } catch(e) {}
  }
  await bot.sendMessage(msg.chat.id, '🔴 Maintenance mode ON. All users notified.');
});

bot.onText(/\/maintenance_off/, async (msg) => {
  if (String(msg.chat.id) !== String(ADMIN_ID)) return;
  store.set('maintenance', false);
  const users = store.getActiveUsers();
  for (const uid of users) {
    try { await bot.sendMessage(uid, store.get('maintenanceOffMessage')); } catch(e) {}
  }
  await bot.sendMessage(msg.chat.id, '🟢 Maintenance mode OFF. All users notified.');
});

bot.onText(/\/orders/, async (msg) => {
  if (String(msg.chat.id) !== String(ADMIN_ID)) return;
  const orders = store.getOrders().slice(-10).reverse();
  if (!orders.length) { await bot.sendMessage(msg.chat.id, 'No orders yet.'); return; }
  const text = orders.map(o => `📦 ${o.id}\n${o.type} | ${o.amount} | ${o.status}\n👤 @${o.username} | ${o.createdAt}`).join('\n\n');
  await bot.sendMessage(msg.chat.id, text);
});

bot.onText(/\/confirm (.+)/, async (msg, match) => {
  if (String(msg.chat.id) !== String(ADMIN_ID)) return;
  const orderId = match[1].trim();
  const order = store.getOrders().find(o => o.id === orderId);
  if (!order) { await bot.sendMessage(msg.chat.id, 'Order not found.'); return; }
  store.updateOrder(orderId, { status: 'CONFIRMED' });
  try {
    await bot.sendMessage(order.userId, `✅ သင်၏ဝယ်ယူမှုအောင်မြင်ပါသည်။\n\nOrder ID: \`${orderId}\``,
      { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: '🏠 Main Menu', callback_data: 'main_menu' }]] } }
    );
  } catch(e) {}
  await bot.sendMessage(msg.chat.id, `✅ Order ${orderId} confirmed and user notified.`);
});

bot.on('polling_error', (err) => {
  console.error('Polling error:', err.message);
});

console.log('🤖 Luxe Exchange Bot started...');
module.exports = bot;
