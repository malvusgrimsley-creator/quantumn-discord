const http = require('http');
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const https = require('https');

// Web server for Render
const server = http.createServer((req, res) => {
    res.writeHead(200);
    res.end('Bot is running!');
});

server.listen(3000, () => {
    console.log('🌐 Web server ready');
});

// Discord client with all required intents
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences
    ]
});

// Your Discord User ID
const ADMIN_USERS = ['1506534999204298923'];

// Key type configurations
const KEY_TYPES = {
    common: { 
        name: 'Common', 
        emoji: '🟢', 
        color: 0x00ff88, 
        prefix: 'CMN', 
        reward: '1,000 Robux', 
        expiry: 24 
    },
    rare: { 
        name: 'Rare', 
        emoji: '🔵', 
        color: 0x0099ff, 
        prefix: 'RAR', 
        reward: '5,000 Robux + Limited', 
        expiry: 12 
    },
    epic: { 
        name: 'Epic', 
        emoji: '🟣', 
        color: 0x8c00ff, 
        prefix: 'EPC', 
        reward: '10,000 Robux + Korblox', 
        expiry: 6 
    },
    mythic: { 
        name: 'Mythic', 
        emoji: '🟡', 
        color: 0xffd700, 
        prefix: 'MYT', 
        reward: '15,000 Robux + Stacked Account', 
        expiry: 3 
    }
};

// Generate key based on type
function generateKey(type) {
    const config = KEY_TYPES[type];
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let key = config.prefix + '-';
    const length = type === 'mythic' ? 12 : type === 'epic' ? 10 : 8;
    for (let i = 0; i < length; i++) {
        key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    key += '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
    return key;
}

// Update JSONBin
async function updateWebsiteKey(key, type) {
    const data = JSON.stringify({
        key: key,
        type: type,
        timestamp: new Date().toISOString()
    });
    
    const options = {
        hostname: 'api.jsonbin.io',
        path: '/v3/b/6a2cd289da38895dfeb8ac3b',
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'X-Master-Key': '$2a$10$hJ/FocyDPeHkkqIY0z4qzuvdTP.QEbGACgo2F3m1qMxOzJ4HB3mcS',
            'Content-Length': Buffer.byteLength(data)
        }
    };
    
    return new Promise((resolve) => {
        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                console.log('JSONBin Response:', res.statusCode);
                resolve(res.statusCode === 200);
            });
        });
        req.on('error', (e) => {
            console.error('JSONBin Error:', e);
            resolve(false);
        });
        req.write(data);
        req.end();
    });
}

// Bot ready
client.once('ready', () => {
    console.log(`✅ ${client.user.tag} is online!`);
    console.log('🔑 Key Types: common, rare, epic, mythic');
    client.user.setActivity('!genkey <type>', { type: 'WATCHING' });
});

// Commands
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    
    if (message.content === '!help') {
        const embed = new EmbedBuilder()
            .setTitle('🔑 Key Generator Commands')
            .setColor(0x8c00ff)
            .setDescription('Generate different tier keys!')
            .addFields({
                name: '📋 Commands',
                value: [
                    '`!genkey common` 🟢 1,000 Robux',
                    '`!genkey rare` 🔵 5,000 Robux + Limited',
                    '`!genkey epic` 🟣 10,000 Robux + Korblox',
                    '`!genkey mythic` 🟡 15,000 Robux + Stacked',
                    '',
                    '`!help` - Show this menu'
                ].join('\n')
            })
            .setFooter({ text: 'Hold key to copy • Website auto-updates' });
        
        await message.reply({ embeds: [embed] });
        return;
    }
    
    if (message.content.startsWith('!genkey')) {
        if (!ADMIN_USERS.includes(message.author.id)) {
            return message.reply('❌ Only admins can generate keys!');
        }
        
        const type = message.content.split(' ')[1]?.toLowerCase();
        
        if (!type || !KEY_TYPES[type]) {
            const embed = new EmbedBuilder()
                .setTitle('❌ Invalid Type')
                .setColor(0xff0000)
                .setDescription('Use: `common`, `rare`, `epic`, or `mythic`')
                .setFooter({ text: 'Example: !genkey mythic' });
            
            return message.reply({ embeds: [embed] });
        }
        
        const config = KEY_TYPES[type];
        const key = generateKey(type);
        
        // Update website
        const webUpdated = await updateWebsiteKey(key, type);
        
        if (!webUpdated) {
            return message.reply('❌ Failed to update website. Try again.');
        }
        
        // Create public embed
        const keyEmbed = new EmbedBuilder()
            .setTitle(`${config.emoji} NEW ${config.name.toUpperCase()} KEY ${config.emoji}`)
            .setColor(config.color)
            .setDescription([
                '**📱 Hold to copy the key:**',
                '',
                `\`\`\`${key}\`\`\``,
                '',
                '**How to claim:**',
                '1️⃣ Hold & copy the key above',
                '2️⃣ Go to our website',
                '3️⃣ Enter the key & verify'
            ].join('\n'))
            .addFields(
                { name: '🎁 Reward', value: config.reward, inline: true },
                { name: '⏰ Expires', value: `${config.expiry} Hours`, inline: true },
                { name: '📊 Type', value: `${config.emoji} ${config.name}`, inline: true },
                { name: '🌐 Status', value: '✅ Live on website', inline: true }
            )
            .setFooter({ text: 'Hold the key above to copy • Website updated' })
            .setTimestamp();
        
        // Send to channel
        await message.channel.send({
            content: `@everyone 🔑 **NEW ${config.name.toUpperCase()} KEY DROPPED!**`,
            embeds: [keyEmbed]
        });
        
        // Confirm to admin
        await message.reply(`✅ ${config.emoji} **${config.name}** key generated and posted!`);
    }
});

// Login
client.login('MTUxNTI4MDg3OTMzMTcwODk4OA.Gx6PDH.mphXzBDC5AWlnFWam0uiItBQ61b_Z_W7Wsf7Xs')
    .then(() => console.log('🤖 Bot logged in!'))
    .catch(err => console.error('❌ Login failed:', err));
