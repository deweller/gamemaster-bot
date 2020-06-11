<template>
    <div>
        <nav aria-label="breadcrumb" class="mt-3">
          <ol class="breadcrumb">
            <li class="breadcrumb-item"><router-link :to="{name: 'adminDashboard'}">Home</router-link></li>
            <li class="breadcrumb-item"><router-link :to="{name: 'adminLotteries'}">Lotteries</router-link></li>
            <li class="breadcrumb-item active" aria-current="page">Lottery {{activeLottery.name}}</li>
          </ol>
        </nav>

        <Waiting v-if="loading"></Waiting>
        <template v-if="!loading">
            <ErrorComponent v-if="apiErrorMessage" :error="apiErrorMessage"></ErrorComponent>
            <ErrorComponent v-if="winnersApiErrorMessage" :error="winnersApiErrorMessage"></ErrorComponent>

            <template v-if="lottery && lottery._id">
                <h1 class="mt-4 text-center">Lottery {{activeLottery.name}}</h1>
                <div class="text-center text-muted">Users can enter this lottery by reacting to the message in Discord.</div>

                <ul class="nav nav-tabs mt-4 mb-4">
                    <li class="nav-item">
                        <a @click.prevent="changeNav('edit')" class="nav-link" :class="{'active': navTab == 'edit'}" href="#edit">Match Details</a>
                    </li>
                    <li class="nav-item">
                        <a @click.prevent="changeNav('entries')" class="nav-link" :class="{'active': navTab == 'entries'}" href="#entries">Participants <span v-if="allEntries.length > 0">({{allEntries.length}})</span></a>
                    </li>
                    <li class="nav-item">
                        <a @click.prevent="changeNav('delete')" class="nav-link" :class="{'active': navTab == 'delete'}" href="#delete">Delete</a>
                    </li>
                </ul>


                <template v-if="navTab == 'edit'">

                <h2>Match Details</h2>

                <form @submit.prevent="saveForm" class="mt-4">
                    <div class="row">
                        <div class="col-md-6">
                            <div class="form-group">
                                <label for="lotteryName">Lottery Name</label>
                                <input @input="changed" type="text" required maxlength="32" class="form-control" id="lotteryName" placeholder="Game One" v-model="lottery.name">
                            </div>
                        </div>
                    </div>
                    <div class="row">
                        <div class="col-md-6">
                            <div class="form-group">
                                <label for="matchName">Private Match Name</label>
                                <input @input="changed" type="text" maxlength="32" class="form-control" id="matchName" placeholder="My Match" v-model="lottery.matchName">
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="form-group">
                                <label for="matchPassword">Private Match Password</label>
                                <div class="input-group">
                                    <template v-if="!showPassword">
                                        <input @input="changed" type="password" maxlength="32" class="form-control" id="matchPassword" placeholder="seekr3t" v-model="lottery.matchPassword">
                                        <div class="input-group-append">
                                            <div class="input-group-text">
                                                <a @click.prevent="showPassword = true" href="#show-password"><i class="fas fa-eye"></i></a>
                                            </div>
                                        </div>
                                    </template>

                                    <template v-if="showPassword">
                                        <input @input="changed" type="text" maxlength="32" class="form-control" id="matchPassword" placeholder="seekr3t" v-model="lottery.matchPassword">
                                        <div class="input-group-append">
                                            <div class="input-group-text">
                                                <a @click.prevent="showPassword = false" href="#show-password"><i class="fas fa-eye-slash"></i></a>
                                            </div>
                                        </div>
                                    </template>

                                    
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="row">
                        <div class="col-md-6">
                            <div class="form-group">
                                <label for="comments">Comments</label>
                                <textarea @input="changed" class="form-control" v-model="lottery.comments" id="comments" rows="4" maxlength="1024"></textarea>
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

                <!-- entries -->
                <template v-if="navTab == 'entries'">
                    <h3 class="mt-4">Choose some winners</h3>
                    <p>Click the number of winners to choose.</p>

                    <div class="choices" :class="{'choices-disabled': choosing}">
                    <template v-for="number in 10">
                        <div :key="'n'+number" class="choice-wrapper">
                            <div class="choice" :class="{'choice-inactive': winnerCount != number, 'choice-active': winnerCount == number}" @click.prevent="chooseNumber(number)">
                                <span class="button-label">{{ number }}</span>
                            </div>
                        </div>
                    </template>
                    </div>

                    <div class="text-center mt-3">
                        <a @click.prevent="submitChooseWinners()" href="#choose-winners" class="btn btn-primary" :class="{disabled: winnerCount == null || choosing}">Choose Winners</a>
                        <a @click.prevent="winnerCount = null" href="#cancel-winners" class="btn btn-secondary ml-3" :class="{disabled: winnerCount == null || choosing}">Cancel</a>
                    </div>

                    <hr class="my-4">
                    <h3 class="mt-4">Entrants</h3>
                    <template v-if="allEntries.length > 0">
                    <div class="entries">
                        <template v-for="entry of allEntries">
                            <span class="badge badge-pill badge-info mr-1" :key="entry.username">{{entry.username}}</span>
                        </template>
                    </div>
                    <div class="mt-3 text-muted">{{allEntries.length}} people are in the lottery.</div>
                    </template>
                    <template v-if="allEntries.length == 0">
                        <div class="text-muted">Nobody has entered yet.</div>
                    </template>


                    <hr class="my-4">
                    <h3 class="mt-4">Winners</h3>
                    <template v-if="chosenEntries.length > 0">
                    <div class="winners">
                        <template v-for="entry of chosenEntries">
                            <span class="badge badge-pill badge-info mr-1" :key="entry.username">{{entry.username}}</span>
                        </template>
                    </div>
                    <div class="mt-3 text-muted">{{chosenEntries.length}} people are winners.</div>
