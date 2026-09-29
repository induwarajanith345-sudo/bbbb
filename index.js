// 🔥 HACKER PRO ULTRA — BOOTSTRAP (Auto-Fix All Files)
// මේ file එක run කරාම හැම file එකක්ම auto-create වෙනවා
// ඊට පස්සේ මේකම clean loader එකක් විදිහට rewrite වෙනවා

const fs = require('fs-extra');
const path = require('path');

console.log('🚀 BOOTSTRAP MODE — Auto-creating all files...\n');

const FILES = {

// ============ settings.js ============
'settings.js': String.raw`module.exports = {
    ownerNumber: process.env.OWNER_NUMBER || '94760601455',
    botName: 'Hacker Pro Md',
    ownerName: 'Hacker Pro',
    prefix: '.',
    port: process.env.PORT || 3000,
    tgToken: process.env.TG_TOKEN || '8703196263:AAFI9Ht3VLisyGsRj3fpVL40X6mRkWlYKHw',
    giphyApiKey: process.env.GIPHY_API_KEY || 'dc6zaTOxFJmzC'
};
`,

// ============ lib/helpers.js ============
'lib/helpers.js': String.raw`const getRAM = () => parseFloat((process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2));
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function safeJson(url) {
    try {
        const c = new AbortController();
        const t = setTimeout(() => c.abort(), 20000);
        const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: c.signal });
        clearTimeout(t);
        if (!r.ok) return null;
        return await r.json();
    } catch { return null; }
}

module.exports = { getRAM, sleep, safeJson };
`,

// ============ lib/auth.js ============
'lib/auth.js': String.raw`const fs = require('fs-extra');
const AUTH_DIR = './auth_info';
const CREDS_FILE = AUTH_DIR + '/creds.json';

function ensureAuthDir() {
    if (!fs.existsSync(AUTH_DIR)) fs.mkdirSync(AUTH_DIR, { recursive: true });
}

function resetCreds() {
    try {
        ensureAuthDir();
        fs.writeFileSync(CREDS_FILE, JSON.stringify({}));
        fs.readdirSync(AUTH_DIR).forEach(f => {
            if (f !== 'creds.json') { try { fs.unlinkSync(AUTH_DIR + '/' + f); } catch {} }
        });
        console.log('🔄 Creds reset');
    } catch (e) { console.error('Reset:', e.message); }
}

async function initAuthSession() {
    ensureAuthDir();
    if (process.env.SESSION_ID && process.env.SESSION_ID.startsWith('HACKERPRO~')) {
        try {
            const b64 = process.env.SESSION_ID.replace('HACKERPRO~', '');
            const json = Buffer.from(b64, 'base64').toString('utf-8');
            fs.writeFileSync(CREDS_FILE, json);
            console.log('✅ SESSION_ID restored');
        } catch (e) { console.error('SESSION:', e.message); }
    }
    if (!fs.existsSync(CREDS_FILE)) fs.writeFileSync(CREDS_FILE, JSON.stringify({}));
}

function isRegistered() {
    try {
        if (!fs.existsSync(CREDS_FILE)) return false;
        const c = JSON.parse(fs.readFileSync(CREDS_FILE, 'utf8') || '{}');
        return !!c.registered;
    } catch { return false; }
}

function purgeOldKeys() {
    try {
        if (!fs.existsSync(AUTH_DIR)) return;
        let n = 0;
        fs.readdirSync(AUTH_DIR).forEach(f => {
            if (f.startsWith('pre-key-') || f.startsWith('session-')) {
                try { fs.unlinkSync(AUTH_DIR + '/' + f); n++; } catch {}
            }
        });
        if (n) console.log('🧹 Cleared ' + n + ' keys');
    } catch {}
}

module.exports = { AUTH_DIR, CREDS_FILE, ensureAuthDir, resetCreds, initAuthSession, isRegistered, purgeOldKeys };
`,

// ============ lib/socket.js ============
'lib/socket.js': String.raw`const pino = require('pino');
const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys');
const { AUTH_DIR, initAuthSession, resetCreds } = require('./auth');
const { sleep } = require('./helpers');

let sock = null;
let isConnected = false;
let isStarting = false;
let reconnectTimer = null;
let pairingInProgress = false;
let keepAlive = false;

const logger = pino({ level: 'silent' });

const state = {
    get sock() { return sock; },
    get isConnected() { return isConnected; },
    get pairing() { return pairingInProgress; },
    set pairing(v) { pairingInProgress = v; },
    set keepAlive(v) { keepAlive = v; }
};

async function killSocket() {
    if (!sock) return;
    try { sock.ev.removeAllListeners(); } catch {}
    try { sock.ws?.close(); } catch {}
    try { sock.end(undefined); } catch {}
    sock = null; isConnected = false;
    await sleep(800);
}

async function startSock(onMessage) {
    if (isStarting) { await sleep(2000); return sock; }
    isStarting = true;
    if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
    await killSocket();
    await initAuthSession();

    const { state: authState, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    const { version } = await fetchLatestBaileysVersion();

    sock = makeWASocket({
        version, auth: authState, logger,
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
            isConnected = true; pairingInProgress = false; keepAlive = true;
        }
        if (connection === 'close') {
            isConnected = false;
            const code = lastDisconnect?.error?.output?.statusCode;
            console.log('❌ Socket Closed (' + code + ')');
            if (code === DisconnectReason.loggedOut || code === 401) {
                resetCreds(); keepAlive = false;
            }
            if (keepAlive && !pairingInProgress) reconnectTimer = setTimeout(() => startSock(onMessage), 5000);
        }
    });

    if (typeof onMessage === 'function') {
        sock.ev.on('messages.upsert', onMessage);
    }

    await sleep(1500);
    isStarting = false;
    return sock;
}

function getSock() { return sock; }

module.exports = { startSock, killSocket, getSock, state };
`,

// ============ lib/pairing.js ============
'lib/pairing.js': String.raw`const { isRegistered, resetCreds } = require('./auth');
const { startSock, killSocket, getSock, state } = require('./socket');
const { sleep } = require('./helpers');

async function getPairCode(phone) {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
        throw new Error('Valid phone number එකක් දෙන්න (උදා: 94760601455)');
    }
    if (state.isConnected) throw new Error('WhatsApp දැනටමත් connect වී ඇත!');
    if (state.pairing) throw new Error('Pair code එකක් දැනටමත් generate වෙමින් පවතී.');

    state.pairing = true;
    state.keepAlive = false;

    try {
        if (isRegistered()) { console.log('⚠️ Already registered → reset'); resetCreds(); }
        await killSocket();
        console.log('🔧 Creating fresh socket...');
        await startSock();
        await sleep(2500);

        const sock = getSock();
        if (!sock) throw new Error('Socket init fail');
        if (sock.authState?.creds?.registered) throw new Error('Session reset fail');

        console.log('🔑 Requesting pair code for ' + cleanPhone + '...');
        const code = await sock.requestPairingCode(cleanPhone);
        console.log('✅ Pair code: ' + code);

        setTimeout(() => { state.pairing = false; state.keepAlive = true; }, 60000);
        return code?.match(/.{1,4}/g)?.join('-') || code;
    } catch (e) {
        state.pairing = false;
        state.keepAlive = true;
        throw e;
    }
}

module.exports = { getPairCode };
`,

// ============ lib/isOwner.js ============
'lib/isOwner.js': String.raw`const settings = require('../settings');

module.exports = function isOwner(jid) {
    if (!jid) return false;
    const num = jid.split('@')[0].split(':')[0];
    return num === settings.ownerNumber;
};
`,

// ============ lib/isAdmin.js ============
'lib/isAdmin.js': String.raw`async function isAdmin(sock, groupJid, userJid) {
    try {
        if (!groupJid?.endsWith('@g.us')) return false;
        const metadata = await sock.groupMetadata(groupJid);
        const participant = metadata.participants.find(p => p.id === userJid || p.id.split('@')[0] === userJid.split('@')[0]);
        if (!participant) return false;
        return participant.admin === 'admin' || participant.admin === 'superadmin';
    } catch { return false; }
}

module.exports = { isAdmin };
`,

// ============ lib/lightweight_store.js ============
'lib/lightweight_store.js': String.raw`const store = {
    messages: {},
    contacts: {},
    chats: {},
    saveMessage(jid, msg) {
        if (!this.messages[jid]) this.messages[jid] = [];
        this.messages[jid].push(msg);
        if (this.messages[jid].length > 50) this.messages[jid].shift();
    },
    getMessage(jid) { return this.messages[jid] || []; }
};

module.exports = store;
`,

// ============ lib/exif.js ============
'lib/exif.js': String.raw`module.exports = {
    writeExif: async (buffer) => buffer,
    addExif: async (buffer) => buffer
};
`,

// ============ lib/converter.js ============
'lib/converter.js': String.raw`const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');

ffmpeg.setFfmpegPath(ffmpegPath);

async function toAudio(buffer, ext = 'mp4') {
    const tmpIn = path.join(os.tmpdir(), 'in_' + Date.now() + '.' + ext);
    const tmpOut = path.join(os.tmpdir(), 'out_' + Date.now() + '.mp3');
    await fs.writeFile(tmpIn, buffer);
    return new Promise((resolve, reject) => {
        ffmpeg(tmpIn).toFormat('mp3').on('end', async () => {
            const out = await fs.readFile(tmpOut);
            fs.unlink(tmpIn).catch(() => {});
            fs.unlink(tmpOut).catch(() => {});
            resolve(out);
        }).on('error', reject).save(tmpOut);
    });
}

module.exports = { toAudio };
`,

// ============ lib/uploadImage.js ============
'lib/uploadImage.js': String.raw`const FormData = require('form-data');
const axios = require('axios');

async function uploadImage(buffer) {
    try {
        const form = new FormData();
        form.append('file', buffer, { filename: 'image.jpg' });
        const res = await axios.post('https://telegra.ph/upload', form, {
            headers: form.getHeaders()
        });
        if (res.data?.[0]?.src) return 'https://telegra.ph' + res.data[0].src;
        return null;
    } catch { return null; }
}

module.exports = { uploadImage };
`,

// ============ lib/welcome.js ============
'lib/welcome.js': String.raw`async function sendWelcome(sock, groupJid, participant) {
    try {
        await sock.sendMessage(groupJid, {
            text: '👋 Welcome @' + participant.split('@')[0] + '!',
            mentions: [participant]
        });
    } catch (e) { console.error('Welcome error:', e.message); }
}

async function sendGoodbye(sock, groupJid, participant) {
    try {
        await sock.sendMessage(groupJid, {
            text: '👋 Goodbye @' + participant.split('@')[0],
            mentions: [participant]
        });
    } catch (e) { console.error('Goodbye error:', e.message); }
}

module.exports = { sendWelcome, sendGoodbye };
`,

// ============ lib/messageConfig.js ============
'lib/messageConfig.js': String.raw`module.exports = {
    welcomeEnabled: true,
    goodbyeEnabled: true,
    antiLinkEnabled: false,
    antiCallEnabled: false,
    antiDeleteEnabled: false,
    autoReactEnabled: false
};
`,

// ============ lib/index.js ============
'lib/index.js': String.raw`module.exports = {
    ...require('./helpers'),
    ...require('./auth'),
    ...require('./socket'),
    ...require('./pairing'),
    ...require('./welcome'),
    ...require('./converter'),
    ...require('./uploadImage')
};
`,

// ============ commands/index.js ============
'commands/index.js': String.raw`const fs = require('fs');
const path = require('path');

const COMMANDS = new Map();
const ALIASES = new Map();

function loadCommands() {
    const files = fs.readdirSync(__dirname).filter(f => f.endsWith('.js') && f !== 'index.js');
    for (const file of files) {
        try {
            const mod = require(path.join(__dirname, file));
            const name = file.replace('.js', '');

            if (typeof mod === 'function') {
                COMMANDS.set(name, { handler: mod, opts: {} });
                console.log('📦 Loaded: ' + name);
            }
            else if (mod.name && typeof mod.handler === 'function') {
                COMMANDS.set(mod.name, { handler: mod.handler, opts: {} });
                (mod.aliases || []).forEach(a => ALIASES.set(a, mod.name));
                console.log('📦 Loaded: ' + mod.name);
            }
        } catch (e) {
            console.error('❌ Failed ' + file + ': ' + e.message);
        }
    }
    return COMMANDS.size;
}

function getCommand(name) {
    const key = name.toLowerCase();
    if (COMMANDS.has(key)) return COMMANDS.get(key);
    if (ALIASES.has(key)) return COMMANDS.get(ALIASES.get(key));
    return null;
}

module.exports = { loadCommands, getCommand, COMMANDS };
`,

// ============ commands/ping.js ============
'commands/ping.js': String.raw`const { getRAM } = require('../lib/helpers');

module.exports = {
    name: 'ping',
    aliases: ['speed'],
    handler: async ({ sock, from, msg }) => {
        const t = Date.now();
        const s = await sock.sendMessage(from, { text: '🏓 Pong!' }, { quoted: msg });
        await sock.sendMessage(from, {
            text: '⚡ Speed: ' + (Date.now() - t) + 'ms\n💾 RAM: ' + getRAM() + ' MB',
            edit: s.key
        });
    }
};
`,

// ============ commands/menu.js ============
'commands/menu.js': String.raw`const settings = require('../settings');

module.exports = {
    name: 'menu',
    aliases: ['help'],
    handler: async ({ sock, from, msg }) => {
        await sock.sendMessage(from, {
            text: '🔥 *' + settings.botName + '* 🔥\n\n📌 Commands:\n.ping\n.settings\n.owner'
        }, { quoted: msg });
    }
};
`,

// ============ commands/settings.js ============
'commands/settings.js': String.raw`const settings = require('../settings');
const { getRAM } = require('../lib/helpers');

module.exports = {
    name: 'settings',
    aliases: ['config'],
    handler: async ({ sock, from, msg }) => {
        const up = process.uptime();
        const hrs = Math.floor(up / 3600);
        const mins = Math.floor((up % 3600) / 60);
        await sock.sendMessage(from, {
            text: '⚙️ *' + settings.botName + ' Settings*\n📱 Owner: +' + settings.ownerNumber + '\n⏱️ Uptime: ' + hrs + 'h ' + mins + 'm\n💾 RAM: ' + getRAM() + ' MB'
        }, { quoted: msg });
    }
};
`,

// ============ commands/owner.js ============
'commands/owner.js': String.raw`const settings = require('../settings');

module.exports = {
    name: 'owner',
    aliases: ['creator'],
    handler: async ({ sock, from, msg }) => {
        await sock.sendMessage(from, { text: '👑 *Owner:* +' + settings.ownerNumber }, { quoted: msg });
    }
};
`,

// ============ web/server.js ============
'web/server.js': String.raw`const express = require('express');
const path = require('path');
const settings = require('../settings');

function startWeb() {
    const app = express();
    app.use(express.json());
    app.use(express.static(path.join(__dirname, 'public')));

    app.post('/api/pair', async (req, res) => {
        try {
            const phone = req.body.phone || req.query.phone || '';
            const code = await global.generatePairCode('web', phone);
            if (!code) return res.status(500).json({ success: false, error: 'No code generated' });
            res.json({ success: true, code });
        } catch (e) {
            res.status(500).json({ success: false, error: e.message });
        }
    });

    app.get('/pair', async (req, res) => {
        try {
            const code = await global.generatePairCode('web', req.query.phone || '');
            if (!code) return res.status(500).json({ success: false, error: 'No code generated' });
            res.json({ success: true, code });
        } catch (e) {
            res.status(500).json({ success: false, error: e.message });
        }
    });

    app.get('/reset', async (req, res) => {
        try {
            await global.resetSession();
            res.json({ success: true, message: 'Session reset complete' });
        } catch (e) {
            res.status(500).json({ success: false, error: e.message });
        }
    });

    app.get('/status', (req, res) => {
        res.json(global.getStatus());
    });

    app.listen(settings.port, () => console.log('🌐 Web active on port ' + settings.port));
}

module.exports = { startWeb };
`,

// ============ web/public/index.html ============
'web/public/index.html': String.raw`<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>HACKER PRO PAIRING PORTAL</title>
<style>
*{box-sizing:border-box}
body{background:#0a0e1a;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:15px}
.box{background:#131b2e;padding:25px;border-radius:15px;border:1px solid #1f2d4d;width:100%;max-width:400px;text-align:center}
h2{color:#00d2ff;margin:0 0 20px;font-size:20px}
input{width:100%;padding:12px;margin-bottom:12px;border-radius:8px;border:1px solid #2a3b5c;background:#0a0e1a;color:#fff;text-align:center;font-size:16px}
button{width:100%;padding:12px;border-radius:8px;border:none;background:#00d2ff;color:#000;font-weight:bold;font-size:15px;cursor:pointer;margin-bottom:8px}
button.alt{background:#2a3b5c;color:#fff}
button:disabled{opacity:.5}
.res{margin-top:15px;font-size:22px;font-family:monospace;color:#00ff88;letter-spacing:2px;min-height:30px;word-break:break-all}
.st{font-size:12px;color:#8899bb;margin-top:10px}
</style>
</head>
<body>
<div class="box">
<h2>⚡ PAIR CODE GENERATOR</h2>
<input type="tel" id="phone" placeholder="94760601455 (no +)">
<button id="btn" onclick="go()">GET PAIR CODE</button>
<button class="alt" onclick="rst()">RESET SESSION</button>
<div class="res" id="r"></div>
<div class="st" id="s">Loading...</div>
</div>
<script>
const r=document.getElementById('r'),b=document.getElementById('btn');
async function go(){
  const p=document.getElementById('phone').value.trim();
  if(!p){r.style.color='#ff4757';r.innerText='Phone number දාන්න';return}
  r.style.color='#00d2ff';r.innerText='GENERATING...';b.disabled=true;
  try{
    const x=await fetch('/api/pair',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone:p})});
    const d=await x.json();
    if(d.code){r.style.color='#00ff88';r.innerText=d.code}
    else{r.style.color='#ff4757';r.innerText=d.error||'Failed'}
  }catch(e){r.style.color='#ff4757';r.innerText='Server Error'}
  b.disabled=false;
}
async function rst(){
  r.style.color='#ffa500';r.innerText='RESETTING...';
  try{
    const x=await fetch('/reset');const d=await x.json();
    r.style.color=d.success?'#00ff88':'#ff4757';
    r.innerText=d.success?'SESSION CLEARED ✓':(d.error||'Failed');
  }catch(e){r.style.color='#ff4757';r.innerText='Server Error'}
}
setInterval(async()=>{
  try{
    const x=await fetch('/status');const d=await x.json();
    document.getElementById('s').innerText=
      (d.connected?'🟢 Connected':(d.pairing?'🟡 Pairing...':'🔴 Not connected'))+' | RAM: '+d.ram+'MB';
  }catch(e){}
},4000);
</script>
</body>
</html>
`,

// ============ telegram/bot.js ============
'telegram/bot.js': String.raw`const settings = require('../settings');

async function sendTgMessage(chatId, text) {
    try {
        await fetch('https://api.telegram.org/bot' + settings.tgToken + '/sendMessage', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' })
        });
    } catch {}
}

async function startTelegram() {
    if (!settings.tgToken || settings.tgToken === 'YOUR_TOKEN') {
        console.log('⚠️ No Telegram token — skipping');
        return;
    }
    let offset = 0;
    while (true) {
        try {
            const res = await fetch('https://api.telegram.org/bot' + settings.tgToken + '/getUpdates?offset=' + offset + '&timeout=20');
            const data = await res.json();
            if (data.ok && data.result.length > 0) {
                for (const update of data.result) {
                    offset = update.update_id + 1;
                    const msg = update.message;
                    if (!msg?.text) continue;
                    const chatId = msg.chat.id;
                    const text = msg.text.trim();

                    if (text === '/start') {
                        await sendTgMessage(chatId, '⚡ *' + settings.botName + ' Pair Bot*\n\n/pair 94760601455\n/reset');
                    } else if (text.startsWith('/pair')) {
                        const phone = text.split(/\s+/)[1];
                        if (!phone) { await sendTgMessage(chatId, '⚠️ `/pair 94760601455`'); continue; }
                        await sendTgMessage(chatId, '⏳ Generating Pair Code...');
                        try {
                            const code = await global.generatePairCode(String(chatId), phone);
                            if (code) {
                                await sendTgMessage(chatId, '🎉 *Your Pair Code:*\n\n\`' + code + '\`\n\n📱 WhatsApp → Linked Devices → Link with Phone Number');
                            } else {
                                await sendTgMessage(chatId, '❌ Pair code generate fail');
                            }
                        } catch (err) {
                            await sendTgMessage(chatId, '❌ *Error:* ' + err.message);
                        }
                    } else if (text === '/reset') {
                        await global.resetSession();
                        await sendTgMessage(chatId, '✅ Session reset. දැන් `/pair` යවන්න.');
                    }
                }
            }
        } catch { await new Promise(r => setTimeout(r, 4000)); }
    }
}

module.exports = { startTelegram };
`
};

