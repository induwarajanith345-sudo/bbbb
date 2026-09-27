require('dotenv').config();
const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const axios = require('axios');
const cheerio = require('cheerio');
const express = require('express');
const QRCode = require('qrcode');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, jidNormalizedUser, Browsers, delay } = require('@whiskeysockets/baileys');
const P = require('pino');

// ==========================================
// GLOBAL DATA
// ==========================================
const AUTH_DIR = './sessions';
const DATA_FILE = './data/bot_data.json';
fs.ensureDirSync(AUTH_DIR);
fs.ensureDirSync('./data');

let botData = {
    antilinkGroups: {},
    statusSettings: {},
    autoReacts: {},
    antiCall: {},
    isPublic: false,
    webUsers: [],
    owners: []
};

if (fs.existsSync(DATA_FILE)) {
    try { botData = fs.readJsonSync(DATA_FILE); } catch (e) {}
}
if (!botData.owners) botData.owners = [];

function saveBotData() {
    fs.writeJsonSync(DATA_FILE, botData);
}

const sessions = {};

// ==========================================
// HELPERS
// ==========================================
function isOwner(sender) {
    if (!sender) return false;
    const senderNum = sender.split('@')[0].split(':')[0];
    const mainOwner = process.env.OWNER_NUMBER || '94760601455';
    return senderNum === mainOwner || botData.owners.includes(senderNum);
}

async function checkAdmin(sock, chatId, senderId) {
    if (!chatId.endsWith('@g.us')) return true;
    try {
        const metadata = await sock.groupMetadata(chatId);
        const senderNumber = jidNormalizedUser(senderId).split('@')[0].split(':')[0];
        const participant = metadata.participants.find(p => {
            const pId = jidNormalizedUser(p.id).split('@')[0].split(':')[0];
            return pId === senderNumber;
        });
        return !!(participant && (participant.admin === 'admin' || participant.admin === 'superadmin'));
    } catch (e) { return false; }
}

// ==========================================
// CLOUDFLARE BYPASS
// ==========================================
const bypassCache = new Map();

async function fetchWithBypass(url) {
    if (bypassCache.has(url)) {
        const cached = bypassCache.get(url);
        if (Date.now() - cached.time < 5 * 60 * 1000) return cached.data;
    }

    try {
        const res = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive'
            },
            timeout: 30000
        });

        if (res.data.includes('cf-challenge') || res.data.includes('Just a moment')) {
            throw new Error('Cloudflare detected');
        }

        const result = { html: res.data, $: cheerio.load(res.data) };
        bypassCache.set(url, { data: result, time: Date.now() });
        
        if (bypassCache.size > 50) {
            const firstKey = bypassCache.keys().next().value;
            bypassCache.delete(firstKey);
        }
        
        return result;
    } catch (e) {
        const res = await axios.get(url, { timeout: 30000 });
        return { html: res.data, $: cheerio.load(res.data) };
    }
}

// ==========================================
// COMMAND SYSTEM
// ==========================================
const COMMANDS = {};

function register(name, aliases, handler, options = {}) {
    const cmd = {
        name,
        aliases: aliases || [],
        handler,
        ownerOnly: options.ownerOnly || false,
        public: options.public !== false,
        category: options.category || 'main'
    };
    COMMANDS[name] = cmd;
    cmd.aliases.forEach(a => COMMANDS[a] = cmd);
}

