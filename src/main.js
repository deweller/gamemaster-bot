import Vue from 'vue'
import App from './App.vue'
import VueSocketIO from 'vue-socket.io'
import SocketIO from "socket.io-client"

import 'bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';

import * as userStore from './lib/userstore'
import * as api from './lib/api'

// router
import router from './router'

Vue.config.productionTip = false

// socket.io
Vue.use(new VueSocketIO({
    debug: (process.env.NODE_ENV != 'production'),
    connection: SocketIO(api.formatUrl(''), {}),
  })
);


Vue.mixin({
  data() {
    return {
    }
  },
  methods: {
    async ensureUser() {
        return await userStore.ensureUser()
    },
    getUser() {
        return userStore.getUser()
    },
    setUserData(userData) {
        this.userReloadedCounter = this.userReloadedCounter + 1
        return userStore.setUserData(userData)
    },

    formatApiUrl(url) {
        return api.formatUrl(url)
    },
  }
})

new Vue({
  router,
  render: h => h(App),
}).$mount('#app')