// ============ WRITE ALL FILES ============
(async () => {
    let created = 0;
    let updated = 0;

    for (const [file, content] of Object.entries(FILES)) {
        try {
            const fullPath = path.join(__dirname, file);
            const existed = fs.existsSync(fullPath);
            fs.ensureDirSync(path.dirname(fullPath));
            fs.writeFileSync(fullPath, content);
            if (existed) { updated++; console.log('♻️  Updated: ' + file); }
            else { created++; console.log('✅ Created: ' + file); }
        } catch (e) {
            console.error('❌ Failed ' + file + ': ' + e.message);
        }
    }

    console.log('\n📊 ' + created + ' created, ' + updated + ' updated');

    // ============ REWRITE index.js AS CLEAN LOADER ============
    const CLEAN_INDEX = String.raw`// 🔥 HACKER PRO ULTRA — Modular Loader
require('dotenv').config();
const settings = require('./settings');
const { getRAM } = require('./lib/helpers');
const { loadCommands, getCommand } = require('./commands');
const { startSock, getSock, state, killSocket } = require('./lib/socket');
const { startWeb } = require('./web/server');
const { startTelegram } = require('./telegram/bot');
const { getPairCode } = require('./lib/pairing');
const { resetCreds, purgeOldKeys } = require('./lib/auth');
const { isAdmin } = require('./lib/isAdmin');
const isOwner = require('./lib/isOwner');

global.botData = {};
global.saveBotData = () => {};
global.sessions = {};
global.generatePairCode = async (userId, phone) => {
    const code = await getPairCode(phone);
    if (code) global.sessions[userId] = { pairCode: code, time: Date.now() };
    return code;
};
global.resetSession = async () => {
    resetCreds();
    await killSocket();
    state.pairing = false;
    state.keepAlive = false;
};
global.getStatus = () => ({
    connected: state.isConnected,
    pairing: state.pairing,
    uptime: process.uptime(),
    ram: getRAM()
});

process.on('uncaughtException', (e) => console.error('🛡️ Uncaught:', e?.message || e));
process.on('unhandledRejection', (e) => console.error('🛡️ Unhandled:', e?.message || e));

console.log('💾 [RAM] ' + getRAM() + ' MB');
console.log('⚙️  Bot: ' + settings.botName);

async function onMessage({ messages }) {
    try {
        const msg = messages[0];
        if (!msg?.message || msg.key.fromMe) return;
        const from = msg.key.remoteJid;
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
        if (!text.startsWith(settings.prefix)) return;

        const [cmdName, ...args] = text.slice(settings.prefix.length).trim().split(/\s+/);
        const cmd = getCommand(cmdName);
        if (!cmd) return;

        const sock = getSock();
        if (!sock) return;

        const participant = msg.key.participant || from;
        let adminUser = false;
        try { adminUser = await isAdmin(sock, from, participant); } catch {}
        const ownerUser = isOwner(participant);

        await cmd.handler({
            sock, from, msg, args,
            text: args.join(' '),
            isAdmin: adminUser || ownerUser,
            ownerNumber: settings.ownerNumber,
            botName: settings.botName,
            botData: global.botData,
            saveBotData: global.saveBotData,
            userId: participant
        });
    } catch (e) { console.error('Msg error:', e.message); }
}

(async () => {
    console.log('🚀 Booting...');
    const count = loadCommands();
    console.log('✅ ' + count + ' commands loaded');

    startWeb();
    startTelegram();
    setInterval(purgeOldKeys, 1000 * 60 * 60);

    if (process.env.SESSION_ID && process.env.SESSION_ID.startsWith('HACKERPRO~')) {
        console.log('📦 SESSION_ID found → auto-connecting...');
        state.keepAlive = true;
        await startSock(onMessage);
    } else {
        console.log('ℹ️ No SESSION_ID → use /pair to connect');
    }
})();
`;

    try {
        fs.writeFileSync(path.join(__dirname, 'index.js'), CLEAN_INDEX);
        console.log('\n✨ index.js rewritten as clean loader');
        console.log('♻️  Restarting bot in 3 seconds...\n');
    } catch (e) {
        console.error('❌ Failed to rewrite index.js:', e.message);
    }

    // Restart process
    setTimeout(() => {
        process.exit(0);
    }, 3000);
})();