// ==========================================
// MAIN COMMANDS
// ==========================================
register('menu', ['help'], async (ctx) => {
    const { sock, from, msg } = ctx;
    const isBotOwner = isOwner(ctx.sender) || msg.key.fromMe;
    
    let menuText = `𝗛𝗔𝗖𝗞𝗘𝗥 𝗣𝗥𝗢 𝗨𝗟𝗧𝗥𝗔 𝗔𝗖𝗧𝗜𝗩𝗘\n` +
                   `╭━━━〔 𝗠𝗔𝗜𝗡 𝗠𝗘𝗡𝗨 〕━━━┈⊷\n` +
                   `┃ ⋄ .menu\n` +
                   `┃ ⋄ .ping\n` +
                   `┃ ⋄ .owner\n` +
                   `┃ ⋄ .dp\n` +
                   `┃ ⋄ .ai [question]\n` +
                   `╰━━━━━━━━━━━━━━━━━━┈⊷\n\n` +
                   `╭━━━〔 𝗠𝗢𝗩𝗜𝗘 〕━━━┈⊷\n` +
                   `┃ ⋄ .movie [name]\n` +
                   `┃ ⋄ .moviedl [url]\n` +
                   `┃ ⋄ .cinesubz [name]\n` +
                   `┃ ⋄ .animeclub2 [name]\n` +
                   `╰━━━━━━━━━━━━━━━━━━┈⊷\n\n` +
                   `╭━━━〔 𝗚𝗔𝗠𝗘𝗦 〕━━━┈⊷\n` +
                   `┃ ⋄ .fitgirl [game]\n` +
                   `┃ ⋄ .dodi [game]\n` +
                   `╰━━━━━━━━━━━━━━━━━━┈⊷\n\n` +
                   `╭━━━〔 𝗗𝗢𝗪𝗡𝗟𝗢𝗔𝗗 〕━━━┈⊷\n` +
                   `┃ ⋄ .tiktok [url]\n` +
                   `┃ ⋄ .fb [url]\n` +
                   `┃ ⋄ .ig [url]\n` +
                   `╰━━━━━━━━━━━━━━━━━━┈⊷\n\n` +
                   `╭━━━〔 𝗧𝗢𝗢𝗟𝗦 〕━━━┈⊷\n` +
                   `┃ ⋄ .status on/off\n` +
                   `╰━━━━━━━━━━━━━━━━━━┈⊷`;

    if (isBotOwner) {
        menuText += `\n\n╭━━━〔 👑 𝗢𝗪𝗡𝗘𝗥 〕━━━┈⊷\n` +
                   `┃ ⋄ .public / .private\n` +
                   `┃ ⋄ .addowner [num]\n` +
                   `┃ ⋄ .delowner [num]\n` +
                   `┃ ⋄ .broadcast [msg]\n` +
                   `┃ ⋄ .chnlreact [jid] [emoji]\n` +
                   `╰━━━━━━━━━━━━━━━━━━┈⊷`;
    }
    
    menuText += `\n\n> POWERED BY HACKER PRO TEAM`;

    await sock.sendMessage(from, {
        image: { url: 'https://res.cloudinary.com/dqlh378fb/image/upload/v1790485177/zanta_media_uploads/wfkglvlowl9jcmqpl5ji.jpg' },
        caption: menuText
    }, { quoted: msg });
}, { public: true, category: 'main' });

register('ping', ['speed'], async (ctx) => {
    const { sock, from, msg } = ctx;
    const s = Date.now();
    const sent = await sock.sendMessage(from, { text: '🏓 Pinging...' }, { quoted: msg });
    const ping = Date.now() - s;
    const mem = (process.memoryUsage().rss / 1024 / 1024).toFixed(1);
    await sock.sendMessage(from, {
        text: `⚡ *Pong!*\n📊 ${ping}ms\n💾 RAM: ${mem}MB\n🖥️ ${os.platform()}\n\n> POWERED BY HACKER PRO TEAM`,
        edit: sent.key
    });
}, { public: true, category: 'main' });

register('owner', [], async (ctx) => {
    const { sock, from, msg } = ctx;
    const ownerNum = process.env.OWNER_NUMBER || '94760601455';
    const vcard = `BEGIN:VCARD\nVERSION:3.0\nFN:Hacker Pro\nTEL;type=CELL;type=VOICE;waid=${ownerNum}:+${ownerNum}\nEND:VCARD`;
    await sock.sendMessage(from, {
        contacts: { displayName: 'Hacker Pro', contacts: [{ vcard }] }
    }, { quoted: msg });
}, { public: true, category: 'main' });

register('dp', ['profilepic'], async (ctx) => {
    const { sock, from, msg } = ctx;
    try {
        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
        const target = mentioned || msg.key.participant || from;
        const pp = await sock.profilePictureUrl(target, 'image').catch(() => null);
        if (!pp) return await sock.sendMessage(from, { text: '❌ No profile picture' }, { quoted: msg });
        await sock.sendMessage(from, { image: { url: pp }, caption: '✅ Profile Picture\n\n> POWERED BY HACKER PRO TEAM' }, { quoted: msg });
    } catch (e) {}
}, { public: true, category: 'tools' });

// ==========================================
// OWNER COMMANDS
// ==========================================
register('public', [], async (ctx) => {
    const { sock, from, msg } = ctx;
    botData.isPublic = true;
    saveBotData();
    await sock.sendMessage(from, { text: '✅ *PUBLIC* mode ON' }, { quoted: msg });
}, { ownerOnly: true });

register('private', [], async (ctx) => {
    const { sock, from, msg } = ctx;
    botData.isPublic = false;
    saveBotData();
    await sock.sendMessage(from, { text: '✅ *PRIVATE* mode ON' }, { quoted: msg });
}, { ownerOnly: true });

register('addowner', ['addown'], async (ctx) => {
    const { sock, from, msg, args } = ctx;
    if (!args[0]) return await sock.sendMessage(from, { text: '👑 Usage: .addowner <number>' }, { quoted: msg });
    const num = args[0].replace(/[^0-9]/g, '');
    if (botData.owners.includes(num)) return await sock.sendMessage(from, { text: '⚠️ Already owner' }, { quoted: msg });
    botData.owners.push(num);
    saveBotData();
    await sock.sendMessage(from, { text: `✅ Added: +${num}\n\n👑 Owners:\n${botData.owners.map((o,i)=>`${i+1}. +${o}`).join('\n')}` }, { quoted: msg });
}, { ownerOnly: true });

