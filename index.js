// 🔥 HACKER PRO ULTRA — Baileys 6.6.0 Edition
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

// ============ ERROR HANDLERS ============
process.on('uncaughtException', (e) => console.error('🛡️', e?.message || e));
process.on('unhandledRejection', (e) => console.error('🛡️', e?.message || e));

const getRAM = () => parseFloat((process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2));
console.log(`💾 [RAM] ${getRAM()} MB`);

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

// ============ COMMANDS ============
const COMMANDS = new Map();
const ALIASES = new Map();
function register(name, aliases, handler, opts = {}) {
    COMMANDS.set(name, { handler, opts });
    (aliases || []).forEach(a => ALIASES.set(a, name));
}
console.log('📋 Registering commands...');

register('ytmp3', ['yta', 'song'], async (c) => { const { sock, from, msg, args } = c; if (!args[0]) return sock.sendMessage(from, { text: '🎵 .ytmp3 <name>' }, { quoted: msg }); const s = await sock.sendMessage(from, { text: '🔄...' }, { quoted: msg }); try { let url = args.join(' '), title = 'audio'; if (!url.includes('youtu')) { const r = await ytSearch(url); if (!r) throw new Error('නෑ!'); url = r.url; title = r.title; } const dl = await ytDownload(url, 'audio'); if (!dl) throw new Error('Fail!'); await sock.sendMessage(from, { audio: { url: dl }, mimetype: 'audio/mpeg', fileName: `${title}.mp3`, ptt: false }, { quoted: msg }); await sock.sendMessage(from, { delete: s.key }).catch(() => {}); } catch (e) { await sock.sendMessage(from, { text: `❌ ${e.message}`, edit: s.key }); } }, { public: true });

register('ytmp4', ['ytv', 'video'], async (c) => { const { sock, from, msg, args } = c; if (!args[0]) return sock.sendMessage(from, { text: '🎬 .ytmp4 <name>' }, { quoted: msg }); const s = await sock.sendMessage(from, { text: '🔄...' }, { quoted: msg }); try { let url = args.join(' '), title = 'video'; if (!url.includes('youtu')) { const r = await ytSearch(url); if (!r) throw new Error('නෑ!'); url = r.url; title = r.title; } const dl = await ytDownload(url, 'video'); if (!dl) throw new Error('Fail!'); await sock.sendMessage(from, { document: { url: dl }, mimetype: 'video/mp4', fileName: `${title}.mp4`, caption: `> ${BOT_NAME}` }, { quoted: msg }); await sock.sendMessage(from, { delete: s.key }).catch(() => {}); } catch (e) { await sock.sendMessage(from, { text: `❌ ${e.message}`, edit: s.key }); } }, { public: true });

register('fb', ['fbdl'], async (c) => { const { sock, from, msg, args } = c; if (!args[0]) return sock.sendMessage(from, { text: '📘 .fb <URL>' }, { quoted: msg }); const s = await sock.sendMessage(from, { text: '🔄...' }, { quoted: msg }); try { let dl = null; for (const a of [`https://api.nyxs.pw/dl/facebook?url=${encodeURIComponent(args[0])}`, `https://api.zenkey.my.id/download/facebook?url=${encodeURIComponent(args[0])}`]) { const r = await safeJson(a); dl = pickUrl(r) || r?.download_url || r?.video_hd; if (dl) break; } if (!dl) dl = await ytdlp(args[0], 'video'); if (!dl) throw new Error('නෑ!'); await sock.sendMessage(from, { video: { url: dl }, mimetype: 'video/mp4', caption: `> ${BOT_NAME}` }, { quoted: msg }); await sock.sendMessage(from, { delete: s.key }).catch(() => {}); } catch (e) { await sock.sendMessage(from, { text: `❌ ${e.message}`, edit: s.key }); } }, { public: true });

