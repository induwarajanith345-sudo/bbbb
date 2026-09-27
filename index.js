// =======================================================
// 🔥 HACKER PRO — LIGHTWEIGHT EDITION (Auto-Fix + Low RAM)
// =======================================================

const { exec } = require('child_process');

// ============ 🛡️ AUTO CRASH FIX ============
process.on('uncaughtException', (err) => {
    console.error('🛡️ [CAUGHT]', err.message);
});
process.on('unhandledRejection', (err) => {
    console.error('🛡️ [REJECT]', err?.message || err);
});

// ============ 👑 CONFIG ============
let OWNER_NUMBER = '94760601455'; // 🔴 ඔයාගේ number
const BOT_NAME = 'HACKER PRO';

// ============ 🛡️ SAFE FETCH (low memory) ============
async function safeFetchJson(url) {
    try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 25000);
        const res = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            signal: ctrl.signal
        });
        clearTimeout(timer);
        if (!res.ok) return null;
        const t = await res.text();
        try { return JSON.parse(t); } catch { return null; }
    } catch { return null; }
}

async function safeFetchText(url) {
    try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 25000);
        const res = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            signal: ctrl.signal
        });
        clearTimeout(timer);
        if (!res.ok) return null;
        return await res.text();
    } catch { return null; }
}

// ============ 👑 OWNER CHECK ============
function isOwner(ctx) {
    if (ctx.msg?.key?.fromMe) return true;
    const num = (ctx.from || '').split('@')[0].split(':')[0];
    return num === OWNER_NUMBER;
}

// ============ 🎵 YOUTUBE HELPERS ============
function pickUrl(o) {
    if (!o) return null;
    const c = [
        o?.result?.download?.url, o?.result?.download,
        o?.result?.url, o?.result?.dl,
        o?.data?.download?.url, o?.data?.download,
        o?.data?.url, o?.data?.dl,
        o?.download?.url, o?.download,
        o?.url, o?.link, o?.dl
    ];
    for (const x of c) if (typeof x === 'string' && x.startsWith('http')) return x;
    return null;
}

async function ytSearch(q) {
    const apis = [
        `https://api.vreden.my.id/api/ytsearch?query=${encodeURIComponent(q)}`,
        `https://api.zenkey.my.id/search/youtube?q=${encodeURIComponent(q)}`
    ];
    for (const a of apis) {
        const r = await safeFetchJson(a);
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
        `https://api.zenkey.my.id/download/ytmp3?url=${encodeURIComponent(url)}`,
        `https://api.nyxs.pw/dl/ytmp3?url=${encodeURIComponent(url)}`
    ] : [
        `https://api.vreden.my.id/api/ytmp4?url=${encodeURIComponent(url)}`,
        `https://api.zenkey.my.id/download/ytmp4?url=${encodeURIComponent(url)}`,
        `https://api.nyxs.pw/dl/ytmp4?url=${encodeURIComponent(url)}`
    ];
    for (const a of apis) {
        const r = await safeFetchJson(a);
        const u = pickUrl(r);
        if (u) return u;
    }
    // yt-dlp fallback
    return await new Promise((resolve) => {
        const fmt = mode === 'audio' ? 'bestaudio[ext=m4a]/bestaudio/best' : 'bv*[ext=mp4]+ba[ext=m4a]/b';
        exec(`yt-dlp -g -f "${fmt}" --no-playlist --no-warnings "${url}"`,
            { timeout: 90000, maxBuffer: 1024 * 1024 * 10 },
            (err, stdout) => {
                if (err || !stdout) return resolve(null);
                const l = stdout.split('\n').map(s => s.trim()).find(s => s.startsWith('http'));
                resolve(l || null);
            });
    });
}

// =======================================================
// 🎵 YOUTUBE AUDIO
// =======================================================
register('ytmp3', ['yta', 'song'], async (ctx) => {
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
        if (!dl) throw new Error('API fail! Direct link ekak danna.');

        await sock.sendMessage(from, {
            audio: { url: dl },
            mimetype: 'audio/mpeg',
            fileName: `${title}.mp3`,
            ptt: false
        }, { quoted: msg });
        await sock.sendMessage(from, { delete: s.key }).catch(() => {});
    } catch (e) {
        await sock.sendMessage(from, { text: `❌ ${e.message}`, edit: s.key });
    }
}, { public: true });

