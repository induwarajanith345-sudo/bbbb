// 🔥 HACKER PRO ULTRA — Simplified
require('dotenv').config();
const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const { exec } = require('child_process');
const pino = require('pino');
const QRCode = require('qrcode');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');

let settings = { ownerNumber: '94760601455', botName: 'Hacker Pro Md' };
try { settings = { ...settings, ...require('./settings.js') }; console.log('✅ settings loaded'); } catch {}
let OWNER_NUMBER = settings.ownerNumber;
const BOT_NAME = settings.botName;

process.on('uncaughtException', (e) => console.error('🛡️', e?.message || e));
process.on('unhandledRejection', (e) => console.error('🛡️', e?.message || e));

const MAX_RAM = 180; let memWarn = 0;
const getRAM = () => parseFloat((process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2));
setInterval(() => { const r = getRAM(); if (r > MAX_RAM) { memWarn++; if (global.gc) global.gc(); if (memWarn >= 3) setTimeout(() => process.exit(0), 2000); } else memWarn = 0; }, 60000);
console.log(`💾 [RAM START] ${getRAM()} MB`);

async function safeJson(url) { try { const c = new AbortController(); const t = setTimeout(() => c.abort(), 25000); const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: c.signal }); clearTimeout(t); if (!r.ok) return null; const txt = await r.text(); try { return JSON.parse(txt); } catch { return null; } } catch { return null; } }

const isOwner = (ctx) => ctx.msg?.key?.fromMe || (ctx.from || '').split('@')[0].split(':')[0] === OWNER_NUMBER;

const pickUrl = (o) => { if (!o) return null; for (const x of [o?.result?.download?.url, o?.result?.url, o?.result?.dl, o?.data?.url, o?.data?.dl, o?.download?.url, o?.url, o?.link]) { if (typeof x === 'string' && x.startsWith('http')) return x; if (x?.url && typeof x.url === 'string') return x.url; } return null; };

const ytdlp = (url, mode = 'video') => new Promise((res) => { const fmt = mode === 'audio' ? 'bestaudio[ext=m4a]/bestaudio/best' : 'bv*[ext=mp4]+ba[ext=m4a]/b'; exec(`yt-dlp -g -f "${fmt}" --no-playlist --no-warnings "${url}"`, { timeout: 90000, maxBuffer: 5e6 }, (e, out) => { if (e || !out) return res(null); res(out.split('\n').map(s => s.trim()).find(s => s.startsWith('http')) || null); }); });

async function ytSearch(q) { for (const a of [`https://api.vreden.my.id/api/ytsearch?query=${encodeURIComponent(q)}`, `https://api.zenkey.my.id/search/youtube?q=${encodeURIComponent(q)}`]) { const r = await safeJson(a); const it = r?.result?.[0] || r?.data?.[0]; if (it) { const url = it.url || it.link || (it.videoId ? `https://youtu.be/${it.videoId}` : null); if (url) return { url, title: it.title || 'media' }; } } return null; }

async function ytDownload(url, mode) { const apis = mode === 'audio' ? [`https://api.vreden.my.id/api/ytmp3?url=${encodeURIComponent(url)}`, `https://api.zenkey.my.id/download/ytmp3?url=${encodeURIComponent(url)}`] : [`https://api.vreden.my.id/api/ytmp4?url=${encodeURIComponent(url)}`, `https://api.zenkey.my.id/download/ytmp4?url=${encodeURIComponent(url)}`]; for (const a of apis) { const r = await safeJson(a); const u = pickUrl(r); if (u) return u; } return await ytdlp(url, mode); }

const COMMANDS = new Map(); const ALIASES = new Map();
function register(name, aliases, handler, opts = {}) { COMMANDS.set(name, { handler, opts }); (aliases || []).forEach(a => ALIASES.set(a, name)); }
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

register('owner', ['creator'], async (c) => { const { sock, from, msg } = c; try { const vcard = `BEGIN:VCARD\nVERSION:3.0\nFN:${BOT_NAME} Owner\nTEL;type=CELL;waid=${OWNER_NUMBER}:+${OWNER_NUMBER}\nEND:VCARD`; await sock.sendMessage(from, { contacts: { displayName: `${BOT_NAME} Owner`, contacts: [{ vcard }] } }, { quoted: msg }); } catch {} await sock.sendMessage(from, { text: `👑 +${OWNER_NUMBER}` }, { quoted: msg }); }, { public: true });