register('delowner', ['delown'], async (ctx) => {
    const { sock, from, msg, args } = ctx;
    if (!args[0]) return await sock.sendMessage(from, { text: '👑 Usage: .delowner <number>' }, { quoted: msg });
    const num = args[0].replace(/[^0-9]/g, '');
    const idx = botData.owners.indexOf(num);
    if (idx === -1) return await sock.sendMessage(from, { text: '⚠️ Not an owner' }, { quoted: msg });
    botData.owners.splice(idx, 1);
    saveBotData();
    await sock.sendMessage(from, { text: `✅ Removed: +${num}` }, { quoted: msg });
}, { ownerOnly: true });

register('broadcast', ['bc'], async (ctx) => {
    const { sock, from, msg, args } = ctx;
    if (!args.length) return await sock.sendMessage(from, { text: '📢 Usage: .broadcast <msg>' }, { quoted: msg });
    const message = args.join(" ");
    let sent = 0;
    for (const [userId, session] of Object.entries(sessions)) {
        if (session.isConnected && session.sock) {
            try {
                const botNumber = jidNormalizedUser(session.sock.user.id);
                await session.sock.sendMessage(botNumber, {
                    text: `📢 *FROM OWNER*\n\n${message}\n\n> POWERED BY HACKER PRO TEAM`
                });
                sent++;
            } catch (e) {}
        }
    }
    await sock.sendMessage(from, { text: `✅ Sent to ${sent} bots` }, { quoted: msg });
}, { ownerOnly: true });