// =======================================================
// 🎬 YOUTUBE VIDEO
// =======================================================
register('ytmp4', ['ytv', 'video'], async (ctx) => {
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
        if (!dl) throw new Error('API fail! Direct link ekak danna.');

        await sock.sendMessage(from, {
            document: { url: dl },
            mimetype: 'video/mp4',
            fileName: `${title}.mp4`,
            caption: '> POWERED BY HACKER PRO'
        }, { quoted: msg });
        await sock.sendMessage(from, { delete: s.key }).catch(() => {});
    } catch (e) {
        await sock.sendMessage(from, { text: `❌ ${e.message}`, edit: s.key });
    }
}, { public: true });

// =======================================================
// 🎥 MOVIE (FIXED)
// =======================================================
register('movie', ['mv', 'film'], async (ctx) => {
    const { sock, from, msg, args } = ctx;
    if (!args[0]) return await sock.sendMessage(from, { text: '🎥 Usage: .movie <name>' }, { quoted: msg });
    const s = await sock.sendMessage(from, { text: '🔄 Searching Movie...' }, { quoted: msg });

    try {
        const q = args.join(' ');
        const data = await safeFetchJson(`https://yts.mx/api/v2/list_movies.json?query_term=${encodeURIComponent(q)}&limit=1`);
        const movie = data?.data?.movies?.[0];
        if (!movie) throw new Error('Movie eka hambune na!');

        let text = `🎥 *${movie.title} (${movie.year || 'N/A'})*\n\n`;
        text += `⭐ Rating: ${movie.rating || 'N/A'}/10\n`;
        text += `⏱️ Runtime: ${movie.runtime || 'N/A'} min\n`;
        text += `🎭 Genres: ${movie.genres?.join(', ') || 'N/A'}\n\n`;
        if (movie.summary) text += `📝 *Summary:*\n${movie.summary.slice(0, 300)}...\n\n`;

        if (movie.torrents?.length) {
            text += `📥 *Download Links:*\n`;
            movie.torrents.forEach(t => {
                text += `\n🔗 *${t.quality}* (${t.size})\n${t.url}`;
            });
        }
        text += `\n\n> POWERED BY HACKER PRO`;

        await sock.sendMessage(from, {
            image: { url: movie.medium_cover_image },
            caption: text
        }, { quoted: msg });
        await sock.sendMessage(from, { delete: s.key }).catch(() => {});
    } catch (e) {
        await sock.sendMessage(from, { text: `❌ ${e.message}`, edit: s.key });
    }
}, { public: true });

// =======================================================
// 👑 OWNER
// =======================================================
register('owner', ['creator', 'dev'], async (ctx) => {
    const { sock, from, msg } = ctx;

    try {
        const vcard = 'BEGIN:VCARD\n' +
            'VERSION:3.0\n' +
            `FN:${BOT_NAME} Owner\n` +
            `TEL;type=CELL;type=VOICE;waid=${OWNER_NUMBER}:+${OWNER_NUMBER}\n` +
            'END:VCARD';
        await sock.sendMessage(from, {
            contacts: { displayName: `${BOT_NAME} Owner`, contacts: [{ vcard }] }
        }, { quoted: msg });
    } catch {}

    await sock.sendMessage(from, {
        text: `👑 *Owner*\n\n📱 +${OWNER_NUMBER}\n🤖 ${BOT_NAME}\n\n> POWERED BY ${BOT_NAME}`
    }, { quoted: msg });
}, { public: true });

// =======================================================
// 📢 BROADCAST (owner)
// =======================================================
register('broad', ['broadcast', 'bc'], async (ctx) => {
    const { sock, from, msg, args } = ctx;
    if (!isOwner(ctx)) return await sock.sendMessage(from, { text: '❌ Owner only!' }, { quoted: msg });
    if (!args[0]) return await sock.sendMessage(from, { text: '📢 Usage: .broad <message>' }, { quoted: msg });

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
        await sock.sendMessage(from, { text: `✅ Sent: ${sent}\n❌ Failed: ${fail}\n📊 Total: ${ids.length}`, edit: s.key });
    } catch (e) {
        await sock.sendMessage(from, { text: `❌ ${e.message}`, edit: s.key });
    }
}, { public: false });