register('tt', ['ttdl'], async (c) => { const { sock, from, msg, args } = c; if (!args[0]) return sock.sendMessage(from, { text: '🎵 .tt <URL>' }, { quoted: msg }); const s = await sock.sendMessage(from, { text: '🔄...' }, { quoted: msg }); try { const r = await safeJson(`https://tikwm.com/api/?url=${encodeURIComponent(args[0])}`); let dl = r?.data?.play || r?.data?.hdplay; if (!dl) dl = await ytdlp(args[0], 'video'); if (!dl) throw new Error('නෑ!'); await sock.sendMessage(from, { video: { url: dl }, mimetype: 'video/mp4', caption: `> ${BOT_NAME}` }, { quoted: msg }); await sock.sendMessage(from, { delete: s.key }).catch(() => {}); } catch (e) { await sock.sendMessage(from, { text: `❌ ${e.message}`, edit: s.key }); } }, { public: true });

register('ig', ['igdl'], async (c) => { const { sock, from, msg, args } = c; if (!args[0]) return sock.sendMessage(from, { text: '📸 .ig <URL>' }, { quoted: msg }); const s = await sock.sendMessage(from, { text: '🔄...' }, { quoted: msg }); try { const dl = await ytdlp(args[0], 'video'); if (!dl) throw new Error('නෑ!'); await sock.sendMessage(from, { video: { url: dl }, mimetype: 'video/mp4', caption: `> ${BOT_NAME}` }, { quoted: msg }); await sock.sendMessage(from, { delete: s.key }).catch(() => {}); } catch (e) { await sock.sendMessage(from, { text: `❌ ${e.message}`, edit: s.key }); } }, { public: true });

register('ai', ['gpt', 'chat'], async (c) => { const { sock, from, msg, args } = c; if (!args[0]) return sock.sendMessage(from, { text: '🤖 .ai <q>' }, { quoted: msg }); const s = await sock.sendMessage(from, { text: '🤔...' }, { quoted: msg }); try { let ans = null; for (const a of [`https://api.nyxs.pw/ai/gpt4?text=${encodeURIComponent(args.join(' '))}`, `https://api.zenkey.my.id/ai/gpt?q=${encodeURIComponent(args.join(' '))}`]) { const r = await safeJson(a); ans = r?.result || r?.data || r?.answer; if (typeof ans === 'object') ans = ans?.text; if (typeof ans === 'string') break; ans = null; } if (!ans) throw new Error('නෑ!'); await sock.sendMessage(from, { text: `🤖 ${ans.slice(0, 3000)}\n\n> ${BOT_NAME}`, edit: s.key }); } catch (e) { await sock.sendMessage(from, { text: `❌ ${e.message}`, edit: s.key }); } }, { public: true });

register('imagine', ['img', 'gen'], async (c) => { const { sock, from, msg, args } = c; if (!args[0]) return sock.sendMessage(from, { text: '🎨 .imagine <prompt>' }, { quoted: msg }); const s = await sock.sendMessage(from, { text: '🎨...' }, { quoted: msg }); try { const img = `https://image.pollinations.ai/prompt/${encodeURIComponent(args.join(' '))}?width=1024&height=1024&nologo=true&seed=${Date.now()}`; await sock.sendMessage(from, { image: { url: img }, caption: `🎨 ${args.join(' ')}\n\n> ${BOT_NAME}` }, { quoted: msg }); await sock.sendMessage(from, { delete: s.key }).catch(() => {}); } catch (e) { await sock.sendMessage(from, { text: `❌ ${e.message}`, edit: s.key }); } }, { public: true });

register('weather', ['wthr'], async (c) => { const { sock, from, msg, args } = c; const city = args.join(' ') || 'Colombo'; const s = await sock.sendMessage(from, { text: `🔄 ${city}...` }, { quoted: msg }); try { const r = await safeJson(`https://wttr.in/${encodeURIComponent(city)}?format=j1`); const cc = r?.current_condition?.[0]; if (!cc) throw new Error('නෑ!'); await sock.sendMessage(from, { text: `🌤️ *${city}*\n\n🌡️ ${cc.temp_C}°C\n☁️ ${cc.weatherDesc[0].value}\n💧 ${cc.humidity}%\n\n> ${BOT_NAME}`, edit: s.key }); } catch (e) { await sock.sendMessage(from, { text: `❌ ${e.message}`, edit: s.key }); } }, { public: true });

