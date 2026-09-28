// 🔥 HACKER PRO ULTRA — Compact Complete
require('dotenv').config();
const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const { exec } = require('child_process');
const pino = require('pino');
const QRCode = require('qrcode');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');

// ============ SETTINGS ============
let settings = { ownerNumber: '94760601455', botName: 'Hacker Pro Md', ownerName: 'Hacker Pro' };
try { settings = { ...settings, ...require('./settings.js') }; console.log('✅ settings loaded'); } catch { console.log('⚠️ settings.js not found'); }
let OWNER_NUMBER = settings.ownerNumber;
const BOT_NAME = settings.botName;

// ============ CRASH FIX ============
process.on('uncaughtException', (e) => console.error('🛡️', e?.message || e));
process.on('unhandledRejection', (e) => console.error('🛡️', e?.message || e));

// ============ RAM + AUTO CLEAN ============
const MAX_RAM = 180;
let memWarn = 0;
const getRAM = () => parseFloat((process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2));
setInterval(() => {
    const r = getRAM();
    if (r > MAX_RAM) {
        memWarn++;
        if (global.gc) global.gc();
        if (memWarn >= 3) { console.log('🛑 RAM limit — restart'); setTimeout(() => process.exit(0), 2000); }
    } else memWarn = 0;
}, 60000);
console.log(`💾 [RAM START] ${getRAM()} MB`);

// ============ SAFE FETCH ============
async function safeJson(url) {
    try {
        const c = new AbortController(); const t = setTimeout(() => c.abort(), 25000);
        const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: c.signal });
        clearTimeout(t); if (!r.ok) return null;
        const txt = await r.text(); try { return JSON.parse(txt); } catch { return null; }
    } catch { return null; }
}

// ============ OWNER CHECK ============
const isOwner = (ctx) => ctx.msg?.key?.fromMe || (ctx.from || '').split('@')[0].split(':')[0] === OWNER_NUMBER;

// ============ YT HELPERS ============
const pickUrl = (o) => {
    if (!o) return null;
    for (const x of [o?.result?.download?.url, o?.result?.url, o?.result?.dl, o?.data?.url, o?.data?.dl, o?.download?.url, o?.url, o?.link, o?.video, o?.audio]) {
        if (typeof x === 'string' && x.startsWith('http')) return x;
        if (x?.url && typeof x.url === 'string') return x.url;
    } return null;
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
    } return null;
}

async function ytDownload(url, mode) {
    const apis = mode === 'audio' ? [
        `https://api.vreden.my.id/api/ytmp3?url=${encodeURIComponent(url)}`,
        `https://api.zenkey.my.id/download/ytmp3?url=${encodeURIComponent(url)}`
    ] : [
        `https://api.vreden.my.id/api/ytmp4?url=${encodeURIComponent(url)}`,
        `https://api.zenkey.my.id/download/ytmp4?url=${encodeURIComponent(url)}`
    ];
    for (const a of apis) { const r = await safeJson(a); const u = pickUrl(r); if (u) return u; }
    return await ytdlp(url, mode);
}

// ============ COMMAND SYSTEM ============
const COMMANDS = new Map();
const ALIASES = new Map();
function register(name, aliases, handler, opts = {}) {
    COMMANDS.set(name, { handler, opts });
    (aliases || []).forEach(a => ALIASES.set(a, name));
}
console.log('📋 Registering commands...');

// ============ 23 COMMANDS ============
register('ytmp3', ['yta', 'song', 'mp3'], async (c) => {
    const { sock, from, msg, args } = c;
    if (!args[0]) return sock.sendMessage(from, { text: '🎵 Usage: .ytmp3 <name or link>' }, { quoted: msg });
    const s = await sock.sendMessage(from, { text: '🔄 Downloading Audio...' }, { quoted: msg });
    try {
        let url = args.join(' '), title = 'audio';
        if (!url.includes('youtu')) { const r = await ytSearch(url); if (!r) throw new Error('නෑ!'); url = r.url; title = r.title; }
        const dl = await ytDownload(url, 'audio'); if (!dl) throw new Error('API fail!');
        await sock.sendMessage(from, { audio: { url: dl }, mimetype: 'audio/mpeg', fileName: `${title}.mp3`, ptt: false }, { quoted: msg });
        await sock.sendMessage(from, { delete: s.key }).catch(() => {});
    } catch (e) { await sock.sendMessage(from, { text: `❌ ${e.message}`, edit: s.key }); }
}, { public: true });

