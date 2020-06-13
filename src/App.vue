<template>
  <div id="app">
    <Waiting v-if="!loaded"></Waiting>
    <template v-if="loaded">
      <!-- user loaded -->
      <nav class="navbar navbar-expand-lg navbar-light bg-light">
        <router-link class="navbar-brand" :to="{name: (getUser().isAdmin ? 'adminDashboard' : 'dashboard')}">Lottery Bot</router-link>

        <button class="navbar-toggler" type="button" data-toggle="collapse" data-target="#navbarSupportedContent" aria-controls="navbarSupportedContent" aria-expanded="false" aria-label="Toggle navigation">
          <span class="navbar-toggler-icon"></span>
        </button>

        <div class="collapse navbar-collapse" id="navbarSupportedContent">
          <ul class="navbar-nav mr-auto">
            <template v-if="!getUser().isAdmin">
            <li class="nav-item" :class="{active: this.$route.name == 'dashboard'}">
              <router-link class="nav-link" :to="{name:'dashboard'}">Home</router-link>
            </li>
            </template>


            <template v-if="getUser().isAdmin">
            <li class="nav-item" :class="{active: this.$route.name == 'adminDashboard'}">
              <router-link class="nav-link" :to="{name:'adminDashboard'}"><i class="fas fa-crown mr-1"></i>Admin</router-link>
            </li>
            <li class="nav-item" :class="{active: this.$route.name == 'adminLotteries'}">
              <router-link class="nav-link" :to="{name:'adminLotteries'}"><i class="fas fa-dice mr-1"></i>Manage Lotteries</router-link>
            </li>
            </template>
          </ul>

          <template v-if="getUser().isLoggedIn">
          <ul class="nav navbar-nav">
            <li class="nav-item dropdown mr-5">
              <a class="nav-link dropdown-toggle" href="#" id="navbarDropdown" role="button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                <span class="mr-2"><i v-if="getUser().isAdmin" class="fas fa-crown mr-1"></i> {{getUser().display_name}}</span>
                <img :src="getUser().profile_image_url" alt="User Logo" class="login-img mr-1">
              </a>
              <div class="dropdown-menu" aria-labelledby="navbarDropdown">
                <a class="dropdown-item" :href="logoutUrl">Logout</a>
              </div>
            </li>
          </ul>
          </template>

        </div>
      </nav>

      <div class="container">
        <router-view></router-view>
      </div>
    </template>
  </div>

</template>

<script>
import Waiting from './components/WaitingComponent.vue'

export default {
  name: 'App',
  components: {
    Waiting,
  },
  data() {
    return {
      loaded: false,
    }
  },
  async mounted() {
    this.loaded = true
  },
  computed: {
      logoutUrl() {
        return this.formatApiUrl('/logout')
      },
  }
}
</script>

<style scoped lang="scss">
#app {
  .login-img {
    max-height: 32px;
  }
}
</style>
