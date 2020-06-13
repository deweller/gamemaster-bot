<template>
    <div class="hello" v-if="user">
        <h1 class="mt-5 text-center">
            Hi there, {{user.display_name}}.
        </h1>

        <div v-if="loaded" class="mt-5 text-center">
            You are not authorized as an administrator.
        </div>

    </div>
</template>

<script>
// this is the old user dashboard that is no longer used
export default {
    name: 'Dashboard',
    components: {
    },
    props: {
    },
    data() {
        return {
            loaded: false,
        }
    },
    created() {
    },
    mounted() {
        if (this.user.isAdmin) {
            // redirect
            this.$router.push({ name: 'adminDashboard' })
        } else {
            this.loaded = true
        }
    },
    methods: {
    },
    computed: {
        user() {
            return this.getUser()
        }
    },
}
</script>
