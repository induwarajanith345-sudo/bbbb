// 🔥 HACKER PRO ULTRA — Baileys Standalone Edition (Index + Telegram Pair Bot)
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
process.on('uncaughtException', (e) => console.error('🛡️', e?.message || e));
process.on('unhandledRejection', (e) => console.error('🛡️', e?.message || e));

const getRAM = () => parseFloat((process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2));
console.log(`💾 [RAM] ${getRAM()} MB`);

// ============ SESSION & STORAGE CLEANUP SYSTEM ============
async function initAuthSession() {
    if (!fs.existsSync('./auth_info')) {
        fs.mkdirSync('./auth_info', { recursive: true });
    }
    
    if (process.env.SESSION_ID && process.env.SESSION_ID.startsWith('HACKERPRO~')) {
        try {
            const base64Data = process.env.SESSION_ID.replace('HACKERPRO~', '');
            const jsonString = Buffer.from(base64Data, 'base64').toString('utf-8');
            fs.writeFileSync('./auth_info/creds.json', jsonString);
            console.log('✅ SESSION_ID එකෙන් Auth Restore විය!');
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
        if (count > 0) console.log(`🧹 Cleared ${count} old session key files.`);
    } catch (e) {
        console.error('Cleanup error:', e.message);
    }
}

setInterval(purgeOldKeys, 1000 * 60 * 60);

// ============ HELPERS ============
async function safeJson(url) {
    try {
        const c = new AbortController();
        const t = setTimeout(() => c.abort(), 25000);
        const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: c.signal });
        clearTimeout(t);
        if (!r.ok) return null;
        const txt = await r.text();
        try { return JSON.parse(txt); } catch { return null; }
    } catch { return null; }
}

const isOwner = (ctx) => ctx.msg?.key?.fromMe || (ctx.from || '').split('@')[0].split(':')[0] === OWNER_NUMBER;

const pickUrl = (o) => {
    if (!o) return null;
    for (const x of [o?.result?.download?.url, o?.result?.url, o?.result?.dl, o?.data?.url, o?.data?.dl, o?.download?.url, o?.url, o?.link]) {
        if (typeof x === 'string' && x.startsWith('http')) return x;
        if (x?.url && typeof x.url === 'string') return x.url;
    }
    return null;
};

const ytdlp = (url, mode = 'video') => new Promise((res) => {
    const fmt = mode === 'audio' ? 'bestaudio[ext=m4a]/bestaudio/best' : 'bv*[ext=mp4]+ba[ext=m4a]/b';
    exec(`yt-dlp -g -f "${fmt}" --no-playlist --no-warnings "${url}"`, { timeout: 90000, maxBuffer: 5e6 }, (e, out) => {
        if (e || !out) return res(null);
        res(out.split('\n').map(s => s.trim()).find(s => s.startsWith('http')) || null);
    });
});

async function ytSearch(q) {
    for (const a of [
        `https://api.vreden.my.id/api/ytsearch?query=${encodeURIComponent(q)}`,
        `https://api.zenkey.my.id/search/youtube?q=${encodeURIComponent(q)}`
    ]) {
        const r = await safeJson(a);
        const it = r?.result?.[0] || r?.data?.[0];
        if (it) {
            const url = it.url || it.link || (it.videoId ? `https://youtu.be/${it.videoId}` : null);
            if (url) return { url, title: it.title || 'media' };
        }
    }
    return null;
}

async function ytDownload(url, mode) {
    const apis = mode === 'audio' ? [
        `https://api.vreden.my.id/api/ytmp3?url=${encodeURIComponent(url)}`,
        `https://api.zenkey.my.id/download/ytmp3?url=${encodeURIComponent(url)}`
    ] : [
        `https://api.vreden.my.id/api/ytmp4?url=${encodeURIComponent(url)}`,
        `https://api.zenkey.my.id/download/ytmp4?url=${encodeURIComponent(url)}`
    ];
    for (const a of apis) {
        const r = await safeJson(a);
        const u = pickUrl(r);
        if (u) return u;
    }
    return await ytdlp(url, mode);
}