register('ping', ['speed'], async (c) => { const { sock, from, msg } = c; const t = Date.now(); const s = await sock.sendMessage(from, { text: '🏓...' }, { quoted: msg }); await sock.sendMessage(from, { text: `⚡ ${Date.now() - t}ms\n💾 ${getRAM()}MB`, edit: s.key }); }, { public: true });

register('settings', ['config'], async (c) => { const { sock, from, msg } = c; const up = process.uptime(); await sock.sendMessage(from, { text: `⚙️ ${BOT_NAME}\n📱 +${OWNER_NUMBER}\n⏱️ ${Math.floor(up / 3600)}h ${Math.floor(up % 3600 / 60)}m\n💾 ${getRAM()} MB` }, { quoted: msg }); }, { public: true });

register('gc', ['ram'], async (c) => { const { sock, from, msg } = c; if (!isOwner(c)) return sock.sendMessage(from, { text: '❌ Owner only!' }, { quoted: msg }); const b = getRAM(); if (global.gc) global.gc(); await sock.sendMessage(from, { text: `🧹 ${b} → ${getRAM()} MB` }, { quoted: msg }); }, { public: false });

register('update', ['up'], async (c) => { const { sock, from, msg } = c; if (!isOwner(c)) return sock.sendMessage(from, { text: '❌ Owner only!' }, { quoted: msg }); const s = await sock.sendMessage(from, { text: '🔄...' }, { quoted: msg }); exec('git pull', { timeout: 60000 }, async (e, out, err) => { if (e) return sock.sendMessage(from, { text: `❌ ${err || e.message}`, edit: s.key }); if (out.includes('Already up to date')) return sock.sendMessage(from, { text: '✅ Up to date!', edit: s.key }); await sock.sendMessage(from, { text: `✅ ${out.slice(0, 500)}`, edit: s.key }); }); }, { public: false });

register('restart', ['rs'], async (c) => { const { sock, from, msg } = c; if (!isOwner(c)) return sock.sendMessage(from, { text: '❌ Owner only!' }, { quoted: msg }); await sock.sendMessage(from, { text: '🔄 Restarting in 5s...' }, { quoted: msg }); setTimeout(() => process.exit(0), 5000); }, { public: false });

register('menu', ['help'], async (c) => { const { sock, from, msg } = c; await sock.sendMessage(from, { text: `🔥 *${BOT_NAME}*\n\n📥 .ytmp3 .ytmp4 .fb .tt .ig\n🤖 .ai .imagine .weather .meme .joke .quote .wiki .translate\n👑 .owner .update .restart .gc\nℹ️ .settings .ping .menu` }, { quoted: msg }); }, { public: true });
    
console.log(`✅ ${COMMANDS.size} commands registered\n`);

// ============ BAILEYS WHATSAPP ============
let sock = null;
let currentCode = null;
let currentUserId = null;
let qrStore = new Map();
let isSocketReady = false;
const logger = pino({ level: 'silent' });

