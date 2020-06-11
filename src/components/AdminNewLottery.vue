<template>
    <div class="hello">
        <h1 class="mt-4 text-center">Create a new Lottery</h1>

        <ErrorComponent v-if="!saving" :error="apiErrorMessage"></ErrorComponent>

        <form @submit.prevent="saveForm">
          <div class="form-group">
            <label for="lotteryName">Lottery Name</label>
            <input type="text" required maxlength="32" class="form-control" id="lotteryName" aria-describedby="lotteryHelp" placeholder="Game One" v-model="lottery.name">
            <small v-if="lottery.name" id="lotteryHelp" class="form-text text-muted">Users can enter this lottery by reacting to the message in Discord as soon as you click save.</small>
          </div>

          <div class="mt-4">
          <button type="submit" class="btn btn-primary mr-3" :class="{disabled: saving}" :disabled="saving"><i class="fas fa-save mr-2"></i>Save</button>
          <!-- <button type="submit" class="btn btn-info mr-3">Save Draft</button> -->
          <router-link :to="{name: 'adminLotteries'}" class="btn btn-secondary" :class="{disabled: saving}" :disabled="saving">Cancel</router-link>
          </div>
        </form>

    </div>
</template>
<script>

import ErrorComponent from './ErrorComponent.vue'
import * as api from '../lib/api'


export default {
    name: 'AdminEditLottery',
    components: {
        ErrorComponent
    },
    props: {
    },
    data() {
        return {
            lottery: {},

            saving: false,
            apiErrorMessage: null,
        }
    },
    methods: {
        async saveForm() {
            if (this.saving) {
                return
            }
            console.log('saving lottery',JSON.stringify(this.lottery,null,2))

            this.apiErrorMessage = ''
            this.saving = true
            let response = await api.saveNewLottery(this.lottery)
            console.log('response', JSON.stringify(response,null,2))

            if (response.success) {
                this.$router.push({name: 'editLottery', params:{id: response.data.model._id}})
            } else {
                this.apiErrorMessage = response.error
            }

            this.saving = false
        },
    },
}
</script>
