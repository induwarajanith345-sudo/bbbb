// 🔥 HACKER PRO ULTRA — Fully Fixed Baileys Pair Bot + Web Portal
require('dotenv').config();
const express = require('express');
const fs = require('fs-extra');
const pino = require('pino');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');

// ============ SETTINGS ============
let settings = { ownerNumber: '94760601455', botName: 'Hacker Pro Md' };
try { settings = { ...settings, ...require('./settings.js') }; console.log('✅ settings loaded'); } catch {}
let OWNER_NUMBER = settings.ownerNumber;
const BOT_NAME = settings.botName;
const TELEGRAM_TOKEN = process.env.TG_TOKEN || '8703196263:AAFI9Ht3VLisyGsRj3fpVL40X6mRkWlYKHw';
const AUTH_DIR = './auth_info';

// ============ ERROR HANDLERS ============
process.on('uncaughtException', (e) => console.error('🛡️ Uncaught:', e?.message || e));
process.on('unhandledRejection', (e) => console.error('🛡️ Unhandled:', e?.message || e));

const getRAM = () => parseFloat((process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2));
console.log(`💾 [RAM] ${getRAM()} MB`);

// ============ SESSION MANAGEMENT ============
async function initAuthSession() {
    if (!fs.existsSync(AUTH_DIR)) fs.mkdirSync(AUTH_DIR, { recursive: true });
    if (process.env.SESSION_ID && process.env.SESSION_ID.startsWith('HACKERPRO~')) {
        try {
            const base64Data = process.env.SESSION_ID.replace('HACKERPRO~', '');
            const jsonString = Buffer.from(base64Data, 'base64').toString('utf-8');
            fs.writeFileSync(`${AUTH_DIR}/creds.json`, jsonString);
            console.log('✅ SESSION_ID Restored successfully!');
        } catch (err) {
            console.error('❌ SESSION_ID Restore error:', err.message);
        }
    }
}

// 🔥 Auto reset — auth_info folder delete කරන්න ඕන නෑ
async function resetSession() {
    try {
        if (fs.existsSync(AUTH_DIR)) {
            fs.removeSync(AUTH_DIR);
            console.log('🧹 Auth session cleared (auto reset)');
        }
        fs.mkdirSync(AUTH_DIR, { recursive: true });
    } catch (e) {
        console.error('Reset error:', e.message);
    }
}

function purgeOldKeys() {
    try {
        if (!fs.existsSync(AUTH_DIR)) return;
        const files = fs.readdirSync(AUTH_DIR);
        let count = 0;
        files.forEach(file => {
            if (file.startsWith('pre-key-') || file.startsWith('session-')) {
                try { fs.unlinkSync(`${AUTH_DIR}/${file}`); count++; } catch {}
            }
        });
        if (count > 0) console.log(`🧹 Cleared ${count} old session keys.`);
    } catch (e) { console.error('Cleanup error:', e.message); }
}
setInterval(purgeOldKeys, 1000 * 60 * 60);

// ============ HELPERS ============
const isOwner = (ctx) => ctx.msg?.key?.fromMe || (ctx.from || '').split('@')[0].split(':')[0] === OWNER_NUMBER;

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
let reconnectTimer = null;
let pairingInProgress = false;
let currentPairPhone = null;
const logger = pino({ level: 'silent' });