register('ytmp4', ['ytv', 'video', 'mp4'], async (c) => {
    const { sock, from, msg, args } = c;
    if (!args[0]) return sock.sendMessage(from, { text: '🎬 Usage: .ytmp4 <name or link>' }, { quoted: msg });
    const s = await sock.sendMessage(from, { text: '🔄 Downloading Video...' }, { quoted: msg });
    try {
        let url = args.join(' '), title = 'video';
        if (!url.includes('youtu')) { const r = await ytSearch(url); if (!r) throw new Error('නෑ!'); url = r.url; title = r.title; }
        const dl = await ytDownload(url, 'video'); if (!dl) throw new Error('API fail!');
        await sock.sendMessage(from, { document: { url: dl }, mimetype: 'video/mp4', fileName: `${title}.mp4`, caption: `> ${BOT_NAME}` }, { quoted: msg });
        await sock.sendMessage(from, { delete: s.key }).catch(() => {});
    } catch (e) { await sock.sendMessage(from, { text: `❌ ${e.message}`, edit: s.key }); }
}, { public: true });

register('fb', ['fbdl', 'facebook'], async (c) => {
    const { sock, from, msg, args } = c;
    if (!args[0]) return sock.sendMessage(from, { text: '📘 Usage: .fb <URL>' }, { quoted: msg });
    const s = await sock.sendMessage(from, { text: '🔄 Downloading FB...' }, { quoted: msg });
    try {
        let dl = null;
        for (const a of [`https://api.nyxs.pw/dl/facebook?url=${encodeURIComponent(args[0])}`, `https://api.zenkey.my.id/download/facebook?url=${encodeURIComponent(args[0])}`]) {
            const r = await safeJson(a); dl = pickUrl(r) || r?.download_url || r?.video_hd; if (dl) break;
        }
        if (!dl) dl = await ytdlp(args[0], 'video');
        if (!dl) throw new Error('Download link නෑ!');
        await sock.sendMessage(from, { video: { url: dl }, mimetype: 'video/mp4', caption: `> ${BOT_NAME}` }, { quoted: msg });
        await sock.sendMessage(from, { delete: s.key }).catch(() => {});
    } catch (e) { await sock.sendMessage(from, { text: `❌ ${e.message}`, edit: s.key }); }
}, { public: true });

register('tt', ['ttdl', 'tiktok'], async (c) => {
    const { sock, from, msg, args } = c;
    if (!args[0]) return sock.sendMessage(from, { text: '🎵 Usage: .tt <URL>' }, { quoted: msg });
    const s = await sock.sendMessage(from, { text: '🔄 Downloading TikTok...' }, { quoted: msg });
    try {
        const r = await safeJson(`https://tikwm.com/api/?url=${encodeURIComponent(args[0])}`);
        let dl = r?.data?.play || r?.data?.hdplay;
        if (!dl) dl = await ytdlp(args[0], 'video');
        if (!dl) throw new Error('Download link නෑ!');
        await sock.sendMessage(from, { video: { url: dl }, mimetype: 'video/mp4', caption: `> ${BOT_NAME}` }, { quoted: msg });
        await sock.sendMessage(from, { delete: s.key }).catch(() => {});
    } catch (e) { await sock.sendMessage(from, { text: `❌ ${e.message}`, edit: s.key }); }
}, { public: true });

register('ig', ['igdl', 'instagram'], async (c) => {
    const { sock, from, msg, args } = c;
    if (!args[0]) return sock.sendMessage(from, { text: '📸 Usage: .ig <URL>' }, { quoted: msg });
    const s = await sock.sendMessage(from, { text: '🔄 Downloading IG...' }, { quoted: msg });
    try {
        const dl = await ytdlp(args[0], 'video');
        if (!dl) throw new Error('Download link නෑ!');
        await sock.sendMessage(from, { video: { url: dl }, mimetype: 'video/mp4', caption: `> ${BOT_NAME}` }, { quoted: msg });
        await sock.sendMessage(from, { delete: s.key }).catch(() => {});
    } catch (e) { await sock.sendMessage(from, { text: `❌ ${e.message}`, edit: s.key }); }
}, { public: true });

