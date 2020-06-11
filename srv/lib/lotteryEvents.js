const EventEmitter = require('events')

exports.emmiter = new EventEmitter()

/*
'userAdded', { lotteryId: lottery._id }
'winnersChosen', { lotteryId: lottery._id }
*/