// ============ BUILT-IN COMMANDS ============
const COMMANDS = new Map();
const ALIASES = new Map();

function register(name, aliases, handler, opts = {}) {
    COMMANDS.set(name.toLowerCase(), { handler, opts });
    (aliases || []).forEach(a => ALIASES.set(a.toLowerCase(), name.toLowerCase()));
}

register('ytmp3', ['yta', 'song'], async (c) => { const { sock, from, msg, args } = c; if (!args[0]) return sock.sendMessage(from, { text: '🎵 .ytmp3 <name>' }, { quoted: msg }); const s = await sock.sendMessage(from, { text: '🔄...' }, { quoted: msg }); try { let url = args.join(' '), title = 'audio'; if (!url.includes('youtu')) { const r = await ytSearch(url); if (!r) throw new Error('නෑ!'); url = r.url; title = r.title; } const dl = await ytDownload(url, 'audio'); if (!dl) throw new Error('Fail!'); await sock.sendMessage(from, { audio: { url: dl }, mimetype: 'audio/mpeg', fileName: `${title}.mp3`, ptt: false }, { quoted: msg }); await sock.sendMessage(from, { delete: s.key }).catch(() => {}); } catch (e) { await sock.sendMessage(from, { text: `❌ ${e.message}`, edit: s.key }); } }, { public: true });
register('ytmp4', ['ytv', 'video'], async (c) => { const { sock, from, msg, args } = c; if (!args[0]) return sock.sendMessage(from, { text: '🎬 .ytmp4 <name>' }, { quoted: msg }); const s = await sock.sendMessage(from, { text: '🔄...' }, { quoted: msg }); try { let url = args.join(' '), title = 'video'; if (!url.includes('youtu')) { const r = await ytSearch(url); if (!r) throw new Error('නෑ!'); url = r.url; title = r.title; } const dl = await ytDownload(url, 'video'); if (!dl) throw new Error('Fail!'); await sock.sendMessage(from, { document: { url: dl }, mimetype: 'video/mp4', fileName: `${title}.mp4`, caption: `> ${BOT_NAME}` }, { quoted: msg }); await sock.sendMessage(from, { delete: s.key }).catch(() => {}); } catch (e) { await sock.sendMessage(from, { text: `❌ ${e.message}`, edit: s.key }); } }, { public: true });
register('fb', ['fbdl'], async (c) => { const { sock, from, msg, args } = c; if (!args[0]) return sock.sendMessage(from, { text: '📘 .fb <URL>' }, { quoted: msg }); const s = await sock.sendMessage(from, { text: '🔄...' }, { quoted: msg }); try { let dl = null; for (const a of [`https://api.nyxs.pw/dl/facebook?url=${encodeURIComponent(args[0])}`, `https://api.zenkey.my.id/download/facebook?url=${encodeURIComponent(args[0])}`]) { const r = await safeJson(a); dl = pickUrl(r) || r?.download_url || r?.video_hd; if (dl) break; } if (!dl) dl = await ytdlp(args[0], 'video'); if (!dl) throw new Error('නෑ!'); await sock.sendMessage(from, { video: { url: dl }, mimetype: 'video/mp4', caption: `> ${BOT_NAME}` }, { quoted: msg }); await sock.sendMessage(from, { delete: s.key }).catch(() => {}); } catch (e) { await sock.sendMessage(from, { text: `❌ ${e.message}`, edit: s.key }); } }, { public: true });
register('tt', ['ttdl'], async (c) => { const { sock, from, msg, args } = c; if (!args[0]) return sock.sendMessage(from, { text: '🎵 .tt <URL>' }, { quoted: msg }); const s = await sock.sendMessage(from, { text: '🔄...' }, { quoted: msg }); try { const r = await safeJson(`https://tikwm.com/api/?url=${encodeURIComponent(args[0])}`); let dl = r?.data?.play || r?.data?.hdplay; if (!dl) dl = await ytdlp(args[0], 'video'); if (!dl) throw new Error('නෑ!'); await sock.sendMessage(from, { video: { url: dl }, mimetype: 'video/mp4', caption: `> ${BOT_NAME}` }, { quoted: msg }); await sock.sendMessage(from, { delete: s.key }).catch(() => {}); } catch (e) { await sock.sendMessage(from, { text: `❌ ${e.message}`, edit: s.key }); } }, { public: true });
register('ig', ['igdl'], async (c) => { const { sock, from, msg, args } = c; if (!args[0]) return sock.sendMessage(from, { text: '📸 .ig <URL>' }, { quoted: msg }); const s = await sock.sendMessage(from, { text: '🔄...' }, { quoted: msg }); try { const dl = await ytdlp(args[0], 'video'); if (!dl) throw new Error('නෑ!'); await sock.sendMessage(from, { video: { url: dl }, mimetype: 'video/mp4', caption: `> ${BOT_NAME}` }, { quoted: msg }); await sock.sendMessage(from, { delete: s.key }).catch(() => {}); } catch (e) { await sock.sendMessage(from, { text: `❌ ${e.message}`, edit: s.key }); } }, { public: true });
register('ai', ['gpt', 'chat'], async (c) => { const { sock, from, msg, args } = c; if (!args[0]) return sock.sendMessage(from, { text: '🤖 .ai <q>' }, { quoted: msg }); const s = await sock.sendMessage(from, { text: '🤔...' }, { quoted: msg }); try { let ans = null; for (const a of [`https://api.nyxs.pw/ai/gpt4?text=${encodeURIComponent(args.join(' '))}`, `https://api.zenkey.my.id/ai/gpt?q=${encodeURIComponent(args.join(' '))}`]) { const r = await safeJson(a); ans = r?.result || r?.data || r?.answer; if (typeof ans === 'object') ans = ans?.text; if (typeof ans === 'string') break; ans = null; } if (!ans) throw new Error('නෑ!'); await sock.sendMessage(from, { text: `🤖 ${ans.slice(0, 3000)}\n\n>${BOT_NAME}`, edit: s.key }); } catch (e) { await sock.sendMessage(from, { text: `❌ ${e.message}`, edit: s.key }); } }, { public: true });
register('imagine', ['img', 'gen'], async (c) => { const { sock, from, msg, args } = c; if (!args[0]) return sock.sendMessage(from, { text: '🎨 .imagine <prompt>' }, { quoted: msg }); const s = await sock.sendMessage(from, { text: '🎨...' }, { quoted: msg }); try { const img = `https://image.pollinations.ai/prompt/${encodeURIComponent(args.join(' '))}?width=1024&height=1024&nologo=true&seed=${Date.now()}`; await sock.sendMessage(from, { image: { url: img }, caption: `🎨 ${args.join(' ')}\n\n>${BOT_NAME}` }, { quoted: msg }); await sock.sendMessage(from, { delete: s.key }).catch(() => {}); } catch (e) { await sock.sendMessage(from, { text: `❌ ${e.message}`, edit: s.key }); } }, { public: true });
register('weather', ['wthr'], async (c) => { const { sock, from, msg, args } = c; const city = args.join(' ') || 'Colombo'; const s = await sock.sendMessage(from, { text: `🔄 ${city}...` }, { quoted: msg }); try { const r = await safeJson(`https://wttr.in/${encodeURIComponent(city)}?format=j1`); const cc = r?.current_condition?.[0]; if (!cc) throw new Error('නෑ!'); await sock.sendMessage(from, { text: `🌤️ *${city}*\n\n🌡️ ${cc.temp_C}°C\n☁️ ${cc.weatherDesc[0].value}\n💧 ${cc.humidity}\%\n\n>${BOT_NAME}`, edit: s.key }); } catch (e) { await sock.sendMessage(from, { text: `❌ ${e.message}`, edit: s.key }); } }, { public: true });
register('meme', ['memes'], async (c) => { const { sock, from, msg } = c; const s = await sock.sendMessage(from, { text: '🔄...' }, { quoted: msg }); try { const r = await safeJson('https://meme-api.com/gimme'); if (!r?.url) throw new Error('නෑ!'); await sock.sendMessage(from, { image: { url: r.url }, caption: `😂 ${r.title}\n\n>${BOT_NAME}` }, { quoted: msg }); await sock.sendMessage(from, { delete: s.key }).catch(() => {}); } catch (e) { await sock.sendMessage(from, { text: `❌ ${e.message}`, edit: s.key }); } }, { public: true });
register('joke', ['jokes'], async (c) => { const { sock, from, msg } = c; try { const r = await safeJson('https://official-joke-api.appspot.com/random_joke'); if (!r?.setup) throw new Error('නෑ!'); await sock.sendMessage(from, { text: `😄 ${r.setup}\n\n\vert{}\vert{}${r.punchline}||` }, { quoted: msg }); } catch (e) { await sock.sendMessage(from, { text: `❌ ${e.message}` }, { quoted: msg }); } }, { public: true });
register('quote', ['quotes'], async (c) => { const { sock, from, msg } = c; try { const r = await safeJson('https://zenquotes.io/api/random'); const q = r?.[0]; if (!q?.q) throw new Error('නෑ!'); await sock.sendMessage(from, { text: `💬 "${q.q}"\n\n— ${q.a}` }, { quoted: msg }); } catch (e) { await sock.sendMessage(from, { text: `❌ ${e.message}` }, { quoted: msg }); } }, { public: true });
register('wiki', ['wikipedia'], async (c) => { const { sock, from, msg, args } = c; if (!args[0]) return sock.sendMessage(from, { text: '📚 .wiki <topic>' }, { quoted: msg }); const s = await sock.sendMessage(from, { text: '🔄...' }, { quoted: msg }); try { const r = await safeJson(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(args.join(' '))}`); if (!r?.extract) throw new Error('නෑ!'); const text = `📚 *${r.title}*\n\n${r.extract.slice(0, 1500)}\n\n>${BOT_NAME}`; if (r.thumbnail?.source) await sock.sendMessage(from, { image: { url: r.thumbnail.source }, caption: text }, { quoted: msg }); else await sock.sendMessage(from, { text, edit: s.key }); await sock.sendMessage(from, { delete: s.key }).catch(() => {}); } catch (e) { await sock.sendMessage(from, { text: `❌ ${e.message}`, edit: s.key }); } }, { public: true });
register('translate', ['tr'], async (c) => { const { sock, from, msg, args } = c; if (!args[0]) return sock.sendMessage(from, { text: '🌐 .tr si Hello' }, { quoted: msg }); const s = await sock.sendMessage(from, { text: '🔄...' }, { quoted: msg }); try { let to = 'en', text = args.join(' '); if (args[0].length <= 3) { to = args[0]; text = args.slice(1).join(' '); } const r = await safeJson(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${to}&dt=t&q=${encodeURIComponent(text)}`); if (!r?.[0]) throw new Error('නෑ!'); await sock.sendMessage(from, { text: `🌐 *${to}*\n\n${r[0].map(x => x[0]).join('')}`, edit: s.key }); } catch (e) { await sock.sendMessage(from, { text: `❌ ${e.message}`, edit: s.key }); } }, { public: true });
register('owner', ['creator'], async (c) => { const { sock, from, msg } = c; try { const vcard = `BEGIN:VCARD\nVERSION:3.0\nFN:${BOT_NAME} Owner\nTEL:type=CELL;waid=${OWNER_NUMBER}:+${OWNER_NUMBER}\nEND:VCARD`; await sock.sendMessage(from, { contacts: { displayName: `${BOT_NAME} Owner`, contacts: [{ vcard }] } }, { quoted: msg }); } catch {} await sock.sendMessage(from, { text: `👑 +${OWNER_NUMBER}` }, { quoted: msg }); }, { public: true });
register('ping', ['speed'], async (c) => { const { sock, from, msg } = c; const t = Date.now(); const s = await sock.sendMessage(from, { text: '🏓...' }, { quoted: msg }); await sock.sendMessage(from, { text: `⚡ ${Date.now() - t}ms\n💾 ${getRAM()}MB`, edit: s.key }); }, { public: true });
register('settings', ['config'], async (c) => { const { sock, from, msg } = c; const up = process.uptime(); await sock.sendMessage(from, { text: `⚙️ ${BOT_NAME}\n📱 +${OWNER_NUMBER}\n⏱️ ${Math.floor(up / 3600)}h ${Math.floor((up \% 3600) / 60)}m\n💾 ${getRAM()} MB` }, { quoted: msg }); }, { public: true });
register('gc', ['ram'], async (c) => { const { sock, from, msg } = c; if (!isOwner(c)) return sock.sendMessage(from, { text: '❌ Owner only!' }, { quoted: msg }); const b = getRAM(); if (global.gc) global.gc(); purgeOldKeys(); await sock.sendMessage(from, { text: `🧹 Memory & Session Cleared:\n${b} →${getRAM()} MB` }, { quoted: msg }); }, { public: false });
register('update', ['up'], async (c) => { const { sock, from, msg } = c; if (!isOwner(c)) return sock.sendMessage(from, { text: '❌ Owner only!' }, { quoted: msg }); const s = await sock.sendMessage(from, { text: '🔄...' }, { quoted: msg }); exec('git pull', { timeout: 60000 }, async (e, out, err) => { if (e) return sock.sendMessage(from, { text: `❌ ${err || e.message}`, edit: s.key }); if (out.includes('Already up to date')) return sock.sendMessage(from, { text: '✅ Up to date!', edit: s.key }); await sock.sendMessage(from, { text: `✅ ${out.slice(0, 500)}`, edit: s.key }); }); }, { public: false });
register('restart', ['rs'], async (c) => { const { sock, from, msg } = c; if (!isOwner(c)) return sock.sendMessage(from, { text: '❌ Owner only!' }, { quoted: msg }); await sock.sendMessage(from, { text: '🔄 Restarting in 5s...' }, { quoted: msg }); setTimeout(() => process.exit(0), 5000); }, { public: false });
register('menu', ['help'], async (c) => { const { sock, from, msg } = c; await sock.sendMessage(from, { text: `🔥 *${BOT_NAME}*\n\n📥 .ytmp3 .ytmp4 .fb .tt .ig\n🤖 .ai .imagine .weather .meme .joke .quote .wiki .translate\n👑 .owner .update .restart .gc\nℹ️ .settings .ping .menu` }, { quoted: msg }); }, { public: true });

