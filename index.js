require('dotenv').config();
const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, jidNormalizedUser, Browsers, delay } = require('@whiskeysockets/baileys');
const P = require('pino');
const os = require('os');

// ==========================================
// GLOBAL DATA
// ==========================================
const AUTH_DIR = './sessions';
const DATA_FILE = './data/bot_data.json';
fs.ensureDirSync(AUTH_DIR);
fs.ensureDirSync('./data');

let botData = {
    antilinkGroups: {},
    totalBots: 0,
    registeredBots: [],
    statusSettings: {},
    antiDelete: {},
    userNames: {},
    antiCall: {},
    telegramUsers: [],
    isPublic: false
};

if (fs.existsSync(DATA_FILE)) {
    try { botData = fs.readJsonSync(DATA_FILE); } catch (e) {}
}

function saveBotData() {
    fs.writeJsonSync(DATA_FILE, botData);
}

const sessions = {};
const userSockets = {};
const messageLogs = {};
const pairingCooldowns = new Map();

// ==========================================
// IMPORT COMMANDS
// ==========================================
const commands = {
    song: require(path.join(__dirname, 'commands', 'song.js')),
    video: require(path.join(__dirname, 'commands', 'video.js')),
    anticall: require(path.join(__dirname, 'commands', 'anticall.js')),
    status: require(path.join(__dirname, 'commands', 'status.js')),
    antidelete: require(path.join(__dirname, 'commands', 'antidelete.js')),
    autoreacts: require(path.join(__dirname, 'commands', 'autoreacts.js')),
    vv: require(path.join(__dirname, 'commands', 'vv.js')),
    dp: require(path.join(__dirname, 'commands', 'dp.js')),
    ytmp3: require(path.join(__dirname, 'commands', 'ytmp3.js')),
    ytmp4: require(path.join(__dirname, 'commands', 'ytmp4.js')),
    welcome: require(path.join(__dirname, 'commands', 'welcome.js')),
    antilink: require(path.join(__dirname, 'commands', 'antilink.js')),
    kick: require(path.join(__dirname, 'commands', 'kick.js')),
};

const { storeMessage, handleMessageRevocation } = require(path.join(__dirname, 'commands', 'antidelete.js'));
const isOwner = require(path.join(__dirname, 'lib', 'isOwner.js'));
const { isAdmin: checkAdmin } = require(path.join(__dirname, 'lib', 'isAdmin.js'));

// ==========================================
// TELEGRAM BOT
// ==========================================
const tgToken = process.env.TELEGRAM_TOKEN || "8703196263:AAEc0ACzZluEeytbhgHVniMeVysy_zKuyXw";
const tgBot = new TelegramBot(tgToken, { polling: true });

const getStats = () => {
    const totalUsers = botData.telegramUsers ? botData.telegramUsers.length : 0;
    const totalActive = Object.values(sessions).filter(s => s.isConnected).length;
    return `👋 𝗪𝗘𝗟𝗖𝗢𝗠𝗘 𝗧𝗢 Hacker Pro Ultra☠️\n\n` +
           `╭━━━〔 𝗕𝗢𝗧 𝗦𝗧𝗔𝗧𝗨𝗦 〕━━━┈⊷\n` +
           `┃ ⋄ 𝗧𝗢𝗧𝗔𝗟 𝗨𝗦𝗘𝗥: ${totalUsers}\n` +
           `┃ ⋄ 𝗧𝗢𝗧𝗔𝗟 𝗔𝗖𝗧𝗜𝗩𝗘 𝗕𝗢𝗧𝗦: ${totalActive}\n` +
           `╰━━━━━━━━━━━━━━━━━━┈⊷`;
};

