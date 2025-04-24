import { cloneDeep } from "lodash";
import { ref } from "vue";

// const defaultItem: any = {
//   active: false,
//   cat: "General",
//   group: {},
//   height: 60,
//   id: 1,
//   rotate: 0,
//   scaleX: 1,
//   scaleY: 1,
//   settings: {
//     bgColor: "inherit",
//     fillColor: "#659dc5",
//     fontSize: 16,
//     textColor: "inherit",
//     titleColor: "inherit",
//     t3EntryDisplayField: "none",
//     justifyContent: ''
//   },
//   showDimensions: true,
//   t3Entry: null,
//   title: null,
//   translate: [217, 49],
//   type: "G_Circle",
//   width: 60,
//   zindex: 1
// };

export const contextMenuShow = ref<boolean>(false);
export const objectConfigShow = ref<boolean>(false);
export const currentObject = ref<any>({});

