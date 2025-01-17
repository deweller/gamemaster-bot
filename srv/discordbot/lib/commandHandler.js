const datastore = require('../../lib/datastore.js')
const eventEmitter = require('../../lib/lotteryEvents').emmiter
const logger = require('../../lib/logger')

let client
let commands = {}
let config

const REACT_EMOJI = '✅'

exports.init = async function(newClient, newConfig) {
    client = newClient

    config = {
        mainGuild: null,
        mainChannel: null,
        admins: [],
        ...newConfig
    }

    listenForEvents()

    // attach to active lottery reactors and cleanup old messages
    await cleanupAndAttachMessages()

    // greet
    let message = await config.mainChannel.send("I have joined the chat")
    message.delete({timeout: 5000})


    return {
        handleMessage
    }
}

const handleMessage = function(message) {
    const parsedMsg = parseMessage(message)

    if (parsedMsg.command != null) {
        let commandName = parsedMsg.command

        if (commands[commandName] != null) {
            commands[commandName](parsedMsg)
        }
    }
}

function listenForEvents() {
    eventEmitter.on('lotteryCreated', (data) => {
        launchLottery(data.lottery)
    })
    eventEmitter.on('lotteryDeleted', (data) => {
        deleteLottery(data.lottery)
    })
    eventEmitter.on('winnersChosen', async (data) => {
        const lotteryName = data.lotteryName
        let userTags = ''
        let first = true
        for (let userEntry of data.users) {
            if (!first) {
                userTags = userTags + ', '
            }
            userTags = userTags + `<@${userEntry.userId}>`
            first = false
        }
        logger.debug(`[winnersChosen] ${lotteryName} ${userTags}`)

        // send a general message in Discord (disabled)
        // let message = await config.mainChannel.send(`Winners were chosen for ${lotteryName}. ${userTags}, please check your direct messages.`)
        // message.delete({timeout: 60000})

        // send DMs
        const lottery = await datastore.findLotteryById(data.lotteryId)

        // let messageContent = `:smile: You won the ${lotteryName} lottery! Here are the details:\n`
        let messageContent = `You are the chosen one! Here is the name and password of the game!\n`
        messageContent = messageContent + buildWinningLotteryDetails(lottery)

        for (let userEntry of data.users) {
            let user = await findUserById(config.mainGuild, userEntry.userId)
            try {
                let message = await user.send(messageContent)
            } catch (e) {
                logger.error('Failed to DM')                
                // let message = await config.mainChannel.send(`Hey <@${user.id}>.  I couldn't send you a DM. Make sure you have "Allow direct messages from server members enabled on this server" checked or you won't be able to get the informaton if you win.`);
                let message = await config.mainChannel.send(`Hey <@${user.id}>.  I couldn't send you a DM, you're no one special. Open your damn DMs and react again! :upside_down:`);
                message.delete({timeout: 20000})
            }
        }
    })

    eventEmitter.on('lotteryReset', async (data) => {
        const lottery = await datastore.findLotteryById(data.lotteryId)

        // remove the lottery message
        await removeLotteryMessage(lottery)

        // launch the message again
        const message = await launchLottery(lottery)
    })

}

function buildWinningLotteryDetails(lottery) {
    const matchName = lottery.matchName || ''
    const matchPassword = lottery.matchPassword || ''
    const comments = lottery.comments || ''

    let messageContent = ''
    if (matchName.length > 0 || matchPassword.length > 0 || comments.length > 0) {

        messageContent = messageContent + '```'

        if (matchName.length > 0) {
            messageContent = messageContent + `Match Name: ${matchName}`
        }
        if (matchPassword.length > 0) {
            if (messageContent.length > 0) {
                messageContent = messageContent + "\n"
            }
            messageContent = messageContent + `Match Password: ${matchPassword}`
        }
        if (comments.length > 0) {
            if (messageContent.length > 0) {
                messageContent = messageContent + "\n\n"
            }
            messageContent = messageContent + `${comments}`
        }

        messageContent = messageContent + '```'

    } else {
        messageContent = messageContent + "```Well this is embarassing.  I don't have any details about the match to send you.```"
    }

    return messageContent
}

async function cleanupAndAttachMessages() {
    let lotteries = await datastore.getLotteries()

    // attach to existing reaction messages
    let activeMessageIdsMap = {}
    for (let lottery of lotteries) {
        let message

        if (lottery.discordMsgId == null) {
            message = await launchLottery(lottery)
        } else {
            try {
                message = await config.mainChannel.messages.fetch(lottery.discordMsgId)
                if (message) {
                    await launchLotteryReactor(lottery, message)
    
                    // handle existing reactions
                    handleExistingReactions(lottery, message)
                }

            } catch (e) {
                logger.error('failed to attach message for lottery. '+e)
            }
        }

        activeMessageIdsMap[message.id] = true

    }


    // delete all messages not in the activeMessageIdsMap
    try {
        const messages = await config.mainChannel.messages.fetch()
        const myUserId = client.user.id
        for (let [msgId, message] of messages) {
            if (activeMessageIdsMap[message.id] == null) {
                if (message.author.id == myUserId) {
                    logger.debug('deleting old message: '+message.id)
                    message.delete({})
                }
            }
        }
    } catch (e) {
        logger.error('failed to fetch messages: '+e)
    }

}

function parseMessage(message) {
    let contentTokens = message.content.split(/\s+/)
    let command = null

    // command
    if (contentTokens[0].substring(0, 1) == '!') {
        command = contentTokens[0].substring(1).toLowerCase()
    }

    // args
    let args = contentTokens.slice(1)
    if (args == null) {
        args = []
    }

    let isDm = message.channel.type == 'dm'

    let dmCommand = null
    if (isDm) {
        if (command == null) {
            command = contentTokens[0]
        }
    }

    return {
        message,
        command,
        args,
        isDm,
    }
}


