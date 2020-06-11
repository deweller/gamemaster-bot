<template>
    <div class="hello" v-if="user">
        <h1 class="mt-5 text-center">
            Hi there, {{user.display_name}}.
        </h1>

        <ErrorComponent v-if="!loading" :error="apiErrorMessage"></ErrorComponent>

        <div>
            There is nothing to see on this page at this time.
            <!-- user view is disabled.  Use Discord instead. -->
        </div>

        <div v-if="false" :class="{loading: loading}" class="mt-2">

            <template v-if="lotteries.length > 0">
                <div class="text-center sub-header mb-4">Here are a list of the current lotteries.  If you win, the match details will be shown on this page.  glhf!</div>

                <template v-for="(lottery, idx) of lotteries">
                    <div class="lottery-container"  :key="lottery.id">
                        <hr v-if="idx > 0" class="my-4">
                        <div class="row">
                            <div class="col-xl-8">
                                <h3 class="mb-3 lottery-header"><i class="fas fa-dice mr-2"></i> Lottery {{lottery.name}}</h3>
                                <div v-if="lottery.userIsEntered" class="lottery-info">
                                    <div v-if="!lottery.hasWinners" class="text-muted">
                                        <i class="fas fa-sync-alt fa-spin mr-2"></i>
                                        You are entered in this lottery.  Good luck.
                                    </div>
                                    <template v-if="lottery.hasWinners">
                                        <template v-if="lottery.userWon">
                                            <div class="winner">
                                                <div class="message"><i class="fas fa-smile-beam mr-1"></i> You won!  Here are the match details:</div>
                                                <div class="details">
                                                    <div v-if="lottery.details.matchName" class="detail">
                                                        <span class="detail-label">Match Name</span> <span class="detail-element">{{lottery.details.matchName}}</span>
                                                    </div>
                                                    <div v-if="lottery.details.matchPassword" class="detail">
                                                        <span class="detail-label">Match Password</span> <span class="detail-element">{{lottery.details.matchPassword}}</span>
                                                    </div>
                                                    <div v-if="lottery.details.comments" class="detail detail-comments">
                                                        <span class="detail-element">{{lottery.details.comments}}</span>
                                                    </div>
                                                    <div v-if="!lottery.details.matchName && !lottery.details.matchPassword && !lottery.details.comments" class="detail no-details">
                                                        <span class="detail-element">It appears there are no details.  Well, this is awkward.</span>
                                                    </div>

                                                </div>
                                            </div>
                                        </template>
                                        <div v-if="!lottery.userWon" class="sorry">
                                            <i class="fa fa-sad-tear mr-2"></i>
                                            Some other winners have been chosen.  Sorry. You didn't win this time.
                                        </div>
                                    </template>
                                </div>
                                <div v-if="!lottery.userIsEntered" class="lottery-info text-muted">
                                    <i class="fa fa-info-circle mr-1"></i>
                                    You are not entered in this lottery yet.  Enter it by reacting to Discord.
                                </div>
                            </div>
                        </div>
                    </div>
                </template>
            </template>

            <template v-if="!loading && lotteries.length == 0">
                <div class="text-center text-muted mb-5">There are no lotteries happening right now.</div>
            </template>
            <template v-if="loading">
                <div class="text-center text-muted mb-5">Loading...</div>
            </template>
        </div>
    </div>
</template>
<style scoped lang="scss">
.loading {
    opacity: 0.35;
}
.sub-header {
    color: #333;
}

.lottery-info {
    margin-left: 1rem;
}
.sorry {
    color: #333;
    font-size: 1.1rem;
}
.winner {
    color: #000;
    font-size: 1.2rem;

    .message {
        color: #050;
    }
}

.details {
    margin-left: 1.9rem;
    margin-top: 0.4rem;
}
.detail-comments {
    margin-top: 0.3rem;
}
.detail-label {
    font-weight: bold;
    margin-right: 0.2rem;
    min-width: 9.4rem;
    display: inline-block;
}
.detail-element {
    color: #555;
}
.no-details {
    .detail-element {
        color: #999;
        font-size: 0.9rem;
    }
}
</style>

<script>

import ErrorComponent from './ErrorComponent.vue'
import * as api from '../lib/api'
import moment from 'moment'

export default {
    name: 'Dashboard',
    components: {
        ErrorComponent
    },
    props: {
    },
    data() {
        return {
            lotteries: [],

            loading: false,
            reloading: false,
            apiErrorMessage: null,
        }
    },
    created() {
        // this.loadLotteries()
    },
    mounted() {
        this.sendSubscriptions()
    },
    sockets: {
        connected: function () {
            console.log('connected')
            this.sendSubscriptions()
        },
        lotteryUpdated: function () {
            console.log('heard lotteryUpdated')
            // this.reloadLotteries()
        },
        entryUpdated: function () {
            console.log('heard entryUpdated')
            // this.reloadLotteries()
        },
    },
    methods: {
        sendSubscriptions() {
            this.$socket.emit('subscribe', [{name:'entryUpdated',username:this.user.login}, {name:'lotteryUpdated',}])
        },
        // async loadLotteries() {
        //     if (this.loading) {
        //         return
        //     }
        //     console.log('[loadLotteries]')

        //     this.apiErrorMessage = ''
        //     this.loading = true
        //     let response = await api.getUserLotteries()
        //     // console.log('response', JSON.stringify(response,null,2))

        //     if (response.success) {
        //         this.lotteries = response.data.models
        //     } else {
        //         console.error(response.error)
        //         this.apiErrorMessage = 'Failed to load lotteries from the server'
        //     }

        //     this.loading = false
        // },

        // async reloadLotteries() {
        //     if (this.loading || this.reloading) {
        //         return
        //     }

        //     console.log('[reloadLotteries]')

        //     this.apiErrorMessage = ''
        //     this.reloading = true
        //     let response = await api.getUserLotteries()

        //     if (response.success) {
        //         this.lotteries = response.data.models
        //     } else {
        //         console.error(response.error)
        //         this.apiErrorMessage = 'Failed to load lotteries from the server'
        //     }

        //     this.reloading = false
        // },

        formatDate(rawDate) {
            return moment(rawDate).fromNow()
        }
    },
    computed: {
        user() {
            return this.getUser()
        }
    },
}
</script>
