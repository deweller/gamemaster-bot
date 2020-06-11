// for local use only
// PREFIX=dude COUNT=2 node ./bin/addusers.js

require('dotenv').config({ path: __dirname + '/../.env.local' })

const datastore = require('../srv/lib/datastore.js')
const eventEmitter = require('../srv/lib/lotteryEvents').emmiter
const axios = require('axios')

async function addRandoms(prefix, count) {
  let lotteries = await datastore.getLotteries()
  let lottery = lotteries[0]

  for (var i = 1; i <= count; i++) {
    let username = `${prefix}${i}`
    let url = formatUrl(`/rest/admin/lottery/${lottery._id}/entry/${username}`)
    console.log('url',url)
    let result = await axios.post(url, {})
    console.log(`${result.status}: `,JSON.stringify(result.data,null,2))
  }

  process.exit(0)
}

function formatUrl(urlPath) {
    if (process.env.VUE_APP_API_HOST != null) {
        let url = `${process.env.VUE_APP_API_PROTOCOL}://${process.env.VUE_APP_API_HOST}`
        if (process.env.VUE_APP_API_PORT != null) {
            url = `${url}:${process.env.VUE_APP_API_PORT}`
        }
        url = url + urlPath
        return url
    }

    return urlPath
}

const prefix = process.env.PREFIX || 'randomuser'
const count = process.env.COUNT || 5
addRandoms(prefix, count)