register('meme', ['memes'], async (c) => { const { sock, from, msg } = c; const s = await sock.sendMessage(from, { text: '🔄...' }, { quoted: msg }); try { const r = await safeJson('https://meme-api.com/gimme'); if (!r?.url) throw new Error('නෑ!'); await sock.sendMessage(from, { image: { url: r.url }, caption: `😂 ${r.title}\n\n> ${BOT_NAME}` }, { quoted: msg }); await sock.sendMessage(from, { delete: s.key }).catch(() => {}); } catch (e) { await sock.sendMessage(from, { text: `❌ ${e.message}`, edit: s.key }); } }, { public: true });

register('joke', ['jokes'], async (c) => { const { sock, from, msg } = c; try { const r = await safeJson('https://official-joke-api.appspot.com/random_joke'); if (!r?.setup) throw new Error('නෑ!'); await sock.sendMessage(from, { text: `😄 ${r.setup}\n\n||${r.punchline}||` }, { quoted: msg }); } catch (e) { await sock.sendMessage(from, { text: `❌ ${e.message}` }, { quoted: msg }); } }, { public: true });

register('quote', ['quotes'], async (c) => { const { sock, from, msg } = c; try { const r = await safeJson('https://zenquotes.io/api/random'); const q = r?.[0]; if (!q?.q) throw new Error('නෑ!'); await sock.sendMessage(from, { text: `💬 "${q.q}"\n\n— ${q.a}` }, { quoted: msg }); } catch (e) { await sock.sendMessage(from, { text: `❌ ${e.message}` }, { quoted: msg }); } }, { public: true });

register('wiki', ['wikipedia'], async (c) => { const { sock, from, msg, args } = c; if (!args[0]) return sock.sendMessage(from, { text: '📚 .wiki <topic>' }, { quoted: msg }); const s = await sock.sendMessage(from, { text: '🔄...' }, { quoted: msg }); try { const r = await safeJson(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(args.join(' '))}`); if (!r?.extract) throw new Error('නෑ!'); const text = `📚 *${r.title}*\n\n${r.extract.slice(0, 1500)}\n\n> ${BOT_NAME}`; if (r.thumbnail?.source) await sock.sendMessage(from, { image: { url: r.thumbnail.source }, caption: text }, { quoted: msg }); else await sock.sendMessage(from, { text, edit: s.key }); await sock.sendMessage(from, { delete: s.key }).catch(() => {}); } catch (e) { await sock.sendMessage(from, { text: `❌ ${e.message}`, edit: s.key }); } }, { public: true });

register('translate', ['tr'], async (c) => { const { sock, from, msg, args } = c; if (!args[0]) return sock.sendMessage(from, { text: '🌐 .tr si Hello' }, { quoted: msg }); const s = await sock.sendMessage(from, { text: '🔄...' }, { quoted: msg }); try { let to = 'en', text = args.join(' '); if (args[0].length <= 3) { to = args[0]; text = args.slice(1).join(' '); } const r = await safeJson(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${to}&dt=t&q=${encodeURIComponent(text)}`); if (!r?.[0]) throw new Error('නෑ!'); await sock.sendMessage(from, { text: `🌐 *${to}*\n\n${r[0].map(x => x[0]).join('')}`, edit: s.key }); } catch (e) { await sock.sendMessage(from, { text: `❌ ${e.message}`, edit: s.key }); } }, { public: true });

register('owner', ['creator'], async (c) => { const { sock, from, msg } = c; try { const vcard = `BEGIN:VCARD\nVERSION:3.0\nFN:${BOT_NAME} Owner\nTEL:type=CELL;waid=${OWNER_NUMBER}:+${OWNER_NUMBER}\nEND:VCARD`; await sock.sendMessage(from, { contacts: { displayName: `${BOT_NAME} Owner`, contacts: [{ vcard }] } }, { quoted: msg }); } catch {} await sock.sendMessage(from, { text: `👑 +${OWNER_NUMBER}` }, { quoted: msg }); }, { public: true });

register('ping', ['speed'], async (c) => { const { sock, from, msg } = c; const t = Date.now(); const s = await sock.sendMessage(from, { text: '🏓...' }, { quoted: msg }); await sock.sendMessage(from, { text: `⚡ ${Date.now() - t}ms\n💾 ${getRAM()}MB`, edit: s.key }); }, { public: true });

