<template>
    <div>
        <nav aria-label="breadcrumb" class="mt-3">
          <ol class="breadcrumb">
            <li class="breadcrumb-item"><router-link :to="{name: 'adminDashboard'}">Home</router-link></li>
            <li class="breadcrumb-item active" aria-current="page">Twitch Bot Settings</li>
          </ol>
        </nav>

        <Waiting v-if="loading"></Waiting>
        <template v-if="!loading">
            <ErrorComponent v-if="apiErrorMessage" :error="apiErrorMessage"></ErrorComponent>

                <h2>Twitch Bot Settings</h2>

                <form @submit.prevent="saveForm" class="mt-4">
                    <div class="row">
                        <div class="col-md-6">
                            <div class="form-group">
                                <label for="lotteryName">Bot Name</label>
                                <input type="text" readonly class="form-control-plaintext text-muted" v-model="botSettings.botName">
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="form-group">
                                <label for="lotteryName">Bot Channel</label>
                                <input type="text" readonly class="form-control-plaintext text-muted" v-model="botSettings.botChannel">
                            </div>
                        </div>
                    </div>

                    <div class="row">
                        <div class="col-md-6">
                            <div class="form-group">
                                <label for="lotteryName">Bot Enabled</label>
                                
                                <div class="custom-control custom-switch">
                                  <input @input="changed" type="checkbox" class="custom-control-input" id="botEnabled"  v-model="botSettings.enabled">
                                  <label class="custom-control-label" for="botEnabled">Enabled</label>
                                </div>

                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="form-group">
                                <label for="lotteryName">Bot Reminder Interval</label>
                                <div class="input-group w-50">
                                    <input @input="changed" type="number" min="30" class="form-control" v-model="botSettings.reminderInterval">
                                    <div class="input-group-append">
                                        <span class="input-group-text">seconds</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="mt-4">
                        <button type="submit" class="btn btn-primary mr-3" :class="{disabled: saving || !anyChanges}" :disabled="saving || !anyChanges"><i class="fas fa-save mr-2"></i>Save Changes</button>
                    </div>

                    <div v-if="saveComplete" class="alert alert-warning fade show mt-4" role="alert">
                        Changes Saved
                        <button @click="saveComplete = false" type="button" class="close" aria-label="Close">
                            <span aria-hidden="true">&times;</span>
                        </button>
                    </div>

                </form>

        </template>
    </div>
</template>
<style scoped lang="scss">
label {
    font-weight: bold;
}
label.custom-control-label {
    font-weight: normal;
}

</style>

<script>
import Waiting from './WaitingComponent.vue'
import ErrorComponent from './ErrorComponent.vue'
import * as api from '../lib/api'


export default {
    name: 'AdminTwitchBotSettings',
    components: {
        Waiting,
        ErrorComponent,
    },
    props: {},
    data() {
        return {
            botSettings: {},

            anyChanges: false,
            loading: true,

            saveComplete: false,
            saving: false,
            apiErrorMessage: null,
        }
    },
    created() {

    },
    mounted() {
        this.loadBotSettings()
        this.sendSubscriptions()
    },
    unmounted() {
    },
    sockets: {
        connected: function () {
            this.sendSubscriptions()
        },
    },
    methods: {
        sendSubscriptions() {
        },
        changed() {
            this.anyChanges = true
            this.saveComplete = false
        },
        async loadBotSettings() {
            this.loading = true

            this.apiErrorMessage = ''
            let response = await api.getBotSettings()

            if (response.success) {
                this.botSettings = response.data
            } else {
                this.apiErrorMessage = response.error
            }


            this.loading = false
        },


        async saveForm() {
            if (this.saving) {
                return
            }

            this.saveComplete = false
            this.apiErrorMessage = ''
            this.saving = true
            let response = await api.updateBotSettings(this.botSettings)

            if (response.success) {
                // this.$router.push({ name: 'adminLotteries' })
                this.anyChanges = false
                this.saveComplete = true
                this.botSettings = JSON.parse(JSON.stringify(this.botSettings))
            } else {
                this.apiErrorMessage = response.error
            }

            this.saving = false
        },

        // ------------------------------------------------------------------------
        

    },

    computed: {


    },
}
</script>