<script>
import { onUnmounted } from "vue";
import { Dashboard } from "@uppy/vue";
import { Cookies } from "quasar";

import "@uppy/core/dist/style.css";
import "@uppy/dashboard/dist/style.css";
import "@uppy/image-editor/dist/style.css";

import Uppy from "@uppy/core";
import XHRUpload from "@uppy/xhr-upload";
import ImageEditor from "@uppy/image-editor";

export default {
  components: {
    Dashboard,
  },
  props: {
    endpoint: {
      type: String,
      default: () => process.env.API_URL + `/file`,
    },
    headers: {
      type: Object,
      default: () => ({
        auth: Cookies.get("token"),
      }),
    },
    types: {
      type: Array,
      default: null,
    },
    path: {
      type: String,
      default: "files",
    },
    maxNumberOfFiles: {
      type: Number,
      default: 1,
    },
    height: {
      type: Number,
      default: 300,
    },
  },
  emits: ["uploaded", "fileAdded", "fileRemoved"],
  setup(props, ctx) {
    const uppy = new Uppy({
      autoProceed: false,
      restrictions: {
        allowedFileTypes: props.types,
        maxNumberOfFiles: props.maxNumberOfFiles,
      },
    });

    uppy.use(XHRUpload, {
      endpoint: props.endpoint + `?path=${props.path}`,
      fieldName: "file",
      method: "post",
      headers: props.headers,
    });
    uppy.use(ImageEditor, {
      quality: 1,
    });

    uppy.on("complete", (result) => {
      if (result.successful?.length > 0) {
        ctx.emit("uploaded", result.successful[0]?.response);
      }
    });

    uppy.on("file-added", (file) => {
      ctx.emit("fileAdded", file);
    });
    uppy.on("file-removed", (file, reason) => {
      ctx.emit("fileRemoved", file);
    });
    onUnmounted(() => {
      uppy.close();
    });
    function upload() {
      uppy.upload();
    }

    function cancel() {
      uppy.cancelAll();
    }

    return {
      uppy,
      upload,
      cancel,
    };
  },
};
</script>

<template>
  <dashboard
    ref="dash"
    :uppy="uppy"
    :props="{
      proudlyDisplayPoweredByUppy: false,
      hideUploadButton: true,
      height,
      metaFields: [
        { id: 'name', name: 'Name', placeholder: 'file name' },
        {
          id: 'caption',
          name: 'Caption',
          placeholder: 'describe what the image is about',
        },
      ],
    }"
    :plugins="['ImageEditor']"
  />
</template>

<style scoped>
.app-card {
  box-shadow: 0 4px 15px 0 rgb(0 74 96 / 15%);
}
</style>