register('chnlreact', ['creact'], async (ctx) => {
    const { sock, from, msg, args } = ctx;
    if (!args[0]) return await sock.sendMessage(from, { text: '📺 Usage: .chnlreact <jid> <emoji>' }, { quoted: msg });
    try {
        await sock.newsletterReactMessage(args[0], "latest", args[1] || "👍");
        await sock.sendMessage(from, { text: `✅ Reacted ${args[1] || "👍"}` }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(from, { text: `❌ ${e.message}` }, { quoted: msg });
    }
}, { ownerOnly: true });

// ==========================================
// AI COMMANDS
// ==========================================
register('ai', ['gpt', 'chat'], async (ctx) => {
    const { sock, from, msg, args } = ctx;
    if (!args.length) return await sock.sendMessage(from, { text: '🤖 Usage: .ai <question>' }, { quoted: msg });
    const status = await sock.sendMessage(from, { text: '🤖 Thinking...' }, { quoted: msg });

    try {
        const res = await axios.get('https://supunofc.site/api/ai/ai2', {
            params: { prompt: args.join(" "), model: 'deepseek', apikey: process.env.SUPUN_API_KEY },
            timeout: 60000
        });
        let answer = res.data.response || res.data.result || res.data.message || JSON.stringify(res.data);
        if (String(answer).length > 4000) answer = String(answer).slice(0, 4000) + '...';
        await sock.sendMessage(from, { text: `🤖 *AI:*\n\n${answer}\n\n> POWERED BY HACKER PRO TEAM`, edit: status.key });
    } catch (e) {
        await sock.sendMessage(from, { text: `❌ ${e.message}`, edit: status.key });
    }
}, { public: true, category: 'ai' });

// ==========================================
// MOVIE COMMANDS
// ==========================================
register('movie', ['film'], async (ctx) => {
    const { sock, from, msg, args } = ctx;
    if (!args.length) return await sock.sendMessage(from, { text: '🎬 Usage: .movie <name>' }, { quoted: msg });
    const query = args.join(" ");
    const status = await sock.sendMessage(from, { text: `🔍 Searching: ${query}...` }, { quoted: msg });

    try {
        const res = await axios.get('https://supunofc.site/api/movie/zoom/search', {
            params: { q: query, apikey: process.env.SUPUN_API_KEY }, timeout: 30000
        });
        const results = res.data.result || [];
        if (!results.length) return await sock.sendMessage(from, { text: '❌ හම්බුනේ නෑ!', edit: status.key });

        let text = `🎬 *Movie Results: ${query}*\n\n`;
        results.slice(0, 5).forEach((r, i) => {
            text += `*${i + 1}.* ${r.cleanTitle || r.title}\n🔗 ${r.link}\n\n`;
        });
        text += `> Use .moviedl <link>\n> POWERED BY HACKER PRO TEAM`;
        await sock.sendMessage(from, { image: { url: results[0].thumbnail }, caption: text, edit: status.key });
    } catch (e) {
        await sock.sendMessage(from, { text: `❌ ${e.message}`, edit: status.key });
    }
}, { public: true, category: 'movie' });

register('moviedl', ['moviedownload'], async (ctx) => {
    const { sock, from, msg, args } = ctx;
    if (!args[0]) return await sock.sendMessage(from, { text: '🎬 Usage: .moviedl <link>' }, { quoted: msg });
    const status = await sock.sendMessage(from, { text: '⬇️ Getting links...' }, { quoted: msg });

    try {
        const res = await axios.get('https://supunofc.site/api/movie/zoom/details', {
            params: { url: args[0], apikey: process.env.SUPUN_API_KEY }, timeout: 30000
        });
        const r = res.data.result;
        if (!r) return await sock.sendMessage(from, { text: '❌ හම්බුනේ නෑ!', edit: status.key });

        let text = `🎬 *${r.title}*\n\n`;
        if (r.synopsis) {
            const syn = Array.isArray(r.synopsis) ? r.synopsis.join("\n").slice(0, 200) : String(r.synopsis).slice(0, 200);
            text += `📖 ${syn}...\n\n`;
        }
        if (r.downloadLinks?.length) {
            text += `📥 *Links (${r.downloadLinks.length}):*\n\n`;
            r.downloadLinks.slice(0, 15).forEach((dl, i) => {
                text += `*${i + 1}.* ${dl.title}\n🔗 ${dl.url}\n\n`;
            });
        }
        text += `> POWERED BY HACKER PRO TEAM`;
        await sock.sendMessage(from, { image: { url: r.poster }, caption: text, edit: status.key });
    } catch (e) {
        await sock.sendMessage(from, { text: `❌ ${e.message}`, edit: status.key });
    }
}, { public: true, category: 'movie' });

register('cinesubz', ['csub'], async (ctx) => {
    const { sock, from, msg, args } = ctx;
    if (!args.length) return await sock.sendMessage(from, { text: '🎬 Usage: .cinesubz <movie>' }, { quoted: msg });
    const query = args.join(" ");
    const status = await sock.sendMessage(from, { text: `🔍 Searching CineSubz: ${query}...` }, { quoted: msg });

    try {
        const { $ } = await fetchWithBypass(`https://cinesubz.co/?s=${encodeURIComponent(query)}`);
        const results = [];
        $('article, .post').each((i, el) => {
            if (i >= 5) return;
            const title = $(el).find('h2.entry-title a, h2 a').first().text().trim();
            const link = $(el).find('h2.entry-title a, h2 a').first().attr('href');
            const img = $(el).find('img').attr('src') || $(el).find('img').attr('data-src');
            if (title && link) results.push({ title, link, img });
        });

        if (!results.length) return await sock.sendMessage(from, { text: '❌ හම්බුනේ නෑ!', edit: status.key });

        let text = `🎬 *CineSubz Results*\n🔍 ${query}\n\n`;
        results.forEach((r, i) => text += `*${i + 1}.* ${r.title}\n🔗 ${r.link}\n\n`);
        text += `> POWERED BY HACKER PRO TEAM`;

        await sock.sendMessage(from, {
            image: { url: results[0].img || 'https://res.cloudinary.com/dqlh378fb/image/upload/v1790485177/zanta_media_uploads/wfkglvlowl9jcmqpl5ji.jpg' },
            caption: text, edit: status.key
        });
    } catch (e) {
        await sock.sendMessage(from, { text: `❌ ${e.message}`, edit: status.key });
    }
}, { public: true, category: 'movie' });

register('animeclub2', ['aclub2', 'anime2'], async (ctx) => {
    const { sock, from, msg, args } = ctx;
    if (!args.length) return await sock.sendMessage(from, { text: '🎌 Usage: .animeclub2 <anime>' }, { quoted: msg });
    const query = args.join(" ");
    const status = await sock.sendMessage(from, { text: `🔍 Searching AnimeClub2: ${query}...` }, { quoted: msg });

    try {
        const { $ } = await fetchWithBypass(`https://animeclub2.com/?s=${encodeURIComponent(query)}`);
        const results = [];
        $('article, .post, .item, .tvshows').each((i, el) => {
            if (i >= 5) return;
            const title = $(el).find('h2 a, h3 a, .entry-title a, .title a').first().text().trim();
            const link = $(el).find('h2 a, h3 a, .entry-title a, .title a').first().attr('href');
            const img = $(el).find('img').attr('src') || $(el).find('img').attr('data-src');
            if (title && link) results.push({ title, link, img });
        });

        if (!results.length) return await sock.sendMessage(from, { text: '❌ හම්බුනේ නෑ!', edit: status.key });

        let text = `🎌 *AnimeClub2 Results*\n🔍 ${query}\n\n`;
        for (const r of results) {
            text += `📺 *${r.title}*\n🔗 ${r.link}\n\n`;
            if (r.link.includes('/tvshows/') || r.link.includes('/seasons/')) {
                try {
                    const { $: showPage } = await fetchWithBypass(r.link);
                    const eps = [];
                    showPage("a[href*='/episode'], .episode a, .episodes a").each((i, el) => {
                        const t = showPage(el).text().trim();
                        const l = showPage(el).attr('href');
                        if (t && l) eps.push({ t, l });
                    });
                    if (eps.length) {
                        text += `📥 *Episodes (${eps.length}):*\n`;
                        eps.slice(0, 8).forEach((e, i) => text += `  ${i + 1}. ${e.t}\n     🔗 ${e.l}\n`);
                        if (eps.length > 8) text += `  ... තව ${eps.length - 8}\n`;
                    }
                } catch (e) {}
            }
            text += `━━━━━━━━━━━━━\n\n`;
        }
        text += `> POWERED BY HACKER PRO TEAM`;

        await sock.sendMessage(from, {
            image: { url: results[0].img || 'https://res.cloudinary.com/dqlh378fb/image/upload/v1790485177/zanta_media_uploads/wfkglvlowl9jcmqpl5ji.jpg' },
            caption: text, edit: status.key
        });
    } catch (e) {
        await sock.sendMessage(from, { text: `❌ ${e.message}`, edit: status.key });
    }
}, { public: true, category: 'anime' });

// ==========================================
// GAME COMMANDS
// ==========================================
register('fitgirl', ['fg'], async (ctx) => {
    const { sock, from, msg, args } = ctx;
    if (!args.length) return await sock.sendMessage(from, { text: '🎮 Usage: .fitgirl <game>' }, { quoted: msg });
    const query = args.join(" ");
    const status = await sock.sendMessage(from, { text: `🎮 Searching: ${query}...` }, { quoted: msg });

    try {
        const { $ } = await fetchWithBypass(`https://fitgirl-repacks.site/?s=${encodeURIComponent(query)}`);
        const results = [];
        $('article, .post').each((i, el) => {
            if (i >= 5) return;
            const title = $(el).find('h1.entry-title a, h2.entry-title a, h2 a').first().text().trim();
            const link = $(el).find('h1.entry-title a, h2.entry-title a, h2 a').first().attr('href');
            if (title && link) results.push({ title, link });
        });
        if (!results.length) return await sock.sendMessage(from, { text: '❌ හම්බුනේ නෑ!', edit: status.key });

        let text = `🎮 *FitGirl Repacks*\n🔍 ${query}\n\n`;
        results.forEach((r, i) => text += `*${i + 1}.* ${r.title}\n🔗 ${r.link}\n\n`);
        text += `> POWERED BY HACKER PRO TEAM`;
        await sock.sendMessage(from, { text, edit: status.key });
    } catch (e) {
        await sock.sendMessage(from, { text: `❌ ${e.message}`, edit: status.key });
    }
}, { public: true, category: 'game' });

register('dodi', [], async (ctx) => {
    const { sock, from, msg, args } = ctx;
    if (!args.length) return await sock.sendMessage(from, { text: '🎮 Usage: .dodi <game>' }, { quoted: msg });
    const query = args.join(" ");
    const status = await sock.sendMessage(from, { text: `🎮 Searching: ${query}...` }, { quoted: msg });

    try {
        const { $ } = await fetchWithBypass(`https://dodi-repacks.site/?s=${encodeURIComponent(query)}`);
        const results = [];
        $('article, .post').each((i, el) => {
            if (i >= 5) return;
            const title = $(el).find('h2.entry-title a, h1.entry-title a, h2 a').first().text().trim();
            const link = $(el).find('h2.entry-title a, h1.entry-title a, h2 a').first().attr('href');
            if (title && link) results.push({ title, link });
        });
        if (!results.length) return await sock.sendMessage(from, { text: '❌ හම්බුනේ නෑ!', edit: status.key });

        let text = `🎮 *DODI Repacks*\n🔍 ${query}\n\n`;
        results.forEach((r, i) => text += `*${i + 1}.* ${r.title}\n🔗 ${r.link}\n\n`);
        text += `> POWERED BY HACKER PRO TEAM`;
        await sock.sendMessage(from, { text, edit: status.key });
    } catch (e) {
        await sock.sendMessage(from, { text: `❌ ${e.message}`, edit: status.key });
    }
}, { public: true, category: 'game' });

// ==========================================
// DOWNLOAD COMMANDS
// ==========================================
register('tiktok', ['tt'], async (ctx) => {
    const { sock, from, msg, args } = ctx;
    if (!args[0]) return await sock.sendMessage(from, { text: '📥 Usage: .tiktok <url>' }, { quoted: msg });
    const status = await sock.sendMessage(from, { text: '⬇️ Downloading...' }, { quoted: msg });

    try {
        const res = await axios.get(`https://www.tikwm.com/api/?url=${args[0]}`, { timeout: 30000 });
        const d = res.data.data;
        if (!d) return await sock.sendMessage(from, { text: '❌ Failed!', edit: status.key });
        await sock.sendMessage(from, {
            video: { url: d.play },
            caption: `🎵 *TikTok*\n👤 ${d.author?.nickname || ''}\n\n> POWERED BY HACKER PRO TEAM`
        }, { quoted: msg });
        await sock.sendMessage(from, { delete: status.key }).catch(() => {});
    } catch (e) {
        await sock.sendMessage(from, { text: `❌ ${e.message}`, edit: status.key });
    }
}, { public: true, category: 'download' });

register('fb', ['facebook'], async (ctx) => {
    const { sock, from, msg, args } = ctx;
    if (!args[0]) return await sock.sendMessage(from, { text: '📥 Usage: .fb <url>' }, { quoted: msg });
    const status = await sock.sendMessage(from, { text: '⬇️ Downloading...' }, { quoted: msg });

    try {
        const res = await axios.get(`https://api.akuari.my.id/downloader/fb?link=${args[0]}`, { timeout: 30000 });
        const dl = res.data?.result?.url || res.data?.result?.hd;
        if (!dl) return await sock.sendMessage(from, { text: '❌ Failed!', edit: status.key });
        await sock.sendMessage(from, {
            video: { url: dl },
            caption: `📘 Facebook Video\n\n> POWERED BY HACKER PRO TEAM`
        }, { quoted: msg });
        await sock.sendMessage(from, { delete: status.key }).catch(() => {});
    } catch (e) {
        await sock.sendMessage(from, { text: `❌ ${e.message}`, edit: status.key });
    }
}, { public: true, category: 'download' });

register('ig', ['instagram'], async (ctx) => {
    const { sock, from, msg, args } = ctx;
    if (!args[0]) return await sock.sendMessage(from, { text: '📥 Usage: .ig <url>' }, { quoted: msg });
    const status = await sock.sendMessage(from, { text: '⬇️ Downloading...' }, { quoted: msg });

    try {
        const res = await axios.get(`https://api.instagram.com/oembed/?url=${args[0]}`, { timeout: 30000 });
        await sock.sendMessage(from, {
            image: { url: res.data.thumbnail_url },
            caption: `📸 @${res.data.author_name}\n\n> POWERED BY HACKER PRO TEAM`
        }, { quoted: msg });
        await sock.sendMessage(from, { delete: status.key }).catch(() => {});
    } catch (e) {
        await sock.sendMessage(from, { text: `❌ ${e.message}`, edit: status.key });
    }
}, { public: true, category: 'download' });

// ==========================================
// TOOLS COMMANDS
// ==========================================
register('status', [], async (ctx) => {
    const { sock, from, msg, args, userId } = ctx;
    if (!botData.statusSettings[userId]) {
        botData.statusSettings[userId] = { autoStatus: false, autoSeen: false, autoLike: false };
    }
    const opt = args[0]?.toLowerCase();
    if (opt === 'on') {
        botData.statusSettings[userId] = { autoStatus: true, autoSeen: true, autoLike: true };
        saveBotData();
        await sock.sendMessage(from, { text: '✅ Status ON' }, { quoted: msg });
    } else if (opt === 'off') {
        botData.statusSettings[userId] = { autoStatus: false, autoSeen: false, autoLike: false };
        saveBotData();
        await sock.sendMessage(from, { text: '❌ Status OFF' }, { quoted: msg });
    } else {
        await sock.sendMessage(from, { text: '📊 Usage: .status on/off' }, { quoted: msg });
    }
}, { public: true, category: 'tools' });

// ==========================================
// WEB SERVER
// ==========================================
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'web', 'public')));

