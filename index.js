// =======================================================
// 🔥 HACKER PRO — ULTRA NANO RAM + AUTO CLEAN + WEB API
// Node.js 18+ | Owner: 94760601455
// =======================================================

require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const { exec } = require('child_process');
const pino = require('pino');
const QRCode = require('qrcode');
const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore
} = require('@whiskeysockets/baileys');

// ============ ⚙️ SETTINGS ============
let settings = {
    ownerNumber: '94760601455',
    botName: 'Hacker Pro Md',
    ownerName: 'Hacker Pro'
};
try {
    const s = require('./settings.js');
    settings = { ...settings, ...s };
    console.log('✅ settings.js loaded');
} catch {
    console.log('⚠️ settings.js not found — using defaults');
}

let OWNER_NUMBER = settings.ownerNumber || '94760601455';
const BOT_NAME = settings.botName || 'HACKER PRO';

// ============ 🛡️ AUTO CRASH FIX ============
process.on('uncaughtException', (err) => console.error('🛡️ [CAUGHT]', err?.message || err));
process.on('unhandledRejection', (err) => console.error('🛡️ [REJECT]', err?.message || err));

// =======================================================
// 🧠 ULTRA NANO RAM + AUTO CLEAN
// =======================================================
const RAM_CONFIG = {
    MAX_HEAP_MB: 180,
    CHECK_INTERVAL_MS: 60000,
    FORCE_GC: true,
    CLEAN_TEMP: true,
    WARN_LIMIT: 3
};

let memoryWarnings = 0;

function getRAM() {
    return parseFloat((process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2));
}

function checkMemory() {
    const used = getRAM();
    if (used > RAM_CONFIG.MAX_HEAP_MB) {
        memoryWarnings++;
        console.log(`⚠️ [RAM] ${used}MB > ${RAM_CONFIG.MAX_HEAP_MB}MB (${memoryWarnings}/${RAM_CONFIG.WARN_LIMIT})`);
        if (RAM_CONFIG.FORCE_GC && global.gc) global.gc();
        if (memoryWarnings >= RAM_CONFIG.WARN_LIMIT) {
            console.log('🛑 [RAM] Restarting...');
            setTimeout(() => process.exit(0), 2000);
        }
    } else memoryWarnings = 0;
}

function cleanTempFiles() {
    const dirs = ['./tmp', './temp', './cache'];
    for (const dir of dirs) {
        try {
            if (fs.existsSync(dir)) {
                const files = fs.readdirSync(dir);
                for (const f of files) {
                    try {
                        const fp = path.join(dir, f);
                        const stat = fs.statSync(fp);
                        if (Date.now() - stat.mtimeMs > 3600000) fs.unlinkSync(fp);
                    } catch {}
                }
            }
        } catch {}
    }
}

setInterval(() => {
    checkMemory();
    if (RAM_CONFIG.CLEAN_TEMP) cleanTempFiles();
    if (RAM_CONFIG.FORCE_GC && global.gc) global.gc();
}, RAM_CONFIG.CHECK_INTERVAL_MS);

console.log(`💾 [RAM] ${getRAM()} MB`);
console.log(`🧹 Auto Clean: every ${RAM_CONFIG.CHECK_INTERVAL_MS / 1000}s | Max RAM: ${RAM_CONFIG.MAX_HEAP_MB}MB`);

// ============ 🛡️ SAFE FETCH ============
async function safeJson(url) {
    try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 25000);
        const res = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
            signal: ctrl.signal
        });
        clearTimeout(t);
        if (!res.ok) return null;
        const txt = await res.text();
        try { return JSON.parse(txt); } catch { return null; }
    } catch { return null; }
}

// ============ 👑 OWNER CHECK ============
function isOwner(ctx) {
    if (ctx.msg?.key?.fromMe) return true;
    const n = (ctx.from || '').split('@')[0].split(':')[0];
    return n === OWNER_NUMBER;
}

