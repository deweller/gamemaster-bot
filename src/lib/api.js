import axios from 'axios'

const requestConfig = {
    withCredentials: true
}

export async function getUser() {
    return await wrapCall(async () => {
        return await axios.get(formatUrl(`/rest/user/me`), requestConfig)
    })
}

// ------------------------------------------------------------------------
// admin

export async function getLotteryById(id) {
    return await wrapCall(async () => {
        return await axios.get(formatUrl(`/rest/admin/lottery/${id}`), requestConfig)
    })
}
export async function getLotteries() {
    return await wrapCall(async () => {
        return await axios.get(formatUrl(`/rest/admin/lotteries`), requestConfig)
    })
}
export async function saveNewLottery(postData) {
    return await wrapCall(async () => {
        return await axios.post(formatUrl(`/rest/admin/lottery`), postData, requestConfig)
    })
}
export async function updateLotteryById(id, postData) {
    return await wrapCall(async () => {
        return await axios.post(formatUrl(`/rest/admin/lottery/${id}`), postData, requestConfig)
    })
}
export async function chooseLotteryWinners(id, postData) {
    return await wrapCall(async () => {
        return await axios.post(formatUrl(`/rest/admin/lottery/${id}/winners`), postData, requestConfig)
    })
}
export async function deleteLotteryById(id) {
    return await wrapCall(async () => {
        return await axios.delete(formatUrl(`/rest/admin/lottery/${id}`), requestConfig)
    })
}

export function formatUrl(urlPath) {
    if (process.env.NODE_ENV !== 'production' && process.env.VUE_APP_API_HOST != null) {
        let url = `//${process.env.VUE_APP_API_HOST}`
        if (process.env.VUE_APP_API_PORT != null) {
            url = `${url}:${process.env.VUE_APP_API_PORT}`
        }
        url = url + urlPath
        return url
    }

    return urlPath
}


// ------------------------------------------------------------------------

async function wrapCall(callbackFn) {
    try {
        let response = await callbackFn()
        return formatResponse(response.data)
    } catch (e) {
        return formatError(e)
    }
}

function formatResponse(responseData) {
    return {
        success: true,
        error: null,
        data: responseData,
    }
}

function formatError(e) {
    let errorMsg
    if (e.response) {
        if (e.response.data.message != null) {
            errorMsg = e.response.data.message
        } else {
            errorMsg = `Error code ${e.response.status}`
        }
    } else {
        console.error(e)
        errorMsg = 'Unable to fetch this information from the server.'
    }

    return {
        success: false,
        error: errorMsg,
        responseData: null,
    }
}


