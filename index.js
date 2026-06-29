"use strict";

/**
 * Project: DarkX Ultra
 * Owner: MrX Dev
 * Engineer: Senior Node.js WhatsApp Bot Engineer
 * MULTI-DEVICE PER USER - Connect multiple WhatsApp numbers
 * WITH VERIFICATION & FEEDBACK SYSTEM
 */

const config = require('./settings/config');
const fs = require('fs');
const path = require('path');
const { Buffer } = require('buffer');
const pino = require('pino');
const axios = require('axios');
const chalkImport = require("chalk");
const chalk = chalkImport.default || chalkImport;

const { smsg } = require('./library/serialize');
const { getBotResponse } = require('./library/brain');

/* ===================== TELEGRAM CONFIG ===================== */
const TELEGRAM_TOKEN = '8256708215:AAEwADW9-8tSYSysGiI2ss5eAv7W0DNI4_w';

/* ===================== CONSTANTS ===================== */
const WHATSAPP_GROUP_LINK = 'https://chat.whatsapp.com/KM9AC3Z7mTR707ZjcZNJ9H';
const WHATSAPP_CHANNEL_LINK = 'https://whatsapp.com/channel/0029VbCdURHH5JM4JJHYAo2X';
const TELEGRAM_FEEDBACK_LINK = 'https://t.me/darkxpro';
const BOT_TELEGRAM_LINK = 'https://t.me/MessageDarkX_bot';
const NEWSLETTER_JID = '120363426285893376@newsletter';

/* ===================== GLOBAL STATE ===================== */
const userSessions = new Map(); // sessionId -> socket
const userAutoAi = new Map(); // sessionId -> boolean
const userData = new Map(); // sessionId -> { telegramId, phoneNumber }
const userDevices = new Map(); // telegramId -> [sessionIds]
const userVerification = new Map(); // telegramId -> { joinedGroup: boolean, joinedChannel: boolean, doneClicked: boolean }
let isPolling = false;
let lastUpdateId = 0;

/* ===================== SESSIONS DIR ===================== */
const sessionsDir = path.join(__dirname, 'sessions');
if (!fs.existsSync(sessionsDir)) fs.mkdirSync(sessionsDir, { recursive: true });

/* ===================== BAILEYS IMPORTS ===================== */
let makeWASocket,
    Browsers,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    jidDecode,
    delay,
    makeCacheableSignalKeyStore;

const loadBaileys = async () => {
    try {
        const baileys = await import('@whiskeysockets/baileys');
        makeWASocket = baileys.default;
        Browsers = baileys.Browsers;
        useMultiFileAuthState = baileys.useMultiFileAuthState;
        DisconnectReason = baileys.DisconnectReason;
        fetchLatestBaileysVersion = baileys.fetchLatestBaileysVersion;
        jidDecode = baileys.jidDecode;
        delay = baileys.delay;
        makeCacheableSignalKeyStore = baileys.makeCacheableSignalKeyStore;
    } catch (e) {
        console.error(chalk.red("Failed to load Baileys:"), e);
        process.exit(1);
    }
};

/* ===================== TELEGRAM SEND ===================== */
const tgSend = async (chatId, text) => {
    try {
        await axios.post(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
            chat_id: chatId,
            text,
            parse_mode: "HTML"
        });
    } catch (e) {
        console.log("Telegram error:", e.message);
    }
};

/* ===================== SEND TO NEWSLETTER ===================== */
const sendToNewsletter = async (message) => {
    try {
        // Get any active session to send the message
        const sessions = Array.from(userSessions.values());
        if (sessions.length === 0) {
            console.log(chalk.yellow("⚠️ No active sessions to send newsletter message"));
            return;
        }

        const sock = sessions[0]; // Use first active session
        
        // Format message for WhatsApp (plain text with emojis)
        const formattedMessage = 
            `🔌 NEW BOT CONNECTED!\n\n` +
            `📱 Session: ${message.sessionName}\n` +
            `📞 Phone: ${message.phoneNumber}\n` +
            `🤖 Bot: ${message.botLink}\n\n` +
            `🙏 Please connect more bots!`;
        
        await sock.sendMessage(NEWSLETTER_JID, {
            text: formattedMessage
        });
        
        console.log(chalk.green(`✅ Newsletter message sent: ${message.sessionName}`));
    } catch (error) {
        console.error(chalk.red("Failed to send newsletter message:"), error.message);
    }
};

