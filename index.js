// =======================================================
// 🔥 HACKER PRO - ULTIMATE ZERO-ERROR COMMANDS (FIXED)
// =======================================================

const { exec } = require('child_process');

// ============ 👑 OWNER CONFIG ============
let OWNER_NUMBER = '94760601455'; // 🔴 ඔයාගේ WhatsApp number (country code, + නැතුව, 0 නැතුව)
const BOT_NAME = 'HACKER PRO';

// ============ 🛡️ SAFE FETCH ============
async function safeFetchJson(url) {
    try {
        const res = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
            signal: AbortSignal.timeout(25000)
        });
        if (!res.ok) return null;
        const t = await res.text();
        try { return JSON.parse(t); } catch { return null; }
    } catch { return null; }
}

async function safeFetchText(url) {
    try {
        const res = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
            signal: AbortSignal.timeout(25000)
        });
        if (!res.ok) return null;
        return await res.text();
    } catch { return null; }
}

// ============ 👑 OWNER CHECK HELPER ============
function checkOwner(ctx) {
    const { msg, from } = ctx;
    if (msg?.key?.fromMe) return true;
    const senderNum = (from || '').split('@')[0].split(':')[0];
    return senderNum === OWNER_NUMBER;
}

// =======================================================
// 1. 🔄 UPDATE COMMAND
// =======================================================
register('update', ['up'], async (ctx) => {
    const { sock, from, msg } = ctx;
    const status = await sock.sendMessage(from, { text: '🔄 Checking for updates...' }, { quoted: msg });

    exec('git pull', async (err, stdout, stderr) => {
        if (err) {
            return await sock.sendMessage(from,
                { text: `❌ Update Failed:\n\n${stderr || err.message}`, edit: status.key });
        }
        if (stdout.includes('Already up to date')) {
            return await sock.sendMessage(from,
                { text: '✅ Bot is already up to date!', edit: status.key });
        }
        await sock.sendMessage(from,
            { text: `✅ Update Successful!\n\n${stdout}`, edit: status.key });
    });
}, { public: false });

// =======================================================
// 2. 🎵 YOUTUBE AUDIO
// =======================================================
register('ytmp3', ['yta', 'song'], async (ctx) => {
    const { sock, from, msg, args } = ctx;
    if (!args[0]) return await sock.sendMessage(from, { text: '🎵 Usage: .ytmp3 <name or link>' }, { quoted: msg });
    const status = await sock.sendMessage(from, { text: '🔄 Downloading Audio...' }, { quoted: msg });

    try {
        let url = args.join(" ");
        let title = "audio";

        if (!url.includes("youtu")) {
            const search = await safeFetchJson(`https://api.vreden.my.id/api/ytsearch?query=${encodeURIComponent(url)}`);
            if (!search?.result?.[0]?.url) throw new Error('Song eka hoyaganna ba!');
            url = search.result[0].url;
            title = search.result[0].title || 'audio';
        }

        const dl = await safeFetchJson(`https://api.vreden.my.id/api/ytmp3?url=${encodeURIComponent(url)}`);
        const audioUrl = dl?.result?.download?.url || dl?.result?.url || dl?.url;
        if (!audioUrl) throw new Error('API Error! Direct link ekak danna.');

        await sock.sendMessage(from, {
            audio: { url: audioUrl },
            mimetype: 'audio/mpeg',
            fileName: `${title}.mp3`,
            ptt: false
        }, { quoted: msg });

        await sock.sendMessage(from, { delete: status.key }).catch(() => {});
    } catch (e) {
        await sock.sendMessage(from, { text: `❌ Error: ${e.message}`, edit: status.key });
    }
}, { public: true });

