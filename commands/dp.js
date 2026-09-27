const { jidNormalizedUser } = require('@whiskeysockets/baileys');

async function dpCommand(sock, from, msg) {
    try {
        const messageContent = msg.message?.ephemeralMessage?.message || msg.message?.viewOnceMessage?.message || msg.message?.viewOnceMessageV2?.message || msg.message;
        const quoted = messageContent?.extendedTextMessage?.contextInfo?.quotedMessage;
        const mentionedJid = messageContent?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
        
        let targetJid = '';

        if (msg.key.remoteJid.endsWith('@g.us')) {
            if (quoted) {
                targetJid = messageContent.extendedTextMessage.contextInfo.participant;
            } else if (mentionedJid) {
                targetJid = mentionedJid;
            } else {
                targetJid = msg.key.participant || msg.participant;
            }
        } else {
            if (quoted) {
                targetJid = messageContent.extendedTextMessage.contextInfo.participant;
            } else {
                targetJid = from;
            }
        }

        if (!targetJid) {
            return await sock.sendMessage(from, { text: "❌ Please reply to a message or mention someone to get their DP." }, { quoted: msg });
        }

        await sock.sendMessage(from, { react: { text: '⏳', key: msg.key } });

        let profilePicUrl;
        try {
            profilePicUrl = await sock.profilePictureUrl(targetJid, 'image');
        } catch (e) {
            return await sock.sendMessage(from, { text: "❌ No profile picture found or privacy settings prevent downloading." }, { quoted: msg });
        }

        await sock.sendMessage(from, { 
            image: { url: profilePicUrl }, 
            caption: `*Profile Picture Downloaded*` 
        }, { quoted: msg });

        await sock.sendMessage(from, { react: { text: '✅', key: msg.key } });

    } catch (err) {
        console.error('DP command error:', err);
        await sock.sendMessage(from, { text: `❌ Error: ${err.message}` }, { quoted: msg });
    }
}

module.exports = dpCommand;