app.post("/api/pair", async (req, res) => {
    try {
        const { phone } = req.body;
        if (!phone || phone.length < 10) return res.status(400).json({ error: "Invalid phone" });
        const userId = "web_" + Date.now();
        if (global.generatePairCode) global.generatePairCode(userId, phone);
        res.json({ success: true, userId, phone });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/api/pair/:userId", (req, res) => {
    const session = sessions[req.params.userId];
    if (!session) return res.json({ status: "not_found" });
    if (session.pairCode) return res.json({ status: "success", code: session.pairCode });
    res.json({ status: "pending" });
});

app.post("/api/qr/request", async (req, res) => {
    try {
        const userId = "qr_" + Date.now();
        if (global.generateQRCode) global.generateQRCode(userId);
        res.json({ success: true, userId });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/api/qr/:userId", (req, res) => {
    const session = sessions[req.params.userId];
    if (!session) return res.json({ status: "not_found" });
    if (session.qrCode) return res.json({ status: "success", qr: session.qrCode });
    if (session.isConnected) return res.json({ status: "connected" });
    res.json({ status: "pending" });
});

app.get("/api/status", (req, res) => {
    const activeBots = Object.values(sessions).filter(s => s.isConnected).length;
    res.json({
        botName: "HACKER PRO ULTRA",
        online: true,
        activeBots,
        totalUsers: (botData.webUsers || []).length
    });
});

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, 'web', 'public', 'index.html'));
});