// =======================================================
// 3. 🎬 YOUTUBE VIDEO
// =======================================================
register('ytmp4', ['ytv', 'video'], async (ctx) => {
    const { sock, from, msg, args } = ctx;
    if (!args[0]) return await sock.sendMessage(from, { text: '🎬 Usage: .ytmp4 <name or link>' }, { quoted: msg });
    const status = await sock.sendMessage(from, { text: '🔄 Downloading Video...' }, { quoted: msg });

    try {
        let url = args.join(" ");
        let title = "Video";

        if (!url.includes("youtu")) {
            const search = await safeFetchJson(`https://api.vreden.my.id/api/ytsearch?query=${encodeURIComponent(url)}`);
            if (!search?.result?.[0]?.url) throw new Error('Video eka hoyaganna ba!');
            url = search.result[0].url;
            title = search.result[0].title || 'Video';
        }

        const dl = await safeFetchJson(`https://api.vreden.my.id/api/ytmp4?url=${encodeURIComponent(url)}`);
        const videoUrl = dl?.result?.download?.url || dl?.result?.url || dl?.url;
        if (!videoUrl) throw new Error('API Error! Direct link ekak danna.');

        await sock.sendMessage(from, {
            document: { url: videoUrl },
            mimetype: 'video/mp4',
            fileName: `${title}.mp4`,
            caption: '> POWERED BY HACKER PRO'
        }, { quoted: msg });

        await sock.sendMessage(from, { delete: status.key }).catch(() => {});
    } catch (e) {
        await sock.sendMessage(from, { text: `❌ Error: ${e.message}`, edit: status.key });
    }
}, { public: true });

// =======================================================
// 4. 🎥 MOVIE COMMAND
// =======================================================
register('movie', ['mv', 'film'], async (ctx) => {
    const { sock, from, msg, args } = ctx;
    if (!args[0]) return await sock.sendMessage(from, { text: '🎥 Usage: .movie <name>' }, { quoted: msg });
    const status = await sock.sendMessage(from, { text: '🔄 Searching Movie...' }, { quoted: msg });

    try {
        const query = args.join(" ");
        const data = await safeFetchJson(`https://yts.mx/api/v2/list_movies.json?query_term=${encodeURIComponent(query)}&limit=1`);
        const movie = data?.data?.movies?.[0];
        if (!movie) throw new Error('Movie eka hambune na!');

        let text = `🎥 *${movie.title} (${movie.year || 'N/A'})*\n\n`;
        text += `⭐ Rating: ${movie.rating || 'N/A'}/10\n`;
        text += `⏱️ Runtime: ${movie.runtime || 'N/A'} min\n`;
        text += `🎭 Genres: ${movie.genres?.join(', ') || 'N/A'}\n\n`;
        if (movie.summary) text += `📝 *Summary:*\n${movie.summary.slice(0, 300)}...\n\n`;

        if (movie.torrents?.length) {
            text += `📥 *Download Links (Torrents):*\n`;
            movie.torrents.forEach(t => {
                text += `\n🔗 *${t.quality}* (${t.size})\n${t.url}`;
            });
        }
        text += `\n\n> POWERED BY HACKER PRO`;

        await sock.sendMessage(from, {
            image: { url: movie.medium_cover_image },
            caption: text
        }, { quoted: msg });

        await sock.sendMessage(from, { delete: status.key }).catch(() => {});
    } catch (e) {
        await sock.sendMessage(from, { text: `❌ Error: ${e.message}`, edit: status.key });
    }
}, { public: true });

// =======================================================
// 5. 🎮 GAME COMMAND (FIXED REGEX)
// =======================================================
register('game', ['fitgirl', 'fg'], async (ctx) => {
    const { sock, from, msg, args } = ctx;
    if (!args.length) return await sock.sendMessage(from, { text: '🎮 Usage: .game <name>' }, { quoted: msg });
    const status = await sock.sendMessage(from, { text: `🎮 Searching Game...` }, { quoted: msg });

    try {
        const query = args.join(" ");
        const html = await safeFetchText(`https://fitgirl-repacks.site/?s=${encodeURIComponent(query)}`);
        if (!html) throw new Error('FitGirl site eka block wela ho down wela thiyenne.');

        // ✅ FIXED: h1 + h2 දෙකම match කරනවා, class order ඕනෑම එකක්
        const regex = /<h[12][^>]*class="[^"]*entry-title[^"]*"[^>]*>\s*<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
        const results = [];
        let match;

        while ((match = regex.exec(html)) !== null && results.length < 5) {
            const title = match[2]
                .replace(/<[^>]+>/g, '')
                .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(n))
                .replace(/&amp;/g, '&')
                .trim();
            if (title && match[1]) results.push({ link: match[1], title });
        }

        if (!results.length) throw new Error('Game eka hoyaganna ba!');

        let text = `🎮 *FitGirl Repacks*\n🔍 Query: ${query}\n\n`;
        results.forEach((r, i) => {
            text += `*${i + 1}.* ${r.title}\n🔗 ${r.link}\n\n`;
        });
        text += `> POWERED BY HACKER PRO`;

        await sock.sendMessage(from, { text, edit: status.key });
    } catch (e) {
        await sock.sendMessage(from, { text: `❌ Error: ${e.message}`, edit: status.key });
    }
}, { public: true });