// ============ 🎵 YT HELPERS ============
function pickUrl(o) {
    if (!o) return null;
    const c = [
        o?.result?.download?.url, o?.result?.download,
        o?.result?.url, o?.result?.dl,
        o?.data?.download?.url, o?.data?.download,
        o?.data?.url, o?.data?.dl,
        o?.download?.url, o?.download,
        o?.url, o?.link, o?.dl,
        o?.video, o?.audio
    ];
    for (const x of c) {
        if (typeof x === 'string' && x.startsWith('http')) return x;
        if (x && typeof x === 'object' && typeof x.url === 'string') return x.url;
    }
    return null;
}

function ytdlpOnly(url, mode = 'video') {
    return new Promise((resolve) => {
        const fmt = mode === 'audio'
            ? 'bestaudio[ext=m4a]/bestaudio/best'
            : 'bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4]/b';
        exec(`yt-dlp -g -f "${fmt}" --no-playlist --no-warnings "${url}"`,
            { timeout: 90000, maxBuffer: 5 * 1024 * 1024 },
            (err, stdout) => {
                if (err || !stdout) return resolve(null);
                const l = stdout.split('\n').map(s => s.trim()).find(s => s.startsWith('http'));
                resolve(l || null);
            });
    });
}

async function ytSearch(q) {
    const apis = [
        `https://api.vreden.my.id/api/ytsearch?query=${encodeURIComponent(q)}`,
        `https://api.zenkey.my.id/search/youtube?q=${encodeURIComponent(q)}`,
        `https://api.nyxs.pw/search/youtube?q=${encodeURIComponent(q)}`
    ];
    for (const a of apis) {
        const r = await safeJson(a);
        const it = r?.result?.[0] || r?.data?.[0] || r?.videos?.[0];
        if (it) {
            const url = it.url || it.link ||
                (it.videoId ? `https://youtu.be/${it.videoId}` : null) ||
                (it.id ? `https://youtu.be/${it.id}` : null);
            if (url) return { url, title: it.title || 'media' };
        }
    }
    return null;
}

async function ytDownload(url, mode) {
    const apis = mode === 'audio' ? [
        `https://api.vreden.my.id/api/ytmp3?url=${encodeURIComponent(url)}`,
        `https://api.zenkey.my.id/download/ytmp3?url=${encodeURIComponent(url)}`,
        `https://api.nyxs.pw/dl/ytmp3?url=${encodeURIComponent(url)}`
    ] : [
        `https://api.vreden.my.id/api/ytmp4?url=${encodeURIComponent(url)}`,
        `https://api.zenkey.my.id/download/ytmp4?url=${encodeURIComponent(url)}`,
        `https://api.nyxs.pw/dl/ytmp4?url=${encodeURIComponent(url)}`
    ];
    for (const a of apis) {
        const r = await safeJson(a);
        const u = pickUrl(r);
        if (u) return u;
    }
    return await ytdlpOnly(url, mode);
}

// =======================================================
// 📋 COMMAND SYSTEM
// =======================================================
const COMMANDS = new Map();
const ALIASES = new Map();
const PREFIX = '.';

function register(name, aliases = [], handler, opts = {}) {
    COMMANDS.set(name, { handler, opts });
    for (const a of aliases) ALIASES.set(a, name);
    console.log(`✅ Registered: .${name}${aliases.length ? ' (' + aliases.join(', ') + ')' : ''}`);
}

// =======================================================
// COMMANDS (23)
// =======================================================

// 1. 🎵 YOUTUBE AUDIO
register('ytmp3', ['yta', 'song', 'mp3'], async (ctx) => {
    const { sock, from, msg, args } = ctx;
    if (!args[0]) return await sock.sendMessage(from, { text: '🎵 Usage: .ytmp3 <name or link>' }, { quoted: msg });
    const s = await sock.sendMessage(from, { text: '🔄 Downloading Audio...' }, { quoted: msg });
    try {
        let url = args.join(' '), title = 'audio';
        if (!url.includes('youtu')) {
            const r = await ytSearch(url);
            if (!r) throw new Error('Song eka hoyaganna ba!');
            url = r.url; title = r.title;
        }
        const dl = await ytDownload(url, 'audio');
        if (!dl) throw new Error('API fail!');
        await sock.sendMessage(from, {
            audio: { url: dl }, mimetype: 'audio/mpeg',
            fileName: `${title}.mp3`, ptt: false
        }, { quoted: msg });
        await sock.sendMessage(from, { delete: s.key }).catch(() => {});
    } catch (e) {
        await sock.sendMessage(from, { text: `❌ ${e.message}`, edit: s.key });
    }
}, { public: true });

