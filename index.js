// 🔥 HACKER PRO ULTRA — Fully Fixed Baileys Pair Bot + Web Portal
require('dotenv').config();
const express = require('express');
const fs = require('fs-extra');
const pino = require('pino');
const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys');

// ============ SETTINGS ============
let settings = { ownerNumber: '94760601455', botName: 'Hacker Pro Md' };
try { settings = { ...settings, ...require('./settings.js') }; console.log('✅ settings loaded'); } catch {}
const OWNER_NUMBER = settings.ownerNumber;
const BOT_NAME = settings.botName;
const TELEGRAM_TOKEN = process.env.TG_TOKEN || '8703196263:AAFI9Ht3VLisyGsRj3fpVL40X6mRkWlYKHw';
const AUTH_DIR = './auth_info';
const CREDS_FILE = `${AUTH_DIR}/creds.json`;

// ============ ERROR HANDLERS ============
process.on('uncaughtException', (e) => console.error('🛡️ Uncaught:', e?.message || e));
process.on('unhandledRejection', (e) => console.error('🛡️ Unhandled:', e?.message || e));

const getRAM = () => parseFloat((process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2));
console.log(`💾 [RAM] ${getRAM()} MB`);

// ============ AUTH HELPERS ============
function ensureAuthDir() {
    if (!fs.existsSync(AUTH_DIR)) fs.mkdirSync(AUTH_DIR, { recursive: true });
}

// 🔥 KEY FIX: folder delete නොකර creds.json එකට empty {} write කරනවා
function resetCreds() {
    try {
        ensureAuthDir();
        // creds.json → empty object (Baileys fresh session කියලා හඳුනාගන්නවා)
        fs.writeFileSync(CREDS_FILE, JSON.stringify({}));
        // අනිත් session files ඔක්කොම delete (creds.json එක තියලා)
        fs.readdirSync(AUTH_DIR).forEach(f => {
            if (f !== 'creds.json') {
                try { fs.unlinkSync(`${AUTH_DIR}/${f}`); } catch {}
            }
        });
        console.log('🔄 Creds reset (empty {})');
    } catch (e) {
        console.error('Reset error:', e.message);
    }
}

async function initAuthSession() {
    ensureAuthDir();
    // SESSION_ID එකක් තියෙනවා නම් restore කරන්න
    if (process.env.SESSION_ID && process.env.SESSION_ID.startsWith('HACKERPRO~')) {
        try {
            const base64Data = process.env.SESSION_ID.replace('HACKERPRO~', '');
            const jsonString = Buffer.from(base64Data, 'base64').toString('utf-8');
            fs.writeFileSync(CREDS_FILE, jsonString);
            console.log('✅ SESSION_ID Restored successfully!');
        } catch (err) {
            console.error('❌ SESSION_ID Restore error:', err.message);
        }
    }
    // creds.json නැත්නම් empty create
    if (!fs.existsSync(CREDS_FILE)) {
        fs.writeFileSync(CREDS_FILE, JSON.stringify({}));
    }
}

function isRegistered() {
    try {
        if (!fs.existsSync(CREDS_FILE)) return false;
        const creds = JSON.parse(fs.readFileSync(CREDS_FILE, 'utf8') || '{}');
        return !!creds.registered;
    } catch { return false; }
}

function purgeOldKeys() {
    try {
        if (!fs.existsSync(AUTH_DIR)) return;
        let count = 0;
        fs.readdirSync(AUTH_DIR).forEach(file => {
            if (file.startsWith('pre-key-') || file.startsWith('session-')) {
                try { fs.unlinkSync(`${AUTH_DIR}/${file}`); count++; } catch {}
            }
        });
        if (count > 0) console.log(`🧹 Cleared ${count} old session keys.`);
    } catch (e) { console.error('Cleanup error:', e.message); }
}
setInterval(purgeOldKeys, 1000 * 60 * 60);

// ============ COMMANDS ============
const COMMANDS = new Map();
const ALIASES = new Map();

function register(name, aliases, handler, opts = {}) {
    COMMANDS.set(name.toLowerCase(), { handler, opts });
    (aliases || []).forEach(a => ALIASES.set(a.toLowerCase(), name.toLowerCase()));
}