register('settings', ['config'], async (c) => { const { sock, from, msg } = c; const up = process.uptime(); await sock.sendMessage(from, { text: `⚙️ ${BOT_NAME}\n📱 +${OWNER_NUMBER}\n⏱️ ${Math.floor(up / 3600)}h ${Math.floor(up % 3600 / 60)}m\n💾 ${getRAM()} MB` }, { quoted: msg }); }, { public: true });

register('gc', ['ram'], async (c) => { const { sock, from, msg } = c; if (!isOwner(c)) return sock.sendMessage(from, { text: '❌ Owner only!' }, { quoted: msg }); const b = getRAM(); if (global.gc) global.gc(); await sock.sendMessage(from, { text: `🧹 ${b} → ${getRAM()} MB` }, { quoted: msg }); }, { public: false });

register('update', ['up'], async (c) => { const { sock, from, msg } = c; if (!isOwner(c)) return sock.sendMessage(from, { text: '❌ Owner only!' }, { quoted: msg }); const s = await sock.sendMessage(from, { text: '🔄...' }, { quoted: msg }); exec('git pull', { timeout: 60000 }, async (e, out, err) => { if (e) return sock.sendMessage(from, { text: `❌ ${err || e.message}`, edit: s.key }); if (out.includes('Already up to date')) return sock.sendMessage(from, { text: '✅ Up to date!', edit: s.key }); await sock.sendMessage(from, { text: `✅ ${out.slice(0, 500)}`, edit: s.key }); }); }, { public: false });

register('restart', ['rs'], async (c) => { const { sock, from, msg } = c; if (!isOwner(c)) return sock.sendMessage(from, { text: '❌ Owner only!' }, { quoted: msg }); await sock.sendMessage(from, { text: '🔄 Restarting in 5s...' }, { quoted: msg }); setTimeout(() => process.exit(0), 5000); }, { public: false });

register('menu', ['help'], async (c) => { const { sock, from, msg } = c; await sock.sendMessage(from, { text: `🔥 *${BOT_NAME}*\n\n📥 .ytmp3 .ytmp4 .fb .tt .ig\n🤖 .ai .imagine .weather .meme .joke .quote .wiki .translate\n👑 .owner .update .restart .gc\nℹ️ .settings .ping .menu` }, { quoted: msg }); }, { public: true });

console.log(`✅ ${COMMANDS.size} commands registered\n`);

// =======================================================
// 🚀 BAILEYS 6.6.0 — STABLE PAIR CODE & SOCKET MANAGEMENT
// =======================================================
let sock = null;
let latestQR = null;
let isConnected = false;
let isStarting = false;
let qrClients = new Set();
const logger = pino({ level: 'silent' });

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
        try { fs.removeSync('./auth_info'); console.log('🧹 Cleared auth_info'); } catch {}
    }
    
    const { state, saveCreds } = await useMultiFileAuthState('./auth_info');
    const { version } = await fetchLatestBaileysVersion();
    
    console.log(`📡 Socket initializing...`);
    
    sock = makeWASocket({
        version,
        auth: state,
        logger,
        printQRInTerminal: false,
        browser: ['Ubuntu', 'Chrome', '20.0.04'],
        syncFullHistory: false,
        markOnlineOnConnect: false,
        generateHighQualityLinkPreview: false
    });
    
    sock.ev.on('creds.update', saveCreds);
    
    sock.ev.on('connection.update', async (u) => {
        const { connection, lastDisconnect, qr } = u;
        
        if (qr) {
            latestQR = qr;
            console.log('📱 QR updated');
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
                console.log('🚪 Logged out — clearing after 10s');
                try { fs.removeSync('./auth_info'); } catch {}
                setTimeout(() => { if (!isStarting) startSock(); }, 10000);
            } else if (code === 440) {
                console.log('⚠️ 440 Conflict — waiting 30s');
                setTimeout(() => { if (!isStarting) startSock(); }, 30000);
            } else {
                console.log('🔄 Reconnecting in 10s');
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
            const cmd = COMMANDS.get(cmdName.toLowerCase()) || COMMANDS.get(ALIASES.get(cmdName.toLowerCase()));
            if (!cmd) return;
            await cmd.handler({ sock, from, msg, args });
        } catch (e) { console.error('❌ Msg error:', e.message); }
    });
    
    isStarting = false;
}

