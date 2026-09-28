// =======================================================
// 🔥 HACKER PRO — ULTRA NANO RAM + AUTO CLEAN
// Node.js 18+ | Owner: 94760601455
// =======================================================

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// ============ 🛡️ AUTO CRASH FIX ============
process.on('uncaughtException', (err) => console.error('🛡️ [CAUGHT]', err?.message || err));
process.on('unhandledRejection', (err) => console.error('🛡️ [REJECT]', err?.message || err));

// ============ 👑 CONFIG ============
let OWNER_NUMBER = '94760601455'; // 🔴 ඔයාගේ WhatsApp number
const BOT_NAME = 'HACKER PRO';

// =======================================================
// 🧠 ULTRA NANO RAM SYSTEM + AUTO CLEAN
// =======================================================
const RAM_CONFIG = {
    MAX_HEAP_MB: 180,           // RAM limit (MB) — මීට වැඩි නම් restart
    CHECK_INTERVAL_MS: 60000,   // හැම 60s කට check
    FORCE_GC: true,             // auto garbage collection
    CLEAN_LOGS: true,           // log files truncate
    CLEAN_TEMP: true,           // temp files delete
    WARN_LIMIT: 3               // warnings 3කට පස්සේ restart
};

let memoryWarnings = 0;
let lastCleanTime = Date.now();

function getRAM() {
    return parseFloat((process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2));
}

function logRAM(tag = '') {
    const used = getRAM();
    console.log(`💾 [RAM${tag}] ${used} MB`);
    return used;
}

// RAM check + auto GC + auto restart
function checkMemory() {
    const used = getRAM();
    if (used > RAM_CONFIG.MAX_HEAP_MB) {
        memoryWarnings++;
        console.log(`⚠️ [RAM] ${used}MB > ${RAM_CONFIG.MAX_HEAP_MB}MB (warning ${memoryWarnings}/${RAM_CONFIG.WARN_LIMIT})`);

        if (RAM_CONFIG.FORCE_GC && global.gc) {
            global.gc();
            console.log(`🧹 [GC] Forced — now ${getRAM()}MB`);
        }

        if (memoryWarnings >= RAM_CONFIG.WARN_LIMIT) {
            console.log('🛑 [RAM] Restarting due to high memory...');
            setTimeout(() => process.exit(0), 2000);
        }
    } else {
        memoryWarnings = 0;
    }
}

// Temp files clean
function cleanTempFiles() {
    if (!RAM_CONFIG.CLEAN_TEMP) return;
    const dirs = ['./tmp', './temp', './cache', './auth_info/temp', './sessions/temp'];
    for (const dir of dirs) {
        try {
            if (fs.existsSync(dir)) {
                const files = fs.readdirSync(dir);
                let removed = 0;
                for (const f of files) {
                    try {
                        const fp = path.join(dir, f);
                        const stat = fs.statSync(fp);
                        // 1 hour පරණ files delete
                        if (Date.now() - stat.mtimeMs > 3600000) {
                            fs.unlinkSync(fp);
                            removed++;
                        }
                    } catch {}
                }
                if (removed) console.log(`🧹 [CLEAN] ${dir}: ${removed} files removed`);
            }
        } catch {}
    }
}

// Log files clean (5MB+ truncate)
function cleanLogs() {
    if (!RAM_CONFIG.CLEAN_LOGS) return;
    const dirs = ['./logs', './.logs'];
    for (const dir of dirs) {
        try {
            if (fs.existsSync(dir)) {
                const files = fs.readdirSync(dir);
                for (const f of files) {
                    try {
                        const fp = path.join(dir, f);
                        const stat = fs.statSync(fp);
                        if (stat.size > 5 * 1024 * 1024) {
                            fs.writeFileSync(fp, '');
                            console.log(`🧹 [LOG] Truncated ${fp}`);
                        }
                    } catch {}
                }
            }
        } catch {}
    }
}

// Cache clear (application-level)
function cleanCache() {
    if (global.cache) global.cache = {};
    if (global.downloadsCache) global.downloadsCache = {};
    if (global.tempStore) global.tempStore = {};
}

// Auto clean timer
function startAutoClean() {
    setInterval(() => {
        checkMemory();
        cleanTempFiles();
        cleanLogs();
        cleanCache();
        if (RAM_CONFIG.FORCE_GC && global.gc) global.gc();
        lastCleanTime = Date.now();
    }, RAM_CONFIG.CHECK_INTERVAL_MS);

    console.log(`🧹 Auto Clean: every ${RAM_CONFIG.CHECK_INTERVAL_MS / 1000}s | Max RAM: ${RAM_CONFIG.MAX_HEAP_MB}MB`);
}

// Start clean system
setTimeout(startAutoClean, 5000);
logRAM(' [START]');