app.listen(PORT, () => console.log(`🌐 Web: http://localhost:${PORT}`));

// ==========================================
// PAIR / QR GENERATORS
// ==========================================
global.generatePairCode = async (userId, phoneNumber) => {
    try {
        if (sessions[userId]?.sock) {
            try { sessions[userId].sock.logout(); } catch (e) {}
            try { sessions[userId].sock.end(); } catch (e) {}
            delete sessions[userId];
        }
        const authPath = path.join(AUTH_DIR, userId);
        if (fs.existsSync(authPath)) { try { fs.removeSync(authPath); } catch (e) {} }

        sessions[userId] = new BotSession(userId);
        sessions[userId].phoneNumber = phoneNumber;
        if (!botData.webUsers.includes(phoneNumber)) {
            botData.webUsers.push(phoneNumber);
            saveBotData();
        }
        await sessions[userId].initialize(phoneNumber, false);
    } catch (e) { console.error("Pair error:", e.message); }
};

global.generateQRCode = async (userId) => {
    try {
        if (sessions[userId]?.sock) {
            try { sessions[userId].sock.logout(); } catch (e) {}
            try { sessions[userId].sock.end(); } catch (e) {}
            delete sessions[userId];
        }
        const authPath = path.join(AUTH_DIR, userId);
        if (fs.existsSync(authPath)) { try { fs.removeSync(authPath); } catch (e) {} }

        sessions[userId] = new BotSession(userId);
        await sessions[userId].initialize(null, true);
    } catch (e) { console.error("QR error:", e.message); }
};