// Start default socket
startSock();

// =======================================================
// 🌐 EXPRESS WEB SERVER & API ENDPOINTS
// =======================================================
const app = express();
app.use(express.json());

// API: Request Pairing Code
app.post('/api/pair', async (req, res) => {
    try {
        let rawPhone = req.body.phone || '';
        let phone = rawPhone.replace(/[^0-9]/g, '');
        
        if (!phone || phone.length < 10) {
            return res.status(400).json({ error: 'කරුණාකර නිවැරදි දුරකථන අංකයක් ඇතුළත් කරන්න (उदा: 94760601455)' });
        }

        if (isConnected) {
            return res.json({ error: 'WhatsApp දැනටමත් සම්බන්ධ වී ඇත!' });
        }

        // Restart with fresh state for clean pairing
        await startSock({ fresh: true });

        // Wait up to 5 seconds for socket setup
        let attempts = 0;
        while ((!sock || isStarting) && attempts < 10) {
            await new Promise(r => setTimeout(r, 500));
            attempts++;
        }

        if (!sock) {
            return res.status(500).json({ error: 'Socket ආරම්භ කිරීමට නොහැකි විය. නැවත උත්සාහ කරන්න.' });
        }

        // Delay slightly for WebSocket handshake
        await new Promise(r => setTimeout(r, 3000));

        if (!sock.authState.creds.registered) {
            const code = await sock.requestPairingCode(phone);
            const formattedCode = code?.match(/.{1,4}/g)?.join('-') || code;
            console.log(`🎟️ Pair code generated for ${phone}: ${formattedCode}`);
            return res.json({ success: true, code: formattedCode });
        } else {
            return res.json({ error: 'මෙම Session එක දැනටමත් ලියාපදිංචි වී ඇත.' });
        }
    } catch (e) {
        console.error('❌ Pairing Code Error:', e.message);
        return res.status(500).json({ error: e?.message || 'Pairing code ලබා ගැනීමේ දෝෂයක් සිදු විය.' });
    }
});

// API: Live Status
app.get('/api/status', (req, res) => {
    res.json({ connected: isConnected, name: BOT_NAME });
});

// API: SSE QR Stream
app.get('/api/qr', async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    if (isConnected) {
        res.write(`data: ${JSON.stringify({ connected: true })}\n\n`);
        return res.end();
    }
    
    if (latestQR) {
        try {
            const dataUrl = await QRCode.toDataURL(latestQR, { width: 300 });
            res.write(`data: ${JSON.stringify({ qr: dataUrl })}\n\n`);
        } catch {}
    }
    
    qrClients.add(res);
    req.on('close', () => qrClients.delete(res));
});