<!--                     <div v-if="chooseComplete" class="alert alert-warning fade show mt-4" role="alert">
                        Winners Chosen
                        <button @click="chooseComplete = false" type="button" class="close" aria-label="Close">
                            <span aria-hidden="true">&times;</span>
                        </button>
                    </div>
 -->
                     </template>
                    <template v-if="chosenEntries.length == 0">
                        <div class="text-muted">Nobody has won yet.</div>
                    </template>


                </template>

                <!-- delete -->
                <template v-if="navTab == 'delete'">
                <p class="text-muted mt-3">If you are done with this lottery, you can delete it.  This will delete all entries for this lottery as well.</p>
                <a href="#delete" class="btn btn-danger btn-lg" data-toggle="modal" data-target="#lotteryDeleteModal"><i class="fas fa-trash"></i> Delete lottery</a>

                <div class="modal fade" ref="lotteryDeleteModal" id="lotteryDeleteModal" tabindex="-1" role="dialog" aria-labelledby="lotteryDeleteModalLabel" aria-hidden="true">
                    <div class="modal-dialog" role="document">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title" id="lotteryDeleteModalLabel">Delete Lottery {{lottery.name}}</h5>
                                <button v-if="!deleting" type="button" class="close" data-dismiss="modal" aria-label="Close">
                                    <span aria-hidden="true">&times;</span>
                                </button>
                            </div>
                            <div class="modal-body">
                                Are you sure you want to delete this lottery?
                            </div>
                            <div class="modal-footer">
                                <button :disabled="this.deleting" type="button" class="btn btn-secondary" data-dismiss="modal">Cancel</button>
                                <button :disabled="this.deleting" @click.prevent="executeDelete" type="button" class="btn btn-danger">Delete Lottery</button>
                            </div>
                        </div>
                    </div>
                </div>
                </template>

            </template>
            <template v-else>
                <router-link :to="{name: 'adminLotteries'}" class="btn btn-secondary">Back to Lotteries</router-link>
            </template>
        </template>
    </div>
</template>
<style scoped lang="scss">
    $light-grey: #eee;
    $med-grey: #777;
    $dark-grey: #444;
    $chosen: #6610f2;

    .choices {
        display: flex;
        justify-content: space-between;
    }

    .choices-disabled {
        opacity: 0.35;
    }

    .choice-wrapper {
        text-align: center;
        width: 100px;
    }

    .choice {
        display: inline-block;
        width: 60px;
        height: 60px;

        cursor: pointer;

        background-color: $light-grey;
        color: $dark-grey;

        transition: background-color 0.35s ease, color 0.35s ease;
        border-radius: 6px;

        span.button-label {
            line-height: 60px;
            font-size: 1.5rem;
        }
    }

    div.label {
        line-height: 1.1rem;
        margin-top: 8px;
        color: $med-grey;
    }

    .choice-inactive:hover {
        background-color: darken($light-grey, 8%);
    }

    .choice-active {
        background-color: $chosen;
        color: white;
    }


</style>

<script>
import Waiting from './WaitingComponent.vue'
import ErrorComponent from './ErrorComponent.vue'
import * as api from '../lib/api'
import jQuery from 'jquery'