// =======================================================
// 🚀 BAILEYS SOCKET & PAIRING FUNCTION
// =======================================================
let sock = null;
let latestQR = null;
let isConnected = false;
let isStarting = false;
let qrClients = new Set();
const logger = pino({ level: 'silent' });

async function generatePairingCode(phone) {
    let cleanPhone = phone.replace(/[^0-9]/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
        throw new Error('කරුණාකර නිවැරදි Phone Number එකක් ඇතුළත් කරන්න (උදා: 94760601455)');
    }
    if (isConnected) {
        throw new Error('WhatsApp දැනටමත් සම්බන්ධ වී ඇත!');
    }

    await startSock({ fresh: true });
    await new Promise(r => setTimeout(r, 4000));

    if (sock && !sock.authState.creds.registered) {
        const rawCode = await sock.requestPairingCode(cleanPhone);
        return rawCode?.match(/.{1,4}/g)?.join('-') || rawCode;
    } else {
        throw new Error('Session එක සක්‍රීය කිරීමට නොහැකි විය.');
    }
}

async function startSock(options = {}) {
    const { fresh = false } = options;
    if (isStarting && !fresh) return;
    isStarting = true;

    if (sock) {
        try {
            sock.ev.removeAllListeners('connection.update');
            sock.ev.removeAllListeners('creds.update');
            sock.ev.removeAllListeners('messages.upsert');
            sock.end(undefined);
        } catch {}
        sock = null;
        await new Promise(r => setTimeout(r, 1000));
    }

    if (fresh) {
        try { fs.removeSync('./auth_info'); } catch {}
    } else {
        await initAuthSession();
    }

    const { state, saveCreds } = await useMultiFileAuthState('./auth_info');
    const { version } = await fetchLatestBaileysVersion();

    sock = makeWASocket({
        version,
        auth: state,
        logger,
        printQRInTerminal: false,
        browser: ['Mac OS', 'Chrome', '121.0.6167.160'],
        syncFullHistory: false,
        markOnlineOnConnect: false
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (u) => {
        const { connection, lastDisconnect, qr } = u;

        if (qr) {
            latestQR = qr;
            try {
                const dataUrl = await QRCode.toDataURL(qr, { width: 300 });
                for (const res of qrClients) {
                    try { res.write(`data: ${JSON.stringify({ qr: dataUrl })}\n\n`); } catch {}
                }
            } catch {}
        }

        if (connection === 'open') {
            console.log('✅ WhatsApp connected!');
            isConnected = true;
            isStarting = false;
            latestQR = null;

            try {
                if (fs.existsSync('./auth_info/creds.json')) {
                    const credsData = fs.readFileSync('./auth_info/creds.json');
                    const generatedSession = 'HACKERPRO~' + Buffer.from(credsData).toString('base64');
                    console.log('\n================ 🔑 YOUR SESSION ID ================');
                    console.log(generatedSession);
                    console.log('====================================================\n');
                }
            } catch (e) {}

            for (const res of qrClients) {
                try { res.write(`data: ${JSON.stringify({ connected: true })}\n\n`); res.end(); } catch {}
            }
            qrClients.clear();
        }

        if (connection === 'close') {
            isConnected = false;
            isStarting = false;
            const code = lastDisconnect?.error?.output?.statusCode;
            console.log(`❌ Closed (${code})`);

            if (code === DisconnectReason.loggedOut || code === 401) {
                try { fs.removeSync('./auth_info'); } catch {}
                setTimeout(() => { if (!isStarting) startSock(); }, 10000);
            } else {
                setTimeout(() => { if (!isStarting) startSock(); }, 10000);
            }
        }
    });

    sock.ev.on('messages.upsert', async ({ messages }) => {
        try {
            const msg = messages[0];
            if (!msg?.message || msg.key.fromMe) return;
            const from = msg.key.remoteJid;
            const text = msg.message.conversation || msg.message.extendedTextMessage?.text || msg.message.imageMessage?.caption || '';
            
            if (!text.startsWith('.')) return;
            const [cmdName, ...args] = text.slice(1).trim().split(/\s+/);
            const targetCmd = cmdName.toLowerCase();
            const cmd = COMMANDS.get(targetCmd) || COMMANDS.get(ALIASES.get(targetCmd));
            
            if (!cmd) return;
            await cmd.handler({ sock, from, msg, args, text: args.join(' '), OWNER_NUMBER, BOT_NAME });
        } catch (e) { console.error('❌ Msg error:', e.message); }
    });

    isStarting = false;
}

startSock();

// =======================================================
// 🤖 TELEGRAM PAIR BOT INTEGRATION
// =======================================================
async function sendTgMessage(chatId, text) {
    try {
        await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' })
        });
    } catch (e) {
        console.error('Telegram Send Error:', e.message);
    }
}

