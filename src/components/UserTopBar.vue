<!--
  The `UserTopBar` component is a top navigation bar that appears on all pages.
  It contains various actions that can be performed by the user, such as logging out, searching, and navigating to different pages.

  - The `search` input field allows the user to search for objects in the application.
  - The `logout` button logs the user out of the application.
  - The `navItems` prop is an array of objects that define the navigation items to be displayed in the top navigation bar.
  Each navigation item has a `label` and a `link` property.
  - The `mobileMenuBtnClicked` event is emitted when the mobile menu button is clicked.

  The component uses the `useQuasar` and `useRouter` composables from the Quasar framework to interact with the Vue Router and
  Quasar components.
-->
<script>
import { ref, onMounted } from "vue";
import { useQuasar } from "quasar";
import { useRouter } from "vue-router";
import { user, globalNav, isAdmin } from "../lib/common";
import { liveApi, localApi } from "../lib/api";

export default {
  props: {
    navItems: {
      type: Array,
      required: false,
      default: () => [],
    },
  },
  emits: ["mobileMenuBtnClicked"],
  setup() {
    const router = useRouter();
    const $q = useQuasar();
    const search = ref("");
    onMounted(() => {
      user.value = localStorage.getItem("user")
        ? JSON.parse(localStorage.getItem("user")) || null
        : null;
      isLoggedIn();
    });
    function logout() {
      $q.cookies.remove("token");
      user.value = null;
      localStorage.removeItem("user");
      localApi.post("logout").catch((err) => {
        console.log(err);
      });
      router.replace({ path: globalNav.value.home });
    }
    function isLoggedIn() {
      const hasToken = $q.cookies.has("token");
      if (!hasToken) {
        localApi
          .get("user")
          .then(async (res) => {
            if (res.status === 200) {
              const localUser = await res.json();
              if (localUser?.token) {
                $q.cookies.set("token", localUser.token);
                isLoggedIn();
              }
            }
          })
          .catch((err) => {
            // Not logged in
          });
        localStorage.removeItem("user");
        user.value = null;
        return;
      }
      liveApi
        .get("me")
        .then(async (res) => {
          if (res.status === 200) {
            user.value = await res.json();
            localStorage.setItem("user", JSON.stringify(user.value));
          } else if (res.status === 401) {
            logout();
          }
        })
        .catch((err) => {
          if (err.response.status === 401) {
            logout();
          }
        });
    }
    return {
      logout,
      search,
      user,
      globalNav,
      isAdmin,
    };
  },
};
</script>

<template>
  <q-toolbar class="toolbar bg-primary text-white">
    <div class="flex justify-start flex-nowrap">
      <q-btn
        v-if="globalNav.back"
        flat
        round
        dense
        icon="arrow_back"
        :to="globalNav.back"
      />
      <q-toolbar-title class="toolbar-title flex items-center">
        <router-link :to="globalNav.home" exact-active-class="exact-active">
          <div class="toolbar-title-wrapper">
            <img class="logo" src="../assets/logo.png" alt="Temco Controls" />
            <div class="leading-text">
              <div class="name">{{ globalNav.title }}</div>
            </div>
          </div>
        </router-link>
      </q-toolbar-title>
    </div>
    <div class="flex-1 flex ml-4"><slot name="action-btns"></slot></div>
    <slot name="search-input"></slot>
    <slot name="buttons"></slot>
    <q-btn v-if="user" flat round dense class="mx-2">
      <q-avatar size="35px">
        <img src="../assets/user-none.png" />
      </q-avatar>
      <q-menu>
        <q-list style="min-width: 200px">
          <q-item disable v-close-popup>
            <q-item-section>{{ user?.name }} </q-item-section>
            <q-item-section class="items-end"
              ><q-chip
                v-if="isAdmin(user)"
                class="px-2"
                dense
                size="sm"
                icon="verified_user"
                >Admin</q-chip
              ></q-item-section
            >
          </q-item>
          <q-separator />
          <q-item clickable v-close-popup @click="logout()">
            <q-item-section>Logout</q-item-section>
          </q-item>
        </q-list>
      </q-menu>
    </q-btn>
    <q-btn v-else flat label="Login" to="/login" />
  </q-toolbar>
</template>

<style lang="scss" scoped>
.toolbar {
  justify-items: stretch;
  justify-content: space-between;
}

.toolbar-title {
  flex: none;
}

.edit-page .toolbar-title-wrapper {
  color: #ebebeb;

  .leading-text {
    .slogan {
      color: #ebebeb;
    }
  }
}

.toolbar-title-wrapper {
  flex-shrink: 0;
  display: flex;
  align-items: center;

  .logo {
    width: auto;
    height: 2rem;
  }

  .leading-text {
    display: flex;
    flex-direction: column;
    line-height: 1rem;
    padding-left: 0.5rem;

    .name {
      font-weight: bold;
    }

    .slogan {
      font-size: 0.875rem;
      color: #6b7280;
    }
  }
}

.toolbar-input {
  width: 35%;
}

.router-link-exact-active {
  background-color: #1f2937;
  color: white;
}

.login-link {
  color: #115772;
}

@media (max-width: 1023px) {
  .desktop-menu {
    display: none;
  }

  .edit-page .toolbar-title-wrapper .leading-text {
    display: none;
  }
}
</style>