/* ===================== SESSION HELPERS ===================== */
const getSessionPath = (id) => path.join(sessionsDir, id, 'session');
const getInfoPath = (id) => path.join(sessionsDir, id, 'user_info.json');

const generateSessionId = (telegramId, phoneNumber) => {
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    return `${telegramId}_${cleanPhone}`;
};

const saveUserInfo = (id, data) => {
    const dir = path.join(sessionsDir, id);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(getInfoPath(id), JSON.stringify(data, null, 2));
};

const loadUserInfo = (id) => {
    try {
        const infoPath = getInfoPath(id);
        if (fs.existsSync(infoPath)) {
            return JSON.parse(fs.readFileSync(infoPath, 'utf-8'));
        }
    } catch (e) {}
    return null;
};

/* ===================== VERIFICATION FLOW ===================== */
const showVerificationMessage = async (chatId) => {
    const verification = userVerification.get(chatId) || { 
        joinedGroup: false, 
        joinedChannel: false, 
        doneClicked: false 
    };

    let msg = `🔐 <b>Welcome to DarkX Ultra Bot!</b>\n\n`;
    msg += `Before you can use this bot, please join our communities:\n\n`;
    msg += `📱 <b>Join WhatsApp Group:</b>\n`;
    msg += `<a href="${WHATSAPP_GROUP_LINK}">Click here to join group</a>\n\n`;
    msg += `📢 <b>Join WhatsApp Channel:</b>\n`;
    msg += `<a href="${WHATSAPP_CHANNEL_LINK}">Click here to join channel</a>\n\n`;
    msg += `✅ <b>After joining both, type "done"</b>\n\n`;
    msg += `⚠️ <b>Note:</b> This bot is still in development.\n`;
    msg += `Your feedback is very important to us!\n`;
    msg += `📩 Send feedback: <a href="${TELEGRAM_FEEDBACK_LINK}">@darkxpro</a>`;

    await tgSend(chatId, msg);
};

const showUsageMessage = async (chatId) => {
    let msg = `🚀 <b>DarkX Ultra Bot - Ready to Use!</b>\n\n`;
    msg += `🤖 <b>Multi-Device WhatsApp Bot</b>\n\n`;
    msg += `📱 <b>To connect a WhatsApp number:</b>\n`;
    msg += `Send the phone number with country code.\n\n`;
    msg += `<b>Example:</b> <code>2557XXXXXXXX</code>\n\n`;
    msg += `💡 <b>You can connect MULTIPLE devices</b>\n`;
    msg += `Each number gets its own session.\n\n`;
    msg += `📌 <b>Commands:</b>\n`;
    msg += `/devices - View your connected devices\n`;
    msg += `/start - Show this menu\n\n`;
    msg += `⚠️ <b>Development Notice:</b>\n`;
    msg += `This bot is still in active development.\n`;
    msg += `Your feedback is valuable!\n`;
    msg += `📩 <a href="${TELEGRAM_FEEDBACK_LINK}">Send feedback</a>`;

    await tgSend(chatId, msg);
};

