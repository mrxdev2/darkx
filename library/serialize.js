const { jidDecode, extractMessageContent } = require('@whiskeysockets/baileys');

const decodeJid = (jid) => {
    if (!jid) return jid;
    if (/:\d+@/gi.test(jid)) {
        let decode = jidDecode(jid) || {};
        return decode.user && decode.server && decode.user + '@' + decode.server || jid;
    } else return jid;
};

const smsg = (sock, m, store) => {
    if (!m) return m;
    let M = m.key;
    if (M) {
        m.id = M.id;
        m.isBaileys = m.id.startsWith('BAE5') && m.id.length === 16;
        m.chat = M.remoteJid;
        m.fromMe = M.fromMe;
        m.isGroup = m.chat.endsWith('@g.us');
        m.sender = decodeJid(m.fromMe && sock.user.id || m.participant || m.key.participant || m.chat || '');
    }
    if (m.message) {
        m.mtype = Object.keys(m.message)[0];
        m.body = m.message.conversation || m.message[m.mtype].caption || m.message[m.mtype].text || (m.mtype == 'listResponseMessage') && m.message[m.mtype].singleSelectReply.selectedRowId || (m.mtype == 'buttonsResponseMessage') && m.message[m.mtype].selectedButtonId || m.mtype;
        m.msg = m.message[m.mtype];
    }
    return m;
};

module.exports = { smsg, decodeJid };
