const http = require('http');
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');

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
        GatewayIntentBits.MessageContent
    ]
});

// ⚠️ REPLACE WITH YOUR DISCORD USER ID ⚠️
const ADMIN_USERS = ['YOUR_DISCORD_USER_ID'];

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
    
    // Longer keys for higher tiers
    const length = type === 'mythic' ? 12 : type === 'epic' ? 10 : 8;
    
    for (let i = 0; i < length; i++) {
        key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    key += '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
    return key;
}

// Update website (JSONBin)
async function updateWebsiteKey(key, type) {
    try {
        const response = await fetch(`https://api.jsonbin.io/v3/b/${process.env.JSONBIN_ID}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Master-Key': process.env.JSONBIN_MASTER_KEY
            },
            body: JSON.stringify({
                key: key,
                type: type,
                timestamp: new Date().toISOString()
            })
        });
        return response.ok;
    } catch (error) {
        console.error('JSONBin error:', error);
        return false;
    }
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
    
    // Help command
    if (message.content === '!help') {
        const embed = new EmbedBuilder()
            .setTitle('🔑 Key Generator Commands')
            .setColor(0x8c00ff)
            .setDescription('Generate different tier keys for users!')
            .addFields(
                { 
                    name: '📋 Commands', 
                    value: [
                        '`!genkey common` 🟢',
                        '`!genkey rare` 🔵',
                        '`!genkey epic` 🟣',
                        '`!genkey mythic` 🟡',
                        '',
                        '`!help` - Show this menu'
                    ].join('\n'),
                    inline: false 
                },
                { 
                    name: '🎁 Rewards', 
                    value: [
                        '🟢 Common → 1,000 Robux',
                        '🔵 Rare → 5,000 Robux + Limited',
                        '🟣 Epic → 10,000 Robux + Korblox',
                        '🟡 Mythic → 15,000 Robux + Stacked Account'
                    ].join('\n'),
                    inline: false 
                }
            )
            .setFooter({ text: 'Keys update website automatically' });
        
        await message.reply({ embeds: [embed] });
        return;
    }
    
    // Generate key command
    if (message.content.startsWith('!genkey')) {
        // Check if admin
        if (!ADMIN_USERS.includes(message.author.id)) {
            return message.reply('❌ Only admins can generate keys!');
        }
        
        // Get type from command
        const args = message.content.split(' ');
        const type = args[1]?.toLowerCase();
        
        // Validate type
        if (!type || !KEY_TYPES[type]) {
            const embed = new EmbedBuilder()
                .setTitle('❌ Invalid Key Type')
                .setColor(0xff0000)
                .setDescription('Please choose a valid type:')
                .addFields({
                    name: 'Valid types:',
                    value: '`common` `rare` `epic` `mythic`'
                })
                .setFooter({ text: 'Example: !genkey mythic' });
            
            return message.reply({ embeds: [embed] });
        }
        
        const config = KEY_TYPES[type];
        
        // Send processing message
        const processingMsg = await message.reply(`${config.emoji} Generating **${config.name}** key...`);
        
        // Generate key
        const key = generateKey(type);
        
        // Update website
        const webUpdated = await updateWebsiteKey(key, type);
        
        // Create beautiful embed for public channel
        const keyEmbed = new EmbedBuilder()
            .setTitle(`${config.emoji} NEW ${config.name.toUpperCase()} KEY ${config.emoji}`)
            .setColor(config.color)
            .setDescription([
                '**Hold to copy the key below:**',
                '',
                `\`\`\`${key}\`\`\``,
                '',
                '**How to claim:**',
                '1️⃣ Hold & copy the key above',
                '2️⃣ Go to our website',
                '3️⃣ Enter the key',
                '4️⃣ Verify on Roblox'
            ].join('\n'))
            .addFields(
                { 
                    name: '🎁 Reward', 
                    value: config.reward, 
                    inline: true 
                },
                { 
                    name: '⏰ Expires In', 
                    value: `${config.expiry} Hours`, 
                    inline: true 
                },
                { 
                    name: '📊 Type', 
                    value: `${config.emoji} ${config.name}`, 
                    inline: true 
                }
            )
            .setFooter({ text: 'Key is now live on website • Copy by holding the key' })
            .setTimestamp();
        
        // Delete processing message
        await processingMsg.delete();
        
        // Send key to channel
        const keyMessage = await message.channel.send({
            content: `@everyone 🔑 **NEW ${config.name.toUpperCase()} KEY DROPPED!**`,
            embeds: [keyEmbed]
        });
        
        // Reply to admin privately
        const adminEmbed = new EmbedBuilder()
            .setTitle('✅ Key Generated')
            .setColor(0x00ff88)
            .setDescription(`**${config.name}** key created!`)
            .addFields(
                { name: '🔑 Key', value: `\`${key}\``, inline: false },
                { name: '📢 Posted', value: `<#${message.channel.id}>`, inline: true },
                { name: '🌐 Website', value: '✅ Updated', inline: true }
            );
        
        await message.reply({ embeds: [adminEmbed], ephemeral: true });
    }
});

// Login
client.login(process.env.DISCORD_TOKEN);
