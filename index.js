// =======================================================
// 🔥 HACKER PRO - ULTIMATE ZERO-ERROR COMMANDS (FAABLE)
// =======================================================

const { exec } = require('child_process');

// 🛡️ Safe Fetch (Crash wena eka nawaththana main function eka)
async function safeFetchJson(url) {
    try {
        const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (!res.ok) return null;
        return await res.json();
    } catch (e) {
        return null;
    }
}

async function safeFetchText(url) {
    try {
        const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (!res.ok) return null;
        return await res.text();
    } catch (e) {
        return null;
    }
}

// 🔄 1. UPDATE COMMAND (GitHub eken aluth code eka ganna)
register('update', ['up'], async (ctx) => {
    const { sock, from, msg } = ctx;
    const status = await sock.sendMessage(from, { text: '🔄 Checking for updates...' }, { quoted: msg });
    
    exec('git pull', async (err, stdout, stderr) => {
        if (err) {
            return await sock.sendMessage(from, { text: `❌ Update Failed:\n\n${stderr}`, edit: status.key });
        }
        if (stdout.includes('Already up to date.')) {
            return await sock.sendMessage(from, { text: '✅ Bot is already up to date!', edit: status.key });
        }
        await sock.sendMessage(from, { text: `✅ Update Successful! Restarting bot...\n\n> Changes:\n${stdout}`, edit: status.key });
    });
}, { public: false }); // Meka bot owner ta witharak wada karanna false danna.

// 🎵 2. YOUTUBE AUDIO (No Storage)
register('ytmp3', ['yta', 'song'], async (ctx) => {
    const { sock, from, msg, args } = ctx;
    if (!args[0]) return await sock.sendMessage(from, { text: '🎵 Usage: .ytmp3 <name or link>' }, { quoted: msg });
    const status = await sock.sendMessage(from, { text: '🔄 Downloading Audio...' }, { quoted: msg });
    
    try {
        let url = args.join(" ");
        if (!url.includes("youtu")) {
            const search = await safeFetchJson(`https://api.vreden.my.id/api/ytsearch?query=${encodeURIComponent(url)}`);
            if (!search || !search.result || !search.result[0]) throw new Error('Song eka hoyaganna ba!');
            url = search.result[0].url;
        }

        const dl = await safeFetchJson(`https://api.vreden.my.id/api/ytmp3?url=${encodeURIComponent(url)}`);
        const audioUrl = dl?.result?.download?.url || dl?.result?.url || dl?.url;
        if (!audioUrl) throw new Error('API Error! Puluwan nam direct link ekak danna.');

        await sock.sendMessage(from, { 
            audio: { url: audioUrl }, 
            mimetype: 'audio/mpeg',
            ptt: false 
        }, { quoted: msg });
        
        await sock.sendMessage(from, { delete: status.key }).catch(() => {});
    } catch (e) {
        await sock.sendMessage(from, { text: `❌ Error: ${e.message}`, edit: status.key });
    }
}, { public: true });

// 🎬 3. YOUTUBE VIDEO (Document stream - NO limit crash)
register('ytmp4', ['ytv', 'video'], async (ctx) => {
    const { sock, from, msg, args } = ctx;
    if (!args[0]) return await sock.sendMessage(from, { text: '🎬 Usage: .ytmp4 <name or link>' }, { quoted: msg });
    const status = await sock.sendMessage(from, { text: '🔄 Downloading Video...' }, { quoted: msg });
    
    try {
        let url = args.join(" ");
        let title = "Video";
        
        if (!url.includes("youtu")) {
            const search = await safeFetchJson(`https://api.vreden.my.id/api/ytsearch?query=${encodeURIComponent(url)}`);
            if (!search || !search.result || !search.result[0]) throw new Error('Video eka hoyaganna ba!');
            url = search.result[0].url;
            title = search.result[0].title;
        }

        const dl = await safeFetchJson(`https://api.vreden.my.id/api/ytmp4?url=${encodeURIComponent(url)}`);
        const videoUrl = dl?.result?.download?.url || dl?.result?.url || dl?.url;
        if (!videoUrl) throw new Error('API Error! Puluwan nam direct link ekak danna.');

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

// 🎥 4. MOVIE COMMAND (YTS API - Highly Stable)
register('movie', ['mv', 'film'], async (ctx) => {
    const { sock, from, msg, args } = ctx;
    if (!args[0]) return await sock.sendMessage(from, { text: '🎥 Usage: .movie <name>' }, { quoted: msg });
    const status = await sock.sendMessage(from, { text: '🔄 Searching Movie...' }, { quoted: msg });

    try {
        const query = args.join(" ");
        // YTS API eka godak stable, crash wenne na
        const data = await safeFetchJson(`https://yts.mx/api/v2/list_movies.json?query_term=${encodeURIComponent(query)}&limit=1`);
        
        if (!data || !data.data || !data.data.movies || data.data.movies.length === 0) {
            throw new Error('Movie eka hambune na!');
        }

        const movie = data.data.movies[0];
        let text = `🎥 *${movie.title} (${movie.year})*\n\n`;
        text += `⭐ Rating: ${movie.rating}/10\n`;
        text += `⏱️ Runtime: ${movie.runtime} min\n`;
        text += `🎭 Genres: ${movie.genres ? movie.genres.join(', ') : 'N/A'}\n\n`;
        text += `📝 *Summary:*\n${movie.summary.substring(0, 300)}...\n\n`;
        
        text += `📥 *Download Links (Torrents):*\n`;
        if (movie.torrents) {
            movie.torrents.forEach(t => {
                text += `🔗 ${t.quality} (${t.size}):\n${t.url}\n\n`;
            });
        }
        text += `> POWERED BY HACKER PRO`;

        await sock.sendMessage(from, { 
            image: { url: movie.medium_cover_image }, 
            caption: text 
        }, { quoted: msg });
        
        await sock.sendMessage(from, { delete: status.key }).catch(() => {});
    } catch (e) {
        await sock.sendMessage(from, { text: `❌ Error: ${e.message}`, edit: status.key });
    }
}, { public: true });

// 🎮 5. GAME COMMAND (FitGirl Regex Scraper - Crash Free)
register('game', ['fitgirl', 'fg'], async (ctx) => {
    const { sock, from, msg, args } = ctx;
    if (!args.length) return await sock.sendMessage(from, { text: '🎮 Usage: .game <name>' }, { quoted: msg });
    const status = await sock.sendMessage(from, { text: `🎮 Searching Game...` }, { quoted: msg });

    try {
        const query = args.join(" ");
        const html = await safeFetchText(`https://fitgirl-repacks.site/?s=${encodeURIComponent(query)}`);
        
        if (!html) throw new Error('FitGirl site eka danata block wela ho down wela thiyenne.');

        const regex = /<h1 class="entry-title"><a href="([^"]+)" rel="bookmark">([^<]+)<\/a><\/h1>/g;
        let match;
        const results = [];
        
        while ((match = regex.exec(html)) !== null && results.length < 5) {
            results.push({ link: match[1], title: match[2].replace(/&#\d+;/g, "") });
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
