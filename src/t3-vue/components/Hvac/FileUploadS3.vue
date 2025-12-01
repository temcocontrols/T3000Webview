<!--
  The FileUploadS3 component allows users to upload files to an S3 bucket. It uses the Uppy library to handle the file upload process.

  Props:
  - endpoint: The URL of the S3 bucket endpoint. Defaults to the API_URL environment variable plus "/file".
  - headers: Additional headers to include in the upload request. Defaults to an object with an "auth" property set to the value of the "token" cookie.
  - types: An array of file types to allow for upload. Defaults to null, which allows all file types.
  - path: The path to upload the files to. Defaults to "files".
  - maxNumberOfFiles: The maximum number of files allowed to be uploaded at once. Defaults to 1.

  Events:
  - uploaded: Emitted when a file has been uploaded. The event payload contains the file object.
  - file-removed: Emitted when a file has been removed from the upload queue. The event payload contains the file object.

  Slots:
  - default: The content to display inside the FileUploadS3 component.
-->
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
