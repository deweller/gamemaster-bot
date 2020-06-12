const TwitchOAuth = require('@callowcreation/basic-twitch-oauth')
const logger = require('./logger')

exports.buildTwitchBotOauth = function() {
    const twitchOAuth = new TwitchOAuth({
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        redirect_uri: process.env.BOT_REDIRECT_URI,
        scopes: [
            'chat:read',
            'chat:edit',
        ]
    }, process.env.OAUTH_STATE_SECRET_KEY);

    return twitchOAuth
} 

exports.buildTwitchUserOauth = function() {
    const twitchOAuth = new TwitchOAuth({
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        redirect_uri: process.env.USER_REDIRECT_URI,
        scopes: [
        ]
    }, process.env.OAUTH_STATE_SECRET_KEY);

    return twitchOAuth
}

exports.useCredentials = function(twitchOAuth, tokenData) {
    // set the token data
    if (tokenData == null || tokenData.access_token == null) {
        throw new Error('Unable to find credentials.  Please authenticate your bot.')
    }

    // calculate expires_in from the saved expires_time
    const d = new Date()
    const seconds = Math.round(d.getTime() / 1000)
    tokenData.expires_in = tokenData.expires_time - seconds + 60
    // this.authenticated.expires_time = (seconds + this.authenticated.expires_in) - this.secondsOff;


    twitchOAuth.setAuthenticated(tokenData)
}

// exports.authenticateTwitchOauth = async function(twitchOAuth, oldTokenData) {
//     // set the token data
//     if (oldTokenData == null || oldTokenData.access_token == null) {
//         throw new Error('Unable to find credentials.  Please authenticate your bot.')
//     }
//     twitchOAuth.setAuthenticated(oldTokenData)

//     // refresh (if needed)
//     const newTokenData = await twitchOAuth.fetchRefreshToken()

//     // return the refreshed credentials
//     return newTokenData
// }

exports.getUser = async function(twitchOAuth) {
    const url = `https://api.twitch.tv/helix/users`;
    const result = await twitchOAuth.getEndpoint(url)

    if (result == null || result.error != null) {
        logger.error('twitch oAuth failed: '+ JSON.stringify(result,null,2))
        return null
    }

    if (result.data != null) {
        let user = result.data[0]
        return user
    }

    return null
}

exports.userIsAdmin = function(user) {
    if (user == null) {
        return false
    }
    if (process.env.ADMIN_USERNAMES == null) {
        return false
    }

    const username = user.login

    const allAdmins = process.env.ADMIN_USERNAMES.split(',')
    // logger.debug('username='+username+' allAdmins', JSON.stringify(allAdmins,null,2))
    return (allAdmins.indexOf(username) >= 0)
}

module.exports = exports
