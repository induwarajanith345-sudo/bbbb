// 🔥 HACKER PRO ULTRA — Clean & Fixed Baileys Pair Bot + Web Portal
require('dotenv').config();
const express = require('express');
const fs = require('fs-extra');
const pino = require('pino');
const QRCode = require('qrcode');
const { exec } = require('child_process');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');

// ============ SETTINGS ============
let settings = { ownerNumber: '94760601455', botName: 'Hacker Pro Md' };
try { settings = { ...settings, ...require('./settings.js') }; console.log('✅ settings loaded'); } catch {}
let OWNER_NUMBER = settings.ownerNumber;
const BOT_NAME = settings.botName;
const TELEGRAM_TOKEN = process.env.TG_TOKEN || '8703196263:AAFI9Ht3VLisyGsRj3fpVL40X6mRkWlYKHw';

// ============ ERROR HANDLERS ============
process.on('uncaughtException', (e) => console.error('🛡️ Uncaught:', e?.message || e));
process.on('unhandledRejection', (e) => console.error('🛡️ Unhandled:', e?.message || e));

const getRAM = () => parseFloat((process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2));
console.log(`💾 [RAM] ${getRAM()} MB`);

// ============ SESSION MANAGEMENT ============
async function initAuthSession() {
    if (!fs.existsSync('./auth_info')) {
        fs.mkdirSync('./auth_info', { recursive: true });
    }
    if (process.env.SESSION_ID && process.env.SESSION_ID.startsWith('HACKERPRO~')) {
        try {
            const base64Data = process.env.SESSION_ID.replace('HACKERPRO~', '');
            const jsonString = Buffer.from(base64Data, 'base64').toString('utf-8');
            fs.writeFileSync('./auth_info/creds.json', jsonString);
            console.log('✅ SESSION_ID Restored successfully!');
        } catch (err) {
            console.error('❌ SESSION_ID Restore error:', err.message);
        }
    }
}

function purgeOldKeys() {
    try {
        if (!fs.existsSync('./auth_info')) return;
        const files = fs.readdirSync('./auth_info');
        let count = 0;
        files.forEach(file => {
            if (file.startsWith('pre-key-') || file.startsWith('session-')) {
                fs.unlinkSync(`./auth_info/${file}`);
                count++;
            }
        });
        if (count > 0) console.log(`🧹 Cleared ${count} old session keys.`);
    } catch (e) {
        console.error('Cleanup error:', e.message);
    }
}
setInterval(purgeOldKeys, 1000 * 60 * 60);

// ============ HELPERS ============
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

const isOwner = (ctx) => ctx.msg?.key?.fromMe || (ctx.from || '').split('@')[0].split(':')[0] === OWNER_NUMBER;

// ============ BUILT-IN COMMANDS ============
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
    await sock.sendMessage(from, { text: `🔥 *${BOT_NAME}* 🔥\n\n📌 Commands:\n.ping - Check bot speed\n.settings - System status\n.owner - Owner details` }, { quoted: msg });
}, { public: true });

register('owner', ['creator'], async (c) => {
    const { sock, from, msg } = c;
    await sock.sendMessage(from, { text: `👑 *Owner Number:* +${OWNER_NUMBER}` }, { quoted: msg });
}, { public: true });

// ============ BAILEYS SOCKET & PAIRING SYSTEM ============
let sock = null;
let isConnected = false;
let isStarting = false;
const logger = pino({ level: 'silent' });

async function startSock() {
    if (isStarting) return;
    isStarting = true;

    await initAuthSession();
    const { state, saveCreds } = await useMultiFileAuthState('./auth_info');
    const { version } = await fetchLatestBaileysVersion();

    sock = makeWASocket({
        version,
        auth: state,
        logger,
        printQRInTerminal: false,
        browser: ['Ubuntu', 'Chrome', '20.0.04'],
        syncFullHistory: false,
        markOnlineOnConnect: false
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (u) => {
        const { connection, lastDisconnect } = u;

        if (connection === 'open') {
            console.log('✅ WhatsApp Successfully Connected!');
            isConnected = true;
            isStarting = false;
        }

        if (connection === 'close') {
            isConnected = false;
            isStarting = false;
            const code = lastDisconnect?.error?.output?.statusCode;
            console.log(`❌ Socket Connection Closed (Code: ${code})`);

            if (code === DisconnectReason.loggedOut || code === 401) {
                console.log('🧹 Session expired/logged out. Clearing auth...');
                try { fs.removeSync('./auth_info'); } catch {}
            }
            setTimeout(() => startSock(), 5000);
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
        } catch (e) { console.error('Msg process error:', e.message); }
    });

    isStarting = false;
}

// Pair Code Requester Function
async function getPairCode(phone) {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
        throw new Error('Valid Phone Number එකක් දෙන්න (උදා: 94760601455)');
    }

    if (isConnected) {
        throw new Error('WhatsApp දැනටමත් Connect වී ඇත!');
    }

    if (!sock || !sock.authState) {
        await startSock();
        await new Promise(r => setTimeout(r, 3000));
    }

    if (sock && !sock.authState.creds.registered) {
        await new Promise(r => setTimeout(r, 2000));
        let code = await sock.requestPairingCode(cleanPhone);
        return code?.match(/.{1,4}/g)?.join('-') || code;
    } else {
        throw new Error('Socket ready නැත. තප්පර කිහිපයකින් නැවත උත්සාහ කරන්න.');
    }
}