register('ping', ['speed'], async (c) => {
    const { sock, from, msg } = c;
    const t = Date.now();
    const s = await sock.sendMessage(from, { text: '🏓 Pong!' }, { quoted: msg });
    await sock.sendMessage(from, { text: `⚡ Speed: ${Date.now() - t}ms\n💾 RAM: ${getRAM()} MB`, edit: s.key });
}, { public: true });

register('settings', ['config'], async (c) => {
    const { sock, from, msg } = c;
    const up = process.uptime();
    const hrs = Math.floor(up / 3600);
    const mins = Math.floor((up % 3600) / 60);
    await sock.sendMessage(from, { text: `⚙️ *${BOT_NAME} Settings*\n📱 Owner: +${OWNER_NUMBER}\n⏱️ Uptime: ${hrs}h ${mins}m\n💾 RAM: ${getRAM()} MB` }, { quoted: msg });
}, { public: true });

register('menu', ['help'], async (c) => {
    const { sock, from, msg } = c;
    await sock.sendMessage(from, { text: `🔥 *${BOT_NAME}* 🔥\n\n📌 Commands:\n.ping\n.settings\n.owner` }, { quoted: msg });
}, { public: true });

register('owner', ['creator'], async (c) => {
    const { sock, from, msg } = c;
    await sock.sendMessage(from, { text: `👑 *Owner:* +${OWNER_NUMBER}` }, { quoted: msg });
}, { public: true });

// ============ SOCKET MANAGEMENT ============
let sock = null;
let isConnected = false;
let isStarting = false;
let reconnectTimer = null;
let pairingInProgress = false;
let keepAlive = false; // 🔥 pair වෙනකොට auto-reconnect off
const logger = pino({ level: 'silent' });

async function killSocket() {
    if (!sock) return;
    try { sock.ev.removeAllListeners(); } catch {}
    try { sock.ws?.close(); } catch {}
    try { sock.end(undefined); } catch {}
    sock = null;
    isConnected = false;
    await new Promise(r => setTimeout(r, 800));
}

async function startSock() {
    if (isStarting) {
        console.log('⏳ Socket already starting...');
        // wait for it
        let waited = 0;
        while (isStarting && waited < 10000) {
            await new Promise(r => setTimeout(r, 500));
            waited += 500;
        }
        return sock;
    }

    isStarting = true;
    if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }

    // පරණ socket kill කරන්න
    await killSocket();

    await initAuthSession();
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    const { version } = await fetchLatestBaileysVersion();

    sock = makeWASocket({
        version,
        auth: state,
        logger,
        printQRInTerminal: false,
        browser: ['Ubuntu', 'Chrome', '20.0.04'],
        syncFullHistory: false,
        markOnlineOnConnect: false,
        mobile: false,
        getMessage: async () => undefined
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
        if (connection === 'open') {
            console.log('✅ WhatsApp Connected!');
            isConnected = true;
            pairingInProgress = false;
            keepAlive = true;
        }

        if (connection === 'close') {
            isConnected = false;
            const code = lastDisconnect?.error?.output?.statusCode;
            console.log(`❌ Socket Closed (Code: ${code})`);

            // Logged out → reset creds (folder delete නෑ)
            if (code === DisconnectReason.loggedOut || code === 401) {
                console.log('🧹 Logged out → resetting creds');
                resetCreds();
                keepAlive = false;
            }

            // Pair වෙන අතරේ auto-reconnect නවත්තන්න
            if (keepAlive && !pairingInProgress) {
                reconnectTimer = setTimeout(() => startSock(), 5000);
            }
        }
    });

    sock.ev.on('messages.upsert', async ({ messages }) => {
        try {
            const msg = messages[0];
            if (!msg?.message || msg.key.fromMe) return;
            const from = msg.key.remoteJid;
            const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
            if (!text.startsWith('.')) return;

            const [cmdName, ...args] = text.slice(1).trim().split(/\s+/);
            const cmd = COMMANDS.get(cmdName.toLowerCase()) || COMMANDS.get(ALIASES.get(cmdName.toLowerCase()));

            if (cmd) {
                await cmd.handler({ sock, from, msg, args, text: args.join(' '), OWNER_NUMBER, BOT_NAME });
            }
        } catch (e) { console.error('Msg error:', e.message); }
    });

    // Socket create උනාට පස්සේ ටිකක් ඉඩ දෙන්න
    await new Promise(r => setTimeout(r, 1500));
    isStarting = false;
    return sock;
}

