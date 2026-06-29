"use strict";

/**
 * Project: DarkX Ultra
 * Owner: MrX Dev
 * Engineer: Senior Node.js WhatsApp Bot Engineer
 * Lightweight JSON Database System
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

const dbPath = path.join(__dirname, '../database.json');

// --- DATABASE STRUCTURE ---
const defaultData = {
    users: {},      // Data za watumiaji (kama level, xp, ban status)
    groups: {},     // Data za magroup (kama welcome message, anti-link)
    settings: {     // Mipangilio ya jumla ya bot
        self: false,
        autoRead: false,
        public: true,
        online: true
    },
    others: {}      // Data mchanganyiko
};

/**
 * Inasoma data kutoka kwenye file la JSON.
 * Ikiwa file halipo, inatengeneza jipya na defaultData.
 */
const loadDatabase = () => {
    try {
        if (!fs.existsSync(dbPath)) {
            fs.writeFileSync(dbPath, JSON.stringify(defaultData, null, 2));
            console.log(chalk.green("✅ Database mpya imetengenezwa!"));
            return defaultData;
        }
        const data = fs.readFileSync(dbPath, 'utf-8');
        return JSON.parse(data);
    } catch (err) {
        console.error(chalk.red("❌ Error kusoma database:"), err);
        return defaultData;
    }
};

/**
 * Inahifadhi data zote zilizobadilika kwenda kwenye JSON file.
 */
const saveDatabase = (data) => {
    try {
        fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
    } catch (err) {
        console.error(chalk.red("❌ Error kuhifadhi database:"), err);
    }
};

/**
 * Inahakikisha mtumiaji au group lipo kwenye DB, asipokuwepo anahifadhiwa.
 */
const synchronizeData = (m, sock) => {
    const db = global.db; // Tunatumia global ili ipatikane kote
    if (!db) return;

    const isGroup = m.chat.endsWith('@g.us');
    const sender = m.sender;

    // 1. Synchronize User
    if (sender) {
        let user = db.users[sender];
        if (typeof user !== 'object') db.users[sender] = {};
        if (user) {
            if (!('name' in user)) user.name = m.pushName || "User";
            if (!('banned' in user)) user.banned = false;
            if (!('premium' in user)) user.premium = false;
            if (!('warn' in user)) user.warn = 0;
            if (!('limit' in user)) user.limit = 20; // Daily limit ya commands
        } else {
            db.users[sender] = {
                name: m.pushName || "User",
                banned: false,
                premium: false,
                warn: 0,
                limit: 20
            };
        }
    }

    // 2. Synchronize Group
    if (isGroup) {
        let group = db.groups[m.chat];
        if (typeof group !== 'object') db.groups[m.chat] = {};
        if (group) {
            if (!('mute' in group)) group.mute = false;
            if (!('welcome' in group)) group.welcome = true;
            if (!('antilink' in group)) group.antilink = false;
            if (!('setWelcome' in group)) group.setWelcome = '';
        } else {
            db.groups[m.chat] = {
                mute: false,
                welcome: true,
                antilink: false,
                setWelcome: ''
            };
        }
    }

    // 3. Synchronize Bot Settings
    let settings = db.settings;
    if (typeof settings !== 'object') db.settings = defaultData.settings;
};

// Initialize Database globally
global.db = loadDatabase();

// Auto-save kila baada ya sekunde 30 kuzuia kupoteza data bot ikizima ghafla
setInterval(() => {
    if (global.db) saveDatabase(global.db);
}, 30000);

module.exports = {
    loadDatabase,
    saveDatabase,
    synchronizeData,
    dbPath
};