// =======================================================
// 💬 CHANNEL REACT
// =======================================================
register('chreact', ['creact'], async (ctx) => {
    const { sock, from, msg, args } = ctx;
    if (!args[0]) return await sock.sendMessage(from, {
        text: '💬 Usage: .chreact <emoji> <channel_msg_url>\nOr reply to channel message with .chreact <emoji>'
    }, { quoted: msg });

    try {
        let emoji = args[0];
        let serverId, messageId;

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
        if (!serverId || !messageId) throw new Error('Channel URL එකක් දෙන්න!');
        if (emoji.length > 10) emoji = '❤️';

        await sock.sendMessage(`${serverId}@newsletter`, {
            react: { text: emoji, key: { remoteJid: `${serverId}@newsletter`, id: messageId, fromMe: false } }
        });
        await sock.sendMessage(from, { text: `✅ Reacted! ${emoji}` }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(from, { text: `❌ ${e.message}` }, { quoted: msg });
    }
}, { public: true });

// =======================================================
// 🔄 UPDATE
// =======================================================
register('update', ['up'], async (ctx) => {
    const { sock, from, msg } = ctx;
    const s = await sock.sendMessage(from, { text: '🔄 Checking...' }, { quoted: msg });
    exec('git pull', async (err, stdout, stderr) => {
        if (err) return await sock.sendMessage(from, { text: `❌ ${stderr || err.message}`, edit: s.key });
        if (stdout.includes('Already up to date')) return await sock.sendMessage(from, { text: '✅ Already up to date!', edit: s.key });
        await sock.sendMessage(from, { text: `✅ Updated!\n\n${stdout}`, edit: s.key });
    });
}, { public: false });

// =======================================================
// 🔄 RESTART
// =======================================================
register('restart', ['reboot', 'rs'], async (ctx) => {
    const { sock, from, msg } = ctx;
    if (!isOwner(ctx)) return await sock.sendMessage(from, { text: '❌ Owner only!' }, { quoted: msg });
    await sock.sendMessage(from, { text: `🔄 Restarting in 5s...\n\n> ${BOT_NAME}` }, { quoted: msg });
    setTimeout(() => process.exit(0), 5000);
}, { public: false });

// =======================================================
// ⚙️ SETTINGS
// =======================================================
register('settings', ['config'], async (ctx) => {
    const { sock, from, msg } = ctx;
    const up = process.uptime();
    const h = Math.floor(up / 3600), m = Math.floor((up % 3600) / 60), s = Math.floor(up % 60);
    const mem = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);

    await sock.sendMessage(from, {
        text: `⚙️ *Settings*\n\n🤖 ${BOT_NAME}\n📱 +${OWNER_NUMBER}\n\n⏱️ Uptime: ${h}h ${m}m ${s}s\n💾 RAM: ${mem} MB\n📦 Node: ${process.version}\n⚡ PID: ${process.pid}\n\n> ${BOT_NAME}`
    }, { quoted: msg });
}, { public: true });

// =======================================================
// 🏓 PING
// =======================================================
register('ping', ['speed'], async (ctx) => {
    const { sock, from, msg } = ctx;
    const t = Date.now();
    const s = await sock.sendMessage(from, { text: '🏓 Pinging...' }, { quoted: msg });
    await sock.sendMessage(from, { text: `⚡ Pong! ${Date.now() - t}ms`, edit: s.key });
}, { public: true });

// =======================================================
// 🧹 CLEAR RAM (owner)
// =======================================================
register('gc', ['ram', 'clearcache'], async (ctx) => {
    const { sock, from, msg } = ctx;
    if (!isOwner(ctx)) return await sock.sendMessage(from, { text: '❌ Owner only!' }, { quoted: msg });

    const before = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
    if (global.gc) global.gc();
    const after = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);

    await sock.sendMessage(from, {
        text: `🧹 *RAM Cleaned*\n\n📊 Before: ${before} MB\n📊 After: ${after} MB\n✅ Saved: ${(before - after).toFixed(2)} MB\n\n> ${BOT_NAME}`
    }, { quoted: msg });
}, { public: false });

// =======================================================
// 📋 MENU
// =======================================================
register('menu', ['help'], async (ctx) => {
    const { sock, from, msg } = ctx;
    const text = `🔥 *${BOT_NAME} — Menu*\n\n` +
        `*📥 Downloads*\n` +
        `.ytmp3 — YouTube Audio\n` +
        `.ytmp4 — YouTube Video\n` +
        `.movie — Movie info + torrents\n\n` +
        `*👑 Owner*\n` +
        `.owner — Owner contact\n` +
        `.broad — Broadcast\n` +
        `.chreact — Channel react\n` +
        `.restart — Restart bot\n` +
        `.update — Git pull\n` +
        `.gc — Clear RAM\n\n` +
        `*ℹ️ Info*\n` +
        `.settings — Bot info\n` +
        `.ping — Speed test\n` +
        `.menu — This menu\n\n` +
        `> POWERED BY ${BOT_NAME}`;
    await sock.sendMessage(from, { text }, { quoted: msg });
}, { public: true });