// ==========================================
// BOT SESSION CLASS
// ==========================================
class BotSession {
    constructor(userId) {
        this.userId = userId;
        this.sock = null;
        this.isConnected = false;
        this.authPath = path.join(AUTH_DIR, userId);
        this.isInitializing = false;
        this.onlineMessageSent = false;
        this.pairCode = null;
        this.qrCode = null;
        this.phoneNumber = null;
    }

    sendLog(msg) { console.log(`[${this.userId}] ${msg}`); }

    async initialize(pairingNumber = null, qrMode = false) {
        if (this.isInitializing) return;
        this.isInitializing = true;

        try {
            const { version } = await fetchLatestBaileysVersion();
            const { state, saveCreds } = await useMultiFileAuthState(this.authPath);

            this.sock = makeWASocket({
                version,
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, P({ level: 'silent' })),
                },
                generateHighQualityLinkPreview: false,
                getMessage: async () => ({ conversation: 'Hello' }),
                printQRInTerminal: false,
                logger: P({ level: 'fatal' }),
                browser: Browsers.ubuntu('Chrome'),
                syncFullHistory: false,
                markOnlineOnConnect: true,
                keepAliveIntervalMs: 60000,
                defaultQueryTimeoutMs: 60000,
                emitOwnEvents: false
            });

            if (pairingNumber && !state.creds.registered) {
                await delay(3000);
                try {
                    let code = await this.sock.requestPairingCode(pairingNumber);
                    code = code?.match(/.{1,4}/g)?.join("-") || code;
                    this.pairCode = code;
                    this.sendLog(`Pair code: ${code}`);
                } catch (e) {
                    this.sendLog(`Pair failed: ${e.message}`);
                }
            }

            this.sock.ev.on('creds.update', saveCreds);

            this.sock.ev.on('group-participants.update', async (anu) => {
                try {
                    if (anu.action === 'add') {
                        const metadata = await this.sock.groupMetadata(anu.id);
                        for (const p of anu.participants) {
                            const user = (typeof p === 'string' ? p : p.id).split('@')[0];
                            await this.sock.sendMessage(anu.id, {
                                text: `╭╼━≪•𝙽𝙴𝚆 𝙼𝙴𝙼𝙱𝙴𝚁•≫━╾╮\n┃𝚆𝙴𝙻𝙲𝙾𝙼𝙴: @${user} 👋\n┃Member count: #${metadata.participants.length}\n╰━━━━━━━━━━━━━━━╯\n\n*@${user}* Welcome to *${metadata.subject}*!\n\n> POWERED BY HACKER PRO TEAM`,
                                mentions: [typeof p === 'string' ? p : p.id]
                            }).catch(() => {});
                        }
                    }
                } catch (e) {}
            });

            this.sock.ev.on('messages.upsert', async (chatUpdate) => {
                await this.handleMessage(chatUpdate);
            });

            this.sock.ev.on('call', async (calls) => {
                if (botData.antiCall?.[this.userId]) {
                    for (const call of calls) {
                        if (call.status === 'offer') {
                            try { await this.sock.rejectCall(call.id, call.from).catch(() => {}); } catch (e) {}
                        }
                    }
                }
            });