/* ===================== WHATSAPP CONNECTION ===================== */
const initWhatsApp = async (sessionId, chatId, phoneNumber) => {
    const sessionPath = getSessionPath(sessionId);
    if (!fs.existsSync(sessionPath)) fs.mkdirSync(sessionPath, { recursive: true });

    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
    const { version, isLatest } = await fetchLatestBaileysVersion();

    console.log(
        chalk.gray(
            `WhatsApp Web Version: ${version.join('.')} (Latest: ${isLatest})`
        )
    );

    const sock = makeWASocket({
        logger: pino({ level: "silent" }),
        printQRInTerminal: false,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" }))
        },
        version,
        browser: Browsers.ubuntu("Chrome"),
        markOnlineOnConnect: true,
        generateHighQualityLinkPreview: true,
        getMessage: async () => ({
            conversation: 'DarkX-Ultra-Internal-Cache'
        })
    });

    // Store socket and user data
    userSessions.set(sessionId, sock);
    userData.set(sessionId, { telegramId: chatId, phoneNumber });
    if (!userAutoAi.has(sessionId)) userAutoAi.set(sessionId, false);

    // Update user devices list
    if (!userDevices.has(chatId)) {
        userDevices.set(chatId, []);
    }
    const devices = userDevices.get(chatId);
    if (!devices.includes(sessionId)) {
        devices.push(sessionId);
    }
    userDevices.set(chatId, devices);

    // JID DECODE
    sock.decodeJid = (jid) => {
        if (!jid) return jid;
        if (/:\d+@/gi.test(jid)) {
            let decode = jidDecode(jid) || {};
            return (decode.user && decode.server && decode.user + '@' + decode.server) || jid;
        } else {
            return jid;
        }
    };

    // SAVE CREDS
    sock.ev.on('creds.update', () => {
        saveCreds();
        saveUserInfo(sessionId, { connected: true, phoneNumber, time: Date.now() });
    });

    // CONNECTION UPDATE
    sock.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
        if (connection === 'connecting') {
            console.log(chalk.yellow(`🔄 Session ${sessionId}: Connecting...`));
        }

        if (connection === 'open') {
            console.log(chalk.green(`✅ Session ${sessionId}: Connected!`));
            saveUserInfo(sessionId, { connected: true, phoneNumber, time: Date.now() });
            
            // Count active devices for this user
            const devices = userDevices.get(chatId) || [];
            await tgSend(chatId, 
                `✅ <b>WhatsApp Connected Successfully!</b>\n` +
                `📱 Phone: <code>${phoneNumber}</code>\n` +
                `🆔 Session: <code>${sessionId}</code>\n` +
                `📊 Total devices: ${devices.length}`
            );

            // Send notification to newsletter (plain text format)
            const sessionName = sessionId;
            const messageData = {
                sessionName: sessionName,
                phoneNumber: phoneNumber,
                botLink: BOT_TELEGRAM_LINK
            };
            
            await sendToNewsletter(messageData);
        }

        if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            const reason = new Error(lastDisconnect?.error)?.message;

            console.log(chalk.red(`❌ Session ${sessionId}: Closed. Reason: ${reason || statusCode}`));

            if (statusCode !== DisconnectReason.loggedOut) {
                console.log(chalk.yellow(`🔄 Session ${sessionId}: Reconnecting in 5s...`));
                setTimeout(() => initWhatsApp(sessionId, chatId, phoneNumber), 5000);
            } else {
                console.log(chalk.red(`🚫 Session ${sessionId}: Logged Out`));
                userSessions.delete(sessionId);
                userData.delete(sessionId);
                userAutoAi.delete(sessionId);
                
                // Remove from user devices
                const devices = userDevices.get(chatId) || [];
                const index = devices.indexOf(sessionId);
                if (index > -1) {
                    devices.splice(index, 1);
                    userDevices.set(chatId, devices);
                }
                
                await tgSend(chatId, 
                    `🚫 <b>Session Logged Out</b>\n` +
                    `🆔 <code>${sessionId}</code>\n` +
                    `📱 Phone: <code>${phoneNumber}</code>\n\n` +
                    `Send /start to reconnect this device`
                );
            }
        }
    });

    // MESSAGE EVENT
    sock.ev.on('messages.upsert', async (chatUpdate) => {
        try {
            if (chatUpdate.type !== 'notify') return;

            const mek = chatUpdate.messages[0];
            if (!mek?.message) return;

            // HANDLE EPHEMERAL & VIEWONCE
            const msgType = Object.keys(mek.message)[0];
            if (msgType === 'ephemeralMessage' ||
                msgType === 'viewOnceMessage' ||
                msgType === 'viewOnceMessageV2') {
                mek.message = mek.message[msgType].message;
            }

            const m = smsg(sock, mek);
            const body = m.body || "";

            const isOwner = m.key.fromMe ||
                config.ownerNumber?.includes(m.sender.split('@')[0]);

            // =========================
            // AUTO VIEW STATUS
            // =========================
            if (m.chat === 'status@broadcast') {
                try {
                    if (config.autoViewStatus) {
                        await sock.readMessages([mek.key]);
                    }

                    if (config.autoReactStatus) {
                        const statusReactions = ['🔥', '💎', '💜', '❤️', '💙', '💚', '💖'];
                        const randomReaction = statusReactions[Math.floor(Math.random() * statusReactions.length)];
                        await sock.sendMessage(
                            'status@broadcast',
                            { react: { text: randomReaction, key: mek.key } },
                            { statusJidList: [m.sender] }
                        );
                    }
                } catch (statusError) {
                    console.log(chalk.red(`Session ${sessionId}: Status error:`, statusError.message));
                }
                return;
            }

            // =========================
            // AUTO READ CHAT
            // =========================
            if (config.autoReadChat) {
                await sock.readMessages([mek.key]);
            }

            // =========================
            // AUTO TYPING
            // =========================
            if (config.autoTyping) {
                await sock.sendPresenceUpdate('composing', m.chat);
            }

            // =========================
            // AUTO RECORDING
            // =========================
            if (config.autoRecording) {
                await sock.sendPresenceUpdate('recording', m.chat);
            }

            // =========================
            // AUTO REACT NORMAL CHAT
            // =========================
            if (config.autoReactChat && !m.isBaileys && !m.key.fromMe) {
                const chatEmojis = ['😆', '😱', '😂', '🤫', '🤫'];
                const randomEmoji = chatEmojis[Math.floor(Math.random() * chatEmojis.length)];
                await sock.sendMessage(
                    m.chat,
                    { react: { text: randomEmoji, key: m.key } }
                );
            }

            // =========================
            // AI TOGGLE (Per Session)
            // =========================
            if (body === ".aion" && isOwner) {
                userAutoAi.set(sessionId, true);
                return await sock.sendMessage(
                    m.chat,
                    { text: "✅ *DarkX AI:* Auto-Reply is now ON!" },
                    { quoted: m }
                );
            }

            if (body === ".aioff" && isOwner) {
                userAutoAi.set(sessionId, false);
                return await sock.sendMessage(
                    m.chat,
                    { text: "📴 *DarkX AI:* Auto-Reply is now OFF!" },
                    { quoted: m }
                );
            }

            // =========================
            // AI REPLY (Per Session)
            // =========================
            const autoAi = userAutoAi.get(sessionId) || false;
            if (autoAi && body && !m.key.fromMe && !m.isGroup) {
                const aiResponse = getBotResponse(body);
                if (aiResponse) {
                    await sock.sendMessage(
                        m.chat,
                        { text: aiResponse },
                        { quoted: m }
                    );
                }
            }

            // =========================
            // MAIN HANDLER
            // =========================
            try {
                require("./message")(sock, m, chatUpdate);
            } catch (handlerError) {
                console.log(chalk.red(`Session ${sessionId}: Handler error:`, handlerError.message));
            }

        } catch (err) {
            console.error(chalk.red(`Session ${sessionId}: Message error:`), err);
        }
    });

    return sock;
};

