// =======================================================
// CRASH-FREE, NO-STORAGE COMMANDS (FAABLE OPTIMIZED)
// =======================================================

// Safe Fetch Function (Crash wena eka nawaththanna)
async function safeFetchJson(url) {
    try {
        const res = await fetch(url);
        if (!res.ok) return null;
        return await res.json();
    } catch (e) {
        return null;
    }
}

// 1. YouTube Audio
register('ytmp3', ['yta', 'song'], async (ctx) => {
    const { sock, from, msg, args } = ctx;
    if (!args[0]) return await sock.sendMessage(from, { text: '🎵 Usage: .ytmp3 <name/url>' }, { quoted: msg });
    const status = await sock.sendMessage(from, { text: '🔄 Downloading Audio...' }, { quoted: msg });
    try {
        let url = args.join(" ");
        if (!url.includes("youtu")) {
            const sr = await safeFetchJson(`https://api.vreden.my.id/api/ytsearch?query=${encodeURIComponent(url)}`);
            if (!sr || !sr.result || !sr.result[0]) throw new Error('Song not found!');
            url = sr.result[0].url;
        }
        const dl = await safeFetchJson(`https://api.vreden.my.id/api/ytmp3?url=${encodeURIComponent(url)}`);
        const audioUrl = dl?.result?.download?.url || dl?.result?.url || dl?.url;
        if (!audioUrl) throw new Error('API Error or Link restricted!');
        
        // Kelinma stream wenawa
        await sock.sendMessage(from, { audio: { url: audioUrl }, mimetype: 'audio/mpeg' }, { quoted: msg });
        await sock.sendMessage(from, { delete: status.key }).catch(() => {});
    } catch (e) {
        await sock.sendMessage(from, { text: `❌ Error: ${e.message}`, edit: status.key });
    }
}, { public: true });

// 2. YouTube Video (Loku files nisa Document widihata yanawa)
register('ytmp4', ['ytv', 'video'], async (ctx) => {
    const { sock, from, msg, args } = ctx;
    if (!args[0]) return await sock.sendMessage(from, { text: '🎬 Usage: .ytmp4 <name/url>' }, { quoted: msg });
    const status = await sock.sendMessage(from, { text: '🔄 Downloading Video...' }, { quoted: msg });
    try {
        let url = args.join(" ");
        let title = "Video";
        if (!url.includes("youtu")) {
            const sr = await safeFetchJson(`https://api.vreden.my.id/api/ytsearch?query=${encodeURIComponent(url)}`);
            if (!sr || !sr.result || !sr.result[0]) throw new Error('Video not found!');
            url = sr.result[0].url;
            title = sr.result[0].title;
        }
        const dl = await safeFetchJson(`https://api.vreden.my.id/api/ytmp4?url=${encodeURIComponent(url)}`);
        const videoUrl = dl?.result?.download?.url || dl?.result?.url || dl?.url;
        if (!videoUrl) throw new Error('API Error!');

        // Document widihata upload kireema (Quality adu wenne na, Storage yanne na)
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

// 3. Movie Download (Loku files Document eken)
register('movie', ['mv', 'film'], async (ctx) => {
    const { sock, from, msg, args } = ctx;
    if (!args[0]) return await sock.sendMessage(from, { text: '🎥 Usage: .movie <name>' }, { quoted: msg });
    const status = await sock.sendMessage(from, { text: '🔄 Searching Movie...' }, { quoted: msg });
    
    try {
        const query = args.join(" ");
        // OMDb API eken details gannawa
        const movieData = await safeFetchJson(`https://api.popcat.xyz/imdb?q=${encodeURIComponent(query)}`);
        if (!movieData || movieData.error) throw new Error('Movie not found!');

        // Note: Loku movies direct download API free hambenawa aduy. 
        // Oyage kalin weda karapu movie API link eka thiyenawanam methanata danna. 
        // Danata details witharak send wenna hadala thiyenne, oya gawa direct mp4 link API ekak nam, eka palleha url ekata danna.
        let text = `🎥 *${movieData.title} (${movieData.year})*\n\n`;
        text += `⭐ Rating: ${movieData.ratings}\n`;
        text += `🎭 Genre: ${movieData.genres}\n`;
        text += `🎬 Director: ${movieData.director}\n`;
        text += `📜 Plot: ${movieData.plot}\n\n`;
        text += `> POWERED BY HACKER PRO`;

        await sock.sendMessage(from, { image: { url: movieData.poster }, caption: text }, { quoted: msg });
        await sock.sendMessage(from, { delete: status.key }).catch(() => {});
    } catch (e) {
        await sock.sendMessage(from, { text: `❌ Error: ${e.message}`, edit: status.key });
    }
}, { public: true });

// 4. Anime Download (Document Stream)
register('anime', ['animeclub', 'ani'], async (ctx) => {
    const { sock, from, msg, args } = ctx;
    if (!args[0]) return await sock.sendMessage(from, { text: '🌸 Usage: .anime <name>' }, { quoted: msg });
    const status = await sock.sendMessage(from, { text: '🔄 Searching Anime...' }, { quoted: msg });

    try {
        const query = args.join(" ");
        // Gogoanime or similar API eken search karanawa
        const res = await safeFetchJson(`https://api.vreden.my.id/api/anime/gogoanime/search?query=${encodeURIComponent(query)}`);
        
        if (!res || !res.result || !res.result[0]) throw new Error('Anime hambune na!');
        
        let animeInfo = res.result[0];
        
        let text = `🌸 *${animeInfo.title}*\n\n`;
        text += `🔗 Link: ${animeInfo.url}\n`;
        text += `📅 Released: ${animeInfo.released}\n\n`;
        text += `> Animeclub eke direct stream wenne nathi nisa, meka Gogoanime API eken search kala.\n\n`;
        text += `> POWERED BY HACKER PRO`;

        await sock.sendMessage(from, { image: { url: animeInfo.image }, caption: text }, { quoted: msg });
        await sock.sendMessage(from, { delete: status.key }).catch(() => {});
    } catch (e) {
        await sock.sendMessage(from, { text: `❌ Error: ${e.message}`, edit: status.key });
    }
}, { public: true });
