const http = require('http');
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');

// Web server for Render
const server = http.createServer((req, res) => {
    res.writeHead(200);
    res.end('Bot is running!');
});

server.listen(3000, () => {
    console.log('🌐 Web server ready');
});

// Discord client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences
    ]
});

// Key channel ID
const KEY_CHANNEL_ID = '1513456369762828378';

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

// Generate key
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
    try {
        const response = await fetch(`https://api.jsonbin.io/v3/b/6a2cd289da38895dfeb8ac3b`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Master-Key': '$2a$10$hJ/FocyDPeHkkqIY0z4qzuvdTP.QEbGACgo2F3m1qMxOzJ4HB3mcS'
            },
            body: JSON.stringify({
                key: key,
                type: type,
                timestamp: new Date().toISOString()
            })
        });
        return response.ok;
    } catch (error) {
        console.error('JSONBin Error:', error);
        return false;
    }
}

// Bot ready
client.once('ready', () => {
    console.log(`✅ ${client.user.tag} is online!`);
    console.log(`📢 Posting keys to channel: ${KEY_CHANNEL_ID}`);
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
                value: '`!genkey common` 🟢\n`!genkey rare` 🔵\n`!genkey epic` 🟣\n`!genkey mythic` 🟡\n`!help` - Show this menu'
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
            return message.reply('❌ Use: common, rare, epic, or mythic\nExample: !genkey mythic');
        }
        
        const config = KEY_TYPES[type];
        const key = generateKey(type);
        
        // Update website
        const webUpdated = await updateWebsiteKey(key, type);
        
        if (!webUpdated) {
            return message.reply('❌ Failed to update website!');
        }
        
        // Create embed
        const keyEmbed = new EmbedBuilder()
            .setTitle(`${config.emoji} NEW ${config.name.toUpperCase()} KEY ${config.emoji}`)
            .setColor(config.color)
            .setDescription(`**📱 Hold to copy:**\n\`\`\`${key}\`\`\`\n**How to claim:**\n1️⃣ Copy key above\n2️⃣ Go to website\n3️⃣ Enter key & verify`)
            .addFields(
                { name: '🎁 Reward', value: config.reward, inline: true },
                { name: '⏰ Expires', value: `${config.expiry} Hours`, inline: true },
                { name: '🌐 Status', value: '✅ Live on website', inline: true }
            )
            .setTimestamp();
        
        // Send to key channel
        const keyChannel = client.channels.cache.get(KEY_CHANNEL_ID);
        
        if (keyChannel) {
            await keyChannel.send({
                content: `@everyone 🔑 **NEW ${config.name.toUpperCase()} KEY!**`,
                embeds: [keyEmbed]
            });
            await message.reply(`✅ Key sent to <#${KEY_CHANNEL_ID}>!`);
        } else {
            await message.channel.send({
                content: `@everyone 🔑 **NEW ${config.name.toUpperCase()} KEY!**`,
                embeds: [keyEmbed]
            });
        }
    }
});

// Login
client.login(process.env.DISCORD_TOKEN)
    .then(() => console.log('🤖 Bot logged in!'))
    .catch(err => console.error('❌ Login failed:', err));
