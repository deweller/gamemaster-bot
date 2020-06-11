const HOUR = 360000

const Datastore = require('nedb')
const EventEmitter = require('events');
const logger = require('./logger')

// ------------------------------------------------------------------------
// bot credentials

let botCredentialsDb = new Datastore({
    filename: __dirname + '/../../data/botcreds.db',
    autoload: true
});

exports.saveBotCredentials = async function (credentialsDoc) {
    return new Promise((resolve, reject) => {
        botCredentialsDb.update({}, credentialsDoc, {upsert: true}, (err, numReplaced) => {
            if (err) {
                reject(err)
                return
            }

            resolve(credentialsDoc)
        })
    })
}

exports.getBotCredentials = async function () {
    return new Promise((resolve, reject) => {
        botCredentialsDb.findOne({}, function (err, foundDoc) {
            if (err) {
              reject(err)
              return
            }

            resolve(foundDoc)
        })
    })
}


// ------------------------------------------------------------------------
// users

let usersDb = new Datastore({
    filename: __dirname + '/../../data/users.db',
    autoload: true
});
usersDb.ensureIndex({ fieldName: 'username', unique: true }, function (err) {
});

exports.addUser = async function (userDoc) {
    return new Promise((resolve, reject) => {
        usersDb.insert(userDoc, (err, newDoc) => {
            if (err) {
                reject(err)
                return
            }

            resolve(newDoc)
        })
    })
}
exports.findUserByUsername = async function (username) {
    return new Promise((resolve, reject) => {
        usersDb.findOne({ username: username }, function (err, foundDoc) {
            if (err) {
              reject(err)
              return
            }

            resolve(foundDoc)
        })
    })
}

// ------------------------------------------------------------------------
// lotteries

let lotteriesDb = new Datastore({
    filename: __dirname + '/../../data/lotteries.db',
    autoload: true
});
lotteriesDb.ensureIndex({ fieldName: 'name', unique: true }, function (err) {
});

lotteriesDb.persistence.setAutocompactionInterval(HOUR * 24)

exports.addLottery = async function (lotteryDoc) {
    return new Promise((resolve, reject) => {
        lotteriesDb.insert(lotteryDoc, (err, newDoc) => {
            if (err) {
                reject(err)
                return
            }

            resolve(newDoc)
        })
    })
}
exports.updateLottery = async function (id, lotteryDoc) {
    return new Promise((resolve, reject) => {
      lotteriesDb.update({ _id: id }, { $set: lotteryDoc}, {}, function (err, numReplaced) {
            if (err) {
                reject(err)
                return
            }

            resolve(numReplaced)
        })
    })
}
exports.getLotteries = async function () {
    return new Promise((resolve, reject) => {
        // Find all documents in the collection
        lotteriesDb.find({}).sort({ name: 1 }).exec(function (err, docs) {
            if (err) {
              reject(err)
              return
            }

            resolve(docs)
        })
    })
}

exports.findLotteryByName = async function (name) {
    return new Promise((resolve, reject) => {
        lotteriesDb.findOne({ name: name }, function (err, foundDoc) {
            if (err) {
              reject(err)
              return
            }

            resolve(foundDoc)
        })
    })
}

exports.findLotteryById = async function (id) {
    return new Promise((resolve, reject) => {
        lotteriesDb.findOne({ _id: id }, function (err, foundDoc) {
            if (err) {
              reject(err)
              return
            }

            resolve(foundDoc)
        })
    })
}

exports.deleteLotteryById = async function (id) {
    return new Promise((resolve, reject) => {
        lotteriesDb.remove({ _id: id }, function (err, numRemoved) {
            if (err) {
              reject(err)
              return
            }

            resolve(numRemoved)
        })
    })
}


// ------------------------------------------------------------------------
// lottery entries

let entriesDb = new Datastore({
    filename: __dirname + '/../../data/entries.db',
    autoload: true
});
entriesDb.ensureIndex({ fieldName: 'entryKey', unique: true }, function (err) {
});

exports.addLotteryEntry = async function (lotteryId, userId, username) {

    const entryKey = `${lotteryId}:${username}`
    const entryDoc = {
        entryKey,
        lotteryId,
        userId,
        username,
    }

    return new Promise((resolve, reject) => {
        entriesDb.update({ entryKey: entryKey }, { $set: entryDoc }, { upsert: true }, function (err, numReplaced, newEntryDoc, wasInserted) {
            if (err) {
                reject(err)
                return
            }

            resolve({
                ...entryDoc,
                wasAdded: wasInserted,
            })
        })
    })
}

exports.removeLotteryEntry = async function (lotteryId, username) {
    const entryKey = `${lotteryId}:${username}`

    return new Promise((resolve, reject) => {
        entriesDb.remove({ entryKey: entryKey }, function (err, numRemoved) {
            if (err) {
              reject(err)
              return
            }

            resolve(numRemoved)
        })
    })
}

exports.updateLotteryEntryWinners = async function (ids, updateDoc) {
    return new Promise((resolve, reject) => {
      entriesDb.update({ _id: { $in: ids } }, { $set: updateDoc}, { multi: true }, function (err, numReplaced) {
            if (err) {
                reject(err)
                return
            }

            resolve(numReplaced)
        })
    })

}

exports.getLotteryEntries = async function (lotteryId) {
    return new Promise((resolve, reject) => {
        // Find all documents in the collection
        entriesDb.find({ lotteryId: lotteryId }).sort({ username: 1 }).exec(function (err, docs) {
            if (err) {
              reject(err)
              return
            }

            resolve(docs)
        })
    })
}

exports.findLotteryEntry = async function (lotteryId, username) {
    return new Promise((resolve, reject) => {
        // Find all documents in the collection
        const entryKey = `${lotteryId}:${username}`

        entriesDb.findOne({ entryKey: entryKey }, function (err, foundDoc) {
            if (err) {
              reject(err)
              return
            }

            resolve(foundDoc)
        })
    })
}


exports.deleteLotteryEntries = async function (lotteryId) {
    return new Promise((resolve, reject) => {
        entriesDb.remove({ lotteryId: lotteryId }, function (err, numRemoved) {
            if (err) {
              reject(err)
              return
            }

            resolve(numRemoved)
        })
    })
}

