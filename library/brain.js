/**
 * DarkX AI - Business & Tech Intelligence
 * Powered by MrX Dev | Mwana wa Mzee King Project
 */

const config = require("../settings/config");

const knowledgeBase = [
    {
        keywords: ['mambo', 'habari', 'niaje', 'hi', 'hello', 'vipi', 'mambo vipi'],
        reply: `
*╔════════════════════╗*
*║      ＤΛＲＫＸ   ΛＩ      ║*
*╚════════════════════╝*

Greetings! Naitwa *DarkX AI*, intelligence system ya **MrX Dev**. 

Niko hapa kukuongoza kupata suluhisho bora za kidijitali. Iwe unahitaji *WhatsApp Bot* yenye nguvu au *Website* ya kisasa, upo mahali sahihi.

📌 *Quick Start:*
> Type *.list* ➜ Kuona Menu ya Biashara
> Type *.menu* ➜ Kuona Commands zote

_“Empowering your vision through code.”_`
    },
    {
        keywords: ['bot', 'whatsapp bot', 'tengeneza bot', 'kuunda bot', 'script', 'baileys'],
        reply: `
*┏━━━━━━◤ 📦 ◢━━━━━━┓*
*┃   ＷＨΛＴＳΛＰＰ   ＢＯＴＳ   ┃*
*┗━━━━━━◣ 📦 ◢━━━━━━┛*

Unahitaji mfumo wa *Kiotomatiki* unaofanya kazi 24/7? Tunatengeneza Bots kwa teknolojia ya **Baileys (Node.js)** zenye sifa zifuatazo:

✨ *Custom Features*
🚀 *Ultra-Fast Speed*
🔒 *High Security*

*Hitch a ride to progress:*
Andika *.list* sasa hivi uone packages zetu kuanzia 10k tu!

> _Mwana wa Mzee King Project_`
    },
    {
        keywords: ['website', 'tovuti', 'web', 'tengeneza website', 'hosting'],
        reply: `
*🌐 〔 ＤΞＶΞＬＯＰＭΞＮＴ 〕 🌐*

Tunajenga madaraja ya kidijitali! Website yako ni ofisi yako ya mtandaoni. 
DarkX inakupa:
 
⚡ *Responsive Design* (Simu & PC)
🛠️ *Full Backend Support*
💎 *Premium UI/UX*

Gharama zinaanza *50,000 TZS* pekee. 
Check full details kwa kuandika *.list*`
    },
    {
        keywords: ['customize', 'badilisha', 'vile nataka', 'special', 'pro'],
        reply: `
*🛠️ ◤ ＣＵＳＴＯＭＩＺΛＴＩＯＮ ◢ 🛠️*

Sisi hatufanyi kazi za kukariri! Tuambie unachowaza, na sisi tutakiandikia Code.
• Unataka Bot ya kusimamia vikundi?
• Unataka Website ya kuuza bidhaa?
• Unataka Logo ya kijanja?

*Talk to the Expert:*
Andika *.owner* uongee na **MrX Dev** moja kwa moja au andika *.list* uone uwezo wetu.`
    },
    {
        keywords: ['hacking', 'cybersecurity', 'cyber', 'usalama'],
        reply: `
*🛡️ ◤ ＣＹＢΞＲ  ＳΞＣＵＲＩＴＹ ◢ 🛡️*

Katika ulimwengu wa giza, ulinzi ni kila kitu. Tunatoa huduma za:
• Penetration Testing
• Account Security Audits
• Vulnerability Fixes

_Warning: We operate under strict professional ethics._
Detailed pricing? Type *.list* (Namba 4).`
    }
];

const getBotResponse = (userInput) => {
    const text = userInput.toLowerCase().trim();
    
    for (const entry of knowledgeBase) {
        const isMatch = entry.keywords.some(keyword => {
            const regex = new RegExp(`\\b${keyword}\\b`, 'i');
            return regex.test(text);
        });
        
        if (isMatch) return entry.reply;
    }

    // Default response kama hajaandika keyword inayoeleweka
    return `
*⚠️ 〔 ＳＹＳＴΞＭ  ＮＯＴＩＣΞ 〕 ⚠️*

Samahani, sijapata keyword sahihi. Ikiwa unataka kuona huduma zetu za *Bots, Website* na *Hacking*, tafadhali tumia amri hii:

👉 *${config.prefix}list*

_DarkX Ultra v6.0.0_`;
};

module.exports = { getBotResponse };