register('ai', ['gpt', 'chat'], async (c) => {
    const { sock, from, msg, args } = c;
    if (!args[0]) return sock.sendMessage(from, { text: '🤖 Usage: .ai <question>' }, { quoted: msg });
    const s = await sock.sendMessage(from, { text: '🤔 Thinking...' }, { quoted: msg });
    try {
        let ans = null;
        for (const a of [`https://api.nyxs.pw/ai/gpt4?text=${encodeURIComponent(args.join(' '))}`, `https://api.zenkey.my.id/ai/gpt?q=${encodeURIComponent(args.join(' '))}`]) {
            const r = await safeJson(a); ans = r?.result || r?.data || r?.answer;
            if (typeof ans === 'object') ans = ans?.text;
            if (typeof ans === 'string') break; ans = null;
        }
        if (!ans) throw new Error('AI response නෑ!');
        await sock.sendMessage(from, { text: `🤖 ${ans.slice(0, 3000)}\n\n> ${BOT_NAME}`, edit: s.key });
    } catch (e) { await sock.sendMessage(from, { text: `❌ ${e.message}`, edit: s.key }); }
}, { public: true });

register('imagine', ['img', 'gen'], async (c) => {
    const { sock, from, msg, args } = c;
    if (!args[0]) return sock.sendMessage(from, { text: '🎨 Usage: .imagine <prompt>' }, { quoted: msg });
    const s = await sock.sendMessage(from, { text: '🎨 Generating...' }, { quoted: msg });
    try {
        const img = `https://image.pollinations.ai/prompt/${encodeURIComponent(args.join(' '))}?width=1024&height=1024&nologo=true&seed=${Date.now()}`;
        await sock.sendMessage(from, { image: { url: img }, caption: `🎨 ${args.join(' ')}\n\n> ${BOT_NAME}` }, { quoted: msg });
        await sock.sendMessage(from, { delete: s.key }).catch(() => {});
    } catch (e) { await sock.sendMessage(from, { text: `❌ ${e.message}`, edit: s.key }); }
}, { public: true });

register('weather', ['wthr'], async (c) => {
    const { sock, from, msg, args } = c;
    const city = args.join(' ') || 'Colombo';
    const s = await sock.sendMessage(from, { text: `🔄 ${city}...` }, { quoted: msg });
    try {
        const r = await safeJson(`https://wttr.in/${encodeURIComponent(city)}?format=j1`);
        const cc = r?.current_condition?.[0]; if (!cc) throw new Error('City නෑ!');
        await sock.sendMessage(from, { text: `🌤️ *${city}*\n\n🌡️ ${cc.temp_C}°C\n☁️ ${cc.weatherDesc[0].value}\n💧 ${cc.humidity}%\n💨 ${cc.windspeedKmph} km/h\n\n> ${BOT_NAME}`, edit: s.key });
    } catch (e) { await sock.sendMessage(from, { text: `❌ ${e.message}`, edit: s.key }); }
}, { public: true });

register('meme', ['memes'], async (c) => {
    const { sock, from, msg } = c;
    const s = await sock.sendMessage(from, { text: '🔄 Fetching...' }, { quoted: msg });
    try {
        const r = await safeJson('https://meme-api.com/gimme'); if (!r?.url) throw new Error('Meme නෑ!');
        await sock.sendMessage(from, { image: { url: r.url }, caption: `😂 ${r.title}\n\n> ${BOT_NAME}` }, { quoted: msg });
        await sock.sendMessage(from, { delete: s.key }).catch(() => {});
    } catch (e) { await sock.sendMessage(from, { text: `❌ ${e.message}`, edit: s.key }); }
}, { public: true });

register('joke', ['jokes'], async (c) => {
    const { sock, from, msg } = c;
    try {
        const r = await safeJson('https://official-joke-api.appspot.com/random_joke');
        if (!r?.setup) throw new Error('නෑ!');
        await sock.sendMessage(from, { text: `😄 ${r.setup}\n\n||${r.punchline}||\n\n> ${BOT_NAME}` }, { quoted: msg });
    } catch (e) { await sock.sendMessage(from, { text: `❌ ${e.message}` }, { quoted: msg }); }
}, { public: true });