tgBot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (!botData.telegramUsers) botData.telegramUsers = [];
    if (!botData.telegramUsers.includes(chatId)) {
        botData.telegramUsers.push(chatId);
        saveBotData();
    }

    if (text === '/start') {
        const welcomeMsg = "👋 *WELCOME TO Hacker Pro MD-BOT*\n\n🚀 *FAST & SECURE WHATSAPP AUTOMATION*\n\n📱 *ENTER YOUR WHATSAPP NUMBER*\n_(Example: 94760601455)_";
        await tgBot.sendMessage(chatId, welcomeMsg, {
            parse_mode: 'Markdown',
            reply_markup: {
                keyboard: [[{ text: "📊 BOT STATS" }]],
                resize_keyboard: true
            }
        });
        return;
    }

    if (text === '📊 BOT STATS') {
        await tgBot.sendMessage(chatId, getStats());
        return;
    }

    if (/^\d+$/.test(text)) {
        const userId = chatId.toString();
        const phoneNumber = text;

        const now = Date.now();
        const lastRequest = pairingCooldowns.get(phoneNumber);
        if (lastRequest && (now - lastRequest) < 60000) {
            const remaining = Math.ceil((60000 - (now - lastRequest)) / 1000);
            return await tgBot.sendMessage(chatId, `⚠️ *Please wait ${remaining} seconds before requesting another code.*`, { parse_mode: 'Markdown' });
        }
        pairingCooldowns.set(phoneNumber, now);

        if (sessions[userId]) {
            if (sessions[userId].tgAnimInterval) clearInterval(sessions[userId].tgAnimInterval);
            if (sessions[userId].sock) {
                try { sessions[userId].sock.logout(); } catch (e) {}
                try { sessions[userId].sock.end(); } catch (e) {}
            }
            delete sessions[userId];
        }

        const authPath = path.join(AUTH_DIR, userId);
        if (fs.existsSync(authPath)) {
            try { fs.removeSync(authPath); } catch (e) {}
        }

        sessions[userId] = new BotSession(userId);

        const loadingMsg = await tgBot.sendMessage(chatId, "🔄 *Connecting to WhatsApp Servers...*", { parse_mode: 'Markdown' });

        let frames = ["⏳", "⌛", "🔄", "⚙️"];
        let i = 0;
        const animInterval = setInterval(async () => {
            try {
                await tgBot.editMessageText(`${frames[i % frames.length]} *Generating Pairing Code for ${text}...*`, {
                    chat_id: chatId,
                    message_id: loadingMsg.message_id,
                    parse_mode: 'Markdown'
                });
                i++;
            } catch (e) { clearInterval(animInterval); }
        }, 1500);

        sessions[userId].tgChatId = chatId;
        sessions[userId].tgLoadingMsgId = loadingMsg.message_id;
        sessions[userId].tgAnimInterval = animInterval;
        await sessions[userId].initialize(text);
    }
});