// =======================================================
// 6. 👑 OWNER COMMAND (Contact + vCard)
// =======================================================
register('owner', ['creator', 'dev'], async (ctx) => {
    const { sock, from, msg } = ctx;

    const text = `👑 *Bot Owner*\n\n` +
        `📱 *Number:* +${OWNER_NUMBER}\n` +
        `🤖 *Bot:* ${BOT_NAME}\n` +
        `⚡ *Version:* 2.0 ULTIMATE\n\n` +
        `💬 ප්‍රශ්න තියෙනවා නම් contact කරන්න.\n` +
        `🚫 Spam කරන්න එපා!\n\n` +
        `> POWERED BY ${BOT_NAME}`;

    // vCard (contact card) යවනවා
    try {
        const vcard = 'BEGIN:VCARD\n' +
            'VERSION:3.0\n' +
            `FN:${BOT_NAME} Owner\n` +
            `ORG:${BOT_NAME};\n` +
            `TEL;type=CELL;type=VOICE;waid=${OWNER_NUMBER}:+${OWNER_NUMBER}\n` +
            'END:VCARD';

        await sock.sendMessage(from, {
            contacts: {
                displayName: `${BOT_NAME} Owner`,
                contacts: [{ vcard }]
            }
        }, { quoted: msg });
    } catch {}

    await sock.sendMessage(from, { text }, { quoted: msg });
}, { public: true });

// =======================================================
// 7. ⚙️ SET OWNER (Owner only)
// =======================================================
register('setowner', ['setown'], async (ctx) => {
    const { sock, from, msg, args } = ctx;

    if (!checkOwner(ctx)) {
        return await sock.sendMessage(from, { text: '❌ Owner only!' }, { quoted: msg });
    }
    if (!args[0]) {
        return await sock.sendMessage(from, {
            text: '⚙️ Usage: .setowner <number>\nExample: .setowner 94771234567'
        }, { quoted: msg });
    }

    const newOwner = args[0].replace(/[^0-9]/g, '');
    if (newOwner.length < 10) {
        return await sock.sendMessage(from, { text: '❌ Invalid number!' }, { quoted: msg });
    }

    OWNER_NUMBER = newOwner;
    await sock.sendMessage(from, {
        text: `✅ Owner updated!\n\n📱 New: +${newOwner}\n\n⚠️ Restart කරාම reset වෙනවා.`
    }, { quoted: msg });
}, { public: false });

// =======================================================
// 8. 📢 BROADCAST (Owner only)
// =======================================================
register('broad', ['broadcast', 'bc'], async (ctx) => {
    const { sock, from, msg, args } = ctx;

    if (!checkOwner(ctx)) {
        return await sock.sendMessage(from, { text: '❌ Owner only!' }, { quoted: msg });
    }
    if (!args[0]) {
        return await sock.sendMessage(from, {
            text: '📢 Usage: .broad <message>\n\n💡 හැම group එකකටම message එක යවනවා.'
        }, { quoted: msg });
    }

    const message = args.join(' ');
    const status = await sock.sendMessage(from, { text: '📢 Broadcasting...' }, { quoted: msg });

    try {
        const groups = await sock.groupFetchAllParticipating();
        const groupIds = Object.keys(groups);
        if (!groupIds.length) throw new Error('Groups නෑ!');

        let sent = 0, failed = 0;
        for (const id of groupIds) {
            try {
                await sock.sendMessage(id, {
                    text: `📢 *BROADCAST*\n\n${message}\n\n> ${BOT_NAME}`
                });
                sent++;
                // Rate limit — WhatsApp ban නොවෙන්න 1.5s delay
                await new Promise(r => setTimeout(r, 1500));
            } catch {
                failed++;
            }
        }

        await sock.sendMessage(from, {
            text: `✅ *Broadcast Complete!*\n\n✅ Sent: ${sent}\n❌ Failed: ${failed}\n📊 Total: ${groupIds.length}\n\n> ${BOT_NAME}`,
            edit: status.key
        });
    } catch (e) {
        await sock.sendMessage(from, { text: `❌ ${e.message}`, edit: status.key });
    }
}, { public: false });