async function startTelegramBot() {
    console.log('🤖 Telegram Pair Bot System Initialized...');
    let offset = 0;

    while (true) {
        try {
            const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/getUpdates?offset=${offset}&timeout=30`);
            const data = await res.json();

            if (data.ok && data.result.length > 0) {
                for (const update of data.result) {
                    offset = update.update_id + 1;
                    const msg = update.message;
                    if (!msg || !msg.text) continue;

                    const chatId = msg.chat.id;
                    const text = msg.text.trim();

                    if (text === '/start') {
                        await sendTgMessage(chatId, `⚡ *Welcome to ${BOT_NAME} Pair Bot!*\n\nTo get your WhatsApp Pair Code, use command:\n\`/pair 94760601455\``);
                    } else if (text.startsWith('/pair')) {
                        const parts = text.split(/\s+/);
                        const phone = parts[1];

                        if (!phone) {
                            await sendTgMessage(chatId, `⚠️ *අංකය ඇතුළත් කරන්න!*\n\nUsage: \`/pair 94760601455\``);
                            continue;
                        }

                        await sendTgMessage(chatId, `⏳ *Generating Pairing Code for ${phone}... Please wait!*`);

                        try {
                            const code = await generatePairingCode(phone);
                            await sendTgMessage(chatId, `🎉 *YOUR PAIRING CODE:*\n\n\`${code}\`\n\n📌 _Tap the code to copy and enter in WhatsApp!_`);
                        } catch (err) {
                            await sendTgMessage(chatId, `❌ *Error:* ${err.message}`);
                        }
                    }
                }
            }
        } catch (e) {
            await new Promise(r => setTimeout(r, 5000));
        }
    }
}

