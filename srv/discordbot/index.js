const Discord = require('discord.js');
const logger = require('../lib/logger')

const CommandHandler = require('./lib/commandHandler.js')

const mainChannelName = process.env.DISCORD_BOT_MAIN_CHANNEL

async function run() {
    const client = new Discord.Client()

    client.once('ready', async () => {
        logger.debug('Discord bot Ready!')

        let mainGuild = null
        let mainChannel = null

        if (process.env.DISCORD_BOT_SERVER_ID) {
            // logger.debug('process.env.DISCORD_BOT_SERVER_ID: '+JSON.stringify(process.env.DISCORD_BOT_SERVER_ID,null,2))
            mainGuild = client.guilds.cache.get(process.env.DISCORD_BOT_SERVER_ID);
            if (mainGuild == null) {
                throw new Error("Server ID not found")
            }

            // logger.debug('mainGuild.channels', JSON.stringify(mainGuild.channels,null,2))
            mainChannel = mainGuild.channels.cache.find(channel => channel.name === process.env.DISCORD_BOT_MAIN_CHANNEL)
            if (mainGuild == null) {
                throw new Error("Channel not found")
            }

            // say hi
        } else {
            // show all guilds
            logger.info('Server ID not found.  Choose one.')
            const guilds = client.guilds.cache
            for (let guild of guilds) {
                const guildId = guild[0]
                const guildData = guild[1]
                logger.info(`${guildData.name}: ${guildData.id}`)
            }
            return
        }

        const handler = await CommandHandler.init(client, {
            mainGuild: mainGuild,
            mainChannel: mainChannel,
        })

        client.on('message', message => {
            handler.handleMessage(message)
            // logger.debug(message.content)
        })
    })

    logger.debug('connecting to discord')
    try {
        client.login(process.env.DISCORD_BOT_TOKEN)
    } catch (err) {
        logger.error('connect ERROR: '+JSON.stringify(err,null,2))
        process.exit(-1)
    }
}

// ------------------------------------------------------------------------
    
module.exports = {
    run
}