startSock();

// ============ TELEGRAM PAIR BOT ============
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
                        await sendTgMessage(chatId, `⚡ *${BOT_NAME} Pairing Bot*\n\nPair Code එකක් ලබා ගැනීමට:\n\`/pair 94760601455\``);
                    } else if (text.startsWith('/pair')) {
                        const parts = text.split(/\s+/);
                        const phone = parts[1];
                        if (!phone) {
                            await sendTgMessage(chatId, '⚠️ Phone number එක ඇතුළත් කරන්න!\nඋදා: `/pair 94760601455`');
                            continue;
                        }
                        await sendTgMessage(chatId, '⏳ Generating Pair Code...');
                        try {
                            const code = await getPairCode(phone);
                            await sendTgMessage(chatId, `🎉 *Your Pair Code:*\n\n\`${code}\`\n\n📌 _WhatsApp එකේ Linked Devices -> Link with Phone Number ගොස් ලබා දෙන්න._`);
                        } catch (err) {
                            await sendTgMessage(chatId, `❌ *Error:* ${err.message}`);
                        }
                    }
                }
            }
        } catch {
            await new Promise(r => setTimeout(r, 4000));
        }
    }
}
startTelegramBot();

// ============ WEB PORTAL (EXPRESS) ============
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
        const phone = req.query.phone || '94760601455';
        const code = await getPairCode(phone);
        return res.json({ success: true, code });
    } catch (e) {
        return res.status(500).json({ success: false, error: e.message });
    }
});

app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>HACKER PRO PAIRING PORTAL</title>
        <style>
            body { background: #0a0e1a; color: #fff; font-family: sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
            .box { background: #131b2e; padding: 25px; border-radius: 15px; border: 1px solid #1f2d4d; width: 90%; max-width: 400px; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
            h2 { color: #00d2ff; margin-bottom: 20px; }
            input { width: 100%; padding: 12px; margin-bottom: 15px; border-radius: 8px; border: 1px solid #2a3b5c; background: #0a0e1a; color: #fff; text-align: center; font-size: 16px; box-sizing: border-box; }
            button { width: 100%; padding: 12px; border-radius: 8px; border: none; background: #00d2ff; color: #000; font-weight: bold; font-size: 16px; cursor: pointer; }
            .res { margin-top: 20px; font-size: 24px; font-family: monospace; color: #00ff88; letter-spacing: 2px; }
        </style>
    </head>
    <body>
        <div class="box">
            <h2>⚡ PAIR CODE GENERATOR</h2>
            <input type="text" id="phone" value="94760601455" placeholder="Phone Number (9476...)">
            <button onclick="requestPair()">GET PAIR CODE</button>
            <div class="res" id="result"></div>
        </div>
        <script>
            async function requestPair() {
                const phone = document.getElementById('phone').value;
                const resDiv = document.getElementById('result');
                resDiv.style.color = '#00d2ff';
                resDiv.innerText = 'GENERATING...';
                try {
                    const res = await fetch('/api/pair', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ phone })
                    });
                    const data = await res.json();
                    if (data.code) {
                        resDiv.style.color = '#00ff88';
                        resDiv.innerText = data.code;
                    } else {
                        resDiv.style.color = '#ff4757';
                        resDiv.innerText = data.error || 'Failed';
                    }
                } catch (e) {
                    resDiv.style.color = '#ff4757';
                    resDiv.innerText = 'Server Error';
                }
            }
        </script>
    </body>
    </html>
    `);
});

const PORT = process.env.PORT || 80;
app.listen(PORT, () => console.log(`🌐 Server active on port ${PORT}`));