// Front-End Web Page
const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>HACKER PRO ULTRA</title>
<style>
*{margin:0;padding:0;box-sizing:border-box;font-family:'Segoe UI',Roboto,sans-serif}
body{background:#060917;min-height:100vh;display:flex;align-items:center;justify-content:center;color:#fff;padding:20px}
.c{background:rgba(10,14,39,.85);border:1px solid rgba(255,255,255,.1);border-radius:24px;padding:36px;max-width:480px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.8);backdrop-filter:blur(10px)}
.h{text-align:center;margin-bottom:22px}
.li{width:56px;height:56px;background:linear-gradient(135deg,#00d2ff,#3a7bd5);border-radius:16px;display:flex;align-items:center;justify-content:center;font-size:28px;margin:0 auto 10px;box-shadow:0 0 20px rgba(0,210,255,.4)}
h1{font-size:22px;font-weight:800;background:linear-gradient(90deg,#00d2ff,#00ff88);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.sub{color:#6b7280;font-size:11px;margin-top:4px;text-transform:uppercase;letter-spacing:1px}
.sb{text-align:center;padding:10px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:10px;margin-bottom:18px;font-size:13px;display:flex;align-items:center;justify-content:center;gap:8px}
.dot{width:8px;height:8px;border-radius:50%;background:#ff6b6b;display:inline-block}
.dot.on{background:#00ff88;box-shadow:0 0 10px #00ff88}
.tg{display:flex;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:4px;margin-bottom:18px;position:relative}
.tg .sl{position:absolute;top:4px;left:4px;width:calc(50% - 4px);height:calc(100% - 8px);background:linear-gradient(135deg,#00d2ff,#3a7bd5);border-radius:9px;transition:transform .3s ease}
.tg.qr-mode .sl{transform:translateX(100%)}
.tb{flex:1;padding:10px;background:transparent;border:none;color:#9ca3af;font-size:13px;font-weight:700;cursor:pointer;position:relative;z-index:1;transition:color .3s}
.tb.active{color:#fff}
.iw{position:relative;margin-top:10px}
.iw input{width:100%;padding:14px 14px 14px 42px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.12);border-radius:12px;color:#fff;font-size:15px;outline:none;font-family:monospace}
.iw input:focus{border-color:#00d2ff}
.ii{position:absolute;left:14px;top:50%;transform:translateY(-50%);font-size:16px;opacity:.6}
.gb{width:100%;padding:14px;margin-top:14px;background:linear-gradient(135deg,#00d2ff,#3a7bd5);border:none;border-radius:12px;color:#fff;font-size:14px;font-weight:700;cursor:pointer;transition:opacity .2s}
.gb:hover{opacity:.9}
.gb:disabled{opacity:.5;cursor:not-allowed}
.cb{margin-top:18px;padding:20px;background:linear-gradient(135deg,rgba(0,210,255,.08),rgba(58,123,213,.08));border:2px solid rgba(0,210,255,.3);border-radius:14px;text-align:center;display:none}
.cb.show{display:block}
.cl{font-size:11px;color:#9ca3af;text-transform:uppercase;margin-bottom:8px}
.code{font-size:32px;font-weight:900;letter-spacing:4px;background:linear-gradient(90deg,#00d2ff,#00ff88);-webkit-background-clip:text;-webkit-text-fill-color:transparent;font-family:monospace;cursor:pointer}
.qrb{padding:18px;background:rgba(255,255,255,.03);border-radius:14px;text-align:center;display:none}
.qrb.show{display:block}
.qrw{background:#fff;padding:12px;border-radius:12px;display:inline-block;margin:10px 0}
.qrw img{display:block;width:220px;height:220px}
.err{margin-top:12px;padding:10px;background:rgba(255,107,107,.1);border:1px solid rgba(255,107,107,.3);border-radius:10px;color:#ff6b6b;font-size:12px;text-align:center;display:none}
.err.show{display:block}
.conn{display:none;text-align:center;padding:20px 10px}
.conn.show{display:block}
.conn .ic{font-size:48px;margin-bottom:10px}
.conn h2{color:#00ff88;font-size:18px;margin-bottom:4px}
.conn p{color:#9ca3af;font-size:12px}
.steps{margin-top:16px;padding:14px;background:rgba(255,255,255,.03);border-radius:12px;font-size:11px;line-height:1.7;color:#9ca3af}
.steps b{color:#00d2ff;text-transform:uppercase;font-size:10px;letter-spacing:1px;display:block;margin-bottom:4px}
</style>
</head>
<body>
<div class="c">
    <div class="h">
        <div class="li">⚡</div>
        <h1>HACKER PRO ULTRA</h1>
        <div class="sub">WhatsApp Link Portal</div>
    </div>
    
    <div class="sb"><span class="dot" id="dot"></span><span id="st">Checking Status...</span></div>
    
    <div id="linked-view" class="conn">
        <div class="ic">🎉</div>
        <h2>Connected Successfully!</h2>
        <p>Hacker Pro Bot is actively connected to WhatsApp.</p>
    </div>

    <div id="auth-view">
        <div class="tg" id="tg">
            <div class="sl"></div>
            <button class="tb active" id="btn-pair" onclick="setMode('pair')">PAIR CODE</button>
            <button class="tb" id="btn-qr" onclick="setMode('qr')">QR CODE</button>
        </div>

        <div id="pair-sec">
            <div class="iw">
                <span class="ii">📱</span>
                <input type="text" id="phone" placeholder="94760601455" value="94760601455">
            </div>
            <button class="gb" id="pair-btn" onclick="getPairCode()">GET PAIRING CODE</button>
            
            <div class="cb" id="code-box">
                <div class="cl">Your Pairing Code (Click to Copy)</div>
                <div class="code" id="code-val" onclick="copyCode()">---- ----</div>
            </div>
            
            <div class="steps">
                <b>How to Connect:</b>
                1. Open WhatsApp on your phone.<br>
                2. Tap Settings > Linked Devices > Link a Device.<br>
                3. Choose "Link with phone number instead" and enter the code above.
            </div>
        </div>

        <div class="qrb" id="qr-sec">
            <div class="qrw">
                <img id="qr-img" src="" alt="Scan QR Code" style="display:none">
                <div id="qr-ldr">Loading QR Code...</div>
            </div>
            <p style="font-size:11px;color:#9ca3af">Scan this QR Code using WhatsApp Linked Devices.</p>
        </div>

        <div class="err" id="err-box"></div>
    </div>
</div>

<script>
let currentMode = 'pair';
let sse = null;

function setMode(mode) {
    currentMode = mode;
    const tg = document.getElementById('tg');
    const bPair = document.getElementById('btn-pair');
    const bQr = document.getElementById('btn-qr');
    const pSec = document.getElementById('pair-sec');
    const qSec = document.getElementById('qr-sec');
    
    if (mode === 'pair') {
        tg.classList.remove('qr-mode');
        bPair.classList.add('active');
        bQr.classList.remove('active');
        pSec.style.display = 'block';
        qSec.classList.remove('show');
    } else {
        tg.classList.add('qr-mode');
        bPair.classList.remove('active');
        bQr.classList.add('active');
        pSec.style.display = 'none';
        qSec.classList.add('show');
        initQR();
    }
}

async function getPairCode() {
    const phoneInput = document.getElementById('phone').value.trim();
    const btn = document.getElementById('pair-btn');
    const errBox = document.getElementById('err-box');
    const codeBox = document.getElementById('code-box');
    const codeVal = document.getElementById('code-val');
    
    errBox.classList.remove('show');
    codeBox.classList.remove('show');
    
    if(!phoneInput) {
        errBox.innerText = "කරුණාකර Phone Number එක ඇතුළත් කරන්න!";
        errBox.classList.add('show');
        return;
    }
    
    btn.disabled = true;
    btn.innerText = "GENERATING CODE...";
    
    try {
        const res = await fetch('/api/pair', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ phone: phoneInput })
        });
        const data = await res.json();
        
        if (data.success && data.code) {
            codeVal.innerText = data.code;
            codeBox.classList.add('show');
        } else {
            errBox.innerText = data.error || "Pairing Code ලබා ගැනීමට නොහැකි විය.";
            errBox.classList.add('show');
        }
    } catch(e) {
        errBox.innerText = "Server Error! කරුණාකර නැවත උත්සාහ කරන්න.";
        errBox.classList.add('show');
    } finally {
        btn.disabled = false;
        btn.innerText = "GET PAIRING CODE";
    }
}

function copyCode() {
    const code = document.getElementById('code-val').innerText;
    if (code && code !== '---- ----') {
        navigator.clipboard.writeText(code);
        alert('Pairing code copied to clipboard: ' + code);
    }
}

function checkStatus() {
    fetch('/api/status').then(r => r.json()).then(d => {
        const dot = document.getElementById('dot');
        const st = document.getElementById('st');
        const authView = document.getElementById('auth-view');
        const linkedView = document.getElementById('linked-view');
        
        if (d.connected) {
            dot.classList.add('on');
            st.innerText = "Online & Connected";
            authView.style.display = 'none';
            linkedView.classList.add('show');
        } else {
            dot.classList.remove('on');
            st.innerText = "Disconnected";
            authView.style.display = 'block';
            linkedView.classList.remove('show');
        }
    }).catch(() => {});
}

function initQR() {
    if (sse) return;
    sse = new EventSource('/api/qr');
    sse.onmessage = (e) => {
        const data = JSON.parse(e.data);
        if (data.connected) {
            checkStatus();
        } else if (data.qr) {
            document.getElementById('qr-ldr').style.display = 'none';
            const img = document.getElementById('qr-img');
            img.src = data.qr;
            img.style.display = 'block';
        }
    };
}

setInterval(checkStatus, 4000);
checkStatus();
</script>
</body>
</html>`;

app.get('/', (req, res) => res.send(HTML));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🌐 Server active on port ${PORT}`));