            this.sock.ev.on('connection.update', async (update) => {
                const { connection, lastDisconnect, qr } = update;

                if (qr && qrMode) {
                    try {
                        this.qrCode = await QRCode.toDataURL(qr);
                        this.sendLog('QR Code generated');
                    } catch (e) { this.qrCode = qr; }
                }

                if (connection === 'close') {
                    const code = (lastDisconnect.error)?.output?.statusCode;
                    this.isConnected = false;
                    this.isInitializing = false;
                    if (code !== DisconnectReason.loggedOut) {
                        let dt = code === DisconnectReason.restartRequired ? 1000 : 5000;
                        if (code === 440) dt = 30000;
                        setTimeout(() => this.initialize(), dt);
                    }
                } else if (connection === 'open') {
                    this.isConnected = true;
                    this.isInitializing = false;
                    this.qrCode = null;
                    const botNumber = jidNormalizedUser(this.sock.user.id);
                    if (!this.onlineMessageSent) {
                        this.onlineMessageSent = true;
                        await this.sock.sendMessage(botNumber, {
                            text: `HACKER PRO ULTRA IS ONLINE ✅\n> *USE .MENU*\n> POWERED BY HACKER PRO TEAM`
                        }).catch(() => {});
                    }
                }
            });

        } catch (err) {
            this.isInitializing = false;
            this.sendLog(`Init error: ${err.message}`);
            setTimeout(() => this.initialize(), 10000);
        }
    }

    async handleMessage(chatUpdate) {
        try {
            const msg = chatUpdate.messages[0];
            if (!msg.message) return;
            if (msg.key.id.startsWith('BAE5') && msg.key.fromMe) return;

            const from = msg.key.remoteJid;
            const isGroup = from.endsWith('@g.us');
            const sender = isGroup ? msg.key.participant : from;

            const content = msg.message?.ephemeralMessage?.message || msg.message?.viewOnceMessage?.message || msg.message?.viewOnceMessageV2?.message || msg.message;
            if (!content) return;

            const body = (content.conversation ||
                          content.extendedTextMessage?.text ||
                          content.imageMessage?.caption ||
                          content.videoMessage?.caption || '').trim();

            if (!body) return;

            // Status
            if (from === 'status@broadcast') {
                const settings = botData.statusSettings[this.userId];
                if (settings?.autoSeen) await this.sock.readMessages([msg.key]).catch(() => {});
                if (settings?.autoLike) {
                    await this.sock.sendMessage('status@broadcast', {
                        react: { text: '❤️', key: msg.key }
                    }, { statusJidList: [msg.key.participant] }).catch(() => {});
                }
                return;
            }

            // Antilink
            if (isGroup && botData.antilinkGroups[from] && !msg.key.fromMe) {
                if (/chat\.whatsapp\.com\/|https?:\/\/\S+/gi.test(body)) {
                    const isAdmin = await checkAdmin(this.sock, from, sender);
                    if (!isAdmin) await this.sock.sendMessage(from, { delete: msg.key }).catch(() => {});
                }
            }

            // Commands
            if (!body.startsWith('.')) return;

            const args = body.slice(1).trim().split(/ +/);
            const cmdName = args.shift().toLowerCase();
            const command = COMMANDS[cmdName];
            
            if (!command) return;

            const isBotOwner = isOwner(sender) || msg.key.fromMe;

            if (command.ownerOnly && !isBotOwner) {
                return await this.sock.sendMessage(from, { text: '👑 Owner only' }, { quoted: msg });
            }
            if (!isBotOwner && !botData.isPublic) return;
            if (!isBotOwner && !command.public) return;

            await this.sock.sendMessage(from, { react: { text: '⏳', key: msg.key } }).catch(() => {});

            const ctx = {
                sock: this.sock, from, msg, sender, isGroup, args, body,
                userId: this.userId, botData, saveBotData, isOwner: isBotOwner
            };

            try {
                await command.handler(ctx);
                await this.sock.sendMessage(from, { react: { text: '✅', key: msg.key } }).catch(() => {});
            } catch (cmdError) {
                console.error(`[${cmdName}] Error:`, cmdError.message);
                await this.sock.sendMessage(from, { text: `❌ Error: ${cmdError.message}` }, { quoted: msg }).catch(() => {});
            }

        } catch (e) {
            console.error('Message Error:', e.message);
        }
    }
}

// ==========================================
// LOAD SESSIONS
// ==========================================
async function loadExistingSessions() {
    try {
        const dirs = await fs.readdir(AUTH_DIR);
        for (const userId of dirs) {
            const authPath = path.join(AUTH_DIR, userId);
            if (fs.statSync(authPath).isDirectory()) {
                const creds = path.join(authPath, 'creds.json');
                if (fs.existsSync(creds) && !sessions[userId]) {
                    sessions[userId] = new BotSession(userId);
                    sessions[userId].initialize().catch(() => {});
                }
            }
        }
    } catch (e) {}
}

// ==========================================
// NANO ULTRA
// ==========================================
function startNanoUltra() {
    setInterval(() => { if (global.gc) global.gc(); }, 15000);
    setInterval(async () => {
        const dirs = ['./tmp', './temp'];
        const now = Date.now();
        for (const dir of dirs) {
            if (!fs.existsSync(dir)) continue;
            try {
                for (const file of fs.readdirSync(dir)) {
                    const fp = `${dir}/${file}`;
                    try {
                        const stat = fs.statSync(fp);
                        if (now - stat.mtimeMs > 5 * 60 * 1000) fs.removeSync(fp);
                    } catch (e) {}
                }
            } catch (e) {}
        }
    }, 5 * 60 * 1000);
    console.log("⚡⚡ Nano Ultra started");
}

// ==========================================
// INITIALIZE
// ==========================================
startNanoUltra();
loadExistingSessions();

process.on('uncaughtException', (err) => {
    if (err.message?.includes('Bad MAC') || err.message?.includes('decrypt')) return;
    console.error('Error:', err.message);
});
process.on('unhandledRejection', () => {});

setInterval(() => {}, 1000);