register('quote', ['quotes'], async (c) => {
    const { sock, from, msg } = c;
    try {
        const r = await safeJson('https://zenquotes.io/api/random'); const q = r?.[0];
        if (!q?.q) throw new Error('නෑ!');
        await sock.sendMessage(from, { text: `💬 "${q.q}"\n\n— ${q.a}\n\n> ${BOT_NAME}` }, { quoted: msg });
    } catch (e) { await sock.sendMessage(from, { text: `❌ ${e.message}` }, { quoted: msg }); }
}, { public: true });

register('lyrics', ['ly'], async (c) => {
    const { sock, from, msg, args } = c;
    if (!args[0]) return sock.sendMessage(from, { text: '🎤 Usage: .lyrics <song>' }, { quoted: msg });
    const s = await sock.sendMessage(from, { text: '🔄 Searching...' }, { quoted: msg });
    try {
        const r = await safeJson(`https://api.lyrics.ovh/suggest/${encodeURIComponent(args.join(' '))}`);
        const f = r?.data?.[0]; if (!f) throw new Error('නෑ!');
        const ly = await safeJson(`https://api.lyrics.ovh/v1/${encodeURIComponent(f.artist.name)}/${encodeURIComponent(f.title)}`);
        if (!ly?.lyrics) throw new Error('Lyrics නෑ!');
        await sock.sendMessage(from, { text: `🎤 *${f.title}*\n🎙️ ${f.artist.name}\n\n${ly.lyrics.slice(0, 3000)}\n\n> ${BOT_NAME}`, edit: s.key });
    } catch (e) { await sock.sendMessage(from, { text: `❌ ${e.message}`, edit: s.key }); }
}, { public: true });

register('translate', ['tr'], async (c) => {
    const { sock, from, msg, args } = c;
    if (!args[0]) return sock.sendMessage(from, { text: '🌐 Usage: .tr si Hello' }, { quoted: msg });
    const s = await sock.sendMessage(from, { text: '🔄 Translating...' }, { quoted: msg });
    try {
        let to = 'en', text = args.join(' ');
        if (args[0].length <= 3) { to = args[0]; text = args.slice(1).join(' '); }
        const r = await safeJson(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${to}&dt=t&q=${encodeURIComponent(text)}`);
        if (!r?.[0]) throw new Error('නෑ!');
        await sock.sendMessage(from, { text: `🌐 *${to}*\n\n${r[0].map(x => x[0]).join('')}\n\n> ${BOT_NAME}`, edit: s.key });
    } catch (e) { await sock.sendMessage(from, { text: `❌ ${e.message}`, edit: s.key }); }
}, { public: true });

register('wiki', ['wikipedia'], async (c) => {
    const { sock, from, msg, args } = c;
    if (!args[0]) return sock.sendMessage(from, { text: '📚 Usage: .wiki <topic>' }, { quoted: msg });
    const s = await sock.sendMessage(from, { text: '🔄 Searching...' }, { quoted: msg });
    try {
        const r = await safeJson(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(args.join(' '))}`);
        if (!r?.extract) throw new Error('නෑ!');
        const text = `📚 *${r.title}*\n\n${r.extract.slice(0, 1500)}\n\n> ${BOT_NAME}`;
        if (r.thumbnail?.source) await sock.sendMessage(from, { image: { url: r.thumbnail.source }, caption: text }, { quoted: msg });
        else await sock.sendMessage(from, { text, edit: s.key });
        await sock.sendMessage(from, { delete: s.key }).catch(() => {});
    } catch (e) { await sock.sendMessage(from, { text: `❌ ${e.message}`, edit: s.key }); }
}, { public: true });

register('owner', ['creator', 'dev'], async (c) => {
    const { sock, from, msg } = c;
    try {
        const vcard = `BEGIN:VCARD\nVERSION:3.0\nFN:${BOT_NAME} Owner\nTEL;type=CELL;type=VOICE;waid=${OWNER_NUMBER}:+${OWNER_NUMBER}\nEND:VCARD`;
        await sock.sendMessage(from, { contacts: { displayName: `${BOT_NAME} Owner`, contacts: [{ vcard }] } }, { quoted: msg });
    } catch {}
    await sock.sendMessage(from, { text: `👑 +${OWNER_NUMBER}\n🤖 ${BOT_NAME}` }, { quoted: msg });
}, { public: true });