export default {
    name: 'AdminEditLottery',
    components: {
        Waiting,
        ErrorComponent,
    },
    props: {},
    data() {
        return {
            lottery: {},
            unchosenEntries: [],
            chosenEntries: [],
            allEntries: [],
            activeLottery: {},

            showPassword: false,

            anyChanges: false,
            loading: true,

            saveComplete: false,
            saving: false,
            deleting: false,
            apiErrorMessage: null,
            winnersApiErrorMessage: null,

            chooseComplete: false,
            choosing: false,

            navTab: 'edit',

            winnerCount: null,
        }
    },
    created() {

    },
    mounted() {
        this.loadLottery(this.$route.params.id)
        this.sendSubscriptions()
    },
    unmounted() {
    },
    sockets: {
        connected: function () {
            console.log('connected')
            this.sendSubscriptions()
        },
        entryUpdated: function (data) {
            console.log('entryUpdated heard', JSON.stringify(data,null,2))
            console.log('[entryUpdated] lotteryId', JSON.stringify(data.lotteryId,null,2))
            if (this.lottery && data.lotteryId == this.lottery._id) {
                // reload lottery entries
                this.reloadLotteryEntries(this.lottery._id)
            }
        }
    },
    methods: {
        sendSubscriptions() {
            this.$socket.emit('subscribe', [{name:'entryUpdated',username:'*'}])
        },
        changed() {
            this.anyChanges = true
            this.saveComplete = false
        },
        changeNav(newNavTab) {
            this.navTab = newNavTab
        },
        async loadLottery(lotteryId) {
            this.apiErrorMessage = ''
            this.loading = true
            let response = await api.getLotteryById(lotteryId)
            // console.log('loadLottery response', JSON.stringify(response, null, 2))

            if (response.success) {
                // load the lottery
                this.lottery = response.data.model

                // filter entries
                this.updateLotteryEntries(response.data.entries)

                // set the active lottery object
                this.activeLottery = JSON.parse(JSON.stringify(response.data.model))
            } else {
                this.apiErrorMessage = response.error
            }

            this.loading = false
        },
        async reloadLotteryEntries(lotteryId) {
            let response = await api.getLotteryById(lotteryId)
            // console.log('loadLottery response', JSON.stringify(response, null, 2))

            if (response.success) {
                this.updateLotteryEntries(response.data.entries)
            }

            this.loading = false
        },
        updateLotteryEntries(entries) {
            // filter entries
            let allEntries = []
            let unchosenEntries = []
            let chosenEntries = []
            for (let entry of entries) {
                if (entry.chosenRound == null) {
                    unchosenEntries.push(entry)
                } else {
                    chosenEntries.push(entry)
                }
                allEntries.push(entry)
            }
            this.unchosenEntries = unchosenEntries
            this.chosenEntries = chosenEntries
            this.allEntries = allEntries
        },
        async executeDelete() {
            this.deleting = true
            this.apiErrorMessage = ''

            let response = await api.deleteLotteryById(this.lottery._id)
            console.log('response', JSON.stringify(response, null, 2))

            if (response.success) {
                jQuery(this.$refs.lotteryDeleteModal).on('hidden.bs.modal', () => {
                    this.$router.push({ name: 'adminLotteries' })
                })
                jQuery(this.$refs.lotteryDeleteModal).modal('hide')
            } else {
                this.apiErrorMessage = response.error
            }

            this.deleting = false
        },


        async saveForm() {
            if (this.saving) {
                return
            }
            console.log('saving lottery', JSON.stringify(this.lottery, null, 2))

            this.saveComplete = false
            this.apiErrorMessage = ''
            this.saving = true
            let response = await api.updateLotteryById(this.lottery._id, this.lottery)
            console.log('response', JSON.stringify(response, null, 2))

            if (response.success) {
                // this.$router.push({ name: 'adminLotteries' })
                this.anyChanges = false
                this.saveComplete = true
                this.activeLottery = JSON.parse(JSON.stringify(this.lottery))
            } else {
                this.apiErrorMessage = response.error
            }

            this.saving = false
        },

        // ------------------------------------------------------------------------
        
        chooseNumber(newNumber) {
            if (this.choosing) {
                return
            }

            if (this.winnerCount != null && this.winnerCount == newNumber) {
                // deselect
                this.winnerCount = null
            } else {
                // select
                this.winnerCount = newNumber
            }
        },

        async submitChooseWinners() {
            if (this.winnerCount == null) {
                return
            }

            console.log('submitChooseWinners this.winnerCount',JSON.stringify(this.winnerCount,null,2))
            if (this.saving) {
                return
            }
            console.log('saving lottery', JSON.stringify(this.lottery, null, 2))

            this.chooseComplete = false
            this.winnersApiErrorMessage = ''
            this.choosing = true
            let response = await api.chooseLotteryWinners(this.lottery._id, {
                winnerCount: this.winnerCount
            })
            console.log('response', JSON.stringify(response, null, 2))

            if (response.success) {
                // this.$router.push({ name: 'adminLotteries' })
                this.chooseComplete = true
            } else {
                this.winnersApiErrorMessage = response.error
            }

            this.choosing = false
            this.winnerCount = null

            // reload the lottery...
            this.loadLottery(this.lottery._id)
        },
    },
}
</script>