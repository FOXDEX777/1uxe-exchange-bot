# 💎 LUXE EXCHANGE BOT - Deployment Guide

## 📁 Project Structure
```
luxe-exchange/
├── server.js           # Main Express server
├── .env                # Environment variables  
├── ecosystem.config.js # PM2 config (24/7 hosting)
├── package.json
├── admin/
│   └── index.html      # Admin Panel Website
├── bot/
│   ├── bot.js          # Telegram Bot Logic
│   └── store.js        # Data store
└── data/
    └── store.json      # Auto-created persistent data
```

---

## 🚀 QUICK START (VPS / Server)

### Step 1: Install Node.js (v18+)
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### Step 2: Install PM2 (24/7 process manager)
```bash
npm install -g pm2
```

### Step 3: Upload & Install
```bash
# Upload the luxe-exchange folder to your server, then:
cd luxe-exchange
npm install
```

### Step 4: Start Bot (24/7)
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup   # Auto-start on reboot
```

### Step 5: Access Admin Panel
Open browser: `http://YOUR_SERVER_IP:3000`

---

## 🔧 Admin Panel Features

| Feature | Description |
|---------|-------------|
| Dashboard | Live stats: orders, users, pending |
| Orders | View/Confirm/Cancel all orders |
| Prices | Edit TON & USDT buy/sell prices |
| Wallets | Edit wallet addresses & payment info |
| TG Services | Edit Telegram Stars & Premium prices |
| Broadcast | Send message to all bot users |
| Maintenance | ON/OFF with auto-notification |

---

## 📱 Bot Commands (Admin only)

| Command | Action |
|---------|--------|
| `/admin` | Show admin info |
| `/maintenance_on` | Enable maintenance mode |
| `/maintenance_off` | Disable maintenance mode |
| `/orders` | View last 10 orders |
| `/confirm ORDER-ID` | Confirm a specific order |

---

## 🌐 Free Hosting Options

### Option 1: Railway.app (Recommended - Free tier)
1. Push code to GitHub
2. Connect to Railway.app
3. Set environment variables in Railway dashboard
4. Deploy automatically

### Option 2: Render.com
1. Create Web Service
2. Build command: `npm install`
3. Start command: `node server.js`
4. Add environment variables

### Option 3: Heroku
```bash
heroku create luxe-exchange-bot
heroku config:set BOT_TOKEN=your_token ADMIN_ID=6078445562
git push heroku main
```

### Option 4: VPS (DigitalOcean/Vultr/Contabo)
Use PM2 as shown in Quick Start above.

---

## ⚠️ Important Notes

1. **Keep `.env` file private** - Never share your bot token
2. **Data is stored** in `data/store.json` - backup regularly
3. **PM2 auto-restarts** the bot if it crashes
4. **Admin Panel** is accessible at port 3000 (configure firewall)
5. **UTC 24/7** - PM2 ensures continuous operation

---

## 🔄 Updates / Restart
```bash
pm2 restart luxe-exchange-bot
pm2 logs luxe-exchange-bot   # View logs
pm2 monit                    # Monitor in real-time
```

---

## 📊 Bot Workflow Summary

```
/start
  └── Welcome + Channel Buttons
      └── Main Menu
          ├── [TON Buy/Sell]
          │   ├── Buy → Payment info → Screenshot → Admin notified
          │   └── Sell → TON addresses → Screenshot → Admin notified
          ├── [Crypto/USDT]
          │   ├── Buy → Choose exchange → Wallet address → Payment → Screenshot
          │   └── Sell → USDT amount → MMK pay info → Exchange → Screenshot
          ├── [TG Services]
          │   ├── Premium → Choose period → Payment → Screenshot
          │   └── Stars → Choose amount → Payment → Screenshot
          ├── [Monetization] → @LuxeMonetization_Bot
          ├── [Chat with AI] → Myanmar language AI assistant
          └── [Other] → Customer Support
```

---

Built with ❤️ for Luxe Exchange Myanmar
