<script>
import { onUnmounted } from "vue";
import { Dashboard } from "@uppy/vue";
import { useQuasar } from "quasar";

import "@uppy/core/dist/style.css";
import "@uppy/dashboard/dist/style.css";
import "@uppy/image-editor/dist/style.css";

import Uppy from "@uppy/core";
// import XHRUpload from "@uppy/xhr-upload";
import ImageEditor from "@uppy/image-editor";

export default {
  components: {
    Dashboard,
  },
  props: {
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
  },
  emits: ["uploaded", "fileAdded", "fileRemoved"],
  setup(props, ctx) {
    const $q = useQuasar();
    const uppy = new Uppy({
      autoProceed: false,
      restrictions: {
        allowedFileTypes: props.types,
        maxNumberOfFiles: props.maxNumberOfFiles,
      },
    });

    /* uppy.use(XHRUpload, {
      endpoint: fileServerUrl,
      fieldName: "file",
      method: "post",
      withCredentials: true,
      headers: {
        "access-key": $q.cookies.get('access-key')
      }
    }); */
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
  <dashboard ref="dash" :uppy="uppy" :props="{
    proudlyDisplayPoweredByUppy: false,
    hideUploadButton: true,
    height: 300,
    metaFields: [
      { id: 'name', name: 'Name', placeholder: 'file name' },
      {
        id: 'caption',
        name: 'Caption',
        placeholder: 'describe what the image is about',
      },
    ],
  }" :plugins="['ImageEditor']" />
</template>

<style scoped>
.app-card {
  box-shadow: 0 4px 15px 0 rgb(0 74 96 / 15%);
}
</style>
