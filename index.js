// =======================================================
// ZERO-STORAGE & NO-MODULE COMMANDS (FAABLE OPTIMIZED)
// =======================================================

// 1. YouTube Audio (ytmp3 / song)
register('ytmp3', ['yta', 'song'], async (ctx) => {
    const { sock, from, msg, args } = ctx;
    if (!args[0]) return await sock.sendMessage(from, { text: '🎵 Usage: .ytmp3 <name/url>' }, { quoted: msg });
    const status = await sock.sendMessage(from, { text: '🔄 Downloading Audio...' }, { quoted: msg });
    try {
        let url = args.join(" ");
        if (!url.includes("youtu")) {
            const sr = await (await fetch(`https://api.vreden.my.id/api/ytsearch?query=${encodeURIComponent(url)}`)).json();
            if (!sr.result || !sr.result[0]) throw new Error('Not found!');
            url = sr.result[0].url;
        }
        const dl = await (await fetch(`https://api.vreden.my.id/api/ytmp3?url=${encodeURIComponent(url)}`)).json();
        const audioUrl = dl.result?.download?.url || dl.result?.url;
        if (!audioUrl) throw new Error('API Error!');
        await sock.sendMessage(from, { audio: { url: audioUrl }, mimetype: 'audio/mpeg' }, { quoted: msg });
        await sock.sendMessage(from, { delete: status.key }).catch(() => {});
    } catch (e) {
        await sock.sendMessage(from, { text: `❌ Error: ${e.message}`, edit: status.key });
    }
}, { public: true });

// 2. YouTube Video (ytmp4 / video)
register('ytmp4', ['ytv', 'video'], async (ctx) => {
    const { sock, from, msg, args } = ctx;
    if (!args[0]) return await sock.sendMessage(from, { text: '🎬 Usage: .ytmp4 <name/url>' }, { quoted: msg });
    const status = await sock.sendMessage(from, { text: '🔄 Downloading Video...' }, { quoted: msg });
    try {
        let url = args.join(" ");
        if (!url.includes("youtu")) {
            const sr = await (await fetch(`https://api.vreden.my.id/api/ytsearch?query=${encodeURIComponent(url)}`)).json();
            if (!sr.result || !sr.result[0]) throw new Error('Not found!');
            url = sr.result[0].url;
        }
        const dl = await (await fetch(`https://api.vreden.my.id/api/ytmp4?url=${encodeURIComponent(url)}`)).json();
        const videoUrl = dl.result?.download?.url || dl.result?.url;
        if (!videoUrl) throw new Error('API Error!');
        await sock.sendMessage(from, { video: { url: videoUrl }, caption: '> POWERED BY HACKER PRO' }, { quoted: msg });
        await sock.sendMessage(from, { delete: status.key }).catch(() => {});
    } catch (e) {
        await sock.sendMessage(from, { text: `❌ Error: ${e.message}`, edit: status.key });
    }
}, { public: true });

// 3. Facebook Download (fb)
register('fb', ['facebook'], async (ctx) => {
    const { sock, from, msg, args } = ctx;
    if (!args[0]) return await sock.sendMessage(from, { text: '📥 Usage: .fb <url>' }, { quoted: msg });
    const status = await sock.sendMessage(from, { text: '🔄 Downloading FB Video...' }, { quoted: msg });
    try {
        const dl = await (await fetch(`https://api.vreden.my.id/api/facebook?url=${encodeURIComponent(args[0])}`)).json();
        const videoUrl = dl.result?.hd || dl.result?.sd || dl.url;
        if (!videoUrl) throw new Error('Not found!');
        await sock.sendMessage(from, { video: { url: videoUrl }, caption: '> POWERED BY HACKER PRO' }, { quoted: msg });
        await sock.sendMessage(from, { delete: status.key }).catch(() => {});
    } catch (e) {
        await sock.sendMessage(from, { text: `❌ Error: ${e.message}`, edit: status.key });
    }
}, { public: true });