// ============ 🛡️ SAFE FETCH (Nano RAM) ============
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
    const s = await sock.sendMessage(from, { text: '🔄 Downloading Facebook...' }, { quoted: msg });

    try {
        const url = args[0];
        if (!url.includes('facebook.com') && !url.includes('fb.watch')) throw new Error('Facebook URL එකක් දෙන්න!');

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
            video: { url: dl }, mimetype: 'video/mp4',
            caption: '> POWERED BY HACKER PRO'
        }, { quoted: msg });
        await sock.sendMessage(from, { delete: s.key }).catch(() => {});
    } catch (e) {
        await sock.sendMessage(from, { text: `❌ ${e.message}`, edit: s.key });
    }
}, { public: true });

// =======================================================
// 4. 🎵 TIKTOK DOWNLOADER
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
        if (!dl) dl = await ytdlpOnly(url, 'video');
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
        const dl = await ytdlpOnly(url, 'video');
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
    const s = await sock.sendMessage(from, { text: '🎨 Generating...' }, { quoted: msg });

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
// 10. 😄 JOKE
// =======================================================
register('joke', ['jokes'], async (ctx) => {
    const { sock, from, msg } = ctx;
    try {
        const r = await safeJson('https://official-joke-api.appspot.com/random_joke');
        if (!r?.setup) throw new Error('හම්බුනේ නෑ!');
        await sock.sendMessage(from, {
            text: `😄 *Joke*\n\n${r.setup}\n\n||${r.punchline}||\n\n> ${BOT_NAME}`
        }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(from, { text: `❌ ${e.message}` }, { quoted: msg });
    }
}, { public: true });

// =======================================================
// 11. 💬 QUOTE
// =======================================================
register('quote', ['quotes'], async (ctx) => {
    const { sock, from, msg } = ctx;
    try {
        const r = await safeJson('https://zenquotes.io/api/random');
        const q = r?.[0];
        if (!q?.q) throw new Error('හම්බුනේ නෑ!');
        await sock.sendMessage(from, {
            text: `💬 *Quote*\n\n"${q.q}"\n\n— ${q.a}\n\n> ${BOT_NAME}`
        }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(from, { text: `❌ ${e.message}` }, { quoted: msg });
    }
}, { public: true });

// =======================================================
// 12. 🎤 LYRICS
// =======================================================
register('lyrics', ['ly'], async (ctx) => {
    const { sock, from, msg, args } = ctx;
    if (!args[0]) return await sock.sendMessage(from, { text: '🎤 Usage: .lyrics <song name>' }, { quoted: msg });
    const s = await sock.sendMessage(from, { text: '🔄 Searching lyrics...' }, { quoted: msg });

    try {
        const q = args.join(' ');
        const r = await safeJson(`https://api.lyrics.ovh/suggest/${encodeURIComponent(q)}`);
        const f = r?.data?.[0];
        if (!f) throw new Error('හම්බුනේ නෑ!');

        const ly = await safeJson(`https://api.lyrics.ovh/v1/${encodeURIComponent(f.artist.name)}/${encodeURIComponent(f.title)}`);
        if (!ly?.lyrics) throw new Error('Lyrics හම්බුනේ නෑ!');

        await sock.sendMessage(from, {
            text: `🎤 *${f.title}*\n🎙️ ${f.artist.name}\n\n${ly.lyrics.slice(0, 3000)}\n\n> ${BOT_NAME}`,
            edit: s.key
        });
    } catch (e) {
        await sock.sendMessage(from, { text: `❌ ${e.message}`, edit: s.key });
    }
}, { public: true });

// =======================================================
// 13. 🌐 TRANSLATE
// =======================================================
register('translate', ['tr'], async (ctx) => {
    const { sock, from, msg, args } = ctx;
    if (!args[0]) return await sock.sendMessage(from, { text: '🌐 Usage: .tr si Hello world' }, { quoted: msg });
    const s = await sock.sendMessage(from, { text: '🔄 Translating...' }, { quoted: msg });

    try {
        let to = 'en', text = args.join(' ');
        if (args[0].length <= 3) { to = args[0]; text = args.slice(1).join(' '); }
        if (!text) throw new Error('Text එකක් දෙන්න!');

        const r = await safeJson(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${to}&dt=t&q=${encodeURIComponent(text)}`);
        if (!r?.[0]) throw new Error('Translate කරන්න බෑ!');
        const out = r[0].map(x => x[0]).join('');
        await sock.sendMessage(from, { text: `🌐 *Translation (${to})*\n\n${out}\n\n> ${BOT_NAME}`, edit: s.key });
    } catch (e) {
        await sock.sendMessage(from, { text: `❌ ${e.message}`, edit: s.key });
    }
}, { public: true });

// =======================================================
// 14. 📚 WIKIPEDIA
// =======================================================
register('wiki', ['wikipedia'], async (ctx) => {
    const { sock, from, msg, args } = ctx;
    if (!args[0]) return await sock.sendMessage(from, { text: '📚 Usage: .wiki <topic>' }, { quoted: msg });
    const s = await sock.sendMessage(from, { text: '🔄 Searching...' }, { quoted: msg });

    try {
        const q = args.join(' ');
        const r = await safeJson(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(q)}`);
        if (!r?.extract) throw new Error('හම්බුනේ නෑ!');

        let text = `📚 *${r.title}*\n\n${r.extract.slice(0, 1500)}\n\n`;
        if (r.content_urls?.desktop?.page) text += `🔗 ${r.content_urls.desktop.page}\n`;
        text += `\n> ${BOT_NAME}`;

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

// =======================================================
// 15. 👑 OWNER
// =======================================================
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

    await sock.sendMessage(from, {
        text: `👑 *Owner*\n\n📱 +${OWNER_NUMBER}\n🤖 ${BOT_NAME}\n\n> ${BOT_NAME}`
    }, { quoted: msg });
}, { public: true });

// =======================================================
// 16. 📢 BROADCAST (owner)
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
                await sock.sendMessage(id, {
                    text: `📢 *BROADCAST*\n\n${args.join(' ')}\n\n> ${BOT_NAME}`
                });
                sent++;
                await new Promise(r => setTimeout(r, 1500));
            } catch { fail++; }
        }
        await sock.sendMessage(from, {
            text: `✅ Sent: ${sent}\n❌ Failed: ${fail}\n📊 Total: ${ids.length}`,
            edit: s.key
        });
    } catch (e) {
        await sock.sendMessage(from, { text: `❌ ${e.message}`, edit: s.key });
    }
}, { public: false });