// 2. 🎬 YOUTUBE VIDEO
register('ytmp4', ['ytv', 'video', 'mp4'], async (ctx) => {
    const { sock, from, msg, args } = ctx;
    if (!args[0]) return await sock.sendMessage(from, { text: '🎬 Usage: .ytmp4 <name or link>' }, { quoted: msg });
    const s = await sock.sendMessage(from, { text: '🔄 Downloading Video...' }, { quoted: msg });
    try {
        let url = args.join(' '), title = 'video';
        if (!url.includes('youtu')) {
            const r = await ytSearch(url);
            if (!r) throw new Error('Video eka hoyaganna ba!');
            url = r.url; title = r.title;
        }
        const dl = await ytDownload(url, 'video');
        if (!dl) throw new Error('API fail!');
        await sock.sendMessage(from, {
            document: { url: dl }, mimetype: 'video/mp4',
            fileName: `${title}.mp4`, caption: `> ${BOT_NAME}`
        }, { quoted: msg });
        await sock.sendMessage(from, { delete: s.key }).catch(() => {});
    } catch (e) {
        await sock.sendMessage(from, { text: `❌ ${e.message}`, edit: s.key });
    }
}, { public: true });

// 3. 📘 FACEBOOK
register('fb', ['fbdl', 'facebook'], async (ctx) => {
    const { sock, from, msg, args } = ctx;
    if (!args[0]) return await sock.sendMessage(from, { text: '📘 Usage: .fb <URL>' }, { quoted: msg });
    const s = await sock.sendMessage(from, { text: '🔄 Downloading FB...' }, { quoted: msg });
    try {
        const url = args[0];
        let dl = null;
        for (const a of [
            `https://api.nyxs.pw/dl/facebook?url=${encodeURIComponent(url)}`,
            `https://api.zenkey.my.id/download/facebook?url=${encodeURIComponent(url)}`
        ]) {
            const r = await safeJson(a);
            dl = pickUrl(r) || r?.download_url || r?.video_hd || r?.hd;
            if (dl) break;
        }
        if (!dl) dl = await ytdlpOnly(url, 'video');
        if (!dl) throw new Error('Download link එක ගන්න බෑ.');
        await sock.sendMessage(from, {
            video: { url: dl }, mimetype: 'video/mp4', caption: `> ${BOT_NAME}`
        }, { quoted: msg });
        await sock.sendMessage(from, { delete: s.key }).catch(() => {});
    } catch (e) {
        await sock.sendMessage(from, { text: `❌ ${e.message}`, edit: s.key });
    }
}, { public: true });

// 4. 🎵 TIKTOK
register('tt', ['ttdl', 'tiktok'], async (ctx) => {
    const { sock, from, msg, args } = ctx;
    if (!args[0]) return await sock.sendMessage(from, { text: '🎵 Usage: .tt <URL>' }, { quoted: msg });
    const s = await sock.sendMessage(from, { text: '🔄 Downloading TikTok...' }, { quoted: msg });
    try {
        const url = args[0];
        const r = await safeJson(`https://tikwm.com/api/?url=${encodeURIComponent(url)}`);
        let dl = r?.data?.play || r?.data?.hdplay;
        if (!dl) dl = await ytdlpOnly(url, 'video');
        if (!dl) throw new Error('Download link එක ගන්න බෑ.');
        await sock.sendMessage(from, {
            video: { url: dl }, mimetype: 'video/mp4', caption: `> ${BOT_NAME}`
        }, { quoted: msg });
        await sock.sendMessage(from, { delete: s.key }).catch(() => {});
    } catch (e) {
        await sock.sendMessage(from, { text: `❌ ${e.message}`, edit: s.key });
    }
}, { public: true });