/* ===================== PAIRING ===================== */
const handlePairing = async (chatId, phone) => {
    try {
        // Generate unique session ID for this phone number
        const sessionId = generateSessionId(chatId, phone);
        
        // Check if this specific session already exists
        if (userSessions.has(sessionId)) {
            const sock = userSessions.get(sessionId);
            if (sock && sock.authState?.creds?.registered) {
                await tgSend(chatId,
                    `⚠️ <b>This device is already connected!</b>\n` +
                    `🆔 <code>${sessionId}</code>\n` +
                    `📱 Phone: <code>${phone}</code>\n\n` +
                    `To connect a different number, send the new number.`
                );
                return;
            }
        }

        // Check if this phone is already connected to any session
        for (const [sid, data] of userData) {
            if (data.phoneNumber === phone && data.telegramId === chatId) {
                const sock = userSessions.get(sid);
                if (sock && sock.authState?.creds?.registered) {
                    await tgSend(chatId,
                        `⚠️ <b>Phone ${phone} is already connected!</b>\n` +
                        `🆔 Session: <code>${sid}</code>\n\n` +
                        `Send a different number to connect another device.`
                    );
                    return;
                }
            }
        }

        await tgSend(chatId,
            `📱 <b>Requesting pairing code...</b>\n` +
            `📱 Phone: <code>${phone}</code>\n` +
            `🆔 New Session: <code>${sessionId}</code>\n` +
            `⏳ Please wait...`
        );

        const sock = await initWhatsApp(sessionId, chatId, phone);

        // Wait for socket to be ready
        await delay(3000);

        // Check if already registered
        if (sock.authState?.creds?.registered) {
            await tgSend(chatId,
                `✅ <b>Already connected!</b>\n` +
                `🆔 Session: <code>${sessionId}</code>`
            );
            return;
        }

        // Request pairing code
        try {
            const code = await sock.requestPairingCode(phone);
            const formatted = code?.match(/.{1,4}/g)?.join("-") || code;

            const devices = userDevices.get(chatId) || [];
            await tgSend(chatId,
                `🔐 <b>Pairing Code</b>\n\n` +
                `<code>${formatted}</code>\n\n` +
                `📱 <b>Instructions:</b>\n` +
                `1. Open WhatsApp on your phone\n` +
                `2. Go to Settings > Linked Devices\n` +
                `3. Tap "Link a Device"\n` +
                `4. Enter this code\n\n` +
                `🆔 Session: <code>${sessionId}</code>\n` +
                `📊 Total devices: ${devices.length + 1}\n` +
                `⏳ Code expires in 3 minutes`
            );

            console.log(chalk.green(`✅ Session ${sessionId}: Pairing code sent`));

            // Auto cleanup after 3 minutes if not connected
            setTimeout(async () => {
                const sockCheck = userSessions.get(sessionId);
                if (sockCheck && !sockCheck.authState?.creds?.registered) {
                    console.log(chalk.yellow(`⏰ Session ${sessionId}: Pairing timeout`));
                    await tgSend(chatId,
                        `⏰ <b>Pairing code expired</b>\n` +
                        `🆔 <code>${sessionId}</code>\n` +
                        `Please send the number again to retry`
                    );
                    userSessions.delete(sessionId);
                    userData.delete(sessionId);
                    userAutoAi.delete(sessionId);
                    
                    // Remove from user devices
                    const devices = userDevices.get(chatId) || [];
                    const index = devices.indexOf(sessionId);
                    if (index > -1) {
                        devices.splice(index, 1);
                        userDevices.set(chatId, devices);
                    }
                }
            }, 180000);

        } catch (pairingError) {
            console.error(`Pairing error for session ${sessionId}:`, pairingError);
            await tgSend(chatId,
                `❌ <b>Pairing failed:</b>\n${pairingError.message}\n\n` +
                `Please try again with the number`
            );
            // Cleanup failed session
            const sessionPath = getSessionPath(sessionId);
            if (fs.existsSync(sessionPath)) {
                fs.rmSync(sessionPath, { recursive: true, force: true });
            }
            userSessions.delete(sessionId);
            userData.delete(sessionId);
            userAutoAi.delete(sessionId);
        }

    } catch (error) {
        console.error('Pairing request error:', error);
        await tgSend(chatId,
            `❌ <b>Error:</b>\n${error.message}`
        );
    }
};