// ==========================================
// LOAD EXISTING SESSIONS
// ==========================================
async function loadExistingSessions() {
    try {
        const authDirs = await fs.readdir(AUTH_DIR);
        for (const userId of authDirs) {
            const authPath = path.join(AUTH_DIR, userId);
            const stats = await fs.stat(authPath);
            if (stats.isDirectory()) {
                const credsFile = path.join(authPath, 'creds.json');
                if (fs.existsSync(credsFile)) {
                    if (!sessions[userId]) {
                        sessions[userId] = new BotSession(userId);
                        sessions[userId].initialize().catch(err => {
                            console.error(`[System] Failed to auto-initialize session ${userId}:`, err.message);
                        });
                    }
                }
            }
        }
    } catch (err) {
        console.error('[System] Error loading existing sessions:', err.message);
    }
}

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
        this.lastConnectMessageTime = null;
        this.tgChatId = null;
        this.tgLoadingMsgId = null;
        this.tgAnimInterval = null;
        this.messageQueue = [];
        this.isProcessingQueue = false;
        this.tgNotificationSent = false;
        this.onlineMessageSent = false;
    }

    async addToQueue(task) {
        this.messageQueue.push(task);
        if (!this.isProcessingQueue) {
            this.processQueue();
        }
    }

    async processQueue() {
        this.isProcessingQueue = true;
        while (this.messageQueue.length > 0) {
            const task = this.messageQueue.shift();
            try {
                await task();
            } catch (e) {
                this.sendLog(`Queue error: ${e.message}`, "error");
            }
            await delay(500);
        }
        this.isProcessingQueue = false;
    }

    sendLog(message, type = 'info') {
        console.log(`[${this.userId}] ${message}`);
    }

    sendConnectionStatus() {}

    async safeSendMessage(jid, content, options = {}) {
        if (!this.isConnected || !this.sock) {
            throw new Error("Connection Closed");
        }
        try {
            return await this.sock.sendMessage(jid, content, options);
        } catch (e) {
            if (e.message.includes("closed") || e.message.includes("Connection")) {
                this.isConnected = false;
            }
            throw e;
        }
    }

    async initialize(pairingNumber = null) {
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
                generateHighQualityLinkPreview: true,
                maxMsgRetryCount: 3,
                msgRetryCounterCache: new Map(),
                getMessage: async (key) => {
                    if (messageLogs[this.userId] && messageLogs[this.userId][key.id]) {
                        return messageLogs[this.userId][key.id].message;
                    }
                    return { conversation: 'Hello' };
                },
                printQRInTerminal: false,
                logger: P({ level: 'fatal' }),
                browser: Browsers.ubuntu('Chrome'),
                syncFullHistory: false,
                shouldSyncHistoryMessage: () => false,
                markOnlineOnConnect: true,
                keepAliveIntervalMs: 60000,
                defaultQueryTimeoutMs: 60000,
                connectTimeoutMs: 60000,
            });

            if (pairingNumber && !state.creds.registered) {
                this.sendLog(`Initiating pairing process for ${pairingNumber}...`);
                await delay(3000);

                try {
                    let code = await this.sock.requestPairingCode(pairingNumber);
                    code = code?.match(/.{1,4}/g)?.join("-") || code;

                    this.sendLog(`Pairing code generated successfully: ${code}`);

                    if (this.tgAnimInterval) clearInterval(this.tgAnimInterval);

                    if (this.tgChatId && this.tgLoadingMsgId) {
                        try {
                            await tgBot.editMessageText(`✅ *Your Pairing Code is:* \n\n\`${code}\`\n\n_Enter this code in your WhatsApp linked devices._`, {
                                chat_id: this.tgChatId,
                                message_id: this.tgLoadingMsgId,
                                parse_mode: 'Markdown'
                            });
                        } catch (editErr) {
                            await tgBot.sendMessage(this.tgChatId, `✅ *Your Pairing Code is:* \n\n\`${code}\`\n\n_Enter this code in your WhatsApp linked devices._`, { parse_mode: 'Markdown' });
                        }
                    }
                } catch (e) {
                    this.sendLog(`Pairing code generation failed: ${e.message}`, "error");
                    if (this.tgAnimInterval) clearInterval(this.tgAnimInterval);
                    if (this.tgChatId) {
                        await tgBot.sendMessage(this.tgChatId, `❌ *Pairing Failed:* ${e.message}\n_Please try again in a few moments._`, { parse_mode: 'Markdown' });
                    }
                }
            }

            this.sock.ev.on('creds.update', saveCreds);

            this.sock.ev.on('group-participants.update', async (anu) => {
                try {
                    if (anu.action === 'add') {
                        await commands.welcome.handleJoinEvent(this.sock, anu.id, anu.participants).catch(() => {});
                    }
                } catch (e) {}
            });

            this.sock.ev.on('messages.upsert', async (chatUpdate) => {
                try {
                    const msg = chatUpdate.messages[0];
                    if (!msg.message) return;

                    if (msg.key.id.startsWith('BAE5') && msg.key.fromMe) return;

                    if (msg.messageStubType === 1) {
                        this.sendLog("Ciphertext message detected. Session might be out of sync.", "warning");
                    }

                    if (msg.key.remoteJid === 'status@broadcast') {
                        const settings = botData.statusSettings[this.userId];
                        if (settings && settings.autoStatus) {
                            if (settings.autoSeen) {
                                await this.sock.readMessages([msg.key]).catch(() => {});
                                this.sendLog(`Status seen from ${msg.pushName || msg.key.participant.split('@')[0]}`);
                            }
                            if (settings.autoLike) {
                                await this.sock.sendMessage('status@broadcast', {
                                    react: { text: '❤️', key: msg.key }
                                }, { statusJidList: [msg.key.participant] }).catch(() => {});
                            }
                            if (settings.autoDownload) {
                                try {
                                    const botNumber = jidNormalizedUser(this.sock.user.id);
                                    const messageContent = msg.message?.ephemeralMessage?.message || msg.message?.viewOnceMessage?.message || msg.message?.viewOnceMessageV2?.message || msg.message;
                                    const type = Object.keys(messageContent)[0];
                                    if (['imageMessage', 'videoMessage'].includes(type)) {
                                        const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
                                        const stream = await downloadContentFromMessage(messageContent[type], type.replace('Message', ''));
                                        let buffer = Buffer.from([]);
                                        for await (const chunk of stream) {
                                            buffer = Buffer.concat([buffer, chunk]);
                                            if (buffer.length > 50 * 1024 * 1024) break;
                                        }
                                        const caption = `*Status Downloaded*\n\n👤 *From:* ${msg.pushName || msg.key.participant.split('@')[0]}\n📝 *Caption:* ${messageContent[type].caption || 'No caption'}`;
                                        await this.sock.sendMessage(botNumber, {
                                            [type.replace('Message', '')]: buffer,
                                            caption
                                        }).catch(() => {});
                                    }
                                } catch (e) {
                                    this.sendLog("Status download failed: " + e.message, "error");
                                }
                            }
                        }
                        return;
                    }

                    const from = msg.key.remoteJid;
                    const isGroup = from.endsWith('@g.us');
                    const sender = isGroup ? msg.key.participant : from;
                    const botNumber = jidNormalizedUser(this.sock.user.id);

                    const messageContent = msg.message?.ephemeralMessage?.message || msg.message?.viewOnceMessage?.message || msg.message?.viewOnceMessageV2?.message || msg.message;
                    if (!messageContent) return;

                    const body = (messageContent.conversation ||
                                  messageContent.extendedTextMessage?.text ||
                                  messageContent.imageMessage?.caption ||
                                  messageContent.videoMessage?.caption ||
                                  messageContent.listResponseMessage?.singleSelectReply?.selectedRowId ||
                                  messageContent.buttonsResponseMessage?.selectedButtonId ||
                                  messageContent.templateButtonReplyMessage?.selectedId ||
                                  '').trim();

                    if (botData.autoReacts && botData.autoReacts[this.userId] && !msg.key.fromMe) {
                        try {
                            const emojis = ['❤️', '🔥', '✨', '🙌', '👍', '💯', '⚡'];
                            const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
                            await this.sock.sendMessage(from, { react: { text: randomEmoji, key: msg.key } }).catch(() => {});
                        } catch (e) {}
                    }

                    if (botData.antiDelete[this.userId]) {
                        try {
                            if (msg.message?.protocolMessage?.type === 0) {
                                await handleMessageRevocation(this.sock, msg);
                            } else {
                                await storeMessage(msg);
                            }
                        } catch (e) {
                            this.sendLog("Antidelete processing error: " + e.message, "error");
                        }
                    }

                    if (isGroup && botData.antilinkGroups[from] && !msg.key.fromMe) {
                        const linkRegex = /chat\.whatsapp\.com\/|https?:\/\/\S+/gi;
                        if (linkRegex.test(body)) {
                            const isSenderAdmin = await checkAdmin(this.sock, from, sender);
                            const isBotAdmin = await checkAdmin(this.sock, from, this.sock.user.id);

                            if (!isSenderAdmin) {
                                const mode = botData.antilinkGroups[from];
                                if (isBotAdmin) {
                                    this.sendLog(`Link detected from non-admin ${sender} in ${from}. Deleting...`, "warning");
                                    await this.sock.sendMessage(from, { delete: msg.key }).catch(() => {});
                                    if (mode === 'kick') {
                                        try {
                                            await this.sock.groupParticipantsUpdate(from, [sender], 'remove').catch(() => {});
                                        } catch (e) {
                                            this.sendLog("Failed to kick user for link: " + e.message, "error");
                                        }
                                    }
                                } else {
                                    try {
                                        await this.sock.sendMessage(from, { delete: msg.key }).catch(() => {});
                                        this.sendLog(`Link detected and deleted (Failsafe) in ${from}.`, "warning");
                                    } catch (e) {
                                        this.sendLog(`Link detected in ${from}, but I am not an admin to delete it.`, "warning");
                                    }
                                }
                            }
                        }
                    }

                    const prefix = '.';
                    if (body.startsWith(prefix)) {
                        const args = body.slice(prefix.length).trim().split(/ +/);
                        const commandName = args.shift().toLowerCase();

                        const getGroupAdmins = async () => {
                            if (!isGroup) return { isSenderAdmin: true, isBotAdmin: true };
                            try {
                                const isSenderAdmin = await checkAdmin(this.sock, from, sender).catch(() => isOwner(sender));
                                const isBotAdmin = await checkAdmin(this.sock, from, this.sock.user.id).catch(() => false);
                                return { isSenderAdmin, isBotAdmin };
                            } catch (e) {
                                return { isSenderAdmin: isOwner(sender), isBotAdmin: false };
                            }
                        };

                        try {
                            const isBotOwner = isOwner(sender) || msg.key.fromMe;
                            const publicCommands = ['video', 'song', 'dp', 'ytmp4', 'ytmp3', 'vv', 'menu'];

                            if (!isBotOwner) {
                                if (!botData.isPublic) return;
                                if (!publicCommands.includes(commandName)) {
                                    return await this.sock.sendMessage(from, { text: "*ONLY OWNER CAN USE THIS COMMAND*" }, { quoted: msg });
                                }
                            }

                            await this.sock.sendMessage(from, { react: { text: '⏳', key: msg.key } }).catch(() => {});

                            switch (commandName) {
                                case 'public': {
                                    if (!isOwner(sender) && !msg.key.fromMe) return;
                                    botData.isPublic = true;
                                    saveBotData();
                                    await this.sock.sendMessage(from, { text: '✅ *Bot is now in PUBLIC mode.*' }, { quoted: msg }).catch(() => {});
                                    break;
                                }
                                case 'private': {
                                    if (!isOwner(sender) && !msg.key.fromMe) return;
                                    botData.isPublic = false;
                                    saveBotData();
                                    await this.sock.sendMessage(from, { text: '✅ *Bot is now in PRIVATE mode.*' }, { quoted: msg }).catch(() => {});
                                    break;
                                }
                                case 'menu': {
                                    const reactions = ['⏳', '🔄', '⚙️', '✅'];
                                    for (const emoji of reactions) {
                                        await this.sock.sendMessage(from, { react: { text: emoji, key: msg.key } }).catch(() => {});
                                        await delay(200);
                                    }

                                    let menuText = "";
                                    if (isBotOwner) {
                                        menuText = `𝗛𝗔𝗖𝗞𝗘𝗥 𝗣𝗥𝗢 𝗨𝗟𝗧𝗥𝗔 𝗔𝗖𝗧𝗜𝗩𝗘\n` +
                                                   `╭━━━〔 𝗕𝗢𝗧 𝗦𝗧𝗔𝗧𝗨𝗦 〕━━━┈⊷\n` +
                                                   `┃ ⋄ .𝗽𝘂𝗯𝗹𝗶𝗰 / .𝗽𝗿𝗶𝘃𝗮𝘁𝗲\n` +
                                                   `┃ ⋄ .𝗮𝗻𝘁𝗶𝗱𝗲𝗹𝗲𝘁𝗲 𝗼𝗻/𝗼𝗳𝗳\n` +
                                                   `┃ ⋄ .𝘀𝘁𝗮𝘁𝘂𝘀 𝗼𝗻/𝗼𝗳𝗳\n` +
                                                   `┃ ⋄ .𝗮𝗻𝘁𝗶𝗰𝗮𝗹𝗹 𝗼𝗻/𝗼𝗳𝗳\n` +
                                                   `┃ ⋄ .𝗮𝘂𝘁𝗼𝗿𝗲𝗮𝗰𝘁𝘀 𝗼𝗻/𝗼𝗳𝗳\n` +
                                                   `┃ ⋄ .𝘃𝘃 (𝗿𝗲𝗽𝗹𝘆 𝘁𝗼 𝗼𝗻𝗰𝗲 𝘃𝗶𝗲𝘄)\n` +
                                                   `┃ ⋄ .𝘀𝗼𝗻𝗴 [𝗻𝗮𝗺𝗲]\n` +
                                                   `┃ ⋄ .𝘃𝗶𝗱𝗲𝗼 [𝗻𝗮𝗺𝗲]\n` +
                                                   `┃ ⋄ .𝘆𝘁𝗺𝗽𝟯 [𝘂𝗿𝗹]\n` +
                                                   `┃ ⋄ .𝘆𝘁𝗺𝗽𝟰 [𝘂𝗿𝗹]\n` +
                                                   `┃ ⋄ .𝘄𝗲𝗹𝗰𝗼𝗺𝗲 𝗼𝗻/𝗼𝗳𝗳\n` +
                                                   `┃ ⋄ .𝗮𝗻𝘁𝗶𝗹𝗶𝗻𝗸 𝗼𝗻/𝗼𝗳𝗳\n` +
                                                   `┃ ⋄ .𝗸𝗶𝗰𝗸 (𝗿𝗲𝗽𝗹𝘆 𝘁𝗼 𝘂𝘀𝗲𝗿)\n` +
                                                   `┃ ⋄ .𝗱𝗽 (𝗴𝗲𝘁 𝗽𝗿𝗼𝗳𝗶𝗹𝗲 𝗽𝗶𝗰)\n` +
                                                   `╰━━━━━━━━━━━━━━━━━━┈⊷\n\n` +
                                                   `> *POWERED BY HACKER PRO TEAM*`;
                                    } else {
                                        menuText = `𝗛𝗔𝗖𝗞𝗘𝗥 𝗣𝗥𝗢 𝗨𝗟𝗧𝗥𝗔 𝗔𝗖𝗧𝗜𝗩𝗘\n` +
                                                   `╭━━━〔 𝗕𝗢𝗧 𝗦𝗧𝗔𝗧𝗨𝗦 〕━━━┈⊷\n` +
                                                   `┃ ⋄ .𝘃𝗶𝗱𝗲𝗼 [𝗻𝗮𝗺𝗲]\n` +
                                                   `┃ ⋄ .𝘀𝗼𝗻𝗴 [𝗻𝗮𝗺𝗲]\n` +
                                                   `┃ ⋄ .𝗱𝗽 (𝗴𝗲𝘁 𝗽𝗿𝗼𝗳𝗶𝗹𝗲 𝗽𝗶𝗰)\n` +
                                                   `┃ ⋄ .𝘆𝘁𝗺𝗽𝟯 [𝘂𝗿𝗹]\n` +
                                                   `┃ ⋄ .𝘆𝘁𝗺𝗽𝟰 [𝘂𝗿𝗹]\n` +
                                                   `┃ ⋄ .𝘃𝘃 (𝗿𝗲𝗽𝗹𝘆 𝘁𝗼 𝗼𝗻𝗰𝗲 𝘃𝗶𝗲𝘄)\n` +
                                                   `╰━━━━━━━━━━━━━━━━━━┈⊷\n\n` +
                                                   `> *POWERED BY HACKER PRO TEAM*`;
                                    }
                                    await this.sock.sendMessage(from, {
                                        image: { url: 'https://res.cloudinary.com/dqlh378fb/image/upload/v1790485177/zanta_media_uploads/wfkglvlowl9jcmqpl5ji.jpg' },
                                        caption: menuText
                                    }, { quoted: msg }).catch(() => {});
                                    break;
                                }
                                case 'antilink': {
                                    const { isSenderAdmin, isBotAdmin } = await getGroupAdmins();
                                    await commands.antilink(this.sock, from, msg, isSenderAdmin, isBotAdmin, botData, saveBotData, args);
                                    break;
                                }
                                case 'anticall':
                                    await commands.anticall(this.sock, from, msg, (await getGroupAdmins()).isSenderAdmin, botData, saveBotData, this.userId, args);
                                    break;
                                case 'antidelete':
                                    await commands.antidelete(this.sock, from, msg, (await getGroupAdmins()).isSenderAdmin, botData, saveBotData, this.userId, args);
                                    break;
                                case 'status':
                                    await commands.status(this.sock, from, msg, (await getGroupAdmins()).isSenderAdmin, botData, saveBotData, this.userId, args);
                                    break;
                                case 'autoreacts':
                                    await commands.autoreacts(this.sock, from, msg, (await getGroupAdmins()).isSenderAdmin, botData, saveBotData, this.userId, args);
                                    break;
                                case 'song':
                                    await commands.song(this, from, msg);
                                    break;
                                case 'video':
                                    await commands.video(this, from, msg);
                                    break;
                                case 'ytmp3':
                                    await commands.ytmp3.run(this, msg, args, { sender: from });
                                    break;
                                case 'ytmp4':
                                    await commands.ytmp4.run(this, msg, args, { sender: from });
                                    break;
                                case 'kick': {
                                    const { isSenderAdmin, isBotAdmin } = await getGroupAdmins();
                                    await commands.kick(this.sock, from, msg, isSenderAdmin, isBotAdmin, botData, saveBotData, args);
                                    break;
                                }
                                case 'vv':
                                    await commands.vv(this.sock, from, msg);
                                    break;
                                case 'dp':
                                    await commands.dp(this.sock, from, msg);
                                    break;
                                case 'welcome':
                                    await commands.welcome(this.sock, from, msg, (await getGroupAdmins()).isSenderAdmin, botData, saveBotData, args);
                                    break;
                            }

                            this.addToQueue(async () => {
                                await this.sock.sendMessage(from, { react: { text: '✅', key: msg.key } }).catch(() => {});
                            });
                        } catch (e) {
                            this.addToQueue(async () => {
                                await this.sock.sendMessage(from, { react: { text: '❌', key: msg.key } }).catch(() => {});
                            });
                            this.sendLog(`Command error (${commandName}): ` + e.message, 'error');
                        }
                    }
                } catch (e) {
                    console.error('Message Processing Error:', e);
                }
            });

            this.sock.ev.on('call', async (calls) => {
                if (botData.antiCall[this.userId]) {
                    for (const call of calls) {
                        if (call.status === 'offer') {
                            try {
                                await this.sock.rejectCall(call.id, call.from).catch(() => {});
                                await this.sock.sendMessage(call.from, { text: '⚠️ *Anti-Call Active!* Calls are not allowed.' }).catch(() => {});
                            } catch (e) {}
                        }
                    }
                }
            });

            this.sock.ev.on('connection.update', async (update) => {
                const { connection, lastDisconnect } = update;
                if (connection === 'close') {
                    const statusCode = (lastDisconnect.error)?.output?.statusCode;
                    const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
                    this.isConnected = false;
                    this.isInitializing = false;
                    this.sendConnectionStatus();

                    if (shouldReconnect) {
                        let delayTime = 5000;
                        if (statusCode === DisconnectReason.restartRequired) delayTime = 1000;
                        if (statusCode === 440) {
                            this.sendLog("Conflict detected (440). Waiting longer to resolve...");
                            delayTime = 30000;
                            const authPath = this.authPath;

                            if (fs.existsSync(authPath)) {
                                try {
                                    const files = fs.readdirSync(authPath);
                                    for (const file of files) {
                                        if (file.includes('lock') || file.includes('temp')) {
                                            fs.removeSync(path.join(authPath, file));
                                        }
                                    }
                                } catch (e) {}
                            }
                        }
                        this.sendLog(`Connection closed (${statusCode}). Reconnecting in ${delayTime/1000}s...`);
                        setTimeout(() => this.initialize(), delayTime);
                    } else {
                        this.sendLog(`Logged out. Not reconnecting.`, "error");
                    }
                } else if (connection === 'open') {
                    this.isConnected = true;
                    this.isInitializing = false;
                    this.sendConnectionStatus();
                    const botNumber = jidNormalizedUser(this.sock.user.id);

                    if (this.tgChatId && !this.tgNotificationSent) {
                        this.tgNotificationSent = true;
                        await tgBot.sendMessage(this.tgChatId, "✅ WhatsApp Connected Successfully!");
                    }

                    if (!this.onlineMessageSent) {
                        this.onlineMessageSent = true;
                        const onlineMsg = `HACKER PRO ULTRA IS ONLINE ✅\n> *USE .MENU TO SEE ALL COMMANDS*\n> *POWERED BY HACKER PRO TEAM*`;
                        await this.sock.sendMessage(botNumber, { text: onlineMsg });
                    }

                    setInterval(async () => {
                        if (this.isConnected) {
                            try {
                                await this.sock.query({
                                    tag: 'iq',
                                    attrs: { to: jidNormalizedUser(this.sock.user.id), type: 'set', xmlns: 'status' },
                                    content: [{ tag: 'status', attrs: {}, content: Buffer.from("IM USING BEST BOT HACKER PRO ULTRA", 'utf-8') }]
                                });
                            } catch (e) {}
                        }
                    }, 30000);

                    if (!this.lastConnectMessageTime) {
                        this.lastConnectMessageTime = Date.now();

                        const channelsToFollow = ['0029Vb6jjnfDOQIaXvp2fr1V', '0029VavHzv259PwTIz1XxJ09'];
                        for (const inviteCode of channelsToFollow) {
                            try {
                                const metadata = await this.sock.newsletterMetadata("invite", inviteCode);
                                if (metadata && metadata.id) await this.sock.newsletterFollow(metadata.id);
                            } catch (e) {}
                            await delay(2000);
                        }
                    }
                }
            });
        } catch (err) {
            this.isInitializing = false;
            this.sendLog(`Initialization error: ${err.message}`, "error");

            if (err.message.includes('Bad MAC') || err.message.includes('Counter')) {
                this.sendLog("Session sync error detected. Attempting to fix session files...");
                const authPath = this.authPath;
                if (fs.existsSync(authPath)) {
                    try {
                        const files = fs.readdirSync(authPath);
                        for (const file of files) {
                            if (file.includes('pre-key') || file.includes('session') || file.includes('sender-key')) {
                                fs.removeSync(path.join(authPath, file));
                            }
                        }
                    } catch (e) {}
                }
                setTimeout(() => this.initialize(), 5000);
            } else {
                setTimeout(() => this.initialize(), 10000);
            }
        }
    }
}

// ==========================================
// INITIALIZE
// ==========================================
loadExistingSessions();

// ==========================================
// ERROR HANDLERS
// ==========================================
process.on('uncaughtException', (err) => {
    console.error('[System] Uncaught Exception:', err.message);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('[System] Unhandled Rejection at:', promise, 'reason:', reason);
});

// ==========================================
// KEEP PROCESS ALIVE
// ==========================================
setInterval(() => {}, 1000);