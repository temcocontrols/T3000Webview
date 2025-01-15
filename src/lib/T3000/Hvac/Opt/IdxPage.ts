
// Migrate code from HvacDrawer/IndexPage to IdxPage

import { globalNav, user, emptyLib, library } from "../Data/T3Data"
import { liveApi } from '../../../api'
import { useQuasar, useMeta } from "quasar"


class IdxPage {

  constructor() {
  }

  // wrap code for IndexPage's onMounted event
  initPage() {
    this.initGlobalNav();
    this.isLoggedIn();
  }

  // Set global navigation properties
  initGlobalNav() {
    globalNav.value.title = "HVAC Drawer";
    globalNav.value.back = null;
    globalNav.value.home = "/";
  }

  // Checks if the user is logged in
  isLoggedIn() {
    const $q = useQuasar();

    console.log("= Idx $q:", $q);

    const hasToken = $q.cookies.has("token");
    if (!hasToken) {
      user.value = null;
      return;
    }

    // Get the user's data from the API
    liveApi.get("hvacTools").then(async (res: any) => {
      const data = await res.json();
      if (data.length > 0) {
        data?.forEach((oItem) => {
          this.addOnlineLibImage(oItem);
        });
      }
    })
      .catch((err) => {
        console.log(err);
      });

    liveApi.get("hvacObjectLibs").then(async (res: any) => {
      const data = await res.json();
      if (data.length > 0) {
        data.forEach((oItem) => {
          library.value.objLib.push({
            id: oItem.id,
            label: oItem.label,
            items: oItem.items,
            online: true,
          });
        });
      }
    })
      .catch((err) => {
        console.log(err);
      });

    liveApi.get("me").then(async (res) => {
      user.value = await res.json();
    })
      .catch((err) => {
        // Not logged in
      });
  }

  // Adds the online images to the library
  addOnlineLibImage(oItem) {
    const iIndex = library.value.images.findIndex(
      (obj) => obj.id === "IMG-" + oItem.id
    );
    if (iIndex !== -1) {
      library.value.images.splice(iIndex, 1);
    }
    library.value.images.push({
      id: "IMG-" + oItem.id,
      dbId: oItem.id,
      name: oItem.name,
      path: process.env.API_URL + "/file/" + oItem.file.path,
      online: true,
    });
  }
}

export default IdxPage