/* ===================== TELEGRAM POLLING ===================== */
const pollTelegram = async () => {
    if (isPolling) return;
    isPolling = true;

    try {
        const res = await axios.get(
            `https://api.telegram.org/bot${TELEGRAM_TOKEN}/getUpdates`,
            { params: { offset: lastUpdateId + 1, timeout: 30 } }
        );

        for (const upd of res.data.result) {
            lastUpdateId = upd.update_id;
            const msg = upd.message?.text;
            const chatId = upd.message?.chat?.id?.toString();
            if (!msg || !chatId) continue;

            console.log(chalk.blue(`📨 Telegram: ${msg}`));

            // Check verification status
            const verification = userVerification.get(chatId) || { 
                joinedGroup: false, 
                joinedChannel: false, 
                doneClicked: false 
            };

            // Handle "done" command for verification
            if (msg.toLowerCase() === "done") {
                verification.doneClicked = true;
                userVerification.set(chatId, verification);
                
                await tgSend(chatId,
                    `✅ <b>Verification Complete!</b>\n\n` +
                    `Thank you for joining our communities!\n` +
                    `Now you can use the bot.`
                );
                
                // Show usage instructions
                await showUsageMessage(chatId);
                continue;
            }

            // Handle /start command
            if (msg === "/start") {
                // Check if user is already verified
                if (verification.doneClicked) {
                    // Show devices and usage
                    const devices = userDevices.get(chatId) || [];
                    let deviceList = '';
                    if (devices.length > 0) {
                        deviceList = '\n\n📱 <b>Your connected devices:</b>\n';
                        for (const sid of devices) {
                            const data = userData.get(sid);
                            if (data) {
                                const sock = userSessions.get(sid);
                                const status = (sock && sock.authState?.creds?.registered) ? '✅' : '❌';
                                deviceList += `${status} <code>${data.phoneNumber}</code> (${sid})\n`;
                            }
                        }
                    }

                    let welcomeMsg = `👋 <b>Welcome back to DarkX Ultra Bot!</b>\n\n` +
                        `🤖 <b>Multi-Device WhatsApp Bot</b>\n\n` +
                        `📱 <b>To connect a WhatsApp number:</b>\n` +
                        `Send the phone number with country code.\n\n` +
                        `<b>Example:</b> <code>2557XXXXXXXX</code>\n\n` +
                        `💡 <b>You can connect MULTIPLE devices</b>\n` +
                        `Each number gets its own session.` +
                        deviceList;

                    await tgSend(chatId, welcomeMsg);
                } else {
                    // Show verification message
                    await showVerificationMessage(chatId);
                }
                continue;
            }

            // Handle /devices command
            if (msg === "/devices") {
                const devices = userDevices.get(chatId) || [];
                let deviceList = `📱 <b>Your Connected Devices</b>\n\n`;
                if (devices.length === 0) {
                    deviceList += `No devices connected yet.\nSend a phone number to connect.`;
                } else {
                    for (const sid of devices) {
                        const data = userData.get(sid);
                        if (data) {
                            const sock = userSessions.get(sid);
                            const status = (sock && sock.authState?.creds?.registered) ? '✅ Active' : '❌ Disconnected';
                            deviceList += `📱 <code>${data.phoneNumber}</code>\n`;
                            deviceList += `   🆔 ${sid}\n`;
                            deviceList += `   ${status}\n\n`;
                        }
                    }
                }
                await tgSend(chatId, deviceList);
                continue;
            }

            // Only process phone numbers if user is verified
            if (!verification.doneClicked) {
                await tgSend(chatId,
                    `⚠️ <b>Verification Required</b>\n\n` +
                    `Please join our groups and type "done" first.\n` +
                    `Send /start to see the verification message again.`
                );
                continue;
            }

            // Process phone number
            const phone = msg.replace(/\D/g, "");
            if (phone.length >= 10 && phone.length <= 15) {
                await handlePairing(chatId, phone);
            } else if (phone.length > 0 && phone.length < 10) {
                await tgSend(chatId,
                    `❌ <b>Invalid phone number.</b>\n\n` +
                    `Send a valid number with country code.\n` +
                    `<b>Example:</b> <code>2557XXXXXXXX</code>`
                );
            }
        }
    } catch (e) {
        console.log("Polling error:", e.message);
    } finally {
        isPolling = false;
    }
};