// 5. 📸 INSTAGRAM
register('ig', ['igdl', 'instagram'], async (ctx) => {
    const { sock, from, msg, args } = ctx;
    if (!args[0]) return await sock.sendMessage(from, { text: '📸 Usage: .ig <URL>' }, { quoted: msg });
    const s = await sock.sendMessage(from, { text: '🔄 Downloading IG...' }, { quoted: msg });
    try {
        const dl = await ytdlpOnly(args[0], 'video');
        if (!dl) throw new Error('Download link එක ගන්න බෑ.');
        await sock.sendMessage(from, {
            video: { url: dl }, mimetype: 'video/mp4', caption: `> ${BOT_NAME}`
        }, { quoted: msg });
        await sock.sendMessage(from, { delete: s.key }).catch(() => {});
    } catch (e) {
        await sock.sendMessage(from, { text: `❌ ${e.message}`, edit: s.key });
    }
}, { public: true });

// 6. 🤖 AI
register('ai', ['gpt', 'chat'], async (ctx) => {
    const { sock, from, msg, args } = ctx;
    if (!args[0]) return await sock.sendMessage(from, { text: '🤖 Usage: .ai <question>' }, { quoted: msg });
    const s = await sock.sendMessage(from, { text: '🤔 Thinking...' }, { quoted: msg });
    try {
        const q = args.join(' ');
        const apis = [
            `https://api.nyxs.pw/ai/gpt4?text=${encodeURIComponent(q)}`,
            `https://api.zenkey.my.id/ai/gpt?q=${encodeURIComponent(q)}`
        ];
        let ans = null;
        for (const a of apis) {
            const r = await safeJson(a);
            ans = r?.result || r?.data || r?.answer;
            if (typeof ans === 'object') ans = ans?.text;
            if (ans && typeof ans === 'string') break;
            ans = null;
        }
        if (!ans) throw new Error('AI response නෑ!');
        await sock.sendMessage(from, { text: `🤖 *AI*\n\n${ans.slice(0, 3000)}\n\n> ${BOT_NAME}`, edit: s.key });
    } catch (e) {
        await sock.sendMessage(from, { text: `❌ ${e.message}`, edit: s.key });
    }
}, { public: true });

// 7. 🎨 IMAGINE
register('imagine', ['img', 'gen'], async (ctx) => {
    const { sock, from, msg, args } = ctx;
    if (!args[0]) return await sock.sendMessage(from, { text: '🎨 Usage: .imagine <prompt>' }, { quoted: msg });
    const s = await sock.sendMessage(from, { text: '🎨 Generating...' }, { quoted: msg });
    try {
        const prompt = args.join(' ');
        const img = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true&seed=${Date.now()}`;
        await sock.sendMessage(from, { image: { url: img }, caption: `🎨 ${prompt}\n\n> ${BOT_NAME}` }, { quoted: msg });
        await sock.sendMessage(from, { delete: s.key }).catch(() => {});
    } catch (e) {
        await sock.sendMessage(from, { text: `❌ ${e.message}`, edit: s.key });
    }
}, { public: true });

// 8. 🌤️ WEATHER
register('weather', ['wthr'], async (ctx) => {
    const { sock, from, msg, args } = ctx;
    const city = args.join(' ') || 'Colombo';
    const s = await sock.sendMessage(from, { text: `🔄 ${city}...` }, { quoted: msg });
    try {
        const r = await safeJson(`https://wttr.in/${encodeURIComponent(city)}?format=j1`);
        const c = r?.current_condition?.[0];
        if (!c) throw new Error('City නෑ!');
        const text = `🌤️ *${city}*\n\n🌡️ ${c.temp_C}°C\n☁️ ${c.weatherDesc[0].value}\n💧 ${c.humidity}%\n💨 ${c.windspeedKmph} km/h\n\n> ${BOT_NAME}`;
        await sock.sendMessage(from, { text, edit: s.key });
    } catch (e) {
        await sock.sendMessage(from, { text: `❌ ${e.message}`, edit: s.key });
    }
}, { public: true });

// 9. 😂 MEME
register('meme', ['memes'], async (ctx) => {
    const { sock, from, msg } = ctx;
    const s = await sock.sendMessage(from, { text: '🔄 Fetching...' }, { quoted: msg });
    try {
        const r = await safeJson('https://meme-api.com/gimme');
        if (!r?.url) throw new Error('Meme නෑ!');
        await sock.sendMessage(from, { image: { url: r.url }, caption: `😂 ${r.title}\n\n> ${BOT_NAME}` }, { quoted: msg });
        await sock.sendMessage(from, { delete: s.key }).catch(() => {});
    } catch (e) {
        await sock.sendMessage(from, { text: `❌ ${e.message}`, edit: s.key });
    }
}, { public: true });