async function startSock() {
    const { state, saveCreds } = await useMultiFileAuthState('./auth_info');
    const { version } = await fetchLatestBaileysVersion();
    sock = makeWASocket({ version, auth: state, logger, printQRInTerminal: false, browser: ['Hacker Pro', 'Chrome', '1.0'] });
    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (u) => {
        const { connection, lastDisconnect, qr } = u;
        if (connection === 'connecting' || qr) {
            isSocketReady = true;
            console.log('📡 Socket ready for pairing requests.');
        }
        if (qr) {
            for (const [uid, data] of qrStore) {
                if (data.status !== 'success') {
                    try { data.qr = await QRCode.toDataURL(qr); data.status = 'success'; } catch {}
                }
            }
        }
        if (connection === 'open') {
            console.log('✅ WhatsApp connected!');
            isSocketReady = true;
            for (const [uid, data] of qrStore) { data.status = 'connected'; }
        }
        if (connection === 'close') {
            isSocketReady = false;
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

// ============ EXPRESS WEB SERVER (INLINE HTML) ============
const app = express();
app.use(express.json());

// Inline HTML Dashboard
const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>HACKER PRO ULTRA</title>
<style>
*{margin:0;padding:0;box-sizing:border-box;font-family:'Segoe UI',sans-serif}
body{background:#060917;min-height:100vh;display:flex;align-items:center;justify-content:center;color:#fff;padding:20px}
.c{background:rgba(10,14,39,.7);backdrop-filter:blur(30px);border:1px solid rgba(255,255,255,.08);border-radius:24px;padding:40px;max-width:520px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.7)}
.h{text-align:center;margin-bottom:30px}
.logo{display:inline-flex;align-items:center;gap:12px;margin-bottom:8px}
.li{width:48px;height:48px;background:linear-gradient(135deg,#00d2ff,#3a7bd5);border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:24px;box-shadow:0 8px 24px rgba(0,210,255,.4)}
h1{font-size:26px;font-weight:800;background:linear-gradient(90deg,#00d2ff,#3a7bd5,#00ff88);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.sub{color:#6b7280;font-size:13px;margin-top:4px;letter-spacing:.5px;text-transform:uppercase}
.sb{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:14px;margin-bottom:20px}
.si{display:flex;align-items:center;gap:8px;font-size:13px}
.si .l{color:#6b7280;font-size:11px;text-transform:uppercase}
.si .v{color:#fff;font-weight:700;font-size:15px}
.si .v.on{color:#00ff88}
.si .v.off{color:#ff6b6b}
.pdot{width:8px;height:8px;border-radius:50%;background:#00ff88}
.tg{display:flex;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:4px;margin-bottom:20px;position:relative}
.tg .sl{position:absolute;top:4px;left:4px;width:calc(50% - 4px);height:calc(100% - 8px);background:linear-gradient(135deg,#00d2ff,#3a7bd5);border-radius:10px;transition:transform .4s cubic-bezier(.16,1,.3,1)}
.tg.qr .sl{transform:translateX(0)}
.tg.pair .sl{transform:translateX(100%)}
.tb{flex:1;padding:12px;background:transparent;border:none;color:#6b7280;font-size:14px;font-weight:600;cursor:pointer;position:relative;z-index:1;transition:color .3s}
.tb.active{color:#fff}
.il{display:flex;align-items:center;gap:6px;margin-bottom:8px;font-size:13px;color:#9ca3af;font-weight:500}
.iw{position:relative}
.iw input{width:100%;padding:16px 16px 16px 48px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:14px;color:#fff;font-size:16px;outline:none;transition:all .3s;font-family:monospace;letter-spacing:1px}
.iw input:focus{border-color:#00d2ff;box-shadow:0 0 0 4px rgba(0,210,255,.1)}
.ii{position:absolute;left:16px;top:50%;transform:translateY(-50%);font-size:18px;opacity:.5}
.gb{width:100%;padding:16px;margin-top:16px;background:linear-gradient(135deg,#00d2ff,#3a7bd5);border:none;border-radius:14px;color:#fff;font-size:16px;font-weight:700;cursor:pointer;transition:all .3s}
.gb:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 12px 32px rgba(0,210,255,.5)}
.gb:disabled{opacity:.6;cursor:not-allowed}
.cb{margin-top:24px;padding:24px;background:linear-gradient(135deg,rgba(0,210,255,.08),rgba(58,123,213,.08));border:2px solid rgba(0,210,255,.3);border-radius:16px;text-align:center;display:none}
.cb.show{display:block}
.cl{font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:12px}
.code{font-size:44px;font-weight:900;letter-spacing:10px;background:linear-gradient(90deg,#00d2ff,#00ff88);-webkit-background-clip:text;-webkit-text-fill-color:transparent;font-family:'Courier New',monospace}
.qrb{margin-top:24px;padding:24px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:16px;text-align:center;display:none}
.qrb.show{display:block}
.qrc{background:#fff;padding:16px;border-radius:12px;display:inline-block;margin:12px 0}
.qrc img{display:block;width:220px;height:220px}
.err{margin-top:20px;padding:14px 16px;background:rgba(255,107,107,.1);border:1px solid rgba(255,107,107,.3);border-radius:12px;color:#ff6b6b;font-size:14px;display:none}
.err.show{display:block}
.st{margin-top:24px;padding:20px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:14px}
.stt{font-size:12px;color:#00d2ff;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;font-weight:700}
.step{display:flex;align-items:flex-start;gap:12px;padding:8px 0;font-size:13px;color:#9ca3af;line-height:1.5}
.sn{width:22px;height:22px;background:linear-gradient(135deg,#00d2ff,#3a7bd5);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff;flex-shrink:0}
.step strong{color:#fff}
.ft{text-align:center;margin-top:24px;padding-top:20px;border-top:1px solid rgba(255,255,255,.08);font-size:11px;color:#4b5563;letter-spacing:1px;text-transform:uppercase;font-weight:600}
.ft span{background:linear-gradient(90deg,#00d2ff,#00ff88);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
</style>
</head>
<body>
<div class="c">
<div class="h">
<div class="logo"><div class="li">⚡</div><h1>HACKER PRO ULTRA</h1></div>
<p class="sub">WhatsApp Pairing System</p>
</div>
<div class="sb">
<div class="si"><div class="pdot"></div><div><div class="l">Status</div><div class="v on" id="botStatus">ONLINE</div></div></div>
</div>
<div class="tg pair" id="methodToggle">
<div class="sl"></div>
<button class="tb" data-method="qr" onclick="switchMethod('qr')">📱 QR</button>
<button class="tb active" data-method="pair" onclick="switchMethod('pair')">🔐 Pair</button>
</div>
<div id="pairSection">
<div class="il"><span>📱</span> Phone Number</div>
<div class="iw">
<span class="ii">📞</span>
<input type="tel" id="phone" placeholder="94760601455" maxlength="15">
</div>
<button class="gb" id="generateBtn" onclick="generateCode()">Generate Pair Code</button>
<div class="cb" id="codeBox">
<div class="cl">Your Pairing Code</div>
<div class="code" id="code">----</div>
<button class="gb" onclick="copyCode()" style="margin-top:16px">📋 Copy Code</button>
</div>
</div>
<div id="qrSection" style="display:none">
<div class="qrb show">
<div class="cl">Scan QR Code</div>
<div class="qrc"><img id="qrImg" src="" alt="QR"></div>
<div style="font-size:13px;color:#9ca3af;margin-top:8px">WhatsApp → Linked Devices → Link a Device</div>
<button class="gb" onclick="generateQR()" style="margin-top:16px">🔄 Refresh QR</button>
</div>
</div>
<div class="err" id="error"></div>
<div class="st">
<div class="stt">📌 How to Link</div>
<div class="step"><div class="sn">1</div><div>WhatsApp app එක open කරන්න</div></div>
<div class="step"><div class="sn">2</div><div><strong>Settings</strong> → <strong>Linked Devices</strong></div></div>
<div class="step"><div class="sn">3</div><div><strong>Link a Device</strong> tap කරන්න</div></div>
<div class="step"><div class="sn">4</div><div>Code type කරන්න / QR scan කරන්න</div></div>
</div>
<div class="ft">POWERED BY <span>HACKER PRO TEAM</span></div>
</div>
<script>
let qrPollInterval = null;
function switchMethod(m){
    const tg = document.getElementById("methodToggle");
    const ps = document.getElementById("pairSection");
    const qs = document.getElementById("qrSection");
    document.querySelectorAll(".tb").forEach(b => b.classList.toggle("active", b.dataset.method === m));
    tg.classList.remove("qr","pair");
    tg.classList.add(m);
    if (m === "qr") { ps.style.display = "none"; qs.style.display = "block"; generateQR(); }
    else { ps.style.display = "block"; qs.style.display = "none"; if (qrPollInterval) clearInterval(qrPollInterval); }
}
async function generateCode(){
    const phone = document.getElementById("phone").value.trim();
    const btn = document.getElementById("generateBtn");
    const cb = document.getElementById("codeBox");
    const er = document.getElementById("error");
    cb.classList.remove("show"); er.classList.remove("show");
    if (!phone || phone.length < 10) { er.textContent = "❌ Valid phone number එකක් දෙන්න!"; er.classList.add("show"); return; }
    btn.disabled = true; btn.textContent = "Generating...";
    try {
        const res = await fetch("/api/pair", { method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({phone}) });
        const data = await res.json();
        if (data.success) {
            document.getElementById("code").textContent = data.code;
            cb.classList.add("show");
        } else {
            er.textContent = "❌ " + (data.error || "Failed");
            er.classList.add("show");
        }
    } catch (e) { er.textContent = "❌ " + e.message; er.classList.add("show"); }
    btn.disabled = false; btn.textContent = "Generate Pair Code";
}
function copyCode(){
    const c = document.getElementById("code").textContent;
    if (c && c !== "----") navigator.clipboard.writeText(c).then(() => alert("✅ Copied: " + c));
}
async function generateQR(){
    if (qrPollInterval) clearInterval(qrPollInterval);
    try {
        const res = await fetch("/api/qr/request", { method: "POST" });
        const data = await res.json();
        if (!data.success) return;
        qrPollInterval = setInterval(async () => {
            try {
                const sr = await fetch("/api/qr/" + data.userId);
                const sd = await sr.json();
                if (sd.status === "success" && sd.qr) {
                    document.getElementById("qrImg").src = sd.qr;
                }
            } catch (e) {}
        }, 2000);
    } catch (e) {}
}
async function checkStatus(){
    try {
        const r = await fetch("/api/status");
        const d = await r.json();
        const el = document.getElementById("botStatus");
        el.textContent = d.online ? "ONLINE" : "OFFLINE";
        el.className = "v " + (d.online ? "on" : "off");
    } catch (e) {}
}
document.getElementById("phone").addEventListener("input", e => e.target.value = e.target.value.replace(/[^0-9]/g, ""));
checkStatus();
setInterval(checkStatus, 10000);
</script>
</body>
</html>`;

// Serve HTML
app.get('/', (req, res) => res.send(HTML));

// API - Status
app.get('/api/status', (req, res) => res.json({ online: !!sock?.user, activeBots: 1, totalUsers: 1 }));

// API - Pair Code
app.post('/api/pair', async (req, res) => {
    try {
        const { phone } = req.body;
        if (!phone) return res.json({ success: false, error: 'Phone required' });
        if (!sock) return res.json({ success: false, error: 'Bot not ready' });
        if (!isSocketReady) return res.json({ success: false, error: 'Socket not ready. Try again.' });
        const clean = phone.replace(/[^0-9]/g, '');
        currentUserId = Date.now().toString();
        const code = await sock.requestPairingCode(clean);
        currentCode = code;
        console.log(`🎟️ Pair code for ${clean}: ${code}`);
        res.json({ success: true, userId: currentUserId, code });
    } catch (e) {
        console.error('❌ Pair error:', e.message);
        res.json({ success: false, error: e.message });
    }
});

app.get('/api/pair/:userId', (req, res) => {
    if (currentCode && req.params.userId === currentUserId) res.json({ status: 'success', code: currentCode });
    else res.json({ status: 'pending' });
});

// API - QR
app.post('/api/qr/request', (req, res) => {
    const userId = Date.now().toString();
    qrStore.set(userId, { status: 'pending', qr: null });
    res.json({ success: true, userId });
});

app.get('/api/qr/:userId', (req, res) => {
    const data = qrStore.get(req.params.userId);
    res.json(data || { status: 'pending' });
});

// API - Logout
app.post('/api/logout', async (req, res) => {
    try { if (sock) await sock.logout(); res.json({ success: true }); }
    catch (e) { res.json({ success: false, error: e.message }); }
});

// ============ START ============
const PORT = process.env.PORT || 80;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🌐 Web: http://0.0.0.0:${PORT}`);
    console.log(`🌐 Dashboard ready!`);
});

startSock().catch((e) => console.error('❌ Sock error:', e.message));