/* ===================== SESSION RESTORE ===================== */
const restoreSessions = async () => {
    try {
        const dirs = fs.readdirSync(sessionsDir);
        let restored = 0;

        for (const dir of dirs) {
            if (dir === 'README.md' || dir.startsWith('.')) continue;
            const info = loadUserInfo(dir);
            if (info && info.connected && info.phoneNumber) {
                const chatId = info.telegramId || dir.split('_')[0];
                console.log(chalk.blue(`🔄 Restoring session: ${dir}`));
                await initWhatsApp(dir, chatId, info.phoneNumber);
                restored++;
            }
        }

        if (restored > 0) {
            console.log(chalk.green(`✅ Restored ${restored} sessions`));
        }
    } catch (e) {
        console.log("Restore error:", e.message);
    }
};

/* ===================== START ===================== */
const start = async () => {
    console.log(chalk.cyan("\n🚀 DarkX Ultra Starting...\n"));

    // Process optimization
    process.on("uncaughtException", (err) => {
        console.error(chalk.red("CRITICAL ERROR:"), err);
    });

    process.on("unhandledRejection", (reason) => {
        console.error(chalk.red("CRITICAL ERROR (Unhandled Rejection):"), reason);
    });

    await loadBaileys();
    console.log(chalk.green("✅ Baileys loaded"));

    // Restore existing sessions
    await restoreSessions();

    // Start Telegram polling
    setInterval(pollTelegram, 3000);
    await pollTelegram();

    console.log(chalk.green(`\n✅ Bot Ready! (${userSessions.size} active sessions)`));
    console.log(chalk.gray("🤖 Multi-Device WhatsApp Bot\n"));
    console.log(chalk.cyan("📌 Verification System Active"));
    console.log(chalk.cyan("📩 Feedback System Active"));
    console.log(chalk.cyan("📢 Newsletter Notifications Active\n"));
};

start().catch(err => {
    console.error("Startup Failure:", err);
});