<template>
    <div v-if="showError" class="alert alert-danger fade show" role="alert">
        {{ error }}
        <button @click="clearAlert" type="button" class="close" aria-label="Close">
            <span aria-hidden="true">&times;</span>
        </button>
    </div>
</template>

<script>
export default {

    props: {
        error: String,
    },
    data() {
        return {
            showing: true,
        }
    },

    mounted() {},

    methods: {
        clearAlert() {
            this.showing = false
        }
    },

    computed: {
        showError() {
            return this.showing && this.error != null && this.error.length > 0
        }
    },

    watch: {},
}
</script>