// 10. 😄 JOKE
register('joke', ['jokes'], async (ctx) => {
    const { sock, from, msg } = ctx;
    try {
        const r = await safeJson('https://official-joke-api.appspot.com/random_joke');
        if (!r?.setup) throw new Error('නෑ!');
        await sock.sendMessage(from, { text: `😄 ${r.setup}\n\n||${r.punchline}||\n\n> ${BOT_NAME}` }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(from, { text: `❌ ${e.message}` }, { quoted: msg });
    }
}, { public: true });

// 11. 💬 QUOTE
register('quote', ['quotes'], async (ctx) => {
    const { sock, from, msg } = ctx;
    try {
        const r = await safeJson('https://zenquotes.io/api/random');
        const q = r?.[0];
        if (!q?.q) throw new Error('නෑ!');
        await sock.sendMessage(from, { text: `💬 "${q.q}"\n\n— ${q.a}\n\n> ${BOT_NAME}` }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(from, { text: `❌ ${e.message}` }, { quoted: msg });
    }
}, { public: true });

// 12. 🎤 LYRICS
register('lyrics', ['ly'], async (ctx) => {
    const { sock, from, msg, args } = ctx;
    if (!args[0]) return await sock.sendMessage(from, { text: '🎤 Usage: .lyrics <song>' }, { quoted: msg });
    const s = await sock.sendMessage(from, { text: '🔄 Searching...' }, { quoted: msg });
    try {
        const q = args.join(' ');
        const r = await safeJson(`https://api.lyrics.ovh/suggest/${encodeURIComponent(q)}`);
        const f = r?.data?.[0];
        if (!f) throw new Error('නෑ!');
        const ly = await safeJson(`https://api.lyrics.ovh/v1/${encodeURIComponent(f.artist.name)}/${encodeURIComponent(f.title)}`);
        if (!ly?.lyrics) throw new Error('Lyrics නෑ!');
        await sock.sendMessage(from, {
            text: `🎤 *${f.title}*\n🎙️ ${f.artist.name}\n\n${ly.lyrics.slice(0, 3000)}\n\n> ${BOT_NAME}`,
            edit: s.key
        });
    } catch (e) {
        await sock.sendMessage(from, { text: `❌ ${e.message}`, edit: s.key });
    }
}, { public: true });

// 13. 🌐 TRANSLATE
register('translate', ['tr'], async (ctx) => {
    const { sock, from, msg, args } = ctx;
    if (!args[0]) return await sock.sendMessage(from, { text: '🌐 Usage: .tr si Hello' }, { quoted: msg });
    const s = await sock.sendMessage(from, { text: '🔄 Translating...' }, { quoted: msg });
    try {
        let to = 'en', text = args.join(' ');
        if (args[0].length <= 3) { to = args[0]; text = args.slice(1).join(' '); }
        const r = await safeJson(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${to}&dt=t&q=${encodeURIComponent(text)}`);
        if (!r?.[0]) throw new Error('නෑ!');
        const out = r[0].map(x => x[0]).join('');
        await sock.sendMessage(from, { text: `🌐 *${to}*\n\n${out}\n\n> ${BOT_NAME}`, edit: s.key });
    } catch (e) {
        await sock.sendMessage(from, { text: `❌ ${e.message}`, edit: s.key });
    }
}, { public: true });

// 14. 📚 WIKI
register('wiki', ['wikipedia'], async (ctx) => {
    const { sock, from, msg, args } = ctx;
    if (!args[0]) return await sock.sendMessage(from, { text: '📚 Usage: .wiki <topic>' }, { quoted: msg });
    const s = await sock.sendMessage(from, { text: '🔄 Searching...' }, { quoted: msg });
    try {
        const r = await safeJson(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(args.join(' '))}`);
        if (!r?.extract) throw new Error('නෑ!');
        const text = `📚 *${r.title}*\n\n${r.extract.slice(0, 1500)}\n\n> ${BOT_NAME}`;
        if (r.thumbnail?.source) {
            await sock.sendMessage(from, { image: { url: r.thumbnail.source }, caption: text }, { quoted: msg });
        } else {
            await sock.sendMessage(from, { text, edit: s.key });
        }
        await sock.sendMessage(from, { delete: s.key }).catch(() => {});
    } catch (e) {
        await sock.sendMessage(from, { text: `❌ ${e.message}`, edit: s.key });
    }
}, { public: true });

// 15. 👑 OWNER
register('owner', ['creator', 'dev'], async (ctx) => {
    const { sock, from, msg } = ctx;
    try {
        const vcard = 'BEGIN:VCARD\nVERSION:3.0\n' +
            `FN:${BOT_NAME} Owner\n` +
            `TEL;type=CELL;type=VOICE;waid=${OWNER_NUMBER}:+${OWNER_NUMBER}\n` +
            'END:VCARD';
        await sock.sendMessage(from, {
            contacts: { displayName: `${BOT_NAME} Owner`, contacts: [{ vcard }] }
        }, { quoted: msg });
    } catch {}
    await sock.sendMessage(from, { text: `👑 +${OWNER_NUMBER}\n🤖 ${BOT_NAME}\n\n> ${BOT_NAME}` }, { quoted: msg });
}, { public: true });

// 16. 📢 BROADCAST
register('broad', ['broadcast', 'bc'], async (ctx) => {
    const { sock, from, msg, args } = ctx;
    if (!isOwner(ctx)) return await sock.sendMessage(from, { text: '❌ Owner only!' }, { quoted: msg });
    if (!args[0]) return await sock.sendMessage(from, { text: '📢 Usage: .broad <msg>' }, { quoted: msg });
    const s = await sock.sendMessage(from, { text: '📢 Broadcasting...' }, { quoted: msg });
    try {
        const groups = await sock.groupFetchAllParticipating();
        const ids = Object.keys(groups);
        if (!ids.length) throw new Error('Groups නෑ!');
        let sent = 0, fail = 0;
        for (const id of ids) {
            try {
                await sock.sendMessage(id, { text: `📢 *BROADCAST*\n\n${args.join(' ')}\n\n> ${BOT_NAME}` });
                sent++;
                await new Promise(r => setTimeout(r, 1500));
            } catch { fail++; }
        }
        await sock.sendMessage(from, { text: `✅ ${sent}\n❌ ${fail}\n📊 ${ids.length}`, edit: s.key });
    } catch (e) {
        await sock.sendMessage(from, { text: `❌ ${e.message}`, edit: s.key });
    }
}, { public: false });

// 17. 💬 CHANNEL REACT
register('chreact', ['creact'], async (ctx) => {
    const { sock, from, msg, args } = ctx;
    if (!args[0]) return await sock.sendMessage(from, { text: '💬 Usage: .chreact <emoji> <url>' }, { quoted: msg });
    try {
        let emoji = args[0], serverId, messageId;
        if (args[1]) {
            const m = args[1].match(/channel\/([^/]+)\/(\d+)/);
            if (m) { serverId = m[1]; messageId = m[2]; }
        }
        if (!messageId) {
            const q = msg.message?.extendedTextMessage?.contextInfo;
            if (q?.stanzaId && q?.remoteJid?.includes('@newsletter')) {
                serverId = q.remoteJid.split('@')[0];
                messageId = q.stanzaId;
            }
        }
        if (!serverId || !messageId) throw new Error('Channel URL දෙන්න!');
        if (emoji.length > 10) emoji = '❤️';
        await sock.sendMessage(`${serverId}@newsletter`, {
            react: { text: emoji, key: { remoteJid: `${serverId}@newsletter`, id: messageId, fromMe: false } }
        });
        await sock.sendMessage(from, { text: `✅ ${emoji}` }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(from, { text: `❌ ${e.message}` }, { quoted: msg });
    }
}, { public: true });

// 18. ⚙️ SETTINGS
register('settings', ['config'], async (ctx) => {
    const { sock, from, msg } = ctx;
    const up = process.uptime();
    const h = Math.floor(up / 3600);
    const m = Math.floor((up % 3600) / 60);
    const s = Math.floor(up % 60);
    await sock.sendMessage(from, {
        text: `⚙️ *Settings*\n\n🤖 ${BOT_NAME}\n📱 +${OWNER_NUMBER}\n\n` +
              `⏱️ ${h}h ${m}m ${s}s\n` +
              `💾 RAM: ${getRAM()} MB / ${RAM_CONFIG.MAX_HEAP_MB} MB\n` +
              `🧹 Clean: ${RAM_CONFIG.CHECK_INTERVAL_MS / 1000}s\n` +
              `📦 ${process.version}\n⚡ PID: ${process.pid}\n\n> ${BOT_NAME}`
    }, { quoted: msg });
}, { public: true });

// 19. 🏓 PING
register('ping', ['speed'], async (ctx) => {
    const { sock, from, msg } = ctx;
    const t = Date.now();
    const s = await sock.sendMessage(from, { text: '🏓...' }, { quoted: msg });
    await sock.sendMessage(from, { text: `⚡ ${Date.now() - t}ms\n💾 ${getRAM()}MB\n\n> ${BOT_NAME}`, edit: s.key });
}, { public: true });

// 20. 🧹 GC
register('gc', ['ram', 'clearcache'], async (ctx) => {
    const { sock, from, msg } = ctx;
    if (!isOwner(ctx)) return await sock.sendMessage(from, { text: '❌ Owner only!' }, { quoted: msg });
    const before = getRAM();
    if (global.gc) global.gc();
    cleanTempFiles();
    const after = getRAM();
    await sock.sendMessage(from, {
        text: `🧹 *GC*\n\nBefore: ${before} MB\nAfter: ${after} MB\nSaved: ${(before - after).toFixed(2)} MB\n\n> ${BOT_NAME}`
    }, { quoted: msg });
}, { public: false });

// 21. 🔄 UPDATE
register('update', ['up'], async (ctx) => {
    const { sock, from, msg } = ctx;
    if (!isOwner(ctx)) return await sock.sendMessage(from, { text: '❌ Owner only!' }, { quoted: msg });
    const s = await sock.sendMessage(from, { text: '🔄 Updating...' }, { quoted: msg });
    exec('git pull', { timeout: 60000 }, async (err, stdout, stderr) => {
        if (err) return await sock.sendMessage(from, { text: `❌ ${stderr || err.message}`, edit: s.key });
        if (stdout.includes('Already up to date')) return await sock.sendMessage(from, { text: '✅ Up to date!', edit: s.key });
        await sock.sendMessage(from, { text: `✅ Updated!\n\n${stdout.slice(0, 500)}`, edit: s.key });
    });
}, { public: false });

// 22. 🔄 RESTART
register('restart', ['reboot', 'rs'], async (ctx) => {
    const { sock, from, msg } = ctx;
    if (!isOwner(ctx)) return await sock.sendMessage(from, { text: '❌ Owner only!' }, { quoted: msg });
    await sock.sendMessage(from, { text: '🔄 Restarting in 5s...' }, { quoted: msg });
    setTimeout(() => process.exit(0), 5000);
}, { public: false });

// 23. 📋 MENU
register('menu', ['help', 'commands'], async (ctx) => {
    const { sock, from, msg } = ctx;
    const text = `🔥 *${BOT_NAME} — Menu*\n\n` +
        `*📥 Downloads*\n.ytmp3 / .ytmp4\n.fb / .tt / .ig\n\n` +
        `*🤖 AI & Tools*\n.ai / .imagine / .weather\n.meme / .joke / .quote\n.lyrics / .translate / .wiki\n\n` +
        `*👑 Owner*\n.owner / .broad / .chreact\n.update / .restart / .gc\n\n` +
        `*ℹ️ Info*\n.settings / .ping / .menu\n\n` +
        `> ${BOT_NAME}`;
    await sock.sendMessage(from, { text }, { quoted: msg });
}, { public: true });

console.log(`\n✅ Total commands: ${COMMANDS.size}\n`);

// =======================================================
// 🤖 BAILEYS WHATSAPP CONNECTION
// =======================================================
const AUTH_DIR = './auth_info';
let sock = null;
let connectionState = 'disconnected';
let currentPairCode = null;
let currentPairUserId = null;
let qrCache = new Map();

const logger = pino({ level: 'silent' });

async function startSock() {
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    const { version } = await fetchLatestBaileysVersion();

    sock = makeWASocket({
        version,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys,
