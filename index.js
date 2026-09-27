require('dotenv').config();
const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const axios = require('axios');
const cheerio = require('cheerio');
const express = require('express');
const QRCode = require('qrcode');
const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    DisconnectReason, 
    fetchLatestBaileysVersion, 
    makeCacheableSignalKeyStore, 
    jidNormalizedUser, 
    Browsers, 
    delay 
} = require('@whiskeysockets/baileys');
const P = require('pino');

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
    try { 
        botData = { ...botData, ...fs.readJsonSync(DATA_FILE) }; 
    } catch (e) {
        console.error("Error loading bot_data.json:", e);
    }
}
if (!botData.owners) botData.owners = [];

function saveBotData() {
    fs.writeJsonSync(DATA_FILE, botData);
}

const sessions = {};

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
                'Accept-Language': 'en-US,en;q=0.9'
            },
            timeout: 30000
        });

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

// ========== MAIN COMMANDS ==========
register('menu', ['help'], async (ctx) => {
    const { sock, from, msg } = ctx;
    const isBotOwner = isOwner(ctx.sender) || msg.key.fromMe;
    
    let menuText = `𝗛𝗔𝗖𝗞𝗘𝗥 𝗣𝗥𝗢 𝗨𝗟𝗧𝗥𝗔 𝗔𝗖𝗧𝗜𝗩𝗘\n` +
                   `╭━━━〔 𝗕𝗢𝗧 𝗦𝗧𝗔𝗧𝗨𝗦 〕━━━┈⊷\n` +
                   `┃ ⋄ .menu\n` +
                   `┃ ⋄ .ping\n` +
                   `┃ ⋄ .owner\n` +
                   `┃ ⋄ .dp\n` +
                   `┃ ⋄ .ai [question]\n` +
                   `╰━━━━━━━━━━━━━━━━━━┈⊷\n\n` +
                   `╭━━━〔 🎵 𝗬𝗢𝗨𝗧𝗨𝗕𝗘 〕━━━┈⊷\n` +
                   `┃ ⋄ .song [name]\n` +
                   `┃ ⋄ .video [name]\n` +
                   `┃ ⋄ .ytmp3 [url]\n` +
                   `┃ ⋄ .ytmp4 [url]\n` +
                   `╰━━━━━━━━━━━━━━━━━━┈⊷\n\n` +
                   `╭━━━〔 🎬 𝗠𝗢𝗩𝗜𝗘 〕━━━┈⊷\n` +
                   `┃ ⋄ .movie [name]\n` +
                   `┃ ⋄ .moviedl [url]\n` +
                   `┃ ⋄ .cinesubz [name]\n` +
                   `┃ ⋄ .animeclub2 [name]\n` +
                   `╰━━━━━━━━━━━━━━━━━━┈⊷\n\n` +
                   `╭━━━〔 🎮 𝗚𝗔𝗠𝗘𝗦 〕━━━┈⊷\n` +
                   `┃ ⋄ .fitgirl [game]\n` +
                   `┃ ⋄ .dodi [game]\n` +
                   `╰━━━━━━━━━━━━━━━━━━┈⊷\n\n` +
                   `╭━━━〔 📥 𝗗𝗢𝗪𝗡𝗟𝗢𝗔𝗗 〕━━━┈⊷\n` +
                   `┃ ⋄ .tiktok [url]\n` +
                   `┃ ⋄ .fb [url]\n` +
                   `┃ ⋄ .ig [url]\n` +
                   `╰━━━━━━━━━━━━━━━━━━┈⊷\n\n` +
                   `╭━━━〔 🛠️ 𝗧𝗢𝗢𝗟𝗦 〕━━━┈⊷\n` +
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
}, { public: true });

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
}, { public: true });

register('owner', [], async (ctx) => {
    const { sock, from, msg } = ctx;
    const ownerNum = process.env.OWNER_NUMBER || '94760601455';
    const vcard = `BEGIN:VCARD\nVERSION:3.0\nFN:Hacker Pro\nTEL;type=CELL;type=VOICE;waid=${ownerNum}:+${ownerNum}\nEND:VCARD`;
    await sock.sendMessage(from, {
        contacts: { displayName: 'Hacker Pro', contacts: [{ vcard }] }
    }, { quoted: msg });
}, { public: true });