// =======================================================
// 17. 💬 CHANNEL REACT
// =======================================================
register('chreact', ['creact'], async (ctx) => {
    const { sock, from, msg, args } = ctx;
    if (!args[0]) return await sock.sendMessage(from, {
        text: '💬 Usage: .chreact <emoji> <channel_msg_url>\nOr reply to channel msg with .chreact <emoji>'
    }, { quoted: msg });

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
        if (!serverId || !messageId) throw new Error('Channel URL එකක් දෙන්න!');
        if (emoji.length > 10) emoji = '❤️';

        await sock.sendMessage(`${serverId}@newsletter`, {
            react: {
                text: emoji,
                key: { remoteJid: `${serverId}@newsletter`, id: messageId, fromMe: false }
            }
        });
        await sock.sendMessage(from, { text: `✅ Reacted! ${emoji}` }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(from, { text: `❌ ${e.message}` }, { quoted: msg });
    }
}, { public: true });

// =======================================================
// 18. ⚙️ SETTINGS (with RAM info)
// =======================================================
register('settings', ['config'], async (ctx) => {
    const { sock, from, msg } = ctx;
    const up = process.uptime();
    const h = Math.floor(up / 3600);
    const m = Math.floor((up % 3600) / 60);
    const s = Math.floor(up % 60);
    const mem = getRAM();

    await sock.sendMessage(from, {
        text: `⚙️ *Settings*\n\n🤖 ${BOT_NAME}\n📱 +${OWNER_NUMBER}\n\n` +
              `⏱️ Uptime: ${h}h ${m}m ${s}s\n` +
              `💾 RAM: ${mem} MB / ${RAM_CONFIG.MAX_HEAP_MB} MB\n` +
              `🧹 Auto Clean: ${RAM_CONFIG.CHECK_INTERVAL_MS / 1000}s\n` +
              `📦 Node: ${process.version}\n` +
              `⚡ PID: ${process.pid}\n\n> ${BOT_NAME}`
    }, { quoted: msg });
}, { public: true });

// =======================================================
// 19. 🏓 PING
// =======================================================
register('ping', ['speed'], async (ctx) => {
    const { sock, from, msg } = ctx;
    const t = Date.now();
    const s = await sock.sendMessage(from, { text: '🏓 Pinging...' }, { quoted: msg });
    await sock.sendMessage(from, { text: `⚡ Pong! ${Date.now() - t}ms\n💾 RAM: ${getRAM()}MB\n\n> ${BOT_NAME}`, edit: s.key });
}, { public: true });

// =======================================================
// 20. 🧹 CLEAR RAM (owner)
// =======================================================
register('gc', ['ram', 'clearcache'], async (ctx) => {
    const { sock, from, msg } = ctx;
    if (!isOwner(ctx)) return await sock.sendMessage(from, { text: '❌ Owner only!' }, { quoted: msg });

    const before = getRAM();
    if (global.gc) global.gc();
    cleanTempFiles();
    cleanCache();
    const after = getRAM();

    await sock.sendMessage(from, {
        text: `🧹 *RAM Cleaned*\n\nBefore: ${before} MB\nAfter: ${after} MB\nSaved: ${(before - after).toFixed(2)} MB\n\n> ${BOT_NAME}`
    }, { quoted: msg });
}, { public: false });

// =======================================================
// 21
