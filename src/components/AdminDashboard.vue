<template>
    <div class="hello" v-if="user">
        <div class="container">
            <h1 class="mt-5 text-center">
                Hello {{user.display_name}}
            </h1>

            <div class="text-center">
            <div>
                This is your admin interface to create lotteries and choose winners.
            </div>
            <div class="mt-4">
                <router-link :to="{name: 'adminLotteries'}" class="btn btn-primary">Go to Your Lotteries</router-link>
            </div>
            </div>
        </div>
    </div>
</template>
<script>
export default {
    name: 'AdminDashboard',
    props: {
    },
    computed: {
        user() {
            return this.getUser()
        }
    }
}
</script>
<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
</style>