register('broad', ['broadcast', 'bc'], async (c) => {
    const { sock, from, msg, args } = c;
    if (!isOwner(c)) return sock.sendMessage(from, { text: '❌ Owner only!' }, { quoted: msg });
    if (!args[0]) return sock.sendMessage(from, { text: '📢 Usage: .broad <msg>' }, { quoted: msg });
    const s = await sock.sendMessage(from, { text: '📢 Broadcasting...' }, { quoted: msg });
    try {
        const g = await sock.groupFetchAllParticipating(); const ids = Object.keys(g);
        let sent = 0, fail = 0;
        for (const id of ids) { try { await sock.sendMessage(id, { text: `📢 *BROADCAST*\n\n${args.join(' ')}\n\n> ${BOT_NAME}` }); sent++; await new Promise(r => setTimeout(r, 1500)); } catch { fail++; } }
        await sock.sendMessage(from, { text: `✅ ${sent}\n❌ ${fail}\n📊 ${ids.length}`, edit: s.key });
    } catch (e) { await sock.sendMessage(from, { text: `❌ ${e.message}`, edit: s.key }); }
}, { public: false });

register('chreact', ['creact'], async (c) => {
    const { sock, from, msg, args } = c;
    if (!args[0]) return sock.sendMessage(from, { text: '💬 Usage: .chreact <emoji> <url>' }, { quoted: msg });
    try {
        let emoji = args[0], sid, mid;
        if (args[1]) { const m = args[1].match(/channel\/([^/]+)\/(\d+)/); if (m) { sid = m[1]; mid = m[2]; } }
        if (!mid) { const q = msg.message?.extendedTextMessage?.contextInfo; if (q?.stanzaId && q?.remoteJid?.includes('@newsletter')) { sid = q.remoteJid.split('@')[0]; mid = q.stanzaId; } }
        if (!sid || !mid) throw new Error('Channel URL දෙන්න!');
        if (emoji.length > 10) emoji = '❤️';
        await sock.sendMessage(`${sid}@newsletter`, { react: { text: emoji, key: { remoteJid: `${sid}@newsletter`, id: mid, fromMe: false } } });
        await sock.sendMessage(from, { text: `✅ ${emoji}` }, { quoted: msg });
    } catch (e) { await sock.sendMessage(from, { text: `❌ ${e.message}` }, { quoted: msg }); }
}, { public: true });

register('settings', ['config'], async (c) => {
    const { sock, from, msg } = c;
    const up = process.uptime();
    await sock.sendMessage(from, { text: `⚙️ ${BOT_NAME}\n📱 +${OWNER_NUMBER}\n\n⏱️ ${Math.floor(up/3600)}h ${Math.floor(up%3600/60)}m\n💾 ${getRAM()} MB\n📦 ${process.version}\n⚡ ${process.pid}` }, { quoted: msg });
}, { public: true });

register('ping', ['speed'], async (c) => {
    const { sock, from, msg } = c;
    const t = Date.now();
    const s = await sock.sendMessage(from, { text: '🏓...' }, { quoted: msg });
    await sock.sendMessage(from, { text: `⚡ ${Date.now()-t}ms\n💾 ${getRAM()}MB`, edit: s.key });
}, { public: true });

register('gc', ['ram'], async (c) => {
    const { sock, from, msg } = c;
    if (!isOwner(c)) return sock.sendMessage(from, { text: '❌ Owner only!' }, { quoted: msg });
    const b = getRAM(); if (global.gc) global.gc();
    await sock.sendMessage(from, { text: `🧹 ${b} → ${getRAM()} MB` }, { quoted: msg });
}, { public: false });

register('update', ['up'], async (c) => {
    const { sock, from, msg } = c;
    if (!isOwner(c)) return sock.sendMessage(from, { text: '❌ Owner only!' }, { quoted: msg });
    const s = await sock.sendMessage(from, { text: '🔄 Updating...' }, { quoted: msg });
    exec('git pull', { timeout: 60000 }, async (e, out, err) => {
        if (e) return sock.sendMessage(from, { text: `❌ ${err || e.message}`, edit: s.key });
        if (out.includes('Already up to date')) return sock.sendMessage(from, { text: '✅ Up to date!', edit: s.key });
        await sock.sendMessage(from, { text: `✅ ${out.slice(0, 500)}`, edit: s.key });
    });
}, { public: false });