// ============ PAIR CODE ============
async function getPairCode(phone) {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
        throw new Error('Valid phone number එකක් දෙන්න (උදා: 94760601455)');
    }

    if (isConnected) {
        throw new Error('WhatsApp දැනටමත් connect වී ඇත!');
    }

    if (pairingInProgress) {
        throw new Error('Pair code එකක් දැනටමත් generate වෙමින් පවතී. තප්පර 30ක් ඉන්න.');
    }

    pairingInProgress = true;
    keepAlive = false; // auto-reconnect off

    try {
        // 🔥 Already registered නම් → creds empty කරන්න (folder delete නෑ)
        if (isRegistered()) {
            console.log('⚠️ Session already registered → resetting creds...');
            resetCreds();
        }

        // පරණ socket kill
        await killSocket();

        // Fresh socket හදන්න
        console.log('🔧 Creating fresh socket for pair code...');
        await startSock();

        // Socket ready වෙන්න ඉන්නවා
        await new Promise(r => setTimeout(r, 2500));

        if (!sock) throw new Error('Socket init fail. ආයෙ try කරන්න.');

        // Double-check — registered නම් fail
        if (sock.authState?.creds?.registered) {
            throw new Error('Session reset fail. ආයෙ try කරන්න.');
        }

        console.log(`🔑 Requesting pair code for ${cleanPhone}...`);
        const code = await sock.requestPairingCode(cleanPhone);
        console.log(`✅ Pair code: ${code}`);

        // Pair වෙනකන් wait කරන්න — 60s
        setTimeout(() => {
            pairingInProgress = false;
            keepAlive = true;
            console.log('🔓 Pairing lock released');
        }, 60000);

        return code?.match(/.{1,4}/g)?.join('-') || code;

    } catch (e) {
        pairingInProgress = false;
        keepAlive = true;
        console.error('Pair error:', e.message);
        throw e;
    }
}

// ============ TELEGRAM BOT ============
async function sendTgMessage(chatId, text) {
    try {
        await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' })
        });
    } catch {}
}

async function startTelegramBot() {
    let offset = 0;
    while (true) {
        try {
            const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/getUpdates?offset=${offset}&timeout=20`);
            const data = await res.json();
            if (data.ok && data.result.length > 0) {
                for (const update of data.result) {
                    offset = update.update_id + 1;
                    const msg = update.message;
                    if (!msg?.text) continue;
                    const chatId = msg.chat.id;
                    const text = msg.text.trim();

                    if (text === '/start') {
                        await sendTgMessage(chatId, `⚡ *${BOT_NAME} Pair Bot*\n\n/pair 94760601455\n/reset`);
                    } else if (text.startsWith('/pair')) {
                        const phone = text.split(/\s+/)[1];
                        if (!phone) { await sendTgMessage(chatId, '⚠️ `/pair 94760601455`'); continue; }
                        await sendTgMessage(chatId, '⏳ Generating Pair Code...');
                        try {
                            const code = await getPairCode(phone);
                            await sendTgMessage(chatId, `🎉 *Your Pair Code:*\n\n\`${code}\`\n\n📱 WhatsApp → Linked Devices → Link with Phone Number`);
                        } catch (err) {
                            await sendTgMessage(chatId, `❌ *Error:* ${err.message}`);
                        }
                    } else if (text === '/reset') {
                        resetCreds();
                        await killSocket();
                        pairingInProgress = false;
                        keepAlive = false;
                        await sendTgMessage(chatId, '✅ Session reset. දැන් `/pair` යවන්න.');
                    }
                }
            }
        } catch { await new Promise(r => setTimeout(r, 4000)); }
    }
}
startTelegramBot();

// ============ WEB PORTAL ============
const app = express();
app.use(express.json());

app.post('/api/pair', async (req, res) => {
    try {
        const phone = req.body.phone || req.query.phone || '';
        const code = await getPairCode(phone);
        return res.json({ success: true, code });
    } catch (e) {
        return res.status(500).json({ success: false, error: e.message });
    }
});

app.get('/pair', async (req, res) => {
    try {
        const phone = req.query.phone || '';
        const code = await getPairCode(phone);
        return res.json({ success: true, code });
    } catch (e) {
        return res.status(500).json({ success: false, error: e.message });
    }
});

