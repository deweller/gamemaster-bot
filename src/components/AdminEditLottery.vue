<template>
    <div>
        <nav aria-label="breadcrumb" class="mt-3">
          <ol class="breadcrumb">
            <li class="breadcrumb-item"><router-link :to="{name: 'adminDashboard'}">Home</router-link></li>
            <li class="breadcrumb-item"><router-link :to="{name: 'adminLotteries'}">Lotteries</router-link></li>
            <li class="breadcrumb-item active" aria-current="page">Lottery {{lottery.name}}</li>
          </ol>
        </nav>

        <Waiting v-if="loading"></Waiting>
        <template v-if="!loading">
            <ErrorComponent v-if="apiErrorMessage" :error="apiErrorMessage"></ErrorComponent>
            <ErrorComponent v-if="winnersApiErrorMessage" :error="winnersApiErrorMessage"></ErrorComponent>

            <template v-if="editableLottery && editableLottery._id">
                <h1 class="mt-4 text-center">Lottery {{lottery.name}}</h1>
                <div class="text-center text-muted">Users can enter this lottery by reacting to the message in Discord.</div>

                <ul class="nav nav-tabs mt-4 mb-4">
                    <li class="nav-item">
                        <a @click.prevent="changeNav('edit')" class="nav-link" :class="{'active': navTab == 'edit'}" href="#edit">Match Details</a>
                    </li>
                    <li class="nav-item">
                        <a @click.prevent="changeNav('entries')" class="nav-link" :class="{'active': navTab == 'entries'}" href="#entries">Participants <span v-if="eligibleEntries.length > 0 || allWinningEntries.length > 0">({{eligibleEntries.length + allWinningEntries.length}})</span></a>
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
                                <input @input="changed" type="text" required maxlength="32" class="form-control" id="lotteryName" placeholder="Game One" v-model="editableLottery.name">
                            </div>
                        </div>
                    </div>
                    <div class="row">
                        <div class="col-md-6">
                            <div class="form-group">
                                <label for="matchName">Private Match Name</label>
                                <input @input="changed" type="text" maxlength="32" class="form-control" id="matchName" placeholder="My Match" v-model="editableLottery.matchName">
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="form-group">
                                <label for="matchPassword">Private Match Password</label>
                                <div class="input-group">
                                    <template v-if="!showPassword">
                                        <input @input="changed" type="password" maxlength="32" class="form-control" id="matchPassword" placeholder="seekr3t" v-model="editableLottery.matchPassword">
                                        <div class="input-group-append">
                                            <div class="input-group-text">
                                                <a @click.prevent="showPassword = true" href="#show-password"><i class="fas fa-eye"></i></a>
                                            </div>
                                        </div>
                                    </template>

                                    <template v-if="showPassword">
                                        <input @input="changed" type="text" maxlength="32" class="form-control" id="matchPassword" placeholder="seekr3t" v-model="editableLottery.matchPassword">
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
                                <textarea @input="changed" class="form-control" v-model="editableLottery.comments" id="comments" rows="4" maxlength="1024"></textarea>
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
                    <h3 class="mt-4 mb-3 text-center">Choose some winners for round {{currentLotteryRound}}</h3>

                    <div class="choices" :class="{'choices-disabled': choosing}">
                    <template v-for="number in 10">
                        <div :key="'n'+number" class="choice-wrapper">
                            <div class="choice" :class="{'choice-inactive': winnerCount != number, 'choice-active': winnerCount == number}" @click.prevent="chooseNumber(number)">
                                <span class="button-label">{{ number }}</span>
                            </div>
                        </div>
                    </template>
                    </div>

                    <div v-if="winnerCount != null" class="text-center mt-3">
                        <div v-if="currentLotteryRound > 1" class="mb-0">
                            <div class="add-to-previous-round" :class="{'add-to-previous-round-disabled': this.choosing}">
                                <a @click.prevent="toggleAddToPreviousRound" id="NewRound" href="#previous-round">
                                    <i v-if="addToPreviousRound" class="far fa-check-square"></i>
                                    <i v-if="!addToPreviousRound" class="far fa-square"></i>
                                    <label for="NewRound">Add these winners to round {{currentLotteryRound-1}} instead of creating a new round</label>
                                </a>
                            </div>
                        </div>
                        <div v-if="!addToPreviousRound" class="text-muted">Winners chosen in this round will be excluded from the next round of winners.</div>
                        <div v-if="addToPreviousRound" class="text-muted">Winners chosen will be added to the current round of winners.</div>
                    </div>
                    <div v-if="winnerCount != null && !hasMatchDetails" class="text-center mt-">
                        <span class="text-danger">Please enter some match details before choosing winners.</span>
                    </div>

                    <div class="text-center mt-4">
                        <a @click.prevent="submitChooseWinners()" href="#choose-winners" class="btn btn-primary" :class="{disabled: winnerCount == null || !hasMatchDetails || choosing}">Choose Winners</a>
                        <a @click.prevent="winnerCount = null" href="#cancel-winners" class="btn btn-secondary ml-3" :class="{disabled: winnerCount == null || choosing}">Cancel</a>
                    </div>


                    <hr class="my-4">
                    <h3 class="mt-4">{{eligibleEntries.length}} Eligible Entrants</h3>
                    <template v-if="eligibleEntries.length > 0">
                    <div class="entries">
                        <template v-for="entry of eligibleEntries">
                            <span class="badge badge-pill badge-info mr-1" :key="entry.username">{{entry.username}}</span>
                        </template>
                    </div>

                    </template>
                    <template v-if="eligibleEntries.length == 0">
                        <div class="text-muted">Nobody is eligible to win.</div>
                    </template>

                    <!-- previous round winners -->
                    <ErrorComponent v-if="clearApiErrorMessage" :error="clearApiErrorMessage"></ErrorComponent>
                    <template v-if="currentLotteryRound > 1">
                        <template v-for="roundData of winningEntriesByRound">
                            <div :key="roundData.round">
                                <hr class="my-4">
                                <a href="#clear" @click.prevent="clearRoundWinners(roundData.round)" class="btn btn-danger float-right" :class="{disabled: clearing}"><i class="fas fa-trash mr-1"></i> Clear Round {{ roundData.round }} Winners</a>
                                <h3 class="mt-4">Round {{ roundData.round }} Winners</h3>
                                <div class="entries">
                                    <template v-for="entry of roundData.entries">
                                        <span class="badge badge-pill badge-info mr-1" :key="entry.username">{{entry.username}}</span>
                                    </template>
                                </div>
                                <div class="mt-3 text-muted">These {{roundData.entries.length}} winners will be ineligible to win round {{ currentLotteryRound }}.</div>
                            </div>
                        </template>
                    </template>


                    <!-- Reset -->
                    <template v-if="eligibleEntries.length > 0">
                        <hr class="my-4">
                        <h3 class="mt-4">Reset</h3>
                        <div class="mb-4">Resetting the lottery will remove all {{eligibleEntries.length}} eligble entrants.  They will need to react again to join the lottery.  Previous round winners will remain.</div>
                        <ErrorComponent v-if="resetApiErrorMessage" :error="resetApiErrorMessage"></ErrorComponent>
                        <template v-if="confirmReset">
                            <div class="mb-2"><strong>Are you sure you want to reset the lottery?</strong></div>
                            <a @click.prevent="submitResetLottery" href="#reset-lottery-confirm" class="btn btn-danger" :class="{disabled: resetting}"><i class="fas fa-recycle mr-2"></i>Yes, Reset the Lottery</a>
                            <a @click.prevent="cancelResetLottery" href="#cancel-reset" class="btn btn-secondary ml-3" :class="{disabled: resetting}">Cancel</a>
                        </template>
                        <template v-if="!confirmReset">
                            <a @click.prevent="confirmReset = true" href="#reset-lottery" class="btn btn-primary" :class="{disabled: confirmReset}"><i class="fas fa-recycle mr-2"></i>Reset Lottery</a>
                        </template>
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

    .add-to-previous-round {
        font-size: 1.2rem;

        i {
            margin-right: 0.5rem;
        }
        a {
            color: inherit;
            label {
                cursor: pointer;
                font-weight: bold;
                // font-size: 1.2rem;
            }
        }
    }

    .add-to-previous-round-disabled {
        opacity: 0.35;
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
            rawEntries: [],
            lottery: {},
            editableLottery: {},

            showPassword: false,

            anyChanges: false,
            loading: true,

            saveComplete: false,
            saving: false,
            deleting: false,
            apiErrorMessage: null,
            winnersApiErrorMessage: null,
            resetApiErrorMessage: null,
            clearApiErrorMessage: null,

            addToPreviousRound: false,
            chooseComplete: false,
            choosing: false,

            confirmReset: false,
            resetting: false,

            clearing: false,

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
            if (this.lottery && data.lotteryId == this.lottery._id) {
                // reload lottery entries
                this.reloadLottery()
            }
        },
        lotteryUpdated: function (data) {
            if (this.lottery && data.lotteryId == this.lottery._id) {
                // the lottery was updated - reload the lottery data
                this.reloadLottery()
            }
        }
    },
    methods: {
        sendSubscriptions() {
            this.$socket.emit('subscribe', [
                {name:'entryUpdated',username:'*'},
                {name:'lotteryUpdated'},
            ])
        },
        changed() {
            this.anyChanges = true
            this.saveComplete = false
        },
        changeNav(newNavTab) {
            this.navTab = newNavTab
        },
        async loadLottery(lotteryId) {
            this.loading = true
            let responseData = await this.loadLotteryDataFromAPI(lotteryId)
            if (responseData) {
                // set the active lottery object
                this.lottery = JSON.parse(JSON.stringify(responseData.lottery))
                // set the editable lottery object
                this.editableLottery = JSON.parse(JSON.stringify(responseData.lottery))
                this.rawEntries = responseData.entries
            }
            this.loading = false
        },
        async reloadLottery() {
            let responseData = await this.loadLotteryDataFromAPI(this.lottery._id)
            if (responseData) {
                // set the active lottery object
                this.lottery = JSON.parse(JSON.stringify(responseData.lottery))
                this.rawEntries = responseData.entries
            }
        },
        async loadLotteryDataFromAPI(lotteryId) {
            this.apiErrorMessage = ''
            let response = await api.getLotteryById(lotteryId)

            if (response.success) {
                return {
                    lottery: response.data.model,
                    entries: response.data.entries,
                }
            }

            this.apiErrorMessage = response.error
            return null
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
            console.log('saving lottery', JSON.stringify(this.editableLottery, null, 2))

            this.saveComplete = false
            this.apiErrorMessage = ''
            this.saving = true
            let response = await api.updateLotteryById(this.lottery._id, this.editableLottery)
            console.log('response', JSON.stringify(response, null, 2))

            if (response.success) {
                // this.$router.push({ name: 'adminLotteries' })
                this.anyChanges = false
                this.saveComplete = true
                this.lottery = JSON.parse(JSON.stringify(this.editableLottery))
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

        toggleAddToPreviousRound() {
            if (!this.choosing) {
                this.addToPreviousRound = !this.addToPreviousRound
            }
        },

        async submitChooseWinners() {
            if (this.winnerCount == null) {
                return
            }

            console.log('submitChooseWinners this.winnerCount',JSON.stringify(this.winnerCount,null,2))
            if (this.choosing) {
                return
            }
            this.chooseComplete = false
            this.winnersApiErrorMessage = ''
            this.choosing = true
            let response = await api.chooseLotteryWinners(this.lottery._id, {
                winnerCount: this.winnerCount,
                addToPreviousRound: this.addToPreviousRound,
            })
            console.log('response', JSON.stringify(response, null, 2))

            if (response.success) {
                // this.$router.push({ name: 'adminLotteries' })
                this.chooseComplete = true
                this.winnerCount = null
                this.addToPreviousRound = false
            } else {
                this.winnersApiErrorMessage = response.error
            }

            this.choosing = false

            // // reload the lottery...
        },

        async cancelResetLottery() {
            if (this.resetting) {
                return
            }

            this.confirmReset = false
        },

        async submitResetLottery() {
            if (this.resetting) {
                return
            }

            this.resetApiErrorMessage = ''
            this.resetting = true
            let response = await api.resetLottery(this.lottery._id, {})
            this.resetting = false

            if (response.success) {
                // do nothing
                this.confirmReset = false
            } else {
                this.resetApiErrorMessage = response.error
            }


            // reload the lottery...
        },

        async clearRoundWinners(roundNumber) {
            if (this.clearing) {
                return
            }

            this.clearApiErrorMessage = ''
            this.clearing = true
            let response = await api.clearLotteryRound(this.lottery._id, {round: roundNumber})
            this.clearing = false

            if (response.success) {
                // do nothing
                this.confirmReset = false
            } else {
                this.clearApiErrorMessage = response.error
            }


            // reload the lottery...
        },
    },

    computed: {
        hasMatchDetails() {
            if (this.editableLottery.comments != null && this.editableLottery.comments.length > 0) {
                return true
            }
            if (this.editableLottery.matchName != null && this.editableLottery.matchName.length > 0) {
                return true
            }
            if (this.editableLottery.matchPassword != null && this.editableLottery.matchPassword.length > 0) {
                return true
            }

            return false
        },

        currentLotteryRound() {
            return this.lottery.currentRound || 1
        },
        winningEntriesByRound() {
            return this.entriesByType.winningEntriesByRound
        },
        eligibleEntries() {
            return this.entriesByType.eligibleEntries
        },
        allWinningEntries() {
            return this.entriesByType.allWinningEntries
        },


        entriesByType() {
            // filter entries
            let eligibleEntries = []
            let allWinningEntries = []
            let winningEntriesByRoundMap = {}

            for (let entry of this.rawEntries) {
                if (entry.chosenRound != null) {
                    if (winningEntriesByRoundMap[entry.chosenRound] == null) {
                        winningEntriesByRoundMap[entry.chosenRound] = []
                    }
                    winningEntriesByRoundMap[entry.chosenRound].push(entry)
                    allWinningEntries.push(entry)
                }

                if (entry.chosenRound == null && entry.active == true) {
                    eligibleEntries.push(entry)
                }

            }

            let winningEntriesByRound = []
            for (let round of Object.keys(winningEntriesByRoundMap)) {
                winningEntriesByRound.push({
                    round: round,
                    entries: winningEntriesByRoundMap[round],
                })
            }
            winningEntriesByRound.sort((a,b) => {
                  return b.round - a.round
            })

            return {
                eligibleEntries:  eligibleEntries,
                allWinningEntries:  allWinningEntries,
                winningEntriesByRound:  winningEntriesByRound,
            }
        },


    },
}
</script>