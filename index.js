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
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildInvites
    ]
});

const CONFIG = {
    jsonBinId: '6a2cd289da38895dfeb8ac3b',
    jsonBinKey: '$2a$10$hJ/FocyDPeHkkqIY0z4qzuvdTP.QEbGACgo2F3m1qMxOzJ4HB3mcS',
    minInvites: 4,
    keyExpiryHours: 24,
    restrictedChannelId: '1515761196156977263',
    // Add admin role or user IDs who can use !send (optional - leave empty to allow all admins)
    allowedSenders: [] // Put user IDs here if you want to restrict to specific people
};

const inviteCache = new Map();

function generateKey() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let key = 'HLWN-';
    for (let i = 0; i < 8; i++) {
        key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    key += '-' + Math.random().toString(36).substring(2, 5).toUpperCase();
    return key;
}

async function getAllKeys() {
    try {
        const response = await fetch(`https://api.jsonbin.io/v3/b/${CONFIG.jsonBinId}/latest`, {
            headers: {
                'X-Master-Key': CONFIG.jsonBinKey
            }
        });
        const data = await response.json();
        return data.record || {};
    } catch (error) {
        console.error('JSONBin Read Error:', error);
        return {};
    }
}

async function updateKeys(keysData) {
    try {
        const response = await fetch(`https://api.jsonbin.io/v3/b/${CONFIG.jsonBinId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Master-Key': CONFIG.jsonBinKey
            },
            body: JSON.stringify(keysData)
        });
        return response.ok;
    } catch (error) {
        console.error('JSONBin Update Error:', error);
        return false;
    }
}

async function addKey(key, userId, username) {
    const allKeys = await getAllKeys();
    
    if (!allKeys.keys) {
        allKeys.keys = {};
    }
    
    allKeys.keys[key] = {
        userId: userId,
        username: username,
        used: false,
        createdAt: new Date().toISOString(),
        usedAt: null,
        usedBy: null
    };
    
    return await updateKeys(allKeys);
}

async function getInviteCount(member) {
    const invites = await member.guild.invites.fetch();
    let userInvites = 0;
    
    invites.forEach(invite => {
        if (invite.inviter && invite.inviter.id === member.id) {
            userInvites += invite.uses;
        }
    });
    
    return userInvites;
}

client.once('ready', async () => {
    console.log(`✅ ${client.user.tag} is online!`);
    client.user.setActivity('!redeem for keys', { type: 'WATCHING' });
    
    client.guilds.cache.forEach(async (guild) => {
        try {
            const invites = await guild.invites.fetch();
            invites.forEach(invite => {
                if (invite.inviter) {
                    inviteCache.set(`${guild.id}-${invite.code}`, {
                        inviterId: invite.inviter.id,
                        uses: invite.uses
                    });
                }
            });
        } catch (err) {
            console.error(`Failed to cache invites for ${guild.name}:`, err.message);
        }
    });
});

client.on('inviteCreate', (invite) => {
    inviteCache.set(`${invite.guild.id}-${invite.code}`, {
        inviterId: invite.inviter.id,
        uses: invite.uses
    });
});

// ============================
// MESSAGE HANDLER WITH AUTO-DELETE
// ============================

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    
    // ============================
    // !send COMMAND - NEW!
    // ============================
    
    if (message.content.startsWith('!send')) {
        // Check permissions: Must be Administrator OR in the allowedSenders list
        const isAdmin = message.member.permissions.has('Administrator');
        const isAllowedUser = CONFIG.allowedSenders.includes(message.author.id);
        
        if (!isAdmin && !isAllowedUser) {
            const embed = new EmbedBuilder()
                .setTitle('❌ Permission Denied')
                .setColor(0xff0000)
                .setDescription('You need Administrator permissions to use `!send`.');
            await message.reply({ embeds: [embed] });
            return;
        }
        
        // Parse the command
        const args = message.content.split('\n');
        const firstLine = args[0].trim(); // "!send <CHANNEL_ID>"
        const channelId = firstLine.split(' ')[1];
        
        // Remove the first line to get the message content
        args.shift();
        const messageContent = args.join('\n').trim();
        
        // Validation
        if (!channelId) {
            await message.reply('❌ Please provide a channel ID.\nFormat: `!send <CHANNEL_ID>\nYour message here`');
            return;
        }
        
        if (!messageContent) {
            await message.reply('❌ Please provide a message to send.\nFormat: `!send <CHANNEL_ID>\nYour message here`');
            return;
        }
        
        // Find the channel
        const targetChannel = message.guild.channels.cache.get(channelId);
        
        if (!targetChannel) {
            await message.reply(`❌ Could not find channel with ID \`${channelId}\`.`);
            return;
        }
        
        // Check if bot has permission to send in that channel
        if (!targetChannel.permissionsFor(message.guild.members.me).has('SendMessages')) {
            await message.reply(`❌ I don't have permission to send messages in ${targetChannel.name}.`);
            return;
        }
        
        // Send the message
        try {
            await targetChannel.send(messageContent);
            
            // Confirm to the sender
            const confirmEmbed = new EmbedBuilder()
                .setTitle('✅ Message Sent!')
                .setColor(0x00ff88)
                .setDescription(`Message successfully sent to ${targetChannel}`)
                .addFields(
                    { name: 'Channel', value: `${targetChannel.name} (${targetChannel.id})`, inline: false },
                    { name: 'Preview', value: messageContent.length > 200 ? messageContent.slice(0, 200) + '...' : messageContent }
                );
            
            await message.reply({ embeds: [confirmEmbed] });
            
            // Delete the command message after 2 seconds (optional)
            setTimeout(async () => {
                try {
                    await message.delete();
                } catch (err) {
                    // Ignore if can't delete
                }
            }, 2000);
            
        } catch (error) {
            console.error('Error sending message:', error);
            await message.reply('❌ Failed to send the message. Check the console for errors.');
        }
        
        return;
    }
    
    // Only enforce auto-delete in the restricted channel
    if (message.channel.id === CONFIG.restrictedChannelId) {
        const allowedCommands = ['!redeem', '!help', '!keys', '!send'];
        const isAllowed = allowedCommands.some(cmd => message.content.startsWith(cmd));
        
        if (!isAllowed) {
            try {
                await message.delete();
            } catch (err) {
                // Ignore if missing permissions
            }
            return;
        }
    }
    
    // ============================
    // !help COMMAND
    // ============================
    
    if (message.content === '!help') {
        const embed = new EmbedBuilder()
            .setTitle('🎃 Halloween Event Bot')
            .setColor(0xff6600)
            .addFields(
                { 
                    name: '📋 Commands', 
                    value: '`!redeem` - Get your event key (requires 4+ invites)\n`!send` - Send a message to any channel (Admin only)\n`!help` - Show this menu' 
                },
                {
                    name: '🎁 How It Works',
                    value: '1. Invite friends to the server\n2. Type `!redeem`\n3. Get a unique key in DMs\n4. Use key on the event site'
                },
                {
                    name: '⚠️ Rules',
                    value: '• One key per user\n• Keys are single-use only\n• Keys expire in 24 hours\n• Minimum 4 invites required'
                },
                {
                    name: '📨 !send Usage (Admin)',
                    value: '```\n!send <CHANNEL_ID>\nYour message here\n```\nExample:\n```\n!send 1515761196156977263\n🎃 Spooky announcement!\nEvent starts in 1 hour!\n```'
                }
            )
            .setFooter({ text: 'Halloween Event 2026' });
        
        await message.reply({ embeds: [embed] });
        return;
    }
    
    // ============================
    // !redeem COMMAND
    // ============================
    
    if (message.content === '!redeem') {
        const member = message.member;
        const userId = message.author.id;
        const username = message.author.username;
        
        const inviteCount = await getInviteCount(member);
        
        if (inviteCount < CONFIG.minInvites) {
            const embed = new EmbedBuilder()
                .setTitle('❌ Not Enough Invites')
                .setColor(0xff0000)
                .setDescription(`You have **${inviteCount}** invite${inviteCount !== 1 ? 's' : ''}. You need **${CONFIG.minInvites}** to claim a key!`)
                .addFields({
                    name: '📢 How to Get Invites',
                    value: 'Share this server with friends! Each person who joins counts as 1 invite.'
                });
            
            await message.reply({ embeds: [embed] });
            return;
        }
        
        const key = generateKey();
        const added = await addKey(key, userId, username);
        
        if (!added) {
            return message.reply('❌ Error generating key. Please try again!');
        }
        
        const publicEmbed = new EmbedBuilder()
            .setTitle('✅ Key Generated!')
            .setColor(0x00ff88)
            .setDescription(`Check your **DMs** for your unique event key! 🎃`)
            .addFields({
                name: '📨 Can\'t find it?',
                value: 'Make sure your DMs are open from server members.'
            });
        
        await message.reply({ embeds: [publicEmbed] });
        
        try {
            const dmEmbed = new EmbedBuilder()
                .setTitle('🎃 YOUR HALLOWEEN EVENT KEY')
                .setColor(0xff6600)
                .setDescription(`\`\`\`${key}\`\`\``)
                .addFields(
                    { name: '🌐 Event Site', value: 'https://quantumn-xi.vercel.app/', inline: false },
                    { name: '⏰ Expires', value: '24 Hours', inline: true },
                    { name: '🔒 Single Use', value: 'Yes - Cannot be reused', inline: true },
                    { name: '⚠️ Important', value: 'Do NOT share this key. It can only be used ONCE.' }
                )
                .setFooter({ text: 'Headless Horseman Event 2026' });
            
            await message.author.send({ embeds: [dmEmbed] });
        } catch (dmError) {
            const failEmbed = new EmbedBuilder()
                .setTitle('❌ DM Failed')
                .setColor(0xff0000)
                .setDescription('I couldn\'t DM you! Enable DMs and type `!redeem` again.')
                .addFields({
                    name: '🔧 How to Enable DMs',
                    value: 'Server Settings → Privacy Settings → Allow direct messages from server members'
                });
            
            await message.reply({ embeds: [failEmbed] });
            
            const allKeys = await getAllKeys();
            if (allKeys.keys && allKeys.keys[key]) {
                delete allKeys.keys[key];
                await updateKeys(allKeys);
            }
        }
        
        return;
    }
    
    // ============================
    // !keys ADMIN COMMAND
    // ============================
    
    if (message.content === '!keys' && message.member.permissions.has('Administrator')) {
        const allKeys = await getAllKeys();
        
        if (!allKeys.keys || Object.keys(allKeys.keys).length === 0) {
            return message.reply('No keys in the system yet.');
        }
        
        const keysList = Object.entries(allKeys.keys)
            .map(([key, data]) => `\`${key}\` - ${data.username} - ${data.used ? '🔴 Used' : '🟢 Active'}`)
            .join('\n');
        
        const embed = new EmbedBuilder()
            .setTitle('🔑 All Keys')
            .setColor(0x8c00ff)
            .setDescription(keysList.slice(0, 4000) || 'No keys');
        
        await message.reply({ embeds: [embed] });
    }
});

client.login(process.env.DISCORD_TOKEN)
    .then(() => console.log('🤖 Bot logged in!'))
    .catch(err => console.error('❌ Login failed:', err));
