<template>
    <div>
        <nav aria-label="breadcrumb" class="mt-3">
          <ol class="breadcrumb">
            <li class="breadcrumb-item"><router-link :to="{name: 'adminDashboard'}">Home</router-link></li>
            <li class="breadcrumb-item active" aria-current="page">Lotteries</li>
          </ol>
        </nav>

        <h1 class="mt-4 text-center">Lotteries</h1>

        <p class="text-center">You can have a single lottery or run multiple lotteries at the same time.</p>

        <ErrorComponent v-if="!loading" :error="apiErrorMessage"></ErrorComponent>

        <div class="mt-5">

            <div class="row">
            <template v-for="lottery of lotteries">
            <div class="col-md-6 col-lg-4 col-xl-3 mb-4" :key="lottery.id">
            <div class="card">
                <div class="card-header">
                    <i class="fas fa-dice mr-2"></i>{{lottery.name}}
                </div>
                <div class="card-body">
                    <h5 class="card-title">{{lottery.matchName || 'No Match Name'}}</h5>
                    <div class="mb-1 text-muted">{{lottery.entries.length}} entries</div>
                    <div class="mb-1 text-muted">Created {{formatDate(lottery.created)}}</div>
                    <router-link :to="{name:'editLottery', params: {id: lottery._id}}" class="mt-3 btn btn-info"><i class="fas fa-edit mr-1"></i> Details</router-link>
                </div>
            </div>
            </div>
            </template>
            </div>

            <template v-if="lotteries.length == 0">
                <div class="text-center text-muted mb-5">You don't have any lotteries right now.</div>
            </template>

        </div>

        <div class="mt-5 text-center">
            <router-link :to="{name:'newLottery'}" class="btn btn-primary"><i class="fas fa-plus mr-1"></i> Create a New Lottery</router-link>
        </div>
    </div>
</template>
<script>

import ErrorComponent from './ErrorComponent.vue'
import * as api from '../lib/api'
import moment from 'moment'

export default {
    name: 'Lotteries',
    components: {
        ErrorComponent
    },
    props: {
    },
    data() {
        return {
            lotteries: [],

            loading: false,
            apiErrorMessage: null,
        }
    },
    mounted() {
        this.loadLotteries()
        this.sendSubscriptions()
    },
    sockets: {
        connected: function () {
            this.sendSubscriptions()
        },
        entryUpdated: function () {
            // reload lottery entries
            this.loadLotteries()
        }
    },
    methods: {
        sendSubscriptions() {
            this.$socket.emit('subscribe', [{name:'entryUpdated',username:'*'}])
        },

        async loadLotteries() {
            if (this.loading) {
                return
            }

            this.apiErrorMessage = ''
            this.loading = true
            let response = await api.getLotteries()
            // console.log('response', JSON.stringify(response,null,2))

            if (response.success) {
                this.lotteries = response.data.models
            } else {
                this.apiErrorMessage = response.error
            }

            this.loading = false
        },

        formatDate(rawDate) {
            return moment(rawDate).fromNow()
        }
    },
}
</script>
<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
</style>