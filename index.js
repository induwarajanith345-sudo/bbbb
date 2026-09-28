// 🔥 HACKER PRO ULTRA — FULL FIXED (QR + Pair)
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

// ============ RAM MONITOR ============
const getRAM = () => parseFloat((process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2));
setInterval(() => { if (global.gc) global.gc(); }, 60000);
console.log(`💾 [RAM START] ${getRAM()} MB`);

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

// ============ COMMAND SYSTEM ============
const COMMANDS = new Map();
const ALIASES = new Map();
function register(name, aliases, handler, opts = {}) {
    COMMANDS.set(name, { handler, opts });
    (aliases || []).forEach(a => ALIASES.set(a, name));
}
console.log('📋 Registering commands...');

// ============ COMMANDS ============
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
// 🚀 BAILEYS — FIXED VERSION (No infinite loop!)
// =======================================================
let sock = null;
let latestQR = null;
let isConnected = false;
let isStarting = false;
let qrClients = new Set();
let pairMode = false;          // ✅ Track pair mode
let pairPhone = null;           // ✅ Track pair phone
let pairingCode = null;         // ✅ Store generated code
let pairingResolve = null;      // ✅ Promise resolver
let reconnectTimer = null;      // ✅ Prevent multiple reconnects
const logger = pino({ level: 'silent' });

// ✅ FIX: Do NOT clear auth_info on every reconnect!
// Only clear when explicitly requested via /api/reset

