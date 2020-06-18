import Vue from 'vue'
import VueRouter from 'vue-router'
import * as userStore from './lib/userstore'

import Dashboard from './components/Dashboard.vue'
import AdminLotteries from './components/AdminLotteries.vue'
import LoginRequired from './components/LoginRequired.vue'
import LoginFailure from './components/LoginFailure.vue'
import UserLoginApiError from './components/UserLoginApiError.vue'
import LoginSuccess from './components/LoginSuccess.vue'

import AdminDashboard from './components/AdminDashboard.vue'
import AdminLoginRequired from './components/AdminLoginRequired.vue'
import AdminNewLottery from './components/AdminNewLottery.vue'
import AdminEditLottery from './components/AdminEditLottery.vue'

let routes = [
    {
      path: '/dashboard',
      name: 'dashboard',
      component: Dashboard,
      meta: {
        requireAuth: true,
      },
    },
    {
      path: '/',
      name: 'home',
      redirect: {name: 'dashboard'},
      meta: {
        requireAuth: true,
      },
    },

    {
      path: '/user-login-error',
      name: 'userLoginError',
      component: UserLoginApiError,
      meta: {
        requireAuth: false,
      },
    },
    {
      path: '/login',
      name: 'login',
      component: LoginRequired,
      meta: {
        requireAuth: false,
      },
    },
    {
      path: '/login-failed',
      name: 'login-failed',
      component: LoginFailure,
      meta: {
        requireAuth: false,
      },
    },
    {
      path: '/login-success',
      name: 'login-success',
      component: LoginSuccess,
      meta: {
        requireAuth: false,
      },
    },

    // ------------------------------------------------------------------------
    // admin login
    {
      path: '/admin',
      redirect: {name: 'adminDashboard'},
    },
    {
      path: '/admin/login',
      name: 'adminLogin',
      component: AdminLoginRequired,
      meta: {
        requireAdminAuth: false,
      },
    },

    // ------------------------------------------------------------------------
    // admin

    {
      path: '/admin/dashboard',
      name: 'adminDashboard',
      component: AdminDashboard,
      meta: {
        requireAdminAuth: true,
      },
    },
    {
      path: '/admin/new/lottery',
      name: 'newLottery',
      component: AdminNewLottery,
      meta: {
        requireAdminAuth: true,
      },
    },
    {
      path: '/admin/lottery/:id',
      name: 'editLottery',
      component: AdminEditLottery,
      meta: {
        requireAdminAuth: true,
      },
    },
    {
      path: '/admin/lotteries',
      name: 'adminLotteries',
      component: AdminLotteries,
      meta: {
        requireAdminAuth: true,
      },
    },

]

const router = new VueRouter({
  routes
})

// require dynamic logged in check for certain routes
router.beforeEach(async (to, from, next) => {
  let user
  if (to.meta.requireAuth || to.meta.requireAdminAuth) {
    user = await userStore.ensureUser()
  }

  // user
  if (to.meta.requireAuth) {
    if (user.isError) {
      next({ name: 'userLoginError' })
      return
    } else if (!user.isLoggedIn) {
      next({ name: 'login' })
      return
    }
  }

  // admin
  if (to.meta.requireAdminAuth) {
    if (user.isError) {
      next({ name: 'userLoginError' })
      return
    } else if (!user.isLoggedIn || !user.isAdmin) {
      next({ name: 'adminLogin' })
      return
    }
  }

  next()
})

Vue.use(VueRouter)

export default router
