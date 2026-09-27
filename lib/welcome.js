const fs = require('fs');
const path = require('path');

const WELCOME_FILE = path.join(__dirname, '../data/welcome_settings.json');

async function addWelcome(chatId, status, message) {
    fs.ensureDirSync(path.join(__dirname, '../data'));
    let data = {};
    if (fs.existsSync(WELCOME_FILE)) data = JSON.parse(fs.readFileSync(WELCOME_FILE, 'utf-8'));
    data[chatId] = { status, message };
    fs.writeFileSync(WELCOME_FILE, JSON.stringify(data, null, 2));
}

async function delWelcome(chatId) {
    if (!fs.existsSync(WELCOME_FILE)) return;
    let data = JSON.parse(fs.readFileSync(WELCOME_FILE, 'utf-8'));
    delete data[chatId];
    fs.writeFileSync(WELCOME_FILE, JSON.stringify(data, null, 2));
}

async function isWelcomeOn(chatId) {
    if (!fs.existsSync(WELCOME_FILE)) return false;
    let data = JSON.parse(fs.readFileSync(WELCOME_FILE, 'utf-8'));
    return data[chatId] ? data[chatId].status : false;
}

async function getWelcomeMessage(chatId) {
    if (!fs.existsSync(WELCOME_FILE)) return null;
    let data = JSON.parse(fs.readFileSync(WELCOME_FILE, 'utf-8'));
    return data[chatId] ? data[chatId].message : null;
}

async function handleWelcome(sock, chatId, message, matchText) {
    if (!matchText) {
        return sock.sendMessage(chatId, { 
            text: '👋 *Welcome Settings*\n\n' +
                  'Usage:\n' +
                  '• `.welcome on` - Enable default welcome\n' +
                  '• `.welcome off` - Disable welcome\n' +
                  '• `.welcome [message]` - Set custom message\n\n' +
                  'Variables:\n' +
                  '• `{user}` - Mention user\n' +
                  '• `{group}` - Group name\n' +
                  '• `{description}` - Group description'
        }, { quoted: message });
    }

    if (matchText.toLowerCase() === 'on') {
        await addWelcome(chatId, true, null);
        return sock.sendMessage(chatId, { text: '✅ *Welcome message enabled.*' }, { quoted: message });
    }

    if (matchText.toLowerCase() === 'off') {
        await delWelcome(chatId);
        return sock.sendMessage(chatId, { text: '✅ *Welcome message disabled.*' }, { quoted: message });
    }

    await addWelcome(chatId, true, matchText);
    return sock.sendMessage(chatId, { text: '✅ *Custom welcome message set successfully.*' }, { quoted: message });
}

module.exports = { 
    addWelcome, 
    delWelcome, 
    isWelcomeOn, 
    getWelcomeMessage,
    handleWelcome 
};