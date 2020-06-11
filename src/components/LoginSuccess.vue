<template>
    <div class="hello">
        <div class="container">
            <h1 class="mt-4 text-center">Login Succeeded</h1>
        </div>
    </div>
</template>
<script>
import * as userStore from '../lib/userstore'

export default {
    name: 'LoginSuccess',
    props: {
    },
    async mounted() {
        const user = await userStore.ensureUser()
        if (user.isAdmin) {
            this.$router.push({name: 'adminDashboard'})
        } else {
            this.$router.push({name: 'dashboard'})
        }
    },
}
</script>