async function startSock() {
    if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }

    // පරණ socket close කරන්න
    if (sock) {
        try { sock.ev.removeAllListeners('connection.update'); } catch {}
        try { sock.end(undefined); } catch {}
        sock = null;
    }

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
        mobile: false
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
        if (connection === 'open') {
            console.log('✅ WhatsApp Connected!');
            isConnected = true;
            pairingInProgress = false;
            currentPairPhone = null;
        }

        if (connection === 'close') {
            isConnected = false;
            const code = lastDisconnect?.error?.output?.statusCode;
            console.log(`❌ Socket Closed (Code: ${code})`);

            if (code === DisconnectReason.loggedOut || code === 401) {
                console.log('🧹 Logged out → clearing session');
                await resetSession();
            }

            // Pairing කරන අතරේ auto-reconnect නවත්තන්න
            if (!pairingInProgress) {
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

    return sock;
}

// 🔥 FIXED getPairCode — auto reset if needed
async function getPairCode(phone) {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
        throw new Error('Valid phone number එකක් දෙන්න (උදා: 94760601455)');
    }

    if (isConnected) {
        throw new Error('WhatsApp දැනටමත් connect වී ඇත!');
    }

    if (pairingInProgress) {
        throw new Error('Pair code එකක් දැනටමත් generate වෙමින් පවතී. තප්පර කිහිපයක් ඉන්න.');
    }

    pairingInProgress = true;

    try {
        // Socket එකක් නැත්නම් හදන්න
        if (!sock) {
            await startSock();
            await new Promise(r => setTimeout(r, 2000));
        }

        // 🔥 Already registered නම් → auto reset කරලා fresh socket
        if (sock?.authState?.creds?.registered) {
            console.log('⚠️ Session already registered → auto resetting...');
            await resetSession();
            await startSock();
            await new Promise(r => setTimeout(r, 2000));
        }

        if (!sock) throw new Error('Socket init fail. ආයෙ try කරන්න.');

        // Baileys එකට socket ready වෙන්න ටිකක් ඉඩ දෙන්න
        await new Promise(r => setTimeout(r, 1000));

        const code = await sock.requestPairingCode(cleanPhone);
        currentPairPhone = cleanPhone;
        console.log(`🔑 Pair code: ${code} for ${cleanPhone}`);

        // Pair code එක use කරන්න මිනිත්තු 2ක් වගේ ඉඩ දෙන්න
        setTimeout(() => { pairingInProgress = false; }, 120000);

        return code?.match(/.{1,4}/g)?.join('-') || code;
    } catch (e) {
        pairingInProgress = false;
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
                        await sendTgMessage(chatId, `⚡ *${BOT_NAME} Pairing Bot*\n\n/pair 94760601455\n/reset — session clear කරන්න`);
                    } else if (text.startsWith('/pair')) {
                        const phone = text.split(/\s+/)[1];
                        if (!phone) { await sendTgMessage(chatId, '⚠️ `/pair 94760601455`'); continue; }
                        await sendTgMessage(chatId, '⏳ Generating Pair Code...');
                        try {
                            const code = await getPairCode(phone);
                            await sendTgMessage(chatId, `🎉 *Your Pair Code:*\n\n\`${code}\`\n\n_WhatsApp → Linked Devices → Link with Phone Number_`);
                        } catch (err) {
                            await sendTgMessage(chatId, `❌ *Error:* ${err.message}`);
                        }
                    } else if (text === '/reset') {
                        await resetSession();
                        try { if (sock) sock.end(undefined); } catch {}
                        sock = null; isConnected = false; pairingInProgress = false;
                        await sendTgMessage(chatId, '✅ Session reset complete. දැන් `/pair` යවන්න.');
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

// 🔥 Reset endpoint — auth_info delete කරන්න ඕන නෑ
app.get('/reset', async (req, res) => {
    try {
        await resetSession();
        try { if (sock) sock.end(undefined); } catch {}
        sock = null; isConnected = false; pairingInProgress = false;
        res.json({ success: true, message: 'Session reset complete' });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

app.get('/status', (req, res) => {
    res.json({
        connected: isConnected,
        pairing: pairingInProgress,
        registered: !!sock?.authState?.creds?.registered,
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
body{background:#0a0e1a;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:15px;box-sizing:border-box}
.box{background:#131b2e;padding:25px;border-radius:15px;border:1px solid #1f2d4d;width:100%;max-width:400px;text-align:center;box-shadow:0 10px 25px rgba(0,0,0,.5)}
h2{color:#00d2ff;margin-bottom:20px}
input{width:100%;padding:12px;margin-bottom:15px;border-radius:8px;border:1px solid #2a3b5c;background:#0a0e1a;color:#fff;text-align:center;font-size:16px;box-sizing:border-box}
button{width:100%;padding:12px;border-radius:8px;border:none;background:#00d2ff;color:#000;font-weight:bold;font-size:16px;cursor:pointer;margin-bottom:8px}
button.alt{background:#2a3b5c;color:#fff}
.res{margin-top:15px;font-size:22px;font-family:monospace;color:#00ff88;letter-spacing:2px;min-height:30px;word-break:break-all}
.status{font-size:12px;color:#8899bb;margin-top:10px}
</style>
</head>
<body>
<div class="box">
<h2>⚡ PAIR CODE GENERATOR</h2>
<input type="text" id="phone" placeholder="94760601455 (no +)">
<button onclick="requestPair()">GET PAIR CODE</button>
<button class="alt" onclick="resetSession()">RESET SESSION</button>
<div class="res" id="result"></div>
<div class="status" id="status"></div>
</div>
<script>
async function requestPair(){
  const phone=document.getElementById('phone').value;
  const r=document.getElementById('result');
  r.style.color='#00d2ff';r.innerText='GENERATING...';
  try{
    const res=await fetch('/api/pair',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone})});
    const d=await res.json();
    if(d.code){r.style.color='#00ff88';r.innerText=d.code;}
    else{r.style.color='#ff4757';r.innerText=d.error||'Failed';}
  }catch(e){r.style.color='#ff4757';r.innerText='Server Error';}
}
async function resetSession(){
  const r=document.getElementById('result');
  r.style.color='#ffa500';r.innerText='RESETTING...';
  try{
    const res=await fetch('/reset');
    const d=await res.json();
    r.style.color=d.success?'#00ff88':'#ff4757';
    r.innerText=d.success?'SESSION CLEARED ✓':d.error;
  }catch(e){r.style.color='#ff4757';r.innerText='Server Error';}
}
setInterval(async()=>{
  try{
    const res=await fetch('/status');
    const d=await res.json();
    document.getElementById('status').innerText =
      (d.connected?'🟢 Connected':(d.pairing?'🟡 Pairing...':'🔴 Not connected')) +
      ' | Reg: '+(d.registered?'Yes':'No') +
      ' | RAM: '+d.ram+'MB';
  }catch(e){}
},5000);
</script>
</body>
</html>`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🌐 Server active on port ${PORT}`));

// ============ START ============
// SESSION_ID එකක් තියෙනවා නම් විතරක් auto-start. නැත්නම් pair code එකෙන් connect කරන්න.
(async () => {
    if (process.env.SESSION_ID && process.env.SESSION_ID.startsWith('HACKERPRO~')) {
        await startSock();
    } else {
        console.log('ℹ️ No SESSION_ID. Pair code එකක් හරහා connect කරන්න.');
    }
})();