app.get('/reset', async (req, res) => {
    try {
        resetCreds();
        await killSocket();
        pairingInProgress = false;
        keepAlive = false;
        res.json({ success: true, message: 'Session reset complete' });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

app.get('/status', (req, res) => {
    res.json({
        connected: isConnected,
        pairing: pairingInProgress,
        registered: isRegistered(),
        uptime: process.uptime(),
        ram: getRAM()
    });
});

app.get('/', (req, res) => {
    res.send(`<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>HACKER PRO PAIRING PORTAL</title>
<style>
*{box-sizing:border-box}
body{background:#0a0e1a;color:#fff;font-family:-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:15px}
.box{background:#131b2e;padding:25px;border-radius:15px;border:1px solid #1f2d4d;width:100%;max-width:400px;text-align:center;box-shadow:0 10px 25px rgba(0,0,0,.5)}
h2{color:#00d2ff;margin:0 0 20px;font-size:20px}
input{width:100%;padding:12px;margin-bottom:12px;border-radius:8px;border:1px solid #2a3b5c;background:#0a0e1a;color:#fff;text-align:center;font-size:16px}
button{width:100%;padding:12px;border-radius:8px;border:none;background:#00d2ff;color:#000;font-weight:bold;font-size:15px;cursor:pointer;margin-bottom:8px}
button:disabled{opacity:.5;cursor:not-allowed}
button.alt{background:#2a3b5c;color:#fff}
.res{margin-top:15px;font-size:22px;font-family:monospace;color:#00ff88;letter-spacing:2px;min-height:30px;word-break:break-all}
.status{font-size:12px;color:#8899bb;margin-top:10px}
</style>
</head>
<body>
<div class="box">
<h2>⚡ PAIR CODE GENERATOR</h2>
<input type="tel" id="phone" placeholder="94760601455 (no +)" value="">
<button id="btnPair" onclick="requestPair()">GET PAIR CODE</button>
<button class="alt" onclick="resetSession()">RESET SESSION</button>
<div class="res" id="result"></div>
<div class="status" id="status">Loading...</div>
</div>
<script>
const result = document.getElementById('result');
const btn = document.getElementById('btnPair');

async function requestPair(){
  const phone = document.getElementById('phone').value.trim();
  if(!phone){ result.style.color='#ff4757'; result.innerText='Phone number දාන්න'; return; }
  result.style.color='#00d2ff'; result.innerText='GENERATING...';
  btn.disabled = true;
  try{
    const res = await fetch('/api/pair',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({phone})
    });
    const d = await res.json();
    if(d.code){ result.style.color='#00ff88'; result.innerText=d.code; }
    else { result.style.color='#ff4757'; result.innerText=d.error||'Failed'; }
  }catch(e){ result.style.color='#ff4757'; result.innerText='Server Error'; }
  btn.disabled = false;
}

async function resetSession(){
  result.style.color='#ffa500'; result.innerText='RESETTING...';
  try{
    const res = await fetch('/reset');
    const d = await res.json();
    result.style.color = d.success ? '#00ff88' : '#ff4757';
    result.innerText = d.success ? 'SESSION CLEARED ✓' : (d.error||'Failed');
  }catch(e){ result.style.color='#ff4757'; result.innerText='Server Error'; }
}

setInterval(async()=>{
  try{
    const res = await fetch('/status');
    const d = await res.json();
    document.getElementById('status').innerText =
      (d.connected?'🟢 Connected':(d.pairing?'🟡 Pairing...':'🔴 Not connected'))
      + ' | Reg: ' + (d.registered?'Yes':'No')
      + ' | RAM: ' + d.ram + 'MB';
  }catch(e){}
},4000);
</script>
</body>
</html>`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🌐 Server active on port ${PORT}`));

// ============ STARTUP ============
(async () => {
    console.log('🚀 Starting bot...');
    // SESSION_ID එකක් තියෙනවා නම් විතරක් auto-connect
    if (process.env.SESSION_ID && process.env.SESSION_ID.startsWith('HACKERPRO~')) {
        console.log('📦 SESSION_ID found → auto-connecting...');
        keepAlive = true;
        await startSock();
    } else {
        console.log('ℹ️ No SESSION_ID → use /pair to connect');
    }
})();
