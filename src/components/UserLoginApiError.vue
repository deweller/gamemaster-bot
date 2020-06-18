<template>
    <div class="hello">
        <div class="container">
            <h1 class="mt-4 text-center">Server Error</h1>
            <p class="mt-4 text-center">There was an error logging you in.</p>
            <p class="mt-4 text-center"><router-link :to="{name: 'adminDashboard'}" href="" class="btn btn-primary btn-lg">Try Again</router-link></p>

        </div>
    </div>
</template>
<script>
export default {
    name: 'LoginFailed',
    props: {
    }
}
</script>
