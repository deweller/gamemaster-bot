import express from 'express'
import cors from 'cors'
import session from 'express-session'
let NedbStore = require('nedb-session-store')(session);
const auth = require('./lib/auth')
import twitchbot from './twitchbot/index'
import discordbot from './discordbot/index'

import { throttle, debounce } from 'throttle-debounce';
import socketIO from "socket.io";

import datastore from './lib/datastore.js'
const eventEmitter = require('./lib/lotteryEvents').emmiter

const logger = require('./lib/logger')

const PENALTY_BOX_ROUND = -1

export default (app, http) => {
  logger.debug('Configuring express app with environment '+process.env.NODE_ENV)
  app.use(express.json())

  // setup sessions
  app.use(
    session({
      secret: process.env.COOKIE_SECRET_KEY,
      resave: false,
      saveUninitialized: false,
      cookie: {
        path: '/',
        httpOnly: true,
        maxAge: 365 * 24 * 60 * 60 * 1000   // e.g. 1 year
      },
      store: new NedbStore({
        filename: __dirname + '/../data/sessions.db'
      })
    })
  );

  // default error handler
  app.use((err, req, res, next) => {
    if (req.xhr) {
      res.status(500).json({
        success: false,
        message: ''+err,
      })
    } else {
      next(err)
    }
  })


  // ------------------------------------------------------------------------
  // set up cors (for local testing only)
  
  if (process.env.NODE_ENV !== 'production') {
    let corsOptions = {
      origin: `http://${process.env.PUBLIC_WEB_HOST}:${process.env.PUBLIC_WEB_PORT}`,
      credentials: true,
    }
    // logger.debug('corsOptions', JSON.stringify(corsOptions,null,2))
    app.use(cors(corsOptions))
  }


  // ------------------------------------------------------------------------
  // Auth

  let twitchBotOAuth = auth.buildTwitchBotOauth()
  let twitchUserOAuth = auth.buildTwitchUserOauth()

  app.get('/user/login', (req, res) => {
      res.redirect(twitchUserOAuth.authorizeUrl)
  })

  app.get('/bot/login', (req, res) => {
      res.redirect(twitchBotOAuth.authorizeUrl)
  })

  app.get('/logout', (req, res) => {
    req.session.destroy(() => {
      res.redirect(formatPublicUrl('/#/login'))
    })
  })


  let authCallbackHandler = async (req, res, twitchOAuth) => {
      const qs = require('querystring')
      const req_data = qs.parse(req.url.split('?')[1])
      const code = req_data['code']
      const state = req_data['state']
      // logger.debug('req_data: '+JSON.stringify(req_data,null,2))
   
      if (twitchOAuth.confirmState(state) === true) {
        let json = await twitchOAuth.fetchToken(code)
        return json
      } else {
        logger.debug('mismatched state.  login failed')
        res.redirect(formatPublicUrl('/#/login-failed'))
      }
  }

  // redirect_uri ends up here
  app.get('/user/auth-callback', async (req, res) => {
    let json = await authCallbackHandler(req, res, twitchUserOAuth)
    if (json.success === true && json.access_token != null) {
        logger.debug('authenticated successfully saving credentials '+JSON.stringify(json,null,2))

        // save the credentials to the user session
        req.session.oauthCredentials = json

        // go to the dashboard
        res.redirect(formatPublicUrl('/#/login-success'))
    } else {
        logger.debug('fetchToken was unsuccessful.  login failed')
        res.redirect(formatPublicUrl('/#/login-failed'))
    }
  })
  app.get('/bot/auth-callback', async (req, res) => {
    let json = await authCallbackHandler(req, res, twitchUserOAuth)
    if (json.success === true && json.access_token != null) {
      let botCredentials = await datastore.getBotCredentials()
      if (botCredentials != null) {
        res.status(500).send('Bot credentials already exist. Delete them first.')
        return
      }

      await datastore.saveBotCredentials(json)
      res.status(200).send('authentication succeeded')
    } else {
      res.status(200).send('authentication failed')
    }
  })


  // ------------------------------------------------------------------------
  // API

  async function requireUser(req, res, next) {
    // is the user already in the session?
    let user = req.session.user

    // timeout user
    const timeout = Date.now() - 1000 * 60 * 5 // refresh every 5 minutes
    if (user && (req.session.userLastVerified == null || req.session.userLastVerified < timeout)) {
      user = null
    }

    // refresh the oauth user
    if (user == null && req.session.oauthCredentials != null) {
      let twitchOAuth = auth.buildTwitchUserOauth()
      auth.useCredentials(twitchOAuth, req.session.oauthCredentials)
      user = await auth.getUser(twitchOAuth)

      // save the updated credentials
      req.session.user = user
      if (user) {
        req.session.oauthCredentials = twitchOAuth.authenticated
        req.session.userLastVerified = Date.now()
      } else {
        req.session.userLastVerified = null
        req.session.oauthCredentials = null
      }
    }

    if (user == null) {
      res.status(403).json({
        success: false,
        message: 'You must be logged in to perform this action',
      })
      return
    }

    next()
  }

  app.get('/rest/user/me', requireUser, async (req, res) => {
    // is the user already in the session?
    const user = req.session.user

    res.json({
      ...user,
      isAdmin: auth.userIsAdmin(user),
      isLoggedIn: !!(user != null),
    });
  })

  // ------------------------------------------------------------------------
  // Admin API

  async function isAdmin(req, res, next) {
    let user = req.session.user
    if (!auth.userIsAdmin(user)) {
      res.status(403).json({
        success: false,
        message: 'You must be an admin to perform this action',
      })
      return
    }

    next()
  }

    app.post('/rest/admin/lottery', requireUser, isAdmin, async (req, res) => {
        let postedData = req.body
        let lottery

        try {
          lottery = await datastore.addLottery({
            name: postedData.name.substr(0, 32),
            currentRound: 1,
            created: new Date(),
            updated: new Date(),
          })
        } catch (e) {
          if (e.errorType != null && e.errorType == 'uniqueViolated') {
            res.status(409).json({
              success: false,
              message: 'A lottery with this name already exists.  Please delete it first.',
            })
            return
          }
          throw e
        }

        eventEmitter.emit('lotteryCreated', { lottery: lottery })
        eventEmitter.emit('lotteryUpdated', { lotteryId: lottery._id })

        res.json({
          success: true,
          model: lottery,
        })
        return
    });

    app.get('/rest/admin/lotteries', requireUser, isAdmin, async (req, res) => {
        let lotteries = await datastore.getLotteries()

        // add entries
        for (let lottery of lotteries) {
          lottery.entries = await findLotteryEntries(lottery)
        }

        res.json({models: lotteries})
        return
    });

    app.get('/rest/admin/lottery/:id', requireUser, isAdmin, async (req, res) => {
      let id = req.params.id
      // logger.debug('id', JSON.stringify(id,null,2))
      const lottery = await datastore.findLotteryById(id)

      if (lottery == null) {
        res.status(404).json({
          success: false,
          message: 'Lottery not found',
        })
        return
      }

      res.json({
        model: lottery,
        entries: await findLotteryEntries(lottery),
      })
      return
    });

    app.post('/rest/admin/lottery/:id', requireUser, isAdmin, async (req, res) => {
      const id = req.params.id
      const postedData = req.body
      const lottery = await datastore.findLotteryById(id)

      if (lottery == null) {
        res.status(404).json({
          success: false,
          message: 'Lottery not found',
        })
        return
      }

      // update an existing lottery
      let updateCount = 0
      try {
        let name = postedData.name ? postedData.name.substr(0, 32) : 'unnamed'
        let matchName = postedData.matchName ? postedData.matchName.substr(0, 32) : ''
        let matchPassword = postedData.matchPassword ? postedData.matchPassword.substr(0, 32) : ''
        let comments = postedData.comments ? postedData.comments.substr(0, 1024) : ''

        updateCount = await datastore.updateLottery(id, {
          name,
          matchName,
          matchPassword,
          comments,
          updated: new Date(),
        })
      } catch (e) {
        if (e.errorType != null && e.errorType == 'uniqueViolated') {
          res.status(409).json({
            success: false,
            message: 'A lottery with this name already exists.  Please choose another name.',
          })
          return
        }
        throw e
      }

      eventEmitter.emit('lotteryUpdated', { lotteryId: lottery._id })

      res.json({})
      return
    });

    async function findLotteryEntries(lottery) {
      // get all entries
      const allEntries = await datastore.getLotteryEntries(lottery._id)
      let filteredEntries = []
      for (let entry of allEntries) {
        filteredEntries.push({
          username: entry.username,
          round: entry.round,
          chosenRound: entry.chosenRound || null,
          active: entry.active,
        })
      }
      return filteredEntries
    }

    app.post('/rest/admin/lottery/:id/winners', requireUser, isAdmin, async (req, res) => {
      const id = req.params.id
      const postedData = req.body
      const lottery = await datastore.findLotteryById(id)
      const addToPreviousRound = postedData.addToPreviousRound == null ? false : (!!postedData.addToPreviousRound)

      if (lottery == null) {
        res.status(404).json({
          success: false,
          message: 'Lottery not found',
        })
        return
      }

      // choose winners for a lottery
      let targetRoundNumber = lottery.currentRound || 1
      if (addToPreviousRound) {
        targetRoundNumber = Math.max(1, targetRoundNumber - 1)
      }
      logger.debug('targetRoundNumber: ' + JSON.stringify(targetRoundNumber,null,2))



      // get all active entries
      const allActiveEntries = await datastore.getActiveLotteryEntries(lottery._id)
      let unChosenIds = []
      let usersByEntryId = {}
      for (let entry of allActiveEntries) {
        console.log('entry.chosenRound: '+JSON.stringify(entry.chosenRound,null,2))
        if (entry.chosenRound == null) {
          unChosenIds.push(entry._id)
          usersByEntryId[entry._id] = {
            username: entry.username,
            userId: entry.userId,
            active: entry.active,
          }
          logger.debug('adding to unChosenIds:  '+JSON.stringify(entry.username,null,2))
        }
      }

      // choose winners
      const winnerCount = postedData.winnerCount

      if (winnerCount > unChosenIds.length) {
        res.status(422).json({
          success: false,
          message: 'There are not enough available entries.',
        })
        return
      }
      let chosenIds = pickRandomElements(unChosenIds, winnerCount)
      logger.debug('chosenIds:  '+JSON.stringify(chosenIds,null,2))

      let updateCount = 0
      updateCount = await datastore.updateLotteryEntryWinners(chosenIds, {
        chosenRound: targetRoundNumber,
      })

      // update the lottery with the next round
      if (!addToPreviousRound) {
        datastore.updateLottery(lottery._id, {
          currentRound: targetRoundNumber + 1,
          previousMatchName: lottery.matchName,
          previousMatchPassword: lottery.matchPassword,
          previousComments: lottery.comments,
        })
      }

      eventEmitter.emit('lotteryUpdated', { lotteryId: lottery._id })

      // build usernames
      let winningUsers = []
      for (let chosenId of chosenIds) {
        winningUsers.push(usersByEntryId[chosenId])
      }
      // logger.debug('winningUsers:  '+JSON.stringify(winningUsers,null,2))
      await notifyWinners(lottery, winningUsers)

      res.json({})
      return
    });

    async function notifyWinners(lottery, winningUsers) {
      eventEmitter.emit('winnersChosen', { lotteryName: lottery.name, lotteryId: lottery._id, users: winningUsers })
    }

    app.post('/rest/admin/lottery/:id/clearRound', requireUser, isAdmin, async (req, res) => {
      const id = req.params.id
      const postedData = req.body
      const lottery = await datastore.findLotteryById(id)

      if (lottery == null) {
        res.status(404).json({
          success: false,
          message: 'Lottery not found',
        })
        return
      }

      const round = parseInt(postedData.round)

      const allEntries = await datastore.getLotteryEntries(lottery._id)
      for (let entry of allEntries) {
        logger.debug(`Found entry: ${entry.lotteryId}/${entry.chosenRound}`)
      }

      // clear lottery round
      logger.debug(`clearing lottery winners from ${lottery._id}/${round}`)
      let numReplaced = await datastore.clearChosenRoundFromEntryWinners(lottery._id, round)
      logger.debug(`numReplaced: ${numReplaced}`)

      eventEmitter.emit('lotteryUpdated', { lotteryId: lottery._id })
      eventEmitter.emit('lotteryCleared', { lotteryId: lottery._id })

      res.json({})
      return
    });

    app.post('/rest/admin/lottery/:id/reset', requireUser, isAdmin, async (req, res) => {
      const id = req.params.id
      const postedData = req.body
      const lottery = await datastore.findLotteryById(id)

      if (lottery == null) {
        res.status(404).json({
          success: false,
          message: 'Lottery not found',
        })
        return
      }

      // deactivate all active entries
      const allActiveEntries = await datastore.getActiveLotteryEntries(lottery._id)
      for (let entry of allActiveEntries) {
        datastore.deActivateLotteryEntry(lottery._id, entry.userId, entry.username)
      }

      eventEmitter.emit('lotteryUpdated', { lotteryId: lottery._id })
      eventEmitter.emit('lotteryReset', { lotteryId: lottery._id })

      res.json({})
      return
    });

    app.post('/rest/admin/lottery/:id/modifyEntries', requireUser, isAdmin, async (req, res) => {
      const id = req.params.id
      const postedData = req.body
      const lottery = await datastore.findLotteryById(id)

      if (lottery == null) {
        res.status(404).json({
          success: false,
          message: 'Lottery not found',
        })
        return
      }

      for (let change of postedData.changes) {
        if (change.action == 'penaltyBox') {
          await datastore.updateLotteryEntryByUsername(lottery._id, change.username, {
            chosenRound: PENALTY_BOX_ROUND,
          })
        }
 
        if (change.action == 'clearChosenRound') {
          await datastore.updateLotteryEntryByUsername(lottery._id, change.username, {
            chosenRound: null,
          })
        }
 
        if (change.action == 'chooseWinner') {
          // find the entry
          const entry = await datastore.findLotteryEntry(lottery._id, change.username)
          if (entry) {
            const targetRoundNumber = Math.max(1, lottery.currentRound - 1)
            await datastore.updateLotteryEntryWinners([entry._id], {
              chosenRound: targetRoundNumber,
            })
            const winningUsers = [{
              username: entry.username,
              userId: entry.userId,
              active: entry.active,
            }]
            notifyWinners(lottery, winningUsers)
          }
        }
      }

      eventEmitter.emit('lotteryUpdated', { lotteryId: lottery._id })

      res.json({})
      return
    });
    app.delete('/rest/admin/lottery/:id', requireUser, isAdmin, async (req, res) => {
      let lotteryId = req.params.id
      const lottery = await datastore.findLotteryById(lotteryId)
      if (lottery == null) {
        res.status(404).json({
          success: false,
          message: 'Lottery not found to delete',
        })
        return
      }
      // logger.debug('delete id', JSON.stringify(id,null,2))

      const numEntriesDeleted = await datastore.deleteLotteryEntries(lotteryId)
      const numDeleted = await datastore.deleteLotteryById(lotteryId)

      eventEmitter.emit('lotteryDeleted', { lottery: lottery })
      eventEmitter.emit('lotteryUpdated', { lotteryId: lotteryId })

      res.json({})
      return
    });

    // ------------------------------------------------------------------------
    // bot settings

    app.get('/rest/admin/botSettings', requireUser, isAdmin, async (req, res) => {
      let botSettings = await datastore.getBotSettings()

      let botSettingsData = {}
      botSettingsData.botName = process.env.TWITCH_BOT_USER_NAME
      botSettingsData.botChannel = process.env.TWITCH_BOT_JOIN_CHANNEL_NAME
      botSettingsData.reminderInterval = botSettings.reminderInterval != null ? botSettings.reminderInterval : process.env.TWITCH_BOT_REMINDER_INTERVAL
      botSettingsData.enabled = botSettings.enabled != null ? botSettings.enabled : true

      res.json(botSettingsData)
      return
    });

    app.post('/rest/admin/botSettings', requireUser, isAdmin, async (req, res) => {
      const postedData = req.body
      logger.debug('postedData: '+JSON.stringify(postedData,null,2))

      let botSettings = await datastore.getBotSettings()
      let reminderInterval = Math.max(30, parseInt(postedData.reminderInterval))
      let enabled = !!postedData.enabled

      // changed?
      let intervalChanged = false
      let botEnabledChanged = false
      if (reminderInterval != botSettings.reminderInterval) {
        intervalChanged = true
      }
      if (enabled != botSettings.enabled) {
        botEnabledChanged = true
      }

      // update
      botSettings.reminderInterval = reminderInterval
      botSettings.enabled = enabled
      await datastore.saveBotSettings(botSettings)

      // send events
      if (intervalChanged) {
        eventEmitter.emit('twitchBotIntervalChanged', { interval: reminderInterval })
      }

      if (botEnabledChanged) {
        if (enabled) {
          eventEmitter.emit('twitchBotEnabled', {})
        } else {
          eventEmitter.emit('twitchBotDisabled', {})
        }
      }

      res.json({
        success: true,
        botSettings: botSettings,
      })
      return
    });

  // ------------------------------------------------------------------------
  // socket.io

  let io = socketIO(http);
  io.on("connection", client => {
    logger.debug(`client ${client.id} connected`)

    const eventsToRelay = ['entryUpdated', 'lotteryUpdated']

    // init subscriptions and event relay functions
    let subscriptions = {}
    let emitFns = {}
    for (let eventName of eventsToRelay) {
      subscriptions[eventName] = {}
      emitFns[eventName] = throttle(750, (data) => {
        logger.debug(`heard ${eventName} from eventEmitter`)

        const subSpec = subscriptions[eventName]
        if (subSpec.name != null) {

          // filter entryUpdated events
          if (subSpec.name == 'entryUpdated') {
            if (data.username != subSpec.username && subSpec.username != '*') {
              // logger.debug(`filtered ${data.username} from entryUpdated event for client ${client.id}/${subSpec.username}`)
              return
            }
          }

          // relay to client if subscribed
          client.emit(eventName, data)
        }
      })
    }

    // subscribe to the events and relay them to the client
    for (let eventName of eventsToRelay) {
      eventEmitter.on(eventName, emitFns[eventName])
    }

    // handle subscription request
    client.on('subscribe', function(subSpecs) {
      for (let subSpec of subSpecs) {
        // logger.debug('subSpec', JSON.stringify(subSpec,null,2))
        // logger.debug(`client ${client.id} subscribed to ${subSpec.name}`)
        subscriptions[subSpec.name] = subSpec
      }
    });

    // handle disconnect
    client.on('disconnect', () => {
      // logger.debug(`client ${client.id} disconnected`)
      for (let eventName of eventsToRelay) {
        eventEmitter.off(eventName, emitFns[eventName])
      }
    })

    // tell the client they are connected
    // logger.debug(`emitting connected event to ${client.id}`)
    client.emit('connected')
  });


  // ------------------------------------------------------------------------
  // run the bots
  

  // twitch bot
  twitchbot.run()
  if (process.env.TWITCH_BOT_ENABLED == null || (process.env.TWITCH_BOT_ENABLED != '0' && process.env.TWITCH_BOT_ENABLED != 'false')) {
    logger.debug('Starting twitchbot')
    twitchbot.run()
  } else {
    logger.info('Skipping twitchbot')
  }

  // dscord bot
  if (process.env.DISCORD_BOT_ENABLED == null || (process.env.DISCORD_BOT_ENABLED != '0' && process.env.DISCORD_BOT_ENABLED != 'false')) {
    logger.debug('Starting discord bot')
    discordbot.run()
  } else {
    logger.info('Skipping discord bot')
  }
}


function formatPublicUrl(urlPath) {
    if (process.env.PUBLIC_WEB_HOST != null) {
        let url = `//${process.env.PUBLIC_WEB_HOST}`
        if (process.env.PUBLIC_WEB_PORT != null) {
            url = `${url}:${process.env.PUBLIC_WEB_PORT}`
        }
        url = url + urlPath
        return url
    }

    return urlPath
}

function pickRandomElements(arr, n) {
    let result = new Array(n),
        len = arr.length,
        taken = new Array(len);
    if (n > len)
        throw new RangeError("pickRandomElements: more elements taken than available");
    while (n--) {
        let x = Math.floor(Math.random() * len);
        result[n] = arr[x in taken ? taken[x] : x];
        taken[x] = --len in taken ? taken[len] : len;
    }
    return result;
}