// 4. Instagram Download (ig)
register('ig', ['instagram'], async (ctx) => {
    const { sock, from, msg, args } = ctx;
    if (!args[0]) return await sock.sendMessage(from, { text: '📥 Usage: .ig <url>' }, { quoted: msg });
    const status = await sock.sendMessage(from, { text: '🔄 Downloading IG Video...' }, { quoted: msg });
    try {
        const dl = await (await fetch(`https://api.vreden.my.id/api/igdl?url=${encodeURIComponent(args[0])}`)).json();
        const videoUrl = dl.result?.[0]?.url || dl.url;
        if (!videoUrl) throw new Error('Not found!');
        await sock.sendMessage(from, { video: { url: videoUrl }, caption: '> POWERED BY HACKER PRO' }, { quoted: msg });
        await sock.sendMessage(from, { delete: status.key }).catch(() => {});
    } catch (e) {
        await sock.sendMessage(from, { text: `❌ Error: ${e.message}`, edit: status.key });
    }
}, { public: true });

// 5. FitGirl Repacks (fg) - Regex (No Cheerio)
register('fitgirl', ['fg'], async (ctx) => {
    const { sock, from, msg, args } = ctx;
    if (!args.length) return await sock.sendMessage(from, { text: '🎮 Usage: .fitgirl <game>' }, { quoted: msg });
    const query = args.join(" ");
    const status = await sock.sendMessage(from, { text: `🎮 Searching: ${query}...` }, { quoted: msg });
    try {
        const html = await (await fetch(`https://fitgirl-repacks.site/?s=${encodeURIComponent(query)}`, { headers: { 'User-Agent': 'Mozilla/5.0' }})).text();
        const regex = /<h1 class="entry-title"><a href="([^"]+)" rel="bookmark">([^<]+)<\/a><\/h1>/g;
        let match, text = `🎮 *FitGirl Repacks*\n🔍 ${query}\n\n`, count = 1;
        while ((match = regex.exec(html)) !== null && count <= 5) {
            text += `*${count++}.* ${match[2].replace(/&#\d+;/g, "")}\n🔗 ${match[1]}\n\n`;
        }
        if (count === 1) throw new Error('Game not found!');
        await sock.sendMessage(from, { text: text + `> POWERED BY HACKER PRO`, edit: status.key });
    } catch (e) {
        await sock.sendMessage(from, { text: `❌ Error: ${e.message}`, edit: status.key });
    }
}, { public: true });

// 6. AnimeClub Search (anime) - Regex (No Cheerio)
register('animeclub', ['anime'], async (ctx) => {
    const { sock, from, msg, args } = ctx;
    if (!args.length) return await sock.sendMessage(from, { text: '🌸 Usage: .animeclub <anime>' }, { quoted: msg });
    const query = args.join(" ");
    const status = await sock.sendMessage(from, { text: `🌸 Searching: ${query}...` }, { quoted: msg });
    try {
        const html = await (await fetch(`https://animeclub.lk/?s=${encodeURIComponent(query)}`, { headers: { 'User-Agent': 'Mozilla/5.0' }})).text();
        const regex = /<a href="(https:\/\/animeclub\.lk\/(?:anime|tvshows|movies)\/[^"]+)"[^>]*>([^<]+)<\/a>/gi;
        let match, text = `🌸 *AnimeClub Search*\n🔍 ${query}\n\n`, count = 1, seen = new Set();
        while ((match = regex.exec(html)) !== null && count <= 7) {
            let link = match[1], title = match[2].trim();
            if (title.length > 2 && !title.includes("<img") && !seen.has(link)) {
                seen.add(link);
                text += `*${count++}.* ${title}\n🔗 ${link}\n\n`;
            }
        }
        if (count === 1) throw new Error('Anime not found!');
        await sock.sendMessage(from, { text: text + `> POWERED BY HACKER PRO`, edit: status.key });
    } catch (e) {
        await sock.sendMessage(from, { text: `❌ Error: ${e.message}`, edit: status.key });
    }
}, { public: true });