// =======================================================
// 9. 💬 CHANNEL REACT
// =======================================================
register('chreact', ['creact', 'channelreact'], async (ctx) => {
    const { sock, from, msg, args } = ctx;

    if (!args[0]) {
        return await sock.sendMessage(from, {
            text: '💬 Usage: .chreact <emoji> <channel_message_url>\n\n' +
                  '📌 Examples:\n' +
                  '.chreact ❤️ https://whatsapp.com/channel/xxx/123\n' +
                  '.chreact 🔥 (reply to channel message)'
        }, { quoted: msg });
    }

    try {
        let emoji = args[0];
        let channelUrl = args[1];
        let serverId, messageId;

        // URL එකෙන් extract
        if (channelUrl) {
            const match = channelUrl.match(/channel\/([^/]+)\/(\d+)/);
            if (match) {
                serverId = match[1];
                messageId = match[2];
            }
        }

        // Reply කරලා නම්
        if (!messageId) {
            const quoted = msg.message?.extendedTextMessage?.contextInfo;
            if (quoted?.stanzaId && quoted?.remoteJid?.includes('@newsletter')) {
                serverId = quoted.remoteJid.split('@')[0];
                messageId = quoted.stanzaId;
            }
        }

        if (!serverId || !messageId) {
            throw new Error('Channel URL එකක් දෙන්න හෝ channel message එකකට reply කරන්න!');
        }

        if (emoji.length > 10) emoji = '❤️';

        await sock.sendMessage(`${serverId}@newsletter`, {
            react: {
                text: emoji,
                key: {
                    remoteJid: `${serverId}@newsletter`,
                    id: messageId,
                    fromMe: false
                }
            }
        });

        await sock.sendMessage(from, {
            text: `✅ Channel message එකට react කරා! ${emoji}\n\n> ${BOT_NAME}`
        }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(from, { text: `❌ ${e.message}` }, { quoted: msg });
    }
}, { public: true });

// =======================================================
// 10. ⚙️ SETTINGS
// =======================================================
register('settings', ['config'], async (ctx) => {
    const { sock, from, msg } = ctx;

    const uptime = process.uptime();
    const h = Math.floor(uptime / 3600);
    const m = Math.floor((uptime % 3600) / 60);
    const s = Math.floor(uptime % 60);
    const memMB = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);

    const text = `⚙️ *Bot Settings*\n\n` +
        `🤖 *Name:* ${BOT_NAME}\n` +
        `📱 *Owner:* +${OWNER_NUMBER}\n` +
        `🆔 *Session:* ${sock.user?.id?.split(':')[0] || 'N/A'}\n\n` +
        `⏱️ *Uptime:* ${h}h ${m}m ${s}s\n` +
        `💾 *Memory:* ${memMB} MB\n` +
        `📦 *Node:* ${process.version}\n` +
        `🖥️ *Platform:* ${process.platform}\n` +
        `⚡ *PID:* ${process.pid}\n\n` +
        `> ${BOT_NAME}`;

    await sock.sendMessage(from, { text }, { quoted: msg });
}, { public: true });

// =======================================================
// 11. 🔄 RESTART (Owner only)
// =======================================================
register('restart', ['reboot', 'rs'], async (ctx) => {
    const { sock, from, msg } = ctx;

    if (!checkOwner(ctx)) {
        return await sock.sendMessage(from, { text: '❌ Owner only!' }, { quoted: msg });
    }

    await sock.sendMessage(from, {
        text: `🔄 Restarting bot...\n⏱️ 5 seconds\n\n> ${BOT_NAME}`
    }, { quoted: msg });

    setTimeout(() => process.exit(0), 5000);
}, { public: false });

// =======================================================
// 12. 📋 MENU
// =======================================================
register('menu', ['help', 'commands'], async (ctx) => {
    const { sock, from, msg } = ctx;

    const text = `🔥 *${BOT_NAME} — Menu*\n\n` +
        `*📥 Downloads*\n` +
        `.ytmp3 / .yta — YouTube Audio\n` +
        `.ytmp4 / .ytv — YouTube Video\n\n` +
        `*🎬 Media*\n` +
        `.movie / .mv — Movie info + torrents\n` +
        `.game / .fitgirl — PC games\n\n` +
        `*👑 Owner*\n` +
        `.owner — Owner contact\n` +
        `.setowner — Set owner number\n` +
        `.broad — Broadcast (owner)\n` +
        `.chreact — Channel react\n` +
        `.settings — Bot settings\n` +
        `.restart — Restart bot\n` +
        `.update — Git pull\n\n` +
        `> POWERED BY ${BOT_NAME}`;

    await sock.sendMessage(from, { text }, { quoted: msg });
}, { public: true });
