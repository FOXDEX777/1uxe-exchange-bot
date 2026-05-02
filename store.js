// data/store.js - Persistent JSON-based data store
const fs = require('fs-extra');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../data');
const STORE_FILE = path.join(DATA_DIR, 'store.json');

const DEFAULT_STORE = {
  maintenance: false,
  maintenanceMessage: "Telegram Botအား Maintenanceလုပ်ဆောင်နေပါသည်ယခုအခါယာယီအသုံးမပြုနိုင်သေးပါအကယ်၍Maintenanceပြုလုပ်ပြီးပါကပြန်လည်အကြောင်းကြားပေးပါမည်Luxe Exchangeမိသားစုမှု customerတယောက်ချင်းစီတိုင်းကိုကျေးဇူးတင်ရှိပါတယ်ခင်ဗျာ",
  maintenanceOffMessage: "ယခုအခါBotအားပုံမှန်ပြန်သုံးနိုင်ပါပြီ။",
  tonPrices: [
    { amount: "0.3", price: "2700" },
    { amount: "0.5", price: "4500" },
    { amount: "0.8", price: "7200" },
    { amount: "1", price: "9000" },
    { amount: "2", price: "17000" },
    { amount: "5", price: "42000" }
  ],
  usdtPrices: [
    { amount: "1", price: "4600" },
    { amount: "2", price: "9200" },
    { amount: "3", price: "18400" }
  ],
  telegramStarPrices: [
    { stars: "50", price: "3500" },
    { stars: "75", price: "4500" },
    { stars: "100", price: "6000" },
    { stars: "150", price: "9000" },
    { stars: "250", price: "14000" },
    { stars: "350", price: "19000" },
    { stars: "500", price: "27000" },
    { stars: "750", price: "40000" },
    { stars: "1K", price: "54000" },
    { stars: "1.5K", price: "79000" },
    { stars: "2.5K", price: "131000" },
    { stars: "5K", price: "260000" },
    { stars: "10K", price: "520000" },
    { stars: "25K", price: "1296277" }
  ],
  telegramPremiumPrices: [
    { period: "1Year(၁နှစ်)", price: "138000" },
    { period: "6 Months (၆ လ)", price: "78200" },
    { period: "3 Months (၃ လ)", price: "59800" }
  ],
  paymentInfo: {
    name: "MIN HTET KYAW",
    kpay: "09258736002",
    ayapay: "09258736002",
    wavepay: "09754310892"
  },
  tonAddresses: {
    tonNetwork: "UQAQ-F6jfI6m-g05aiOshNRQ_LEImzrxK5T5NAzvhoWPpWRU",
    ethereumNetwork: "0x871968e91042338e4e6673ee42dddced6878bf95",
    bep20: "0x871968e91042338e4e6673ee42dddced6878bf95"
  },
  bitgetWallet: {
    uid: "7671184732",
    address: "TWJ6UyKKwfhe2REJoXfDUEnypDaK1r1eBp"
  },
  exchangeWallets: {
    binance: { address: "", uid: "" },
    bitget: { uid: "7671184732", address: "TWJ6UyKKwfhe2REJoXfDUEnypDaK1r1eBp" },
    okx: { address: "", uid: "" },
    other: { address: "", uid: "" }
  },
  orders: [],
  users: {},
  activeUsers: []
};

class DataStore {
  constructor() {
    this.data = null;
    this.init();
  }

  init() {
    try {
      fs.ensureDirSync(DATA_DIR);
      if (fs.existsSync(STORE_FILE)) {
        this.data = fs.readJsonSync(STORE_FILE);
        // Merge missing defaults
        this.data = { ...DEFAULT_STORE, ...this.data };
      } else {
        this.data = { ...DEFAULT_STORE };
        this.save();
      }
    } catch (e) {
      this.data = { ...DEFAULT_STORE };
    }
  }

  save() {
    try {
      fs.writeJsonSync(STORE_FILE, this.data, { spaces: 2 });
    } catch (e) {
      console.error('Store save error:', e.message);
    }
  }

  get(key) {
    return this.data[key];
  }

  set(key, value) {
    this.data[key] = value;
    this.save();
  }

  setUserState(userId, state) {
    if (!this.data.users) this.data.users = {};
    this.data.users[userId] = { ...this.data.users[userId], ...state };
    this.save();
  }

  getUserState(userId) {
    return this.data.users?.[userId] || {};
  }

  clearUserState(userId) {
    if (this.data.users?.[userId]) {
      delete this.data.users[userId];
      this.save();
    }
  }

  addOrder(order) {
    if (!this.data.orders) this.data.orders = [];
    this.data.orders.push(order);
    this.save();
    return order;
  }

  getOrders() {
    return this.data.orders || [];
  }

  updateOrder(orderId, updates) {
    const idx = this.data.orders.findIndex(o => o.id === orderId);
    if (idx !== -1) {
      this.data.orders[idx] = { ...this.data.orders[idx], ...updates };
      this.save();
      return this.data.orders[idx];
    }
    return null;
  }

  trackUser(userId) {
    if (!this.data.activeUsers) this.data.activeUsers = [];
    if (!this.data.activeUsers.includes(userId)) {
      this.data.activeUsers.push(userId);
      this.save();
    }
  }

  getActiveUsers() {
    return this.data.activeUsers || [];
  }
}

module.exports = new DataStore();