async function startSock(usePair = false, phone = null) {
    if (isStarting) {
        console.log('⚠️ Socket already starting, skipping...');
        return;
    }
    isStarting = true;
    
    try {
        // Close existing socket gracefully
        if (sock) {
            try { sock.end(undefined); } catch {}
            sock = null;
        }
        
        // Clear reconnect timer
        if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
        
        const { state, saveCreds } = await useMultiFileAuthState('./auth_info');
        const { version } = await fetchLatestBaileysVersion();
        
        console.log(`📡 Starting socket (pair mode: ${usePair})`);
        
        sock = makeWASocket({
            version,
            auth: state,
            logger,
            printQRInTerminal: false,
            browser: ['Hacker Pro', 'Chrome', '1.0'],
            syncFullHistory: false,
            generateHighQualityLinkPreview: false,
            markOnlineOnConnect: false
        });
        
        sock.ev.on('creds.update', saveCreds);
        
        sock.ev.on('connection.update', async (u) => {
            const { connection, lastDisconnect, qr } = u;
            
            // Socket connecting — request pair code if in pair mode
            if (connection === 'connecting') {
                console.log('📡 Socket connecting...');
                isStarting = false;
                
                if (usePair && phone && !pairingCode) {
                    try {
                        await new Promise(r => setTimeout(r, 2500));
                        const code = await sock.requestPairingCode(phone);
                        pairingCode = code;
                        console.log(`🎟️ Pair code for ${phone}: ${code}`);
                        if (pairingResolve) { pairingResolve(code); pairingResolve = null; }
                    } catch (e) {
                        console.error('❌ Pair code error:', e.message);
                        if (pairingResolve) { pairingResolve(null); pairingResolve = null; }
                    }
                }
            }
            
            // QR received — only in QR mode
            if (qr && !usePair) {
                latestQR = qr;
                console.log('📱 QR received');
                try {
                    const dataUrl = await QRCode.toDataURL(qr, { width: 300 });
                    for (const res of qrClients) {
                        try { res.write(`data: ${JSON.stringify({ qr: dataUrl })}\n\n`); } catch {}
                    }
                } catch {}
            }
            
            // Connected!
            if (connection === 'open') {
                console.log('✅ WhatsApp connected!');
                isConnected = true;
                isStarting = false;
                latestQR = null;
                pairingCode = null;
                pairMode = false;
                pairPhone = null;
                for (const res of qrClients) {
                    try { res.write(`data: ${JSON.stringify({ connected: true })}\n\n`); res.end(); } catch {}
                }
                qrClients.clear();
            }
            
            // Disconnected
            if (connection === 'close') {
                isConnected = false;
                isStarting = false;
                const code = lastDisconnect?.error?.output?.statusCode;
                console.log(`❌ Disconnected (code: ${code})`);
                
                // Only reconnect if NOT logged out
                if (code !== DisconnectReason.loggedOut) {
                    // ✅ Prevent multiple reconnect loops
                    if (!reconnectTimer) {
                        reconnectTimer = setTimeout(() => {
                            reconnectTimer = null;
                            console.log('🔄 Reconnecting...');
                            startSock(false).catch(e => console.error('Reconnect error:', e.message));
                        }, 5000);
                    }
                } else {
                    console.log('🚪 Logged out — clearing auth_info');
                    try { fs.removeSync('./auth_info'); } catch {}
                    setTimeout(() => startSock(false), 2000);
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
        
    } catch (e) {
        console.error('❌ startSock error:', e.message);
        isStarting = false;
    }
}

// =======================================================
// 🌐 EXPRESS WEB SERVER
// =======================================================
const app = express();
app.use(express.json());

const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>HACKER PRO</title>
<style>
*{margin:0;padding:0;box-sizing:border-box;font-family:'Segoe UI',sans-serif}
body{background:#060917;min-height:100vh;display:flex;align-items:center;justify-content:center;color:#fff;padding:20px}
.c{background:rgba(10,14,39,.75);border:1px solid rgba(255,255,255,.08);border-radius:24px;padding:36px;max-width:520px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.7)}
.h{text-align:center;margin-bottom:22px}
.li{width:56px;height:56px;background:linear-gradient(135deg,#00d2ff,#3a7bd5);border-radius:16px;display:flex;align-items:center;justify-content:center;font-size:28px;margin:0 auto 10px}
h1{font-size:22px;font-weight:800;background:linear-gradient(90deg,#00d2ff,#00ff88);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.sub{color:#6b7280;font-size:11px;margin-top:4px;text-transform:uppercase;letter-spacing:1px}
.sb{text-align:center;padding:10px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:10px;margin-bottom:18px;font-size:13px}
.dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:#ff6b6b;margin-right:8px;vertical-align:middle}
.dot.on{background:#00ff88;box-shadow:0 0 10px #00ff88}
.dot.ready{background:#ffb84d;box-shadow:0 0 10px #ffb84d}
.st{color:#9ca3af}
.st.on{color:#00ff88;font-weight:700}
.tg{display:flex;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:4px;margin-bottom:18px;position:relative}
.tg .sl{position:absolute;top:4px;left:4px;width:calc(50% - 4px);height:calc(100% - 8px);background:linear-gradient(135deg,#00d2ff,#3a7bd5);border-radius:9px;transition:transform .35s cubic-bezier(.16,1,.3,1)}
.tg.qr .sl{transform:translateX(0)}
.tg.pair .sl{transform:translateX(100%)}
.tb{flex:1;padding:12px;background:transparent;border:none;color:#6b7280;font-size:14px;font-weight:600;cursor:pointer;position:relative;z-index:1;transition:color .3s}
.tb.active{color:#fff}
.il{font-size:12px;color:#9ca3af;margin-bottom:8px;font-weight:500}
.iw{position:relative}
.iw input{width:100%;padding:15px 15px 15px 44px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.1);border-radius:12px;color:#fff;font-size:15px;outline:none;font-family:monospace;letter-spacing:1px}
.iw input:focus{border-color:#00d2ff;box-shadow:0 0 0 4px rgba(0,210,255,.1)}
.ii{position:absolute;left:14px;top:50%;transform:translateY(-50%);font-size:16px;opacity:.5}
.gb{width:100%;padding:15px;margin-top:14px;background:linear-gradient(135deg,#00d2ff,#3a7bd5);border:none;border-radius:12px;color:#fff;font-size:15px;font-weight:700;cursor:pointer}
.gb:hover:not(:disabled){transform:translateY(-2px)}
.gb:disabled{opacity:.6;cursor:not-allowed}
.cb{margin-top:18px;padding:22px;background:linear-gradient(135deg,rgba(0,210,255,.08),rgba(58,123,213,.08));border:2px solid rgba(0,210,255,.3);border-radius:14px;text-align:center;display:none}
.cb.show{display:block}
.cl{font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:10px}
.code{font-size:32px;font-weight:900;letter-spacing:5px;background:linear-gradient(90deg,#00d2ff,#00ff88);-webkit-background-clip:text;-webkit-text-fill-color:transparent;font-family:'Courier New',monospace;word-break:break-all}
.qrb{padding:22px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:14px;text-align:center}
.qrw{background:#fff;padding:14px;border-radius:12px;display:inline-block;margin:12px 0;min-width:260px;min-height:260px;position:relative}
.qrw img{display:block;width:260px;height:260px}
.qrw .sp{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);color:#333;font-size:13px;text-align:center;width:100%;padding:0 20px}
.qrh{font-size:12px;color:#9ca3af;margin-top:6px;line-height:1.6}
.qrh b{color:#00d2ff}
.err{margin-top:14px;padding:12px;background:rgba(255,107,107,.1);border:1px solid rgba(255,107,107,.3);border-radius:10px;color:#ff6b6b;font-size:13px;display:none}
.err.show{display:block}
.conn{display:none;text-align:center;padding:30px 20px}
.conn.show{display:block}
.conn .ic{font-size:56px;margin-bottom:12px}
.conn h2{color:#00ff88;font-size:18px;margin-bottom:6px}
.conn p{color:#9ca3af;font-size:12.5px}
.steps{margin-top:18px;padding:16px;background:rgba(255,255,255,.03);border-radius:12px;font-size:12px;line-height:1.8;color:#9ca3af}
.steps b{color:#00d2ff;text-transform:uppercase;font-size:10.5px;letter-spacing:1px;display:block;margin-bottom:6px}
.steps .s{display:flex;gap:8px;padding:3px 0}
.steps .n{width:18px;height:18px;background:linear-gradient(135deg,#00d2ff,#3a7bd5);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#fff;flex-shrink:0;margin-top:2px}
.ft{text-align:center;margin-top:18px;font-size:10px;color:#4b5563;letter-spacing:1px;text-transform:uppercase;font-weight:600}
.ft span{background:linear-gradient(90deg,#00d2ff,#00ff88);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
</style>
</head>
<body>
<div class="c">
<div class="h">
<div class="li">⚡</div>
<h1>HACKER PRO ULTRA</h1>
<div class="sub">WhatsApp Link</div>
</div>
<div class="sb">
<span class="dot" id="dot"></span>
<span class="st" id="st">Checking...</span>
</div>
<div class="tg pair" id="tg">
<div class="sl"></div>
<button class="tb" data-m="qr" onclick="sw('qr')">📱 QR Code</button>
<button class="tb active" data-m="pair" onclick="sw('pair')">🔐 Pair Code</button>
</div>
<div id="pairSec">
<div class="il">📱 Phone (country code + 0 නැතුව)</div>
<div class="iw">
<span class="ii">📞</span>
<input type="tel" id="phone" placeholder="94760601455" maxlength="15">
</div>
<button class="gb" id="pBtn" onclick="getPair()">Generate Pair Code</button>
<div class="cb" id="codeBox">
<div class="cl">Your Pairing Code</div>
<div class="code" id="code">----</div>
<button class="gb" onclick="copyCode()" style="margin-top:12px">📋 Copy</button>
</div>
<div class="err" id="err"></div>
</div>
<div id="qrSec" style="display:none">
<div class="qrb">
<div style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:6px">Scan QR Code</div>
<div class="qrw">
<img id="qrImg" style="display:none" alt="QR">
<div class="sp" id="qrSpin">🔄 Loading QR...</div>
</div>
<div class="qrh">WhatsApp → <b>Settings</b> → <b>Linked Devices</b><br>→ <b>Link a Device</b> → Scan</div>
</div>
</div>
<div class="conn" id="connBox">
<div class="ic">✅</div>
<h2>WhatsApp Connected!</h2>
<p>Bot ready. <b>.menu</b> try කරන්න.</p>
</div>
<div class="steps">
<b>📌 How to Link</b>
<div class="s"><div class="n">1</div><div>WhatsApp app open කරන්න</div></div>
<div class="s"><div class="n">2</div><div>Settings → Linked Devices</div></div>
<div class="s"><div class="n">3</div><div>Link a Device tap කරන්න</div></div>
<div class="s"><div class="n">4</div><div>Code / QR use කරන්න</div></div>
</div>
<div class="ft">POWERED BY <span>HACKER PRO</span></div>
</div>
<script>
let es=null;
function sw(m){
    const tg=document.getElementById('tg');
    const ps=document.getElementById('pairSec');
    const qs=document.getElementById('qrSec');
    document.querySelectorAll('.tb').forEach(b=>b.classList.toggle('active',b.dataset.m===m));
    tg.classList.remove('qr','pair');tg.classList.add(m);
    if(m==='qr'){ps.style.display='none';qs.style.display='block';connectSSE();}
    else{ps.style.display='block';qs.style.display='none';if(es)es.close();}
}
async function getPair(){
    const phone=document.getElementById('phone').value.trim();
    const btn=document.getElementById('pBtn');
    const cb=document.getElementById('codeBox');
    const er=document.getElementById('err');
    cb.classList.remove('show');er.classList.remove('show');
    if(!phone||phone.length<10){er.textContent='❌ Valid number එකක් දෙන්න!';er.classList.add('show');return;}
    btn.disabled=true;btn.textContent='Generating... (wait 15s)';
    try{
        const r=await fetch('/api/pair',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone})});
        const d=await r.json();
        if(d.success){document.getElementById('code').textContent=d.code;cb.classList.add('show');}
        else{er.textContent='❌ '+(d.error||'Failed');er.classList.add('show');}
    }catch(e){er.textContent='❌ '+e.message;er.classList.add('show');}
    btn.disabled=false;btn.textContent='Generate Pair Code';
}
function copyCode(){const c=document.getElementById('code').textContent;if(c&&c!=='----')navigator.clipboard.writeText(c).then(()=>alert('✅ Copied: '+c));}
function connectSSE(){
    if(es)es.close();
    es=new EventSource('/api/qr-stream');
    es.onmessage=(e)=>{try{
        const d=JSON.parse(e.data);
        if(d.connected){showConn();es.close();}
        if(d.qr){const img=document.getElementById('qrImg');img.src=d.qr;img.style.display='block';document.getElementById('qrSpin').style.display='none';}
    }catch{}};
    es.onerror=()=>{setTimeout(connectSSE,3000);};
}
function showConn(){
    document.getElementById('pairSec').style.display='none';
    document.getElementById('qrSec').style.display='none';
    document.getElementById('tg').style.display='none';
    document.getElementById('connBox').classList.add('show');
    document.getElementById('dot').className='dot on';
    document.getElementById('st').className='st on';
    document.getElementById('st').textContent='CONNECTED';
}
async function st(){
    try{
        const r=await fetch('/api/status');
        const d=await r.json();
        if(d.connected)return showConn();
        const dot=document.getElementById('dot'),el=document.getElementById('st');
        if(d.ready){dot.className='dot ready';el.textContent='READY';}
        else{dot.className='dot';el.textContent='STARTING...';}
    }catch(e){}
}
document.getElementById('phone').addEventListener('input',e=>e.target.value=e.target.value.replace(/[^0-9]/g,''));
st();setInterval(st,5000);
</script>
</body>
</html>`;

app.get('/', (req, res) => res.send(HTML));
app.get('/api/status', (req, res) => res.json({ connected: isConnected, ready: !!latestQR || isConnected }));

// QR SSE Stream
app.get('/api/qr-stream', async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
    if (latestQR) {
        try { const dataUrl = await QRCode.toDataURL(latestQR, { width: 300 }); res.write(`data: ${JSON.stringify({ qr: dataUrl })}\n\n`); } catch {}
    } else if (isConnected) {
        res.write(`data: ${JSON.stringify({ connected: true })}\n\n`);
    }
    qrClients.add(res);
    req.on('close', () => qrClients.delete(res));
});

// ============ PAIR CODE API (FIXED — No spam!) ============
app.post('/api/pair', async (req, res) => {
    try {
        const { phone } = req.body;
        if (!phone) return res.json({ success: false, error: 'Phone number එකක් දෙන්න!' });
        const clean = phone.replace(/[^0-9]/g, '');
        if (clean.length < 10 || clean.length > 15) {
            return res.json({ success: false, error: 'Valid number එකක් දෙන්න (country code + 0 නැතුව)!' });
        }
        
        if (isConnected) return res.json({ success: false, error: 'Already connected! Logout first.' });
        
        console.log(`🎟️ Pair request for: ${clean}`);
        
        // Reset pair state
        pairingCode = null;
        pairPhone = clean;
        
        // Create promise to wait for code
        const codePromise = new Promise((resolve) => {
            pairingResolve = resolve;
            setTimeout(() => {
                if (pairingResolve) { pairingResolve(null); pairingResolve = null; }
            }, 25000);
        });
        
        // Start socket in pair mode (only ONCE!)
        await startSock(true, clean);
        
        // Wait for code
        const code = await codePromise;
        
        if (!code) {
            return res.json({ success: false, error: 'Code generate වුනේ නෑ. Try again.' });
        }
        
        res.json({ success: true, code });
    } catch (e) {
        console.error('❌ Pair endpoint error:', e.message);
        res.json({ success: false, error: e.message });
    }
});

// Reset session (manual)
app.post('/api/reset', async (req, res) => {
    try {
        if (sock) { try { sock.end(undefined); } catch {} sock = null; }
        try { fs.removeSync('./auth_info'); } catch {}
        isConnected = false; latestQR = null; pairingCode = null;
        setTimeout(() => startSock(false), 1500);
        res.json({ success: true });
    } catch (e) { res.json({ success: false, error: e.message }); }
});

// ============ START ============
const PORT = process.env.PORT || 80;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🌐 Web: http://0.0.0.0:${PORT}`);
});

startSock(false).catch((e) => console.error('❌ Sock error:', e.message));
