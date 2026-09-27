// =======================================================
// 🔥 HACKER PRO — CLEAN INDEX (Auto-Fix + Nano RAM)
// Node.js 18+ | Zero Install | Zero Storage
// =======================================================

const { exec } = require('child_process');

// ============ 🛡️ AUTO CRASH FIX ============
process.on('uncaughtException', (err) => console.error('🛡️ [CAUGHT]', err?.message || err));
process.on('unhandledRejection', (err) => console.error('🛡️ [REJECT]', err?.message || err));

// ============ 👑 CONFIG ============
let OWNER_NUMBER = '94771234567'; // 🔴 ඔයාගේ WhatsApp number (country code, + නැතුව)
const BOT_NAME = 'HACKER PRO';

// ============ 🛡️ SAFE FETCH (Nano RAM) ============
async function safeJson(url) {
    try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 25000);
        const res = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            signal: ctrl.signal
        });
        clearTimeout(t);
        if (!res.ok) return null;
        const txt = await res.text();
        try { return JSON.parse(txt); } catch { return null; }
    } catch { return null; }
}

async function safeText(url) {
    try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 25000);
        const res = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            signal: ctrl.signal
        });
        clearTimeout(t);
        if (!res.ok) return null;
        return await res.text();
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
    return await new Promise((resolve) => {
        const fmt = mode === 'audio'
            ? 'bestaudio[ext=m4a]/bestaudio/best'
            : 'bv*[ext=mp4]+ba[ext=m4a]/b';
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
// 1. 🎵 YOUTUBE AUDIO
// =======================================================
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
// 2. 🎬 YOUTUBE VIDEO
// =======================================================
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
// 3. 📘 FACEBOOK DOWNLOADER
// =======================================================
register('fb', ['fbdl', 'facebook'], async (ctx) => {
    const { sock, from, msg, args } = ctx;
    if (!args[0]) return await sock.sendMessage(from, { text: '📘 Usage: .fb <facebook URL>' }, { quoted: msg });
    const s = await sock.sendMessage(from, { text: '🔄 Downloading Facebook video...' }, { quoted: msg });

    try {
        const url = args[0];
        if (!url.includes('facebook.com') && !url.includes('fb.watch')) throw new Error('Facebook URL එකක් දෙන්න!');

        const apis = [
            `https://api.nyxs.pw/dl/facebook?url=${encodeURIComponent(url)}`,
            `https://api.zenkey.my.id/download/facebook?url=${encodeURIComponent(url)}`
        ];
        let dl = null;
        for (const a of apis) {
            const r = await safeJson(a);
            dl = pickUrl(r) || r?.download_url || r?.video_hd || r?.hd;
            if (dl) break;
        }
        if (!dl) dl = await ytDownload(url, 'video');
        if (!dl) throw new Error('Download link එක ගන්න බෑ.');

        await sock.sendMessage(from, {
            video: { url: dl }, mimetype: 'video/mp4',
            caption: '> POWERED BY HACKER PRO'
        }, { quoted: msg });
        await sock.sendMessage(from, { delete: s.key }).catch(() => {});
    } catch (e) {
        await sock.sendMessage(from, { text: `❌ ${e.message}`, edit: s.key });
    }
}, { public: true });

// =======================================================
// 4. 🎵 TIKTOK DOWNLOADER (no watermark)
// =======================================================
register('tt', ['ttdl', 'tiktok'], async (ctx) => {
    const { sock, from, msg, args } = ctx;
    if (!args[0]) return await sock.sendMessage(from, { text: '🎵 Usage: .tt <tiktok URL>' }, { quoted: msg });
    const s = await sock.sendMessage(from, { text: '🔄 Downloading TikTok...' }, { quoted: msg });

    try {
        const url = args[0];
        if (!url.includes('tiktok')) throw new Error('TikTok URL එකක් දෙන්න!');

        const r = await safeJson(`https://tikwm.com/api/?url=${encodeURIComponent(url)}`);
        let dl = r?.data?.play || r?.data?.hdplay || r?.data?.wmplay;
        if (!dl) dl = await ytDownload(url, 'video');
        if (!dl) throw new Error('Download link එක ගන්න බෑ.');

        await sock.sendMessage(from, {
            video: { url: dl }, mimetype: 'video/mp4',
            caption: '> POWERED BY HACKER PRO'
        }, { quoted: msg });
        await sock.sendMessage(from, { delete: s.key }).catch(() => {});
    } catch (e) {
        await sock.sendMessage(from, { text: `❌ ${e.message}`, edit: s.key });
    }
}, { public: true });

// =======================================================
// 5. 📸 INSTAGRAM DOWNLOADER
// =======================================================
register('ig', ['igdl', 'instagram'], async (ctx) => {
    const { sock, from, msg, args } = ctx;
    if (!args[0]) return await sock.sendMessage(from, { text: '📸 Usage: .ig <instagram URL>' }, { quoted: msg });
    const s = await sock.sendMessage(from, { text: '🔄 Downloading Instagram...' }, { quoted: msg });

    try {
        const url = args[0];
        if (!url.includes('instagram.com')) throw new Error('Instagram URL එකක් දෙන්න!');
        const dl = await ytDownload(url, 'video');
        if (!dl) throw new Error('Download link එක ගන්න බෑ.');

        await sock.sendMessage(from, {
            video: { url: dl }, mimetype: 'video/mp4',
            caption: '> POWERED BY HACKER PRO'
        }, { quoted: msg });
        await sock.sendMessage(from, { delete: s.key }).catch(() => {});
    } catch (e) {
        await sock.sendMessage(from, { text: `❌ ${e.message}`, edit: s.key });
    }
}, { public: true });

// =======================================================
// 6. 🤖 AI CHAT
// =======================================================
register('ai', ['gpt', 'chat'], async (ctx) => {
    const { sock, from, msg, args } = ctx;
    if (!args[0]) return await sock.sendMessage(from, { text: '🤖 Usage: .ai <question>' }, { quoted: msg });
    const s = await sock.sendMessage(from, { text: '🤔 Thinking...' }, { quoted: msg });

    try {
        const q = args.join(' ');
        const apis = [
            `https://api.nyxs.pw/ai/gpt4?text=${encodeURIComponent(q)}`,
            `https://api.zenkey.my.id/ai/gpt?q=${encodeURIComponent(q)}`,
            `https://api.vreden.my.id/api/ai?query=${encodeURIComponent(q)}`
        ];
        let ans = null;
        for (const a of apis) {
            const r = await safeJson(a);
            ans = r?.result || r?.data || r?.answer || r?.message || r?.response;
            if (typeof ans === 'object') ans = ans?.text || ans?.message;
            if (ans && typeof ans === 'string') break;
            ans = null;
        }
        if (!ans) throw new Error('AI response එකක් ගන්න බෑ!');
        await sock.sendMessage(from, { text: `🤖 *AI*\n\n${ans.slice(0, 3000)}\n\n> ${BOT_NAME}`, edit: s.key });
    } catch (e) {
        await sock.sendMessage(from, { text: `❌ ${e.message}`, edit: s.key });
    }
}, { public: true });

// =======================================================
// 7. 🎨 AI IMAGE GENERATE
// =======================================================
register('imagine', ['img', 'gen'], async (ctx) => {
    const { sock, from, msg, args } = ctx;
    if (!args[0]) return await sock.sendMessage(from, { text: '🎨 Usage: .imagine <prompt>' }, { quoted: msg });
    const s = await sock.sendMessage(from, { text: '🎨 Generating image...' }, { quoted: msg });

    try {
        const prompt = args.join(' ');
        const img = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true&seed=${Date.now()}`;
        await sock.sendMessage(from, { image: { url: img }, caption: `🎨 *${prompt}*\n\n> ${BOT_NAME}` }, { quoted: msg });
        await sock.sendMessage(from, { delete: s.key }).catch(() => {});
    } catch (e) {
        await sock.sendMessage(from, { text: `❌ ${e.message}`, edit: s.key });
    }
}, { public: true });

// =======================================================
// 8. 🌤️ WEATHER
// =======================================================
register('weather', ['wthr'], async (ctx) => {
    const { sock, from, msg, args } = ctx;
    const city = args.join(' ') || 'Colombo';
    const s = await sock.sendMessage(from, { text: `🔄 Fetching ${city}...` }, { quoted: msg });

    try {
        const r = await safeJson(`https://wttr.in/${encodeURIComponent(city)}?format=j1`);
        const c = r?.current_condition?.[0];
        if (!c) throw new Error('City එක හම්බුනේ නෑ!');

        let text = `🌤️ *Weather: ${city}*\n\n`;
        text += `🌡️ Temp: ${c.temp_C}°C (feels ${c.FeelsLikeC}°C)\n`;
        text += `☁️ ${c.weatherDesc[0].value}\n`;
        text += `💧 Humidity: ${c.humidity}%\n`;
        text += `💨 Wind: ${c.windspeedKmph} km/h\n\n> ${BOT_NAME}`;
        await sock.sendMessage(from, { text, edit: s.key });
    } catch (e) {
        await sock.sendMessage(from, { text: `❌ ${e.message}`, edit: s.key });
    }
}, { public: true });

// =======================================================
// 9. 😂 MEME
// =======================================================
register('meme', ['memes'], async (ctx) => {
    const { sock, from, msg } = ctx;
    const s = await sock.sendMessage(from, { text: '🔄 Fetching meme...' }, { quoted: msg });
    try {
        const r = await safeJson('https://meme-api.com/gimme');
        if (!r?.url) throw new Error('Meme එකක් හම්බුනේ නෑ!');
        await sock.sendMessage(from, { image: { url: r.url }, caption: `😂 ${r.title || 'Meme'}\n\n> ${BOT_NAME}` }, { quoted: msg });
        await sock.sendMessage(from, { delete: s.key }).catch(() => {});
    } catch (e) {
        await sock.sendMessage(from, { text: `❌ ${e.message}`, edit: s.key });
    }
}, { public: true });

// =======================================================
// 10. 👑 OWNER & SYSTEM COMMANDS (.update etc.)
// =======================================================
register('update', ['up'], async (ctx) => {
    const { sock, from, msg } = ctx;
    const s = await sock.sendMessage(from, { text: '🔄 Checking updates...' }, { quoted: msg });
    exec('git pull', async (err, stdout, stderr) => {
        if (err) return await sock.sendMessage(from, { text: `❌ ${stderr || err.message}`, edit: s.key });
        if (stdout.includes('Already up to date')) return await sock.sendMessage(from, { text: '✅ Already up to date!', edit: s.key });
        await sock.sendMessage(from, { text: `✅ Updated Successfully!\n\n${stdout}`, edit: s.key });
    });
}, { public: false });

register('restart', ['reboot', 'rs'], async (ctx) => {
    const { sock, from, msg } = ctx;
    if (!isOwner(ctx)) return await sock.sendMessage(from, { text: '❌ Owner only!' }, { quoted: msg });
    await sock.sendMessage(from, { text: `🔄 Restarting in 5s...` }, { quoted: msg });
    setTimeout(() => process.exit(0), 5000);
}, { public: false });

// =======================================================
// 11. 📋 MENU
// =======================================================
register('menu', ['help', 'commands'], async (ctx) => {
    const { sock, from, msg } = ctx;
    const text = `🔥 *${BOT_NAME} — Menu*\n\n` +
        `*📥 Downloads*\n` +
        `.ytmp3 — YouTube Audio\n` +
        `.ytmp4 — YouTube Video\n` +
        `.fb — Facebook Downloader\n` +
        `.tt — TikTok Downloader\n` +
        `.ig — Instagram Downloader\n\n` +
        `*🤖 AI & Tools*\n` +
        `.ai — AI Chat\n` +
        `.imagine — AI Image Gen\n` +
        `.weather — Weather Info\n` +
        `.meme — Random Meme\n\n` +
        `*👑 Owner Commands*\n` +
        `.update — Git pull (Latest code)\n` +
        `.restart — Restart Bot\n\n` +
        `> POWERED BY ${BOT_NAME}`;
    await sock.sendMessage(from, { text }, { quoted: msg });
}, { public: true });
