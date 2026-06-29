"use strict";

/**
 * Project: DarkX Ultra
 * Owner: MrX Dev
 * Engineer: Senior Node.js WhatsApp Bot Engineer
 * Universal Utility Functions for Media and Data Handling
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { Buffer } = require('buffer');
const fileType = require('file-type');

/**
 * Inapata Buffer kutoka kwenye URL au Path ya file.
 */
const getBuffer = async (url, options) => {
    try {
        options ? options : {};
        const res = await axios({
            method: "get",
            url,
            headers: {
                'DNT': 1,
                'Upgrade-Insecure-Request': 1
            },
            ...options,
            responseType: 'arraybuffer'
        });
        return res.data;
    } catch (err) {
        return err;
    }
};

/**
 * Inabadilisha ukubwa wa file (bytes) kwenda kwenye format inayosomeka (KB, MB, GB).
 */
const formatSize = (bytes) => {
    if (bytes >= 1000000000) { bytes = (bytes / 1000000000).toFixed(2) + ' GB'; }
    else if (bytes >= 1000000) { bytes = (bytes / 1000000).toFixed(2) + ' MB'; }
    else if (bytes >= 1000) { bytes = (bytes / 1000).toFixed(2) + ' KB'; }
    else if (bytes > 1) { bytes = bytes + ' bytes'; }
    else if (bytes == 1) { bytes = bytes + ' byte'; }
    else { bytes = '0 bytes'; }
    return bytes;
};

/**
 * Inatengeneza ID ya kipekee (Random ID).
 */
const generateMsgID = () => {
    return 'DARKX' + Math.random().toString(36).substring(2, 10).toUpperCase();
};

/**
 * Inapata picha ya profile ya mtumiaji au group.
 */
const getProfilePicture = async (sock, jid) => {
    try {
        return await sock.profilePictureUrl(jid, 'image');
    } catch {
        return 'https://telegra.ph/file/a0f3d45e45c71b6d05494.jpg'; // Default image if not found
    }
};

/**
 * Inachelewesha utekelezaji (Sleep/Delay).
 */
const sleep = async (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Inasafisha namba ya simu (Inaondoa alama zisizohitajika).
 */
const parseMention = (text = '') => {
    return [...text.matchAll(/@([0-9]{5,16}|0)/g)].map(v => v[1] + '@s.whatsapp.net');
};

/**
 * Inapata muundo wa muda (Wakati).
 */
const runtime = (seconds) => {
    seconds = Number(seconds);
    var d = Math.floor(seconds / (3600 * 24));
    var h = Math.floor(seconds % (3600 * 24) / 3600);
    var m = Math.floor(seconds % 3600 / 60);
    var s = Math.floor(seconds % 60);
    var dDisplay = d > 0 ? d + (d == 1 ? " siku, " : " siku, ") : "";
    var hDisplay = h > 0 ? h + (h == 1 ? " saa, " : " saa, ") : "";
    var mDisplay = m > 0 ? m + (m == 1 ? " dakika, " : " dakika, ") : "";
    var sDisplay = s > 0 ? s + (s == 1 ? " sekunde" : " sekunde") : "";
    return dDisplay + hDisplay + mDisplay + sDisplay;
};

/**
 * Inapakua media kutoka kwenye ujumbe wa WhatsApp.
 */
const downloadMediaMessage = async (message) => {
    const { downloadContentFromMessage } = await import('@whiskeysockets/baileys');
    let mime = (message.msg || message).mimetype || '';
    let messageType = message.mtype ? message.mtype.replace(/Message/gi, '') : mime.split('/')[0];
    const stream = await downloadContentFromMessage(message, messageType);
    let buffer = Buffer.from([]);
    for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
    }
    return buffer;
};

module.exports = {
    getBuffer,
    formatSize,
    generateMsgID,
    getProfilePicture,
    sleep,
    parseMention,
    runtime,
    downloadMediaMessage
};
