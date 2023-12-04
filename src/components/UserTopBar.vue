<script>
import { ref, onMounted } from "vue";
import { useQuasar } from "quasar";
import { useRouter } from "vue-router";
import { user } from "../lib/common";
import api from "../lib/api";

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
      isLoggedIn();
    });
    function logout() {
      $q.cookies.remove("token");
      router.push({ path: "/apps-library" });
    }
    function isLoggedIn() {
      const hasToken = $q.cookies.has("token");
      if (!hasToken) {
        user.value = null;
        return;
      }
      api
        .get("me")
        .then(async (res) => {
          user.value = await res.json();
        })
        .catch((err) => {
          // Not logged in
        });
    }
    return {
      logout,
      search,
      user,
    };
  },
};
</script>

<template>
  <q-toolbar class="toolbar bg-primary text-white">
    <div class="flex-1 flex justify-start flex-nowrap">
      <q-toolbar-title class="toolbar-title flex items-center">
        <router-link to="/" exact-active-class="exact-active">
          <div class="toolbar-title-wrapper">
            <img class="logo" src="../assets/logo.png" alt="Temco Controls" />
            <div class="leading-text">
              <div class="name">Application Library</div>
            </div>
          </div>
        </router-link>
      </q-toolbar-title>
    </div>
    <q-btn flat round dense class="mx-2">
      <q-avatar size="35px">
        <img src="../assets/user-none.png" />
      </q-avatar>
      <q-menu>
        <q-list style="min-width: 200px">
          <q-item disable v-close-popup>
            <q-item-section>{{ user?.name }}</q-item-section>
          </q-item>
          <q-separator />
          <q-item clickable v-close-popup @click="logout()">
            <q-item-section>Logout</q-item-section>
          </q-item>
        </q-list>
      </q-menu>
    </q-btn>
  </q-toolbar>
</template>

<style lang="scss" scoped>
.toolbar {
  flex: 1 1 0%;
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
