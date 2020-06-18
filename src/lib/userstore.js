import * as api from './api'

const EXPIRE_MINUTES = 1

let userData = {
}

let userDataExpiresAt = 0

export function getUser() {
    return userData
}

export function setUserData(newUserData) {
    if (newUserData != null) {
        userData = newUserData
        // console.log('userData', userData)
    } else {
        userData = {}
    }
}

export async function ensureUser() {
    let expired = false
    if (userData.isLoggedIn != null || userData.isLoggedIn == false) {
        expired = Date.now() >= userDataExpiresAt
        if (expired) {
            console.log('user expired - refreshing')
        }
    }

    if (userData.isLoggedIn == null || expired) {
        // load the user
        let userResponse = await api.getUser()
        if (userResponse.success == false) {
            console.error('failed to load user data')
            userDataExpiresAt = 0
            userData = {
                isError: true
            }
        } else {
            setUserData(userResponse.data)
            userDataExpiresAt = Date.now() + EXPIRE_MINUTES * 60 * 1000
        }
    }

    return userData
}