// Start Telegram Bot
startTelegramBot();

// =======================================================
// 🌐 EXPRESS WEB SERVER & PAIRING API
// =======================================================
const app = express();
app.use(express.json());

app.post('/api/pair', async (req, res) => {
    try {
        const phone = req.body.phone || '';
        const code = await generatePairingCode(phone);
        return res.json({ success: true, code });
    } catch (e) {
        return res.status(500).json({ error: e.message || 'Pairing Code ලබා ගැනීමට නොහැකි විය.' });
    }
});

app.get('/api/status', (req, res) => {
    res.json({ connected: isConnected, name: BOT_NAME });
});

const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>HACKER PRO PAIR PORTAL</title>
<style>
*{margin:0;padding:0;box-sizing:border-box;font-family:sans-serif}
body{background:#060917;min-height:100vh;display:flex;align-items:center;justify-content:center;color:#fff;padding:20px}
.c{background:rgba(10,14,39,.9);border:1px solid rgba(255,255,255,.1);border-radius:20px;padding:30px;max-width:440px;width:100%;text-align:center}
h1{font-size:22px;color:#00d2ff;margin-bottom:15px}
input{width:100%;padding:12px;background:rgba(255,255,255,.05);border:1px solid #333;border-radius:10px;color:#fff;font-size:16px;margin-bottom:10px;text-align:center}
button{width:100%;padding:12px;background:#00d2ff;border:none;border-radius:10px;color:#000;font-weight:bold;cursor:pointer}
.code{font-size:28px;margin-top:15px;color:#00ff88;font-family:monospace;letter-spacing:3px}
</style>
</head>
<body>
<div class="c">
    <h1>⚡ HACKER PRO PORTAL</h1>
    <input type="text" id="phone" value="94760601455" placeholder="Phone Number">
    <button onclick="getPairCode()">GET PAIRING CODE</button>
    <div class="code" id="code-val"></div>
</div>
<script>
async function getPairCode() {
    const phone = document.getElementById('phone').value;
    const codeVal = document.getElementById('code-val');
    codeVal.innerText = "WAITING...";
    try {
        const res = await fetch('/api/pair', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ phone })
        });
        const data = await res.json();
        if(data.code) codeVal.innerText = data.code;
        else codeVal.innerText = data.error || "Error";
    } catch { codeVal.innerText = "Error"; }
}
</script>
</body>
</html>`;

app.get('/', (req, res) => res.send(HTML));

const PORT = process.env.PORT || 80;
app.listen(PORT, () => console.log(`🌐 Server active on port ${PORT}`));
