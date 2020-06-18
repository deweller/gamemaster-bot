
const tmi = require('tmi.js');
const CommandHandler = require('./lib/commandHandler.js')
const logger = require('../lib/logger')

const myChannelName = process.env.JOIN_CHANNEL_NAME
const botUserName = process.env.BOT_USER_NAME

const auth = require('../lib/auth')
const datastore = require('../lib/datastore.js')

// const REFRESH_BOT_CREDENTIALS_INTERVAL = 4 * 3600 * 1000; // once every four hours

async function run() {
    // get the credentials
    let credentials = await datastore.getBotCredentials()
    if (credentials == null) {
        logger.debug('bot credentials not found')
        return
    }

    credentials = await refreshBotCredentials(credentials)
    if (credentials == null || credentials.success != true) {
       logger.debug('invalid bot credentials')
       return
    }

    let tmiConfig = {
        connection: {
            secure: true,
            reconnect: true
        },
        options: {
            debug: true,
        },
        identity: {
            username: botUserName,
            password: 'oauth:' + credentials.access_token
        },
        channels: [ myChannelName ]
    }
    // logger.debug('tmiConfig: '+JSON.stringify(tmiConfig,null,2))
    const client = new tmi.Client(tmiConfig)

    // setInterval(refreshBotCredentials, REFRESH_BOT_CREDENTIALS_INTERVAL)

    const handler = CommandHandler.init(client, {
        admins: process.env.ADMIN_USERNAMES.split(","),
        myChannelName: myChannelName,
    })

    client.on("connected", async (address, port) => {
        try {
            await client.say(myChannelName, `Hi there.  Game Master has joined the chat.`)
        } catch (err) {
            logger.debug('Error while delivering connection message: ', err)
        }
    })

    client.on('message', (channel, tags, message, self) => {
        if (self) {
            // Ignore echoed messages.
            return
        }

        handler.handleMessage(message, channel, tags)
    })


    logger.debug('connecting to twitch')
    try {
        await client.connect()
    } catch (err) {
        logger.error('connect ERROR: '+JSON.stringify(err,null,2))
        process.exit(-1)
    }
}

// ------------------------------------------------------------------------

async function refreshBotCredentials(credentials) {
    let twitchOAuth = auth.buildTwitchBotOauth()
    auth.useCredentials(twitchOAuth, credentials)

    // force the token to refresh if needed
    logger.debug('refreshing bot credentials')
    user = await auth.getUser(twitchOAuth)

    let newCredentials = twitchOAuth.authenticated
    await datastore.saveBotCredentials(newCredentials)

    // logger.debug('bot credentials expire at '+newCredentials.expires_time)
    return newCredentials
}

// ------------------------------------------------------------------------
    
module.exports = {
    run
}