register('restart', ['rs'], async (c) => {
    const { sock, from, msg } = c;
    if (!isOwner(c)) return sock.sendMessage(from, { text: '❌ Owner only!' }, { quoted: msg });
    await sock.sendMessage(from, { text: '🔄 Restarting in 5s...' }, { quoted: msg });
    setTimeout(() => process.exit(0), 5000);
}, { public: false });

register('menu', ['help'], async (c) => {
    const { sock, from, msg } = c;
    await sock.sendMessage(from, { text: `🔥 *${BOT_NAME}*\n\n📥 .ytmp3 .ytmp4 .fb .tt .ig\n🤖 .ai .imagine .weather .meme .joke .quote .lyrics .translate .wiki\n👑 .owner .broad .chreact .update .restart .gc\nℹ️ .settings .ping .menu\n\n> ${BOT_NAME}` }, { quoted: msg });
}, { public: true });

console.log(`✅ ${COMMANDS.size} commands registered\n`);

// ============ BAILEYS ============
let sock = null;
let currentCode = null;
let currentUserId = null;
let qrStore = new Map();
const logger = pino({ level: 'silent' });

async function startSock() {
    const { state, saveCreds } = await useMultiFileAuthState('./auth_info');
    const { version } = await fetchLatestBaileysVersion();
    sock = makeWASocket({ version, auth: state, logger, printQRInTerminal: false, browser: ['Hacker Pro', 'Chrome', '1.0'] });
    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (u) => {
        const { connection, lastDisconnect, qr } = u;
        if (qr) {
            // QR update
            for (const [uid, data] of qrStore) {
                if (data.status !== 'success') {
                    try { data.qr = await QRCode.toDataURL(qr); data.status = 'success'; } catch {}
                }
            }
        }
        if (connection === 'open') {
            console.log('✅ WhatsApp connected!');
            for (const [uid, data] of qrStore) { data.status = 'connected'; }
        }
        if (connection === 'close') {
            const code = lastDisconnect?.error?.output?.statusCode;
            if (code !== DisconnectReason.loggedOut) { console.log('🔄 Reconnecting...'); setTimeout(startSock, 3000); }
            else console.log('🚪 Logged out');
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
            const cmd = COMMANDS.get(cmdName.toLowerCase()) || COMMANDS.get(ALIASES.get(cmdName.toLowerCase()));
            if (!cmd) return;
            await cmd.handler({ sock, from, msg, args });
        } catch (e) { console.error('❌ Msg error:', e.message); }
    });
}

// ============ EXPRESS API ============
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'web')));

app.get('/api/status', (req, res) => {
    res.json({ online: !!sock?.user, activeBots: 1, totalUsers: 1 });
});

app.post('/api/pair', async (req, res) => {
    try {
        const { phone } = req.body;
        if (!phone) return res.json({ success: false, error: 'Phone required' });
        if (!sock) return res.json({ success: false, error: 'Bot not ready' });
        const clean = phone.replace(/[^0-9]/g, '');
        const userId = Date.now().toString();
        currentUserId = userId;
        const code = await sock.requestPairingCode(clean);
        currentCode = code;
        res.json({ success: true, userId, code });
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
});

app.get('/api/pair/:userId', (req, res) => {
    if (currentCode && req.params.userId === currentUserId) res.json({ status: 'success', code: currentCode });
    else res.json({ status: 'pending' });
});

app.post('/api/qr/request', async (req, res) => {
    const userId = Date.now().toString();
    qrStore.set(userId, { status: 'pending', qr: null });
    res.json({ success: true, userId });
});

app.get('/api/qr/:userId', (req, res) => {
    const data = qrStore.get(req.params.userId);
    if (data) res.json(data);
    else res.json({ status: 'pending' });
});

app.post('/api/logout', async (req, res) => {
    try { if (sock) await sock.logout(); res.json({ success: true }); } catch (e) { res.json({ success: false, error: e.message }); }
});

// ============ START ============
const PORT = process.env.PORT || 80;
app.listen(PORT, () => console.log(`🌐 Web: http://localhost:${PORT}`));

startSock().catch((e) => console.error('❌ Sock error:', e.message));
