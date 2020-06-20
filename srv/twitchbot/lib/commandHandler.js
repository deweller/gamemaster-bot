const datastore = require('../../lib/datastore.js')
const eventEmitter = require('../../lib/lotteryEvents').emmiter
const logger = require('../../lib/logger')

let client
let commands = {}
let adminCommands = {}
let config

let reminderInterval = null
let reminderIntervalSeconds = null
let botIsEnabled = null

exports.init = async function(newClient, newConfig) {
    client = newClient

    config = {
        myChannelName: null,
        admins: [],
        ...newConfig
    }

    const botSettings = await datastore.getBotSettings()
    reminderIntervalSeconds = botSettings.reminderInterval || (process.env.TWITCH_BOT_REMINDER_INTERVAL || 30)
    botIsEnabled = botSettings.enabled != null ? botSettings.enabled : true

    listenForEvents()
    checkReminders()

    return {
        onConnected,
        handleMessage,
    }
}

const onConnected = async function() {
    if (botIsEnabled) {
        await client.say(config.myChannelName, `Hi there.  Game Master has joined the chat.`)
    }
}

const handleMessage = function(message, channel, tags) {
    const messageParts = parseMessage(message)
    // logger.debug('messageParts'+ JSON.stringify(messageParts,null,2))
    if (messageParts.command != null) {
        let commandName = messageParts.command

        if (commands[commandName] != null) {
            commands[commandName](messageParts, channel, tags)
        }
        if (adminCommands[commandName] != null) {
            if (isAdmin(channel, tags.username)) {
                adminCommands[commandName](messageParts, channel, tags)
            } else {
                logger.debug(`unauthenticated command ${commandName} from ${tags.username}`)
            }
        }
    }
}

function listenForEvents() {
    eventEmitter.on('lotteryCreated', (data) => {
        if (!botIsEnabled) {
            return
        }

        const lotteryName = data.lottery.name
        client.say(config.myChannelName, `A new ${lotteryName} lottery has started. Please check Discord at ${process.env.DISCORD_INVITE_LINK} to enter.`)

        checkRemindersIfNotAlreadyRunning()
    })
    eventEmitter.on('lotteryDeleted', (data) => {
        clearRemindersIfNoLotteries()
    })
    eventEmitter.on('winnersChosen', (data) => {
        if (!botIsEnabled) {
            return
        }
        const lotteryName = data.lotteryName
        client.say(config.myChannelName, `Winners were chosen for ${lotteryName}. Please check Discord to see if you won and collect the information.`)
    })

    eventEmitter.on('twitchBotIntervalChanged', (data) => {
        reminderIntervalSeconds = data.interval
        logger.debug(`reminderInterval set to ${reminderIntervalSeconds}`)
    })
    eventEmitter.on('twitchBotEnabled', (data) => {
        botIsEnabled = true
        checkRemindersIfNotAlreadyRunning()
    })
    eventEmitter.on('twitchBotDisabled', (data) => {
        botIsEnabled = false
        clearReminderInterval()
    })
}

function parseMessage(message) {
    let pieces = message.split(/\s+/)
    let command = null

    // command
    if (pieces[0].substring(0, 1) == '!') {
        command = pieces[0].substring(1).toLowerCase()
    }

    // args
    let args = pieces.slice(1)
    if (args == null) {
        args = []
    }

    return {
        message,
        command,
        args,
    }
}

// ------------------------------------------------------------------------

function checkRemindersIfNotAlreadyRunning() {
    if (reminderInterval == null) {
        checkReminders()
    }
}

function resetInterval() {
    clearReminderInterval()
    checkReminders()
}

function clearReminderInterval()
{
    if (reminderInterval != null) {
        clearInterval(reminderInterval)
        reminderInterval = null
    }
}

async function clearRemindersIfNoLotteries() {
    const hasLotteries = hasActiveLotteries(await datastore.getLotteries())
    if (!hasLotteries && reminderInterval != null) {
        clearReminderInterval()
    }
}

function hasActiveLotteries(lotteries) {
    return pullActiveLotteries(lotteries).length > 0
}

function pullActiveLotteries(lotteries) {
    // all lotteries are active for now
    return lotteries

    // let filteredLotteries = []
    // for (let lottery of lotteries) {
    //     if (lottery.currentRound == null) {
    //         filteredLotteries.push(lottery)
    //     }
    // }
    // return filteredLotteries
}

async function checkReminders() {
    const lotteries = await datastore.getLotteries()
    const hasLotteries = hasActiveLotteries(lotteries)
    if (hasLotteries && botIsEnabled) {
        if (reminderInterval == null) {
            // set up reminders for the future
            reminderInterval = setInterval(checkReminders, reminderIntervalSeconds * 1000)
        } else {
            // send a reminder now
            sendReminderMessage(lotteries)
        }

    } else {
        // no lotteries (or bot disabled)
        clearReminderInterval()
    }
}

function sendReminderMessage(lotteries) {
    if (!botIsEnabled) {
        return
    }

    const activeLotteries = pullActiveLotteries(lotteries)

    let offset = 0
    let lotteryNames = ''
    const count = activeLotteries.length
    for (let lottery of activeLotteries) {
        if (offset == 0) {
            lotteryNames = lottery.name
        } else if (offset = count - 1) {
            lotteryNames = lotteryNames + (offset > 1 ? ',' : '') + ` and ${lottery.name}`
        } else {
            lotteryNames = lotteryNames + `, ${lottery.name}`
        }

        ++offset
    }
    let lotteryWord = (count == 1 ? 'lottery' : 'lotteries')
    let verb = (count == 1 ? 'is' : 'are')
    let msg = `The ${lotteryWord} named ${lotteryNames} ${verb} running now.  Visit ${process.env.DISCORD_INVITE_LINK} to enter`;
    client.say(config.myChannelName, msg)
}

// ------------------------------------------------------------------------

commands.hello = function(messageParts, channel, tags) {
    client.say(channel, `@${tags.username}, hi there!`);
}

// ------------------------------------------------------------------------

adminCommands.power = function(messageParts, channel, tags) {
    client.say(channel, `${tags.username} is an admin. Roar.`)
}

// ------------------------------------------------------------------------

function isAdmin(channel, username) {
    if (isChannelOwner(channel, username)) {
        return true
    }

    return false
}

function isChannelOwner(channel, username) {
    if (channel.toLowerCase() == '#' + username.toLowerCase()) {
        return true
    }

    return false
}


module.exports = exports