async function findUserById(guild, id) {
    try {
        const member = await guild.members.fetch(id)
        if (member != null) {
            return member.user
        }

        // not found
        return null
    } catch (e) {
        logger.error(e)
    }

}

// ------------------------------------------------------------------------

async function launchLottery(lottery) {
    // create a message
    let message = await config.mainChannel.send(`Private Match is open, react for your chance to play! :sunglasses:\nYou need to have DMs open to get your invite if you win.`)
    await launchLotteryReactor(lottery, message)

    // save the message id to the lottery
    await datastore.updateLottery(lottery._id, { discordMsgId: message.id })

    // react
    await message.react(REACT_EMOJI)

    return message
}

async function launchLotteryReactor(lottery, message) {
    // logger.debug('[launchLotteryReactor]')

    const filter = (reaction, user) => {
        // logger.debug('[launchLotteryReactor] filter: reaction '+JSON.stringify(reaction,null,2))
        return reaction.emoji.name === REACT_EMOJI && user.id !== message.author.id;
    };

    const collector = message.createReactionCollector(filter, { dispose: true });

    // collect
    collector.on('collect', async (reaction, user) => {
        logger.debug(`Collected ${reaction.emoji.name} from ${user.tag}: ${user.id}`);
        collectReaction(lottery._id, user)
    });

    // remove
    collector.on('remove', async (reaction, user) => {
        logger.debug(`Removed ${reaction.emoji.name} from ${user.tag}: ${user.id}`);
        collectUnReaction(lottery._id, user)
    });
}

async function collectReaction(lotteryId, user) {
    const lottery = await datastore.findLotteryById(lotteryId)
    if (!lottery) {
        return
    }

    let result = await datastore.activateLotteryEntry(lottery._id, user.id, user.tag)
    eventEmitter.emit('entryUpdated', { lotteryId: lottery._id, username: user.tag })

    // try to send a DM
    try {
        let message = await user.send(`You are entered in the ${lottery.name} lottery`)
        message.delete({timeout: 10000})
    } catch (e) {
        logger.error('Failed to DM')                
        // let message = await config.mainChannel.send(`Hey <@${user.id}>.  I couldn't send you a DM. Make sure you have "Allow direct messages from server members enabled on this server" checked or you won't be able to get the informaton if you win.`);
        let message = await config.mainChannel.send(`Hey <@${user.id}>.  I couldn't send you a DM. You're no one special. Open your damn DMs and react again! :upside_down:`);
        message.delete({timeout: 20000})
    }

}

async function collectUnReaction(lotteryId, user) {
    const lottery = await datastore.findLotteryById(lotteryId)
    if (!lottery) {
        return
    }

    let result = await datastore.deActivateLotteryEntry(lottery._id, user.id, user.tag)
    // logger.debug('collectUnReaction result '+JSON.stringify(result,null,2))

    eventEmitter.emit('entryUpdated', { lotteryId: lottery._id, username: user.tag })

    // try to send a DM
    try {
        let message = await user.send(`You are no longer entered in the ${lottery.name} lottery.`)
        message.delete({timeout: 10000})
    } catch (e) {
        logger.error('Failed to send DM. '+e)
    }
}

async function handleExistingReactions(lottery, message) {
    let positiveReactionUserIdsMap = {}

    // logger.debug('[handleExistingReactions]')
    const myUserId = client.user.id
    for (let [id, reaction] of message.reactions.cache) {
        // logger.debug('[handleExistingReactions] reaction '+id)
        let users = await reaction.users.fetch()
        for (let [uid, user] of users) {
            // logger.debug('[handleExistingReactions] user '+uid)
            if (user.id != myUserId) {
                logger.debug('found an existing reaction for user: '+user.tag)
                collectReaction(lottery._id, user)
                positiveReactionUserIdsMap[user.id] = true
            } else {
                // logger.debug('found MY reaction with tag: '+user.tag)
            }
        }
    }

    // find any stale reaction entries that were not in the map
    const allActiveEntries = await datastore.getActiveLotteryEntries(lottery._id)
    for (let entry of allActiveEntries) {
        if (positiveReactionUserIdsMap[entry.userId] == null) {
            logger.debug('found a stale reaction for user: '+entry.username)
            let user = await findUserById(config.mainGuild, entry.userId)
            collectUnReaction(lottery._id, user)
        }
    }
}

async function deleteLottery(lottery) {
    await removeLotteryMessage(lottery)

    try {
        // let deletedNoticeMessage = await config.mainChannel.send(`The ${lottery.name} lottery is over.`)
        let deletedNoticeMessage = await config.mainChannel.send(`Games are now closed.`)
        deletedNoticeMessage.delete({timeout: 30000})
    } catch (e) {
        logger.error('failed to delete lottery '+e)
    }
}

async function removeLotteryMessage(lottery) {
    try {
        const message = await config.mainChannel.messages.fetch(lottery.discordMsgId)
        if (message) {
            message.delete({})
        }
    } catch (e) {
        logger.error('failed to remove lottery message '+e)
    }
}

// ------------------------------------------------------------------------

commands.hello = function(parsedMsg) {
    if (parsedMsg.isDm) {
        parsedMsg.message.channel.send(`Well hello there, <@${parsedMsg.message.author.id}>`);
    }
}

commands.hi = commands.hello
commands.howdy = commands.hello
commands.greetings = commands.hello


// ------------------------------------------------------------------------

// ------------------------------------------------------------------------

function isAdmin(channel, username) {
    return false
}


module.exports = exports