register('dp', ['profilepic'], async (ctx) => {
    const { sock, from, msg } = ctx;
    try {
        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
        const target = mentioned || msg.key.participant || from;
        const pp = await sock.profilePictureUrl(target, 'image').catch(() => null);
        if (!pp) return await sock.sendMessage(from, { text: '❌ No profile picture' }, { quoted: msg });
        await sock.sendMessage(from, { image: { url: pp }, caption: '✅ Profile Picture' }, { quoted: msg });
    } catch (e) {}
}, { public: true });

// ========== OWNER ==========
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
    await sock.sendMessage(from, { text: `✅ Added: +${num}` }, { quoted: msg });
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
                await session.sock.sendMessage(botNumber, { text: `📢 *FROM OWNER*\n\n${message}\n\n> POWERED BY HACKER PRO TEAM` });
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

// ========== YOUTUBE (MP3/MP4) ==========
register('song', ['mp3', 'music'], async (ctx) => {
    const { sock, from, msg, args } = ctx;
    if (!args.length) return await sock.sendMessage(from, { text: '🎵 Usage: .song <name>' }, { quoted: msg });
    const status = await sock.sendMessage(from, { text: '🔍 Searching...' }, { quoted: msg });

    try {
        const yts = require('yt-search');
        const query = args.join(" ");
        let url = query;

        if (!query.includes("youtu")) {
            const search = await yts(query);
            if (!search.videos.length) return await sock.sendMessage(from, { text: '❌ Not found', edit: status.key });
            url = search.videos[0].url;
        }

        await sock.sendMessage(from, { text: '⬇️ Downloading audio...', edit: status.key });

        const res = await axios.get(`https://apis.davidcyriltech.my.id/download/ytmp3?url=${encodeURIComponent(url)}`, { timeout: 60000 });
        const dl = res.data?.result?.download_url || res.data?.result?.url || res.data?.url || res.data?.link;
        
        if (!dl) throw new Error('No download link');

        await sock.sendMessage(from, {
            audio: { url: dl },
            mimetype: 'audio/mpeg',
            fileName: `${res.data?.result?.title || 'song'}.mp3`,
            ptt: false
        }, { quoted: msg });
        await sock.sendMessage(from, { delete: status.key }).catch(() => {});
    } catch (e) {
        await sock.sendMessage(from, { text: `❌ ${e.message}`, edit: status.key });
    }
}, { public: true });

register('video', ['mp4'], async (ctx) => {
    const { sock, from, msg, args } = ctx;
    if (!args.length) return await sock.sendMessage(from, { text: '🎬 Usage: .video <name>' }, { quoted: msg });
    const status = await sock.sendMessage(from, { text: '🔍 Searching...' }, { quoted: msg });

    try {
        const yts = require('yt-search');
        const query = args.join(" ");
        let url = query;

        if (!query.includes("youtu")) {
            const search = await yts(query);
            if (!search.videos.length) return await sock.sendMessage(from, { text: '❌ Not found', edit: status.key });
            url = search.videos[0].url;
        }

        await sock.sendMessage(from, { text: '⬇️ Downloading video...', edit: status.key });

        const res = await axios.get(`https://apis.davidcyriltech.my.id/download/ytmp4?url=${encodeURIComponent(url)}`, { timeout: 60000 });
        const dl = res.data?.result?.download_url || res.data?.result?.url || res.data?.url || res.data?.link;
        
        if (!dl) throw new Error('No download link');

        await sock.sendMessage(from, {
            video: { url: dl },
            caption: `🎬 *${res.data?.result?.title || 'video'}*\n\n> POWERED BY HACKER PRO TEAM`,
            mimetype: 'video/mp4'
        }, { quoted: msg });
        await sock.sendMessage(from, { delete: status.key }).catch(() => {});
    } catch (e) {
        await sock.sendMessage(from, { text: `❌ ${e.message}`, edit: status.key });
    }
}, { public: true });

register('ytmp3', ['yta'], async (ctx) => {
    const { sock, from, msg, args } = ctx;
    if (!args[0]) return await sock.sendMessage(from, { text: '🎵 Usage: .ytmp3 <url>' }, { quoted: msg });
    const status = await sock.sendMessage(from, { text: '⬇️ Downloading audio...' }, { quoted: msg });

    try {
        const res = await axios.get(`https://apis.davidcyriltech.my.id/download/ytmp3?url=${encodeURIComponent(args[0])}`, { timeout: 60000 });
        const dl = res.data?.result?.download_url || res.data?.result?.url || res.data?.url || res.data?.link;
        
        if (!dl) throw new Error('No link');

        await sock.sendMessage(from, {
            audio: { url: dl },
            mimetype: 'audio/mpeg',
            ptt: false
        }, { quoted: msg });
        await sock.sendMessage(from, { delete: status.key }).catch(() => {});
    } catch (e) {
        await sock.sendMessage(from, { text: `❌ ${e.message}`, edit: status.key });
    }
}, { public: true });

register('ytmp4', ['ytv'], async (ctx) => {
    const { sock, from, msg, args } = ctx;
    if (!args[0]) return await sock.sendMessage(from, { text: '🎬 Usage: .ytmp4 <url>' }, { quoted: msg });
    const status = await sock.sendMessage(from, { text: '⬇️ Downloading video...' }, { quoted: msg });

    try {
        const res = await axios.get(`https://apis.davidcyriltech.my.id/download/ytmp4?url=${encodeURIComponent(args[0])}`, { timeout: 60000 });
        const dl = res.data?.result?.download_url || res.data?.result?.url || res.data?.url || res.data?.link;
        
        if (!dl) throw new Error('No link');

        await sock.sendMessage(from, {
            video: { url: dl },
            caption: `🎬 Video\n\n> POWERED BY HACKER PRO TEAM`,
            mimetype: 'video/mp4'
        }, { quoted: msg });
        await sock.sendMessage(from, { delete: status.key }).catch(() => {});
    } catch (e) {
        await sock.sendMessage(from, { text: `❌ ${e.message}`, edit: status.key });
    }
}, { public: true });

// ========== AI ==========
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
}, { public: true });

// ========== MOVIE ==========
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
        if (!results.length) return await sock.sendMessage(from, { text: '❌ Not found!', edit: status.key });

        let text = `🎬 *Movie Results: ${query}*\n\n`;
        results.slice(0, 5).forEach((r, i) => {
            text += `*${i + 1}.* ${r.cleanTitle || r.title}\n🔗 ${r.link}\n\n`;
        });
        text += `> Use .moviedl <link>\n> POWERED BY HACKER PRO TEAM`;
        await sock.sendMessage(from, { image: { url: results[0].thumbnail }, caption: text, edit: status.key });
    } catch (e) {
        await sock.sendMessage(from, { text: `❌ ${e.message}`, edit: status.key });
    }
}, { public: true });

register('moviedl', ['mdownload'], async (ctx) => {
    const { sock, from, msg, args } = ctx;
    if (!args[0]) return await sock.sendMessage(from, { text: '🎬 Usage: .moviedl <link>' }, { quoted: msg });
    const status = await sock.sendMessage(from, { text: '⬇️ Getting links...' }, { quoted: msg });

    try {
        const res = await axios.get('https://supunofc.site/api/movie/zoom/details', {
            params: { url: args[0], apikey: process.env.SUPUN_API_KEY }, timeout: 30000
        });
        const r = res.data.result;
        if (!r) return await sock.sendMessage(from, { text: '❌ Not found!', edit: status.key });

        let text = `🎬 *${r.title}*\n\n`;
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
}, { public: true });

register('cinesubz', ['csub'], async (ctx) => {
    const { sock, from, msg, args } = ctx;
    if (!args.length) return await sock.sendMessage(from, { text: '🎬 Usage: .cinesubz <movie>' }, { quoted: msg });
    const query = args.join(" ");
    const status = await sock.sendMessage(from, { text: `🔍 Searching: ${query}...` }, { quoted: msg });

    try {
        const { $ } = await fetchWithBypass(`https://cinesubz.co/?s=${encodeURIComponent(query)}`);
        const results = [];
        $('article, .post').each((i, el) => {
            if (i >= 5) return;
            const title = $(el).find('h2.entry-title a, h2 a').first().text().trim();
            const link = $(el).find('h2.entry-title a, h2 a').first().attr('href');
            const img = $(el).find('img').attr('src') \vert{}\vert{}$(el).find('img').attr('data-src');
            if (title && link) results.push({ title, link, img });
        });

        if (!results.length) return await sock.sendMessage(from, { text: '❌ Not found!', edit: status.key });

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
}, { public: true });

register('animeclub2', ['aclub2'], async (ctx) => {
    const { sock, from, msg, args } = ctx;
    if (!args.length) return await sock.sendMessage(from, { text: '🎌 Usage: .animeclub2 <anime>' }, { quoted: msg });
    const query = args.join(" ");
    const status = await sock.sendMessage(from, { text: `🔍 Searching: ${query}...` }, { quoted: msg });

    try {
        const { $ } = await fetchWithBypass(`https://animeclub2.com/?s=${encodeURIComponent(query)}`);
        const results = [];
        $('article, .post, .item, .tvshows').each((i, el) => {
            if (i >= 5) return;
            const title = $(el).find('h2 a, h3 a, .entry-title a').first().text().trim();
            const link = $(el).find('h2 a, h3 a, .entry-title a').first().attr('href');
            const img = $(el).find('img').attr('src') \vert{}\vert{}$(el).find('img').attr('data-src');
            if (title && link) results.push({ title, link, img });
        });

        if (!results.length) return await sock.sendMessage(from, { text: '❌ Not found!', edit: status.key });

        let text = `🎌 *AnimeClub2 Results*\n🔍 ${query}\n\n`;
        for (const r of results) {
            text += `📺 *${r.title}*\n🔗 ${r.link}\n\n`;
            if (r.link.includes('/tvshows/') || r.link.includes('/seasons/')) {
                try {
                    const { $: sp } = await fetchWithBypass(r.link);
                    const eps = [];
                    sp("a[href*='/episode'], .episode a").each((i, el) => {
                        const t = sp(el).text().trim();
                        const l = sp(el).attr('href');
                        if (t && l) eps.push({ t, l });
                    });
                    if (eps.length) {
                        text += `📥 *Episodes (${eps.length}):*\n`;
                        eps.slice(0, 8).forEach((e, i) => text += `  ${i + 1}. ${e.t}\n     🔗 ${e.l}\n`);
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
}, { public: true });

// ========== GAMES ==========
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
        if (!results.length) return await sock.sendMessage(from, { text: '❌ Not found!', edit: status.key });

        let text = `🎮 *FitGirl Repacks*\n🔍 ${query}\n\n`;
        results.forEach((r, i) => text += `*${i + 1}.* ${r.title}\n🔗 ${r.link}\n\n`);
        text += `> POWERED BY HACKER PRO TEAM`;
        await sock.sendMessage(from, { text, edit: status.key });
    } catch (e) {
        await sock.sendMessage(from, { text: `❌ ${e.message}`, edit: status.key });
    }
}, { public: true });

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
        if (!results.length) return await sock.sendMessage(from, { text: '❌ Not found!', edit: status.key });

        let text = `🎮 *DODI Repacks*\n🔍 ${query}\n\n`;
        results.forEach((r, i) => text += `*${i + 1}.* ${r.title}\n🔗 ${r.link}\n\n`);
        text += `> POWERED BY HACKER PRO TEAM`;
        await sock.sendMessage(from, { text, edit: status.key });
    } catch (e) {
        await sock.sendMessage(from, { text: `❌ ${e.message}`, edit: status.key });
    }
}, { public: true });

// ========== DOWNLOADS ==========
register('tiktok', ['tt'], async (ctx) => {
    const { sock, from, msg, args } = ctx;
    if (!args[0]) return await sock.sendMessage(from, { text: '📥 Usage: .tiktok <url>' }, { quoted: msg });
    const status = await sock.sendMessage(from, { text: '⬇️ Downloading...' }, { quoted: msg });

    try {
        const res = await axios.get(`https://www.tikwm.com/api/?url=${encodeURIComponent(args[0])}`, { timeout: 30000 });
        const d = res.data?.data;
        if (!d) return await sock.sendMessage(from, { text: '❌ Failed to fetch TikTok video!', edit: status.key });

        await sock.sendMessage(from, {
            video: { url: d.play },
            caption: `🎵 *TikTok Video*\n👤 Author: ${d.author?.nickname || 'N/A'}\n📝 Title: ${d.title || 'No Title'}\n\n> POWERED BY HACKER PRO TEAM`
        }, { quoted: msg });

        await sock.sendMessage(from, { delete: status.key }).catch(() => {});
    } catch (e) {
        await sock.sendMessage(from, { text: `❌ Error: ${e.message}`, edit: status.key });
    }
}, { public: true });
