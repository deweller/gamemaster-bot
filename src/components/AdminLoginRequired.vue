<template>
    <div class="hello text-center">
        <h1 class="mt-4 display-4">Login as an Administrator</h1>
        <p class="lead">We need to know your Twitch username so we can verify that you are an admin.</p>
        <a class="mt-4 btn btn-primary btn-lg" :href="loginHref" role="button"><i class="fab fa-twitch mr-1"></i> Login with Twitch</a>
        <p class="mt-5 text-muted">This application will only access your public Twitch user profile.</p>
    </div>
</template>
<script>
import * as api from '../lib/api'

export default {
    name: 'AdminLoginRequired',
    props: {},
    computed: {
        loginHref() {
            return api.formatUrl('/user/login/')
        }
    }
}
</script>