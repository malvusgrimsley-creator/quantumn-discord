const http = require('http');
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');

const server = http.createServer((req, res) => {
    res.writeHead(200);
    res.end('Bot is running!');
});

server.listen(3000, () => {
    console.log('🌐 Web server ready');
});

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const ADMIN_USERS = ['1506534999204298923'];

const CONFIG = {
    jsonBinId: '6a2cd289da38895dfeb8ac3b',
    jsonBinKey: '$2a$10$hJ/FocyDPeHkkqIY0z4qzuvdTP.QEbGACgo2F3m1qMxOzJ4HB3mcS'
};

function generateKey() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let key = 'RBX-';
    for (let i = 0; i < 12; i++) {
        key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    key += '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
    return key;
}

async function updateWebsiteKey(key) {
    try {
        const response = await fetch(`https://api.jsonbin.io/v3/b/${CONFIG.jsonBinId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Master-Key': CONFIG.jsonBinKey
            },
            body: JSON.stringify({
                key: key,
                timestamp: new Date().toISOString()
            })
        });
        return response.ok;
    } catch (error) {
        console.error('JSONBin Error:', error);
        return false;
    }
}

client.once('ready', () => {
    console.log(`✅ ${client.user.tag} is online!`);
    client.user.setActivity('!genkey | !help', { type: 'WATCHING' });
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    
    if (message.content === '!help') {
        const embed = new EmbedBuilder()
            .setTitle('🔑 Key Generator')
            .setColor(0x8c00ff)
            .addFields({
                name: '📋 Commands',
                value: '`!genkey` - Generate new key (Admin only)\n`!help` - Show this menu'
            });
        
        await message.reply({ embeds: [embed] });
        return;
    }
    
    if (message.content === '!genkey') {
        if (!ADMIN_USERS.includes(message.author.id)) {
            return message.reply('❌ Only admins can generate keys!');
        }
        
        const key = generateKey();
        const updated = await updateWebsiteKey(key);
        
        if (!updated) {
            return message.reply('❌ Failed to update website!');
        }
        
        const embed = new EmbedBuilder()
            .setTitle('🔑 NEW ACCESS KEY')
            .setColor(0x8c00ff)
            .setDescription(`\`\`\`${key}\`\`\``)
            .addFields(
                { name: '⏰ Expires', value: '24 Hours', inline: true },
                { name: '🌐 Status', value: '✅ Live on website', inline: true }
            )
            .setTimestamp();
        
        await message.channel.send({ embeds: [embed] });
    }
});

client.login(process.env.DISCORD_TOKEN)
    .then(() => console.log('🤖 Bot logged in!'))
    .catch(err => console.error('❌ Login